/**
 * TypedEventBus - 类型安全的事件总线
 * 支持强类型事件定义
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

  /**
   * 创建类型安全的作用域事件总线
   * 修复：添加缺失的 createScopedBus 方法
   */
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

  off<TEvent extends keyof TEvents>(event: TEvent, handlerId: string): boolean {
    return this.parent.off(this.scopedEvent(event as string), handlerId);
  }

  offAll(event?: keyof TEvents): void {
    if (event === undefined) {
      // 清除当前作用域的所有事件
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

  use(middleware: Middleware): void {
    this.parent.use(middleware);
  }

  useForEvent<TEvent extends keyof TEvents>(event: TEvent, middleware: Middleware<TEvents[TEvent]>): void {
    this.parent.useForEvent(this.scopedEvent(event as string), middleware);
  }

  listenerCount(event?: keyof TEvents): number {
    if (event === undefined) {
      const prefix = `${this.scope}.`;
      const allEvents = this.parent.eventNames();
      let total = 0;
      for (const e of allEvents) {
        if (e.startsWith(prefix)) {
          total += this.parent.listenerCount(e);
        }
      }
      return total;
    }
    return this.parent.listenerCount(this.scopedEvent(event as string));
  }

  eventNames(): string[] {
    const prefix = `${this.scope}.`;
    const allEvents = this.parent.eventNames();
    return allEvents.filter(e => e.startsWith(prefix)).map(e => e.substring(prefix.length));
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

  waitFor<TEvent extends keyof TEvents>(
    event: TEvent,
    timeout?: number
  ): Promise<TEvents[TEvent]> {
    return this.parent.waitFor(this.scopedEvent(event as string), timeout);
  }

  private scopedEvent(event: string): string {
    return `${this.scope}.${event}`;
  }
}
