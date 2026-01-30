/**
 * EventBus - 主事件总线类
 * 核心功能：事件订阅、发布、取消订阅
 *
 * 设计原则：
 * 1. 所有错误都被捕获并记录，绝不向调用方抛出
 * 2. 支持同步/异步事件处理
 * 3. 支持全局和事件特定的中间件
 * 4. 支持类型安全和作用域隔离
 */

import type {
  EventHandler,
  AsyncEventHandler,
  Subscription,
  EventBusOptions,
  EventMetrics,
  Middleware,
  EventContext,
  EventMetadata,
} from './types';
import { ScopedEventBus } from './ScopedEventBus';

/**
 * 事件总线主类
 */
export class EventBus {
  private handlers = new Map<string, Map<string, EventHandler>>();
  private asyncHandlers = new Map<string, Map<string, AsyncEventHandler>>();
  private middlewares = new Map<string, Middleware[]>();
  private globalMiddlewares: Middleware[] = [];
  private options: Required<EventBusOptions>;
  private metrics = new Map<string, EventMetrics>();
  private correlationCounter = 0;

  constructor(options: EventBusOptions = {}) {
    this.options = {
      maxListeners: 50,
      enableAsync: true,
      defaultTimeout: 5000,
      enableMetrics: false,
      ...options,
    };
  }

  // ==================== 订阅方法 ====================

  /**
   * 订阅事件（同步处理）
   */
  on<T = any>(event: string, handler: EventHandler<T>, handlerId?: string): Subscription {
    return this.subscribe(event, handler, false, handlerId);
  }

  /**
   * 订阅事件（异步处理）
   */
  onAsync<T = any>(event: string, handler: AsyncEventHandler<T>, handlerId?: string): Subscription {
    if (!this.options.enableAsync) {
      throw new Error('Async events are disabled');
    }
    return this.subscribe(event, handler, true, handlerId);
  }

  /**
   * 一次性订阅事件
   */
  once<T = any>(event: string, handler: EventHandler<T>): Subscription {
    const subscription = this.on(event, (data: T) => {
      handler(data);
      subscription.unsubscribe();
    });
    return subscription;
  }

  /**
   * 一次性订阅事件（异步）
   */
  onceAsync<T = any>(event: string, handler: AsyncEventHandler<T>): Subscription {
    const subscription = this.onAsync(event, async (data: T) => {
      await handler(data);
      subscription.unsubscribe();
    });
    return subscription;
  }

  // ==================== 发布方法 ====================

  /**
   * 发布事件
   */
  async emit<T = any>(
    event: string,
    data: T,
    metadata: Partial<EventMetadata> = {}
  ): Promise<void> {
    const eventMetrics = this.getOrCreateMetrics(event);
    eventMetrics.totalEvents++;

    let onErrorCallback: ((error: Error) => void) | undefined;

    const context: EventContext<T> = {
      event,
      data,
      metadata: {
        timestamp: Date.now(),
        correlationId: this.generateCorrelationId(),
        ...metadata,
      },
      abort: () => {},
      isAborted: false,
      get onError() {
        return onErrorCallback;
      },
      set onError(callback: ((error: Error) => void) | undefined) {
        onErrorCallback = callback;
      },
    };

    context.abort = () => {
      context.isAborted = true;
    };

    // 执行所有中间件和处理器
    const allMiddlewares = [...this.globalMiddlewares, ...(this.middlewares.get(event) || [])];
    await this.executeMiddlewaresWithHandlers(allMiddlewares, context);

    eventMetrics.lastEventTime = Date.now();
  }

  // ==================== 取消订阅方法 ====================

  /**
   * 移除事件监听器
   */
  off(event: string, handlerId: string): boolean {
    let removed = false;

    const syncHandlers = this.handlers.get(event);
    if (syncHandlers?.has(handlerId)) {
      syncHandlers.delete(handlerId);
      removed = true;
      if (syncHandlers.size === 0) {
        this.handlers.delete(event);
      }
    }

    const asyncHandlers = this.asyncHandlers.get(event);
    if (asyncHandlers?.has(handlerId)) {
      asyncHandlers.delete(handlerId);
      removed = true;
      if (asyncHandlers.size === 0) {
        this.asyncHandlers.delete(event);
      }
    }

    return removed;
  }

  /**
   * 移除所有事件监听器
   */
  offAll(event?: string): void {
    if (event) {
      this.handlers.delete(event);
      this.asyncHandlers.delete(event);
      this.middlewares.delete(event);
      this.metrics.delete(event);
    } else {
      this.handlers.clear();
      this.asyncHandlers.clear();
      this.middlewares.clear();
      this.metrics.clear();
      this.globalMiddlewares = [];
    }
  }

  // ==================== 中间件方法 ====================

  /**
   * 添加全局中间件
   */
  use(middleware: Middleware): void {
    this.globalMiddlewares.push(middleware);
  }

  /**
   * 添加事件特定中间件
   */
  useForEvent(event: string, middleware: Middleware): void {
    const middlewares = this.middlewares.get(event) || [];
    middlewares.push(middleware);
    this.middlewares.set(event, middlewares);
  }

  // ==================== 查询方法 ====================

  /**
   * 获取事件监听器数量
   */
  listenerCount(event?: string): number {
    if (event) {
      return (this.handlers.get(event)?.size || 0) + (this.asyncHandlers.get(event)?.size || 0);
    }

    let total = 0;
    for (const handlers of this.handlers.values()) {
      total += handlers.size;
    }
    for (const handlers of this.asyncHandlers.values()) {
      total += handlers.size;
    }
    return total;
  }

