/**
 * Agent 类型定义
 * 统一管理 Agent 相关的所有类型
 */

import type { ToolSchema, Message, StreamChunk, LLMProvider } from '../providers/base';
import type { ToolResult } from '../tool/base';
import type { AgentContext } from '../context';

// =============================================================================
// Agent 配置
// =============================================================================

/**
 * Agent 配置接口
 */
export interface AgentConfig {
  /** LLM Provider */
  llmProvider: LLMProvider;
  /** 系统提示词 */
  systemPrompt: string;
  /** 默认工具列表（可选），不传则使用 ToolRegistry 中所有工具 */
  defaultTools?: ToolSchema[];
  /** 最大循环次数，0 或 null 表示无限制，默认 1024 */
  maxLoop?: number | null;
  /** 最大 token 数，默认 8000 */
  maxTokens?: number;
  /** 最大输出 token 数，默认 8000 */
  maxOutputTokens?: number;
  /** 工具并发上限，默认 1 */
  toolConcurrency?: number;
  /** 单次工具调用超时（毫秒），默认 300000 (5分钟) */
  toolTimeoutMs?: number;
  /** 连续错误次数上限，默认 2 */
  noProgressLimit?: number;
  /** 会话 ID */
  sessionId?: string;
}

/**
 * Agent 运行选项
 */
export interface AgentRunOptions {
  /** 静默模式 */
  silent?: boolean;
  /** 自定义工具列表 */
  tools?: ToolSchema[];
  /** 启用流式响应 */
  stream?: boolean;
  /** 流式回调函数 */
  streamCallback?: (chunk: StreamChunk) => void;
  /** Abort signal for cancelling the request */
  abortSignal?: AbortSignal;
}

/**
 * Agent 响应
 */
export interface AgentResponse {
  content: string;
  role: Message['role'];
  type?: Message['type'];
}

// =============================================================================
// Agent 内部类型
// =============================================================================

/**
 * 工具调用结果
 */
export interface ToolCallResult {
  /** 是否有工具调用 */
  hasToolCalls: boolean;
  /** 是否有错误 */
  hasError: boolean;
}

/**
 * Agent 状态
 */
export enum AgentState {
  Idle = 'idle',
  Thinking = 'thinking',
  ExecutingTools = 'executing_tools',
  Error = 'error',
  Stopped = 'stopped',
}

/**
 * Agent 事件
 */
export interface AgentEvents {
  'agent:start': { sessionId: string };
  'agent:end': { sessionId: string; duration: number };
  'agent:error': { sessionId: string; error: Error };
  'agent:tool:start': { toolName: string; args: Record<string, unknown> };
  'agent:tool:end': { toolName: string; result: ToolResult; duration: number };
  'agent:llm:start': { sessionId: string; messageCount: number };
  'agent:llm:end': { sessionId: string; response: any; duration: number };
  'agent:compaction:start': { sessionId: string; tokenCount: number };
  'agent:compaction:end': { sessionId: string; compressedCount: number };
}
