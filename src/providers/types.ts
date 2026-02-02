/**
 * Providers 模块统一类型定义
 * 
 * 集中管理所有与 LLM Provider 相关的类型定义
 */

// =============================================================================
// 基础类型
// =============================================================================

export interface BaseProviderConfig {
  /** API key or credentials */
  apiKey: string;
  /** Base URL for API */
  baseURL: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum number of retries */
  maxRetries?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** 温度 */
  temperature: number;
  /** 模型 */
  model: string;
  /** 最大 token 数 */
  maxTokens: number;
  maxOutputTokens: number;
  /** Additional options */
  [key: string]: unknown;
}

// =============================================================================
// 消息和工具类型
// =============================================================================

export type MessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export type MessageContent = string | MessageContentPart[];

export type MessageRole = 'user' | 'system' | 'assistant' | 'tool';

export interface Message {
  role: MessageRole;
  content: MessageContent;
  type?: 'text' | 'tool' | 'tool_call' | 'summary' | 'tool-call' | 'tool-result';
  /** 思维链/推理内容 */
  reasoning_content?: string;
  /** Tool call ID */
  tool_call_id?: string;
  /** Tool calls */
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

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
// LLM 选项和响应
// =============================================================================

export interface LLMOptions {
  maxOutputTokens?: number;
  maxTokens?: number;
  temperature?: number;
  system_prompt?: string;
  tools?: ToolSchema[];
  /** Enable streaming response */
  stream?: boolean;
  /** Callback for receiving streaming chunks */
  streamCallback?: StreamCallback;
  /** Abort signal */
  abortSignal?: AbortSignal;
}

export interface LLMResponse {
  content: string;
  role: 'assistant';
  type?: 'text' | 'tool' | 'tool_call';
  tool_calls?: ToolCall[];
  finishReason?: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// =============================================================================
// 流式处理类型
// =============================================================================

export interface StreamChunk {
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

export type StreamCallback = (chunk: StreamChunk) => void;

export interface StreamCallbacks {
  onContent: (content: string) => void;
  onToolCall: (toolCall: {
    index: number;
    id?: string;
    type?: string;
    function: {
      name?: string;
      arguments?: string;
    };
  }) => void;
  onFinish: (reason: string | undefined) => void;
}

// =============================================================================
// Provider 类型和元数据（模型级别配置）
// =============================================================================

export type ProviderType = 'kimi' | 'deepseek' | 'glm' | 'minimax' | 'openai';

/** 模型唯一标识 */
export type ModelId = 
  // GLM 系列
  | 'glm-4.7' 
  | 'glm-4.6' 
  | 'glm-4-flash'
  // MiniMax 系列  
  | 'minimax-2.1'
  | 'minimax-2'
  // Kimi 系列
  | 'kimi-k2.5'
  // DeepSeek 系列
  | 'deepseek-chat'
  // OpenAI 系列
  | 'gpt-4o'
  | 'gpt-4o-mini';

/** 模型配置 */
export interface ModelConfig {
  /** 模型唯一标识 */
  id: ModelId;
  /** 所属厂商 */
  provider: ProviderType;
  /** 显示名称 */
  name: string;
  /** API 端点路径 */
  endpointPath: string;
  /** API Key 环境变量名 */
  envApiKey: string;
  /** Base URL 环境变量名 */
  envBaseURL: string;
  /** API 基础 URL */
  baseURL: string;
  /** API 模型名称 */
  model: string;
  /** 最大上下文 token 数 */
  maxTokens: number;
  /** 最大输出 token 数 */
  maxOutputTokens: number;
  /** 支持的特性 */
  features: string[];
}

/** @deprecated 使用 ModelConfig 替代 */
export interface ProviderMetadata {
  type: ProviderType;
  name: string;
  model: string;
  baseURL: string;
  endpointPath: string;
  envApiKey: string;
  envBaseURL: string;
  maxTokens: number;
  outputMaxTokens: number;
  features: string[];
}

// =============================================================================
// 适配器类型
// =============================================================================

export interface APIRequestBody {
  model: string;
  messages: Array<{
    role: string;
    content?: unknown;
    tool_call_id?: string;
    tool_calls?: Array<{
      id: string;
      type: string;
      function: {
        name: string;
        arguments: string;
      };
    }>;
  }>;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: Array<{
    type: string;
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>;
  [key: string]: unknown;
}

export interface APIResponse {
  content: string | unknown;
  reasoning_content?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  finish_reason?: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// =============================================================================
// HTTP 客户端类型
// =============================================================================

export interface HttpClientOptions {
  timeout?: number;
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  debug?: boolean;
}

export interface RequestInitWithOptions extends RequestInit {
  timeout?: number;
  maxRetries?: number;
}