  /**
   * 获取事件列表
   */
  eventNames(): string[] {
    const events = new Set<string>();
    this.handlers.keys().forEach(e => events.add(e));
    this.asyncHandlers.keys().forEach(e => events.add(e));
    this.middlewares.keys().forEach(e => events.add(e));
    return Array.from(events);
  }

  /**
   * 获取事件指标
   */
  getMetrics(event?: string): EventMetrics | Map<string, EventMetrics> {
    if (event) {
      return this.metrics.get(event) || this.createEmptyMetrics();
    }
    return new Map(this.metrics);
  }

  /**
   * 重置指标
   */
  resetMetrics(event?: string): void {
    if (event) {
      this.metrics.delete(event);
    } else {
      this.metrics.clear();
    }
  }

  // ==================== 高级功能 ====================

  /**
   * 等待特定事件（Promise 形式）
   */
  waitFor<T = any>(event: string, timeout?: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = timeout
        ? setTimeout(() => {
            subscription.unsubscribe();
            reject(new Error(`Timeout waiting for event: ${event}`));
          }, timeout)
        : undefined;

      const subscription = this.once(event, (data: T) => {
        if (timer) clearTimeout(timer);
        resolve(data);
      });
    });
  }

  /**
   * 创建作用域事件总线
   */
  createScopedBus(scope: string): ScopedEventBus {
    return new ScopedEventBus(this, scope);
  }

  // ==================== 私有方法 ====================

  private subscribe<T>(
    event: string,
    handler: EventHandler<T> | AsyncEventHandler<T>,
    isAsync: boolean,
    handlerId?: string
  ): Subscription {
    const id = handlerId || this.generateHandlerId();
    const handlerMap = isAsync ? this.asyncHandlers : this.handlers;

    let handlers = handlerMap.get(event);
    if (!handlers) {
      handlers = new Map();
      handlerMap.set(event, handlers);
    }

    // 检查监听器数量限制
    if (handlers.size >= this.options.maxListeners) {
      throw new Error(
        `Maximum listeners (${this.options.maxListeners}) exceeded for event: ${event}`
      );
    }

    handlers.set(id, handler as any);

    // 更新指标
    const metrics = this.getOrCreateMetrics(event);
    metrics.totalHandlers++;

    return {
      unsubscribe: () => this.off(event, id),
      event,
      handlerId: id,
    };
  }

  /**
   * 执行中间件和处理器
   * 核心原则：所有错误都被捕获并记录，绝不向调用方抛出
   */
  private async executeMiddlewaresWithHandlers(
    middlewares: Middleware[],
    context: EventContext
  ): Promise<void> {
    let index = 0;

    const executeHandlers = async (): Promise<void> => {
      if (context.isAborted) return;

      const event = context.event;
      const data = context.data;

      // 执行同步处理器
      const syncHandlers = this.handlers.get(event);
      if (syncHandlers) {
        for (const handler of syncHandlers.values()) {
          if (context.isAborted) break;
          const startTime = Date.now();
          try {
            handler(data);
            this.updateMetrics(event, Date.now() - startTime, false);
          } catch (error) {
            this.updateMetrics(event, Date.now() - startTime, true);
            const err = error instanceof Error ? error : new Error(String(error));
            this.handleError(event, err, context);
            if (context.onError) {
              context.onError(err);
            }
          }
        }
      }

      // 执行异步处理器
      const asyncHandlers = this.asyncHandlers.get(event);
      if (asyncHandlers && this.options.enableAsync) {
        const promises: Promise<void>[] = [];
        for (const handler of asyncHandlers.values()) {
          promises.push(
            (async () => {
              if (context.isAborted) return;
              const startTime = Date.now();
              try {
                await handler(data);
                this.updateMetrics(event, Date.now() - startTime, false);
              } catch (error) {
                this.updateMetrics(event, Date.now() - startTime, true);
                const err = error instanceof Error ? error : new Error(String(error));
                this.handleError(event, err, context);
                if (context.onError) {
                  context.onError(err);
                }
              }
            })()
          );
        }
        await Promise.all(promises);
      }
    };

    const next = async (): Promise<void> => {
      if (index >= middlewares.length || context.isAborted) {
        await executeHandlers();
        return;
      }

      const middleware = middlewares[index];
      index++;

      try {
        await middleware(context, next);
      } catch (error) {
        this.handleError(context.event, error, context);
      }
    };

    await next();
  }

  private handleError(event: string, error: unknown, context: EventContext): void {
    const metrics = this.getOrCreateMetrics(event);
    metrics.errors++;
    // console.error(`EventBus error for event "${event}":`, error, context);
  }

  private generateCorrelationId(): string {
    return `evt_${Date.now()}_${++this.correlationCounter}`;
  }

  private generateHandlerId(): string {
    return `handler_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private getOrCreateMetrics(event: string): EventMetrics {
    let metrics = this.metrics.get(event);
    if (!metrics) {
      metrics = this.createEmptyMetrics();
      this.metrics.set(event, metrics);
    }
    return metrics;
  }

  private createEmptyMetrics(): EventMetrics {
    return {
      totalEvents: 0,
      totalHandlers: 0,
      avgExecutionTime: 0,
      errors: 0,
      lastEventTime: 0,
    };
  }

  private updateMetrics(event: string, executionTime: number, isError: boolean): void {
    if (!this.options.enableMetrics) return;

    const metrics = this.getOrCreateMetrics(event);

    if (!isError) {
      const previousValidEvents = metrics.totalEvents - metrics.errors - 1;
      const totalTime = metrics.avgExecutionTime * Math.max(0, previousValidEvents) + executionTime;
      const currentValidEvents = metrics.totalEvents - metrics.errors;
      metrics.avgExecutionTime = currentValidEvents > 0 ? totalTime / currentValidEvents : 0;
    }

    if (isError) {
      metrics.errors++;
    }
  }
}
