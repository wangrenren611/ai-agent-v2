/**
 * EventBus - 类型安全的事件总线工具类
 *
 * ## 特性
 * - 强类型事件定义（通过泛型）
 * - 同步/异步事件处理
 * - 中间件支持（日志、错误处理、验证、超时、重试）
 * - 事件作用域隔离
 * - 性能指标监控
 *
 * ## 架构
 * - EventBus: 核心事件总线
 * - TypedEventBus: 类型安全的事件总线
 * - ScopedEventBus: 作用域隔离的事件总线
 * - TypedScopedEventBus: 类型安全的作用域事件总线
 *
 * ## 使用示例
 * ```typescript
 * // 基本使用
 * const bus = new EventBus();
 * bus.on('user.login', (data) => console.log('User logged in:', data));
 * await bus.emit('user.login', { userId: '123' });
 *
 * // 类型安全
 * interface MyEvents {
 *   'user.login': { userId: string };
 *   'user.logout': { userId: string };
 * }
 * const typedBus = new TypedEventBus<MyEvents>();
 * typedBus.on('user.login', (data) => {
 *   // data 类型自动推断为 { userId: string }
 * });
 *
 * // 作用域隔离
 * const scopedBus = bus.createScopedBus('session-123');
 * scopedBus.on('event', handler); // 实际事件名为 'session-123.event'
 * ```
 */

export * from './types.js';
export * from './EventBus.js';
export * from './ScopedEventBus.js';
export * from './TypedEventBus.js';
export * from './middleware.js';

// =============================================================================
// 默认单例实例
// =============================================================================

import { EventBus } from './EventBus.js';
import { TypedEventBus } from './TypedEventBus.js';
import type { SessionEvents, AgentEvents } from './types.js';

/**
 * 默认事件总线单例
 * 适用于简单的全局事件场景
 */
export const eventBus = new EventBus({
  maxListeners: 100,
  enableAsync: true,
  defaultTimeout: 10000,
  enableMetrics: true,
});

/**
 * 类型安全的事件总线单例
 * 预定义了 SessionEvents 和 AgentEvents
 */
export const typedEventBus = new TypedEventBus<SessionEvents & AgentEvents>();
