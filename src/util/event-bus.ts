/**
 * EventBus - 类型安全的事件总线工具类
 * 支持强类型事件定义、异步事件处理、中间件、作用域和性能监控
 */

export type EventHandler<T = any> = (data: T) => void | Promise<void>;
export type AsyncEventHandler<T = any> = (data: T) => Promise<void>;

export interface EventMetadata {
  timestamp: number;
  source?: string;
  correlationId?: string;
  [key: string]: any;
}

export interface EventContext<T = any> {
  event: string;
  data: T;
  metadata: EventMetadata;
  abort: () => void;
  isAborted: boolean;
}

export interface Middleware<T = any> {
  (context: EventContext<T>, next: () => Promise<void>): Promise<void>;
}

export interface EventBusOptions {
  maxListeners?: number;
  enableAsync?: boolean;
  defaultTimeout?: number;
  enableMetrics?: boolean;
}

export interface EventMetrics {
  totalEvents: number;
  totalHandlers: number;
  avgExecutionTime: number;
  errors: number;
  lastEventTime: number;
}

export interface Subscription {
  unsubscribe: () => void;
  event: string;
  handlerId: string;
}

/**
 * 事件总线类
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

    // 执行全局中间件
    await this.executeMiddlewares(this.globalMiddlewares, context);

    // 执行事件特定中间件
    const eventMiddlewares = this.middlewares.get(event) || [];
    await this.executeMiddlewares(eventMiddlewares, context);

    if (context.isAborted) {
      return;
    }

    // 执行同步处理器
    const syncHandlers = this.handlers.get(event);
    if (syncHandlers) {
      for (const handler of syncHandlers.values()) {
        try {
          handler(data);
        } catch (error) {
          this.handleError(event, error, context);
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
            const startTime = Date.now();
            try {
              await handler(data);
              const executionTime = Date.now() - startTime;
              this.updateMetrics(event, executionTime, false);
            } catch (error) {
              const executionTime = Date.now() - startTime;
              this.updateMetrics(event, executionTime, true);
              this.handleError(event, error, context);
            }
          })()
        );
      }

      // 等待所有异步处理器完成（带超时）
      if (promises.length > 0) {
        await Promise.race([
          Promise.all(promises),
          this.createTimeoutPromise(event),
        ]);
      }
    }

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
   * 创建作用域事件总线
   */
  createScopedBus(scope: string): ScopedEventBus {
    return new ScopedEventBus(this, scope);
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
    const totalTime = metrics.avgExecutionTime * (metrics.totalEvents - metrics.errors) + executionTime;
    const validEvents = metrics.totalEvents - metrics.errors + (isError ? 0 : 1);
    
    metrics.avgExecutionTime = validEvents > 0 ? totalTime / validEvents : 0;
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

/**
 * 作用域事件总线
 */
export class ScopedEventBus {
  constructor(
    private parent: EventBus,
    private scope: string
  ) {}

  on<T = any>(event: string, handler: EventHandler<T>, handlerId?: string): Subscription {
    return this.parent.on(this.scopedEvent(event), handler, handlerId);
  }

  onAsync<T = any>(event: string, handler: AsyncEventHandler<T>, handlerId?: string): Subscription {
    return this.parent.onAsync(this.scopedEvent(event), handler, handlerId);
  }

  once<T = any>(event: string, handler: EventHandler<T>): Subscription {
    return this.parent.once(this.scopedEvent(event), handler);
  }

  onceAsync<T = any>(event: string, handler: AsyncEventHandler<T>): Subscription {
    return this.parent.onceAsync(this.scopedEvent(event), handler);
  }

  async emit<T = any>(event: string, data: T, metadata: Partial<EventMetadata> = {}): Promise<void> {
    return this.parent.emit(this.scopedEvent(event), data, {
      ...metadata,
      scope: this.scope,
    });
  }

  off(event: string, handlerId: string): boolean {
    return this.parent.off(this.scopedEvent(event), handlerId);
  }

  offAll(): void {
    // 移除所有属于该作用域的事件
    const events = this.parent.eventNames();
    for (const event of events) {
      if (event.startsWith(`${this.scope}.`)) {
        this.parent.offAll(event);
      }
    }
  }

  private scopedEvent(event: string): string {
    return `${this.scope}.${event}`;
  }
}

/**
 * 预定义事件类型（示例）
 */
export interface SessionEvents {
  'session.created': { sessionId: string; userId: string };
  'session.message.added': { sessionId: string; message: any };
  'session.compaction.triggered': { sessionId: string; tokenCount: number };
  'session.compaction.completed': { sessionId: string; summary: any; compressedCount: number };
  'session.error': { sessionId: string; error: Error };
}

export interface AgentEvents {
  'agent.tool.called': { toolName: string; params: any };
  'agent.tool.result': { toolName: string; result: any; duration: number };
  'agent.llm.called': { prompt: string; model: string };
  'agent.llm.response': { response: string; duration: number; tokenUsage: any };
}

/**
 * 类型安全的事件总线（泛型版本）
 */
export class TypedEventBus<TEvents extends Record<string, any>> {
  private bus = new EventBus();

  on<TEvent extends keyof TEvents>(
    event: TEvent,
    handler: EventHandler<TEvents[TEvent]>,
    handlerId?: string
  ): Subscription {
    return this.bus.on(event as string, handler, handlerId);
  }

  onAsync<TEvent extends keyof TEvents>(
    event: TEvent,
    handler: AsyncEventHandler<TEvents[TEvent]>,
    handlerId?: string
  ): Subscription {
    return this.bus.onAsync(event as string, handler, handlerId);
  }

  once<TEvent extends keyof TEvents>(
    event: TEvent,
    handler: EventHandler<TEvents[TEvent]>
  ): Subscription {
    return this.bus.once(event as string, handler);
  }

  onceAsync<TEvent extends keyof TEvents>(
    event: TEvent,
    handler: AsyncEventHandler<TEvents[TEvent]>
  ): Subscription {
    return this.bus.onceAsync(event as string, handler);
  }

  async emit<TEvent extends keyof TEvents>(
    event: TEvent,
    data: TEvents[TEvent],
    metadata?: Partial<EventMetadata>
  ): Promise<void> {
    return this.bus.emit(event as string, data, metadata);
  }

  off<TEvent extends keyof TEvents>(event: TEvent, handlerId: string): boolean {
    return this.bus.off(event as string, handlerId);
  }

  offAll(event?: keyof TEvents): void {
    this.bus.offAll(event as string);
  }

  use(middleware: Middleware): void {
    this.bus.use(middleware);
  }

  useForEvent<TEvent extends keyof TEvents>(event: TEvent, middleware: Middleware<TEvents[TEvent]>): void {
    this.bus.useForEvent(event as string, middleware);
  }

  listenerCount(event?: keyof TEvents): number {
    return this.bus.listenerCount(event as string);
  }

  eventNames(): string[] {
    return this.bus.eventNames();
  }

  getMetrics(event?: keyof TEvents): EventMetrics | Map<string, EventMetrics> {
    return this.bus.getMetrics(event as string);
  }

  resetMetrics(event?: keyof TEvents): void {
    this.bus.resetMetrics(event as string);
  }

  createScopedBus(scope: string): ScopedEventBus {
    return this.bus.createScopedBus(scope);
  }

  waitFor<TEvent extends keyof TEvents>(
    event: TEvent,
    timeout?: number
  ): Promise<TEvents[TEvent]> {
    return this.bus.waitFor(event as string, timeout);
  }
}

/**
 * 默认导出单例实例
 */
export const eventBus = new EventBus({
  maxListeners: 100,
  enableAsync: true,
  defaultTimeout: 10000,
  enableMetrics: true,
});

/**
 * 类型安全的单例实例
 */
export const typedEventBus = new TypedEventBus<SessionEvents & AgentEvents>();

/**
 * 工具函数：创建日志中间件
 */
export function createLoggingMiddleware(source?: string): Middleware {
  return async (context, next) => {
    const startTime = Date.now();
    console.log(`[${source || 'EventBus'}] Event started: ${context.event}`, {
      correlationId: context.metadata.correlationId,
      timestamp: new Date(context.metadata.timestamp).toISOString(),
    });

    try {
      await next();
      const duration = Date.now() - startTime;
      console.log(`[${source || 'EventBus'}] Event completed: ${context.event}`, {
        correlationId: context.metadata.correlationId,
        duration: `${duration}ms`,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${source || 'EventBus'}] Event failed: ${context.event}`, {
        correlationId: context.metadata.correlationId,
        duration: `${duration}ms`,
        error,
      });
      throw error;
    }
  };
}

/**
 * 工具函数：创建错误处理中间件
 */
export function createErrorHandlingMiddleware(
  onError?: (error: Error, context: EventContext) => void
): Middleware {
  return async (context, next) => {
    try {
      await next();
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)), context);
      }
      throw error;
    }
  };
}

/**
 * 工具函数：创建验证中间件
 */
export function createValidationMiddleware<T>(
  validator: (data: T) => boolean | Promise<boolean>,
  errorMessage = 'Validation failed'
): Middleware<T> {
  return async (context, next) => {
    const isValid = await validator(context.data);
    if (!isValid) {
      throw new Error(`${errorMessage} for event: ${context.event}`);
    }
    await next();
  };
}