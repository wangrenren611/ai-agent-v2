/**
 * Session Domain Types
 *
 * 会话领域类型定义 - 提供类型安全的会话接口
 */

import type { Message } from '../../../agent/message';

// ============================================================================
// Immutable Session View
// ============================================================================

/**
 * 只读会话接口 - 提供给命令系统的不可变视图
 */
export interface IReadOnlySession {
  readonly sessionId: string;
  readonly userId: string;
  readonly model: string;
  readonly memoryEnabled: boolean;
  readonly messages: readonly Message[];
}

// ============================================================================
// Mutable Session Operations
// ============================================================================

/**
 * 会话管理器接口 - 提供会话操作方法
 */
export interface ISessionManager {
  /**
   * 当前会话的只读视图
   */
  readonly current: IReadOnlySession;

  /**
   * 切换到指定会话
   */
  switchSession(sessionId: string): Promise<void>;

  /**
   * 创建新会话
   */
  createSession(sessionId?: string): Promise<void>;

  /**
   * 更新模型
   */
  updateModel(model: string): void;

  /**
   * 更新内存开关
   */
  updateMemory(enabled: boolean): void;

  /**
   * 清除消息
   */
  clearMessages(): void;
}

// ============================================================================
// Session State
// ============================================================================

/**
 * 会话状态
 */
export interface SessionState {
  sessionId: string;
  userId: string;
  model: string;
  memoryEnabled: boolean;
}

// ============================================================================
// Session Events
// ============================================================================

/**
 * 会话事件类型
 */
export type SessionEvent =
  | { type: 'session-switched'; sessionId: string }
  | { type: 'session-created'; sessionId: string }
  | { type: 'model-changed'; model: string }
  | { type: 'memory-toggled'; enabled: boolean }
  | { type: 'messages-cleared' };
