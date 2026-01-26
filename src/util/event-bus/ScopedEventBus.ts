/**
 * ScopedEventBus - 作用域事件总线
 * 支持事件隔离和命名空间
 */

import type { EventHandler, AsyncEventHandler, Subscription, EventMetadata } from './types';
import { EventBus } from './EventBus';

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

  listenerCount(event?: string): number {
    if (event === undefined) {
      const prefix = `${this.scope}.`;
      const events = this.parent.eventNames();
      let total = 0;
      for (const e of events) {
        if (e.startsWith(prefix)) {
          total += this.parent.listenerCount(e);
        }
      }
      return total;
    }
    return this.parent.listenerCount(this.scopedEvent(event));
  }

  private scopedEvent(event: string): string {
    return `${this.scope}.${event}`;
  }
}
