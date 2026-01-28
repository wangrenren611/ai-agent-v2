/**
 * 统一类型导出
 * 集中管理所有项目核心类型定义
 */

// =============================================================================
// Provider 类型
// =============================================================================

export type {
  BaseProviderConfig,
  ToolSchema,
  StreamChunk,
  StreamCallback,
  LLMOptions,
  Message,
  ToolCall,
  LLMResponse,
} from '../providers/providers/base';

export type {
  EventHandler,
  AsyncEventHandler,
  EventMetadata,
  EventContext,
  Middleware,
  EventBusOptions,
  EventMetrics,
  Subscription,
  SessionEvents,
  AgentEvents,
} from '../util/event-bus/types';

// =============================================================================
// Tool 类型
// =============================================================================

export type {
  ToolResult,
  ToolContext,
} from '../tool/base';

export type {
  ToolContext as ToolRegistryContext,
  ToolRegistryConfig,
  ToolRegistryState,
} from '../tool/registry/types';

// =============================================================================
// Context 类型
// =============================================================================

export type {
  CacheConfig,
  SessionConfig,
  SecurityConfig,
  DangerousOperation,
  DangerousOperationDef,
  ConfirmationRequest,
} from '../context/agent-context';

// =============================================================================
// Agent 类型
// =============================================================================

export type {
  AgentConfig,
  AgentRunOptions,
  AgentResponse,
} from '../agent';

// =============================================================================
// CLI 类型 (TODO: 未实现)
// =============================================================================

// export type {
//   CLIConfig,
//   CommandContext,
// } from '../cli';

// =============================================================================
// 实用类型
// =============================================================================

/**
 * 提取 Promise 的返回类型
 */
export type PromiseReturnType<T extends Promise<any>> = T extends Promise<infer R> ? R : never;

/**
 * 提取函数的参数类型
 */
export type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;

/**
 * 提取函数的返回类型
 */
export type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;

/**
 * 深度只读
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};

/**
 * 深度 Partial
 */
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};
