/**
 * Agent 类型定义和常量
 */

import { LLMProvider } from "../providers/providers/base";
import { Message } from "./message";

// =============================================================================
// 常量定义
// =============================================================================

export const DEFAULT_MAX_LOOP = 1024;
export const DEFAULT_NO_PROGRESS_LIMIT = 10;
export const DEFAULT_MAX_OUTPUT_TOKENS = 8000;
export const DEFAULT_MAX_TOKENS = 16000;
export const MAX_NETWORK_RETRIES = 10;
export const VALID_FINISH_REASONS = ['stop', 'eos', undefined] as const;

/** Temperature 默认值 */
export const DEFAULT_TEMPERATURE = 0.1;           // LLM Provider 默认值
export const CHAT_TEMPERATURE = 0.7;              // 对话场景推荐值
export const COMPACT_SUMMARY_TEMPERATURE = 0.3;   // 摘要生成（稳定性）
export const CLI_TEMPERATURE = 1;                 // CLI 交互模式

// =============================================================================
// 类型定义
// =============================================================================

/** 流式输出块 */
export type StreamChunk = {
    messageId: string;
    content?: string;
    tool_calls?: Array<{
        index: number;
        delta: {
            type?: 'function';
            function?: {
                name?: string;
                arguments?: string;
            };
        };
    }>;
    finish_reason?: string;
}

/** 工具结果 */
export interface ToolResult {
    success: boolean;
    data?: unknown;
    metadata?: Record<string, unknown>;
    error?: string;
}

/** 工具调用 */
export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

/** LLM 响应 */
export interface LLMResponse {
    content: string;
    role: 'assistant';
    type?: 'text' | 'tool' | 'tool_call' | 'summary';
    tool_calls?: ToolCall[];
    finishReason?: string;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}



/** 工具 Schema */
export interface ToolSchema {
    type: 'function';
    function: {
        name: string;
        description: string;
        strict?: boolean;
        parameters: Record<string, unknown>;
    };
}

// =============================================================================
// Agent 事件类型
// =============================================================================

/** Agent 事件类型定义 */
export interface AgentEvents {
    /** 流式输出块事件 */
    'stream-chunk': StreamChunk;
    /** 工具调用开始事件 */
    'tool-call': { messageId: string; toolName: string; args: unknown };
    /** 工具调用完成事件 */
    'tool-result': { messageId: string; toolName: string; result: ToolResult; duration: number };
    /** 错误事件 */
    'error': { error: Error; phase: string };
    /** 会话消息事件 */
    'message': { message: Message };
    /** 日志事件（静默模式下使用） */
    'log': { level: 'info' | 'warn' | 'error'; message: string };
    /** 开始思考事件 */
    'thinking': { step: number };
    /** 思考结束事件 */
    'thinking-end': { step: number; hasToolCalls: boolean };
    /** 工具调用组开始事件 */
    'tool-calls-start': {  count: number };
    /** 工具调用组结束事件 */
    'tool-calls-end': {  count: number; hasErrors: boolean; summary: string };
    /** 任务完成事件 */
    'complete': {  response: AgentResponse };
    /** 任务取消事件 */
    'cancelled': { reason: string };
    "token-usage": {
        usedTokens: number;
        totalTokens: number;
    }
}

// =============================================================================
// Agent 配置和选项
// =============================================================================

/** Agent 配置 */
export interface AgentConfig {
    /** LLM 提供者 */
    llmProvider: LLMProvider;
    /** 系统提示词 */
    systemPrompt: string;
    /** 默认工具列表 */
    tools?: ToolSchema[];
    /** 最大循环次数，0 或 null 表示无限制 */
    maxLoop?: number | null;
    /** 最大 token 数 */
    maxTokens?: number;
    /** 最大输出 token 数 */
    maxOutputTokens?: number;
    /** 连续错误次数上限 */
    noProgressLimit?: number;
    /** 会话 ID */
    sessionId?: string;
    /** 默认模型名称 */
    model?: string;
    /** 默认温度，Agent 层统一控制 */
    temperature: number;
    /** 榛樿娓╁害锛岀敤鎴峰彲閫氳繃 Agent 閰嶇疆缁欏畾 */

}

/** Agent 运行选项 */
export interface AgentRunOptions {
    /** 模型名称 */
    model?: string;
    /** 静默模式（通过事件输出） */
    silent?: boolean;
    /** 覆盖默认工具 */
    tools?: ToolSchema[];
    /** 启用流式响应 */
    stream?: boolean;
    /** 流式回调函数 */
    streamCallback?: (chunk: StreamChunk) => void;
    /** 取消信号 */
    abortSignal?: AbortSignal;
    /** 温度 */
    temperature?: number;
    /** 最大输入 tokens */
    maxTokens?: number;
    /** 最大输出 tokens */
    maxOutputTokens?: number;
    /** 思考配置 */
}

/** Agent 响应 */
export interface AgentResponse {
    content: string;
    role: Message['role'];
    type?: Message['type'];
}
