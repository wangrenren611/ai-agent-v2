/**
 * EventBus - 类型安全的事件总线工具类
 * 支持强类型事件定义、异步事件处理、中间件、作用域和性能监控
 */

export * from './types';
export * from './EventBus';
export * from './ScopedEventBus';
export * from './TypedEventBus';
export * from './middleware';

// =============================================================================
// 默认单例实例
// =============================================================================

import { EventBus } from './EventBus';
import { TypedEventBus } from './TypedEventBus';
import type { SessionEvents, AgentEvents } from './types';

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
