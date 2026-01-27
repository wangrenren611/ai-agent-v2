/**
 * TypedEventBus - 类型安全的事件总线
 * 支持强类型事件定义
 *
 * 使用泛型约束事件类型，提供编译时类型检查
 */

import type {
  EventHandler,
  AsyncEventHandler,
  Subscription,
  Middleware,
  EventMetadata,
  EventMetrics,
} from './types';
import { EventBus } from './EventBus';
import { ScopedEventBus } from './ScopedEventBus';

/**
 * 类型安全的事件总线（泛型版本）
 */
export class TypedEventBus<TEvents extends Record<string, any>> {
  private bus = new EventBus();

  // ==================== 订阅方法 ====================

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

  // ==================== 发布方法 ====================

  async emit<TEvent extends keyof TEvents>(
    event: TEvent,
    data: TEvents[TEvent],
    metadata?: Partial<EventMetadata>
  ): Promise<void> {
    return this.bus.emit(event as string, data, metadata);
  }

  // ==================== 取消订阅方法 ====================

  off<TEvent extends keyof TEvents>(event: TEvent, handlerId: string): boolean {
    return this.bus.off(event as string, handlerId);
  }

  offAll(event?: keyof TEvents): void {
    this.bus.offAll(event as string);
  }

  // ==================== 中间件方法 ====================

  use(middleware: Middleware): void {
    this.bus.use(middleware);
  }

  useForEvent<TEvent extends keyof TEvents>(event: TEvent, middleware: Middleware<TEvents[TEvent]>): void {
    this.bus.useForEvent(event as string, middleware);
  }

  // ==================== 查询方法 ====================

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

  // ==================== 高级功能 ====================

  createScopedBus(scope: string): TypedScopedEventBus<TEvents> {
    return new TypedScopedEventBus(this.bus, scope);
  }

  waitFor<TEvent extends keyof TEvents>(
    event: TEvent,
    timeout?: number
  ): Promise<TEvents[TEvent]> {
    return this.bus.waitFor(event as string, timeout);
  }
}

/**
 * 类型安全的 ScopedEventBus
 */
export class TypedScopedEventBus<TEvents extends Record<string, any>> {
  constructor(
    private parent: EventBus,
    private scope: string
  ) {}

  private scopedEvent(event: string): string {
    return `${this.scope}.${event}`;
  }

  // ==================== 订阅方法 ====================

  on<TEvent extends keyof TEvents>(
    event: TEvent,
    handler: EventHandler<TEvents[TEvent]>,
    handlerId?: string
  ): Subscription {
    return this.parent.on(this.scopedEvent(event as string), handler, handlerId);
  }

  onAsync<TEvent extends keyof TEvents>(
    event: TEvent,
    handler: AsyncEventHandler<TEvents[TEvent]>,
    handlerId?: string
  ): Subscription {
    return this.parent.onAsync(this.scopedEvent(event as string), handler, handlerId);
  }

  once<TEvent extends keyof TEvents>(
    event: TEvent,
    handler: EventHandler<TEvents[TEvent]>
  ): Subscription {
    return this.parent.once(this.scopedEvent(event as string), handler);
  }

  onceAsync<TEvent extends keyof TEvents>(
    event: TEvent,
    handler: AsyncEventHandler<TEvents[TEvent]>
  ): Subscription {
    return this.parent.onceAsync(this.scopedEvent(event as string), handler);
  }

  // ==================== 发布方法 ====================

  async emit<TEvent extends keyof TEvents>(
    event: TEvent,
    data: TEvents[TEvent],
    metadata?: Partial<EventMetadata>
  ): Promise<void> {
    return this.parent.emit(this.scopedEvent(event as string), data, {
      ...metadata,
      scope: this.scope,
    });
  }

  // ==================== 取消订阅方法 ====================

  off<TEvent extends keyof TEvents>(event: TEvent, handlerId: string): boolean {
    return this.parent.off(this.scopedEvent(event as string), handlerId);
  }

  offAll(event?: keyof TEvents): void {
    if (event === undefined) {
      const prefix = `${this.scope}.`;
      const allEvents = this.parent.eventNames();
      for (const e of allEvents) {
        if (e.startsWith(prefix)) {
          this.parent.offAll(e);
        }
      }
    } else {
      this.parent.offAll(this.scopedEvent(event as string));
    }
  }

  // ==================== 中间件方法 ====================

  use(middleware: Middleware): void {
    this.parent.use(middleware);
  }

  useForEvent<TEvent extends keyof TEvents>(event: TEvent, middleware: Middleware<TEvents[TEvent]>): void {
    this.parent.useForEvent(this.scopedEvent(event as string), middleware);
  }

  // ==================== 查询方法 ====================

  listenerCount(event?: keyof TEvents): number {
    if (event === undefined) {
      const prefix = `${this.scope}.`;
      const allEvents = this.parent.eventNames();
      return allEvents
        .filter(e => e.startsWith(prefix))
        .reduce((total, e) => total + this.parent.listenerCount(e), 0);
    }
    return this.parent.listenerCount(this.scopedEvent(event as string));
  }

  eventNames(): string[] {
    const prefix = `${this.scope}.`;
    return this.parent.eventNames()
      .filter(e => e.startsWith(prefix))
      .map(e => e.substring(prefix.length));
  }

  getMetrics(event?: keyof TEvents): EventMetrics | Map<string, EventMetrics> {
    if (event === undefined) {
      const prefix = `${this.scope}.`;
      const allEvents = this.parent.eventNames();
      const result = new Map<string, EventMetrics>();
      for (const e of allEvents) {
        if (e.startsWith(prefix)) {
          const metrics = this.parent.getMetrics(e);
          if (metrics instanceof Map) {
            metrics.forEach((m, name) => result.set(name.substring(prefix.length), m));
          } else {
            result.set(e.substring(prefix.length), metrics);
          }
        }
      }
      return result;
    }
    return this.parent.getMetrics(this.scopedEvent(event as string));
  }

  resetMetrics(event?: keyof TEvents): void {
    if (event === undefined) {
      const prefix = `${this.scope}.`;
      const allEvents = this.parent.eventNames();
      for (const e of allEvents) {
        if (e.startsWith(prefix)) {
          this.parent.resetMetrics(e);
        }
      }
    } else {
      this.parent.resetMetrics(this.scopedEvent(event as string));
    }
  }

  // ==================== 高级功能 ====================

  waitFor<TEvent extends keyof TEvents>(
    event: TEvent,
    timeout?: number
  ): Promise<TEvents[TEvent]> {
    return this.parent.waitFor(this.scopedEvent(event as string), timeout);
  }
}
