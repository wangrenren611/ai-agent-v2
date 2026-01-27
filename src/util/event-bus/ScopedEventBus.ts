/**
 * ScopedEventBus - 作用域事件总线
 * 支持事件隔离和命名空间
 *
 * 使用场景：
 * - 多租户应用中隔离不同租户的事件
 * - 模块化应用中隔离不同模块的事件
 * - 测试环境中创建独立的测试环境
 */

import type { EventHandler, AsyncEventHandler, Subscription, EventMetadata } from './types.js';
import { EventBus } from './EventBus.js';

/**
 * 作用域事件总线
 * 所有事件自动添加作用域前缀，实现事件隔离
 */
export class ScopedEventBus {
  constructor(
    private parent: EventBus,
    private scope: string
  ) {}

  // ==================== 订阅方法 ====================

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

  // ==================== 发布方法 ====================

  async emit<T = any>(event: string, data: T, metadata: Partial<EventMetadata> = {}): Promise<void> {
    return this.parent.emit(this.scopedEvent(event), data, {
      ...metadata,
      scope: this.scope,
    });
  }

  // ==================== 取消订阅方法 ====================

  off(event: string, handlerId: string): boolean {
    return this.parent.off(this.scopedEvent(event), handlerId);
  }

  offAll(): void {
    const prefix = `${this.scope}.`;
    const events = this.parent.eventNames();
    for (const event of events) {
      if (event.startsWith(prefix)) {
        this.parent.offAll(event);
      }
    }
  }

  // ==================== 查询方法 ====================

  listenerCount(event?: string): number {
    if (event === undefined) {
      const prefix = `${this.scope}.`;
      const events = this.parent.eventNames();
      return events
        .filter(e => e.startsWith(prefix))
        .reduce((total, e) => total + this.parent.listenerCount(e), 0);
    }
    return this.parent.listenerCount(this.scopedEvent(event));
  }

  // ==================== 私有方法 ====================

  private scopedEvent(event: string): string {
    return `${this.scope}.${event}`;
  }
}
