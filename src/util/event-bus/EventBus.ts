/**
 * EventBus - 主事件总线类
 * 核心功能：事件订阅、发布、取消订阅
 */

import type {
  EventHandler,
  AsyncEventHandler,
  Subscription,
  EventBusOptions,
  EventMetrics,
  Middleware,
  EventContext,
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
    };

    // 设置 abort 函数
    context.abort = () => {
      context.isAborted = true;
    };

    // 执行所有中间件和处理器
    const allMiddlewares = [...this.globalMiddlewares, ...(this.middlewares.get(event) || [])];
    await this.executeMiddlewaresWithHandlers(allMiddlewares, context);

    eventMetrics.lastEventTime = Date.now();
  }

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

  /**
   * 获取事件监听器数量
   */
  listenerCount(event?: string): number {
    if (event) {
      const syncCount = this.handlers.get(event)?.size || 0;
      const asyncCount = this.asyncHandlers.get(event)?.size || 0;
      return syncCount + asyncCount;
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
    for (const event of this.handlers.keys()) {
      events.add(event);
    }
    for (const event of this.asyncHandlers.keys()) {
      events.add(event);
    }
    for (const event of this.middlewares.keys()) {
      events.add(event);
    }
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

  /**
   * 私有方法
   */
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

  private async executeMiddlewares(middlewares: Middleware[], context: EventContext): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index >= middlewares.length || context.isAborted) {
        return;
      }

      const middleware = middlewares[index];
      index++;

      try {
        await middleware(context, next);
      } catch (error) {
        this.handleError(context.event, error, context);
        throw error;
      }
    };

    await next();
  }

  /**
   * 执行中间件并在最后执行处理器
   * 这允许错误从处理器传播回中间件
   */
  private async executeMiddlewaresWithHandlers(middlewares: Middleware[], context: EventContext): Promise<void> {
    let index = 0;

    const executeHandlers = async (): Promise<void> => {
      if (context.isAborted) {
        return;
      }

      const event = context.event;
      const data = context.data;
      const errors: Error[] = [];

      // 执行同步处理器
      const syncHandlers = this.handlers.get(event);
      if (syncHandlers) {
        for (const handler of syncHandlers.values()) {
          if (context.isAborted) break; // 检查是否被中止
          const startTime = Date.now();
          try {
            handler(data);
            const executionTime = Date.now() - startTime;
            this.updateMetrics(event, executionTime, false);
          } catch (error) {
            const executionTime = Date.now() - startTime;
            this.updateMetrics(event, executionTime, true);
            this.handleError(event, error, context);
            const err = error instanceof Error ? error : new Error(String(error));
            errors.push(err);
            // 不抛出错误，让其他处理器继续执行
          }
        }
      }

      // 执行异步处理器
      const asyncHandlers = this.asyncHandlers.get(event);
      if (asyncHandlers && this.options.enableAsync) {
        const totalHandlers = (syncHandlers?.size || 0) + asyncHandlers.size;

        // 如果只有一个处理器，直接执行以允许错误传播
        if (totalHandlers === 1 && asyncHandlers.size === 1) {
          const handler = Array.from(asyncHandlers.values())[0];
          const startTime = Date.now();
          try {
            if (context.isAborted) return;
            await handler(data);
            const executionTime = Date.now() - startTime;
            this.updateMetrics(event, executionTime, false);
          } catch (error) {
            const executionTime = Date.now() - startTime;
            this.updateMetrics(event, executionTime, true);
            this.handleError(event, error, context);
            // 让错误传播给中间件
            throw error;
          }
        } else {
          // 多个处理器，并行执行，错误不互相影响
          const promises: Promise<void>[] = [];
          for (const handler of asyncHandlers.values()) {
            promises.push(
              (async () => {
                if (context.isAborted) return;
                const startTime = Date.now();
                try {
                  await handler(data);
                  const executionTime = Date.now() - startTime;
                  this.updateMetrics(event, executionTime, false);
                } catch (error) {
                  const executionTime = Date.now() - startTime;
                  this.updateMetrics(event, executionTime, true);
                  this.handleError(event, error, context);
                  const err = error instanceof Error ? error : new Error(String(error));
                  errors.push(err);
                }
              })()
            );
          }

          // 等待所有处理器完成
          await Promise.all(promises);
        }
      }

      // 如果只有一个处理器且出错，抛出错误以允许中间件捕获
      // 如果有多个处理器，错误不影响其他处理器，中间件也无需捕获
      const totalHandlers = (syncHandlers?.size || 0) + (asyncHandlers?.size || 0);
      if (errors.length > 0 && totalHandlers === 1) {
        throw errors[0];
      }
    };

    const next = async (): Promise<void> => {
      if (index >= middlewares.length || context.isAborted) {
        // 所有中间件执行完毕，执行处理器
        await executeHandlers();
        return;
      }

      const middleware = middlewares[index];
      index++;

      try {
        await middleware(context, next);
      } catch (error) {
        this.handleError(context.event, error, context);
        throw error;
      }
    };

    await next();
  }

  private handleError(event: string, error: unknown, context: EventContext): void {
    const metrics = this.getOrCreateMetrics(event);
    metrics.errors++;

    // 可以在这里添加错误日志、错误上报等
    console.error(`EventBus error for event "${event}":`, error, context);
  }

  private generateCorrelationId(): string {
    return `evt_${Date.now()}_${++this.correlationCounter}`;
  }

  private generateHandlerId(): string {
    return `handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      // 只有非错误才更新平均执行时间
      const previousValidEvents = metrics.totalEvents - metrics.errors - 1; // -1 因为 totalEvents 在 emit 中已经递增
      const totalTime = metrics.avgExecutionTime * Math.max(0, previousValidEvents) + executionTime;
      const currentValidEvents = metrics.totalEvents - metrics.errors;
      metrics.avgExecutionTime = currentValidEvents > 0 ? totalTime / currentValidEvents : 0;
    }

    // 更新错误计数
    if (isError) {
      metrics.errors++;
    }
  }

  private createTimeoutPromise(event: string): Promise<void> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Event "${event}" handler timeout after ${this.options.defaultTimeout}ms`));
      }, this.options.defaultTimeout);
    });
  }
}
