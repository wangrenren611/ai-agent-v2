/**
 * Provider Configuration System
 *
 * Defines types and interfaces for all LLM providers.
 * Uses discriminated unions for type-safe provider-specific configs.
 */

/**
 * Supported LLM providers
 */
export enum ProviderType {
  OPENAI = 'openai',
  KIMI = 'kimi',
  DEEPSEEK = 'deepseek',
  GLM = 'glm',
  MINIMAX = 'minimax',
  QWEN = 'qwen',
}

/**
 * Base provider configuration - common fields for all providers
 */
export interface BaseProviderConfig {
  /** API key or credentials */
  apiKey: string;
  /** Base URL for API (overrides default) */
  baseURL?: string;
  /** Model name (overrides default) */
  model?: string;
  /** Maximum input tokens (context window) */
  maxTokens?: number;
  /** Maximum output tokens to generate */
  maxOutputTokens?: number;
  /** Temperature for sampling (0-2) */
  temperature?: number;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum number of retries for transient errors */
  maxRetries?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * OpenAI-specific configuration
 */
export interface OpenAIConfig extends BaseProviderConfig {
  type: ProviderType.OPENAI;
  /** OpenAI organization ID */
  organization?: string;
}

/**
 * Kimi (Moonshot AI) configuration
 */
export interface KimiConfig extends BaseProviderConfig {
  type: ProviderType.KIMI;
}

/**
 * DeepSeek configuration
 */
export interface DeepSeekConfig extends BaseProviderConfig {
  type: ProviderType.DEEPSEEK;
}

/**
 * GLM (Zhipu AI) configuration
 */
export interface GLMConfig extends BaseProviderConfig {
  type: ProviderType.GLM;
}

/**
 * MiniMax configuration
 */
export interface MiniMaxConfig extends BaseProviderConfig {
  type: ProviderType.MINIMAX;
  /** MiniMax Group ID (required for authentication) */
  groupId?: string;
}

/**
 * Qwen (Alibaba) configuration
 */
export interface QwenConfig extends BaseProviderConfig {
  type: ProviderType.QWEN;
}

/**
 * Union type for all provider configurations
 * Use discriminated union with `type` field for type narrowing
 */
export type ProviderConfig =
  | OpenAIConfig
  | KimiConfig
  | DeepSeekConfig
  | GLMConfig
  | MiniMaxConfig
  | QwenConfig;

/**
 * Provider metadata - static information about each provider
 */
export interface ProviderMetadata {
  /** Provider type identifier */
  type: ProviderType;
  /** Human-readable name */
  name: string;
  /** Default base URL for API */
  baseURL: string;
  /** Default model name */
  defaultModel: string;
  /** Maximum context window size */
  maxTokens: number;
  /** Maximum output tokens */
  maxOutputTokens: number;
  /** Supports streaming responses */
  supportsStreaming: boolean;
  /** Supports function calling/tools */
  supportsTools: boolean;
  /** Default timeout in milliseconds */
  defaultTimeout: number;
  /** Default max retries */
  defaultMaxRetries: number;
}

/**
 * Metadata for each provider
 */
export const PROVIDER_METADATA: Record<ProviderType, ProviderMetadata> = {
  [ProviderType.OPENAI]: {
    type: ProviderType.OPENAI,
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    maxTokens: 128000,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsTools: true,
    defaultTimeout: 60000,
    defaultMaxRetries: 3,
  },
  [ProviderType.KIMI]: {
    type: ProviderType.KIMI,
    name: 'Kimi (Moonshot AI)',
    baseURL: 'https://api.moonshot.cn/v1',
    defaultModel: 'kimi-k2.5',
    maxTokens: 256000,
    maxOutputTokens: 8000,
    supportsStreaming: true,
    supportsTools: true,
    defaultTimeout: 60000,
    defaultMaxRetries: 3,
  },
  [ProviderType.DEEPSEEK]: {
    type: ProviderType.DEEPSEEK,
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    maxTokens: 128000,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsTools: true,
    defaultTimeout: 60000,
    defaultMaxRetries: 3,
  },
  [ProviderType.GLM]: {
    type: ProviderType.GLM,
    name: 'GLM (Zhipu AI)',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-plus',
    maxTokens: 128000,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsTools: true,
    defaultTimeout: 60000,
    defaultMaxRetries: 3,
  },
  [ProviderType.MINIMAX]: {
    type: ProviderType.MINIMAX,
    name: 'MiniMax',
    baseURL: 'https://api.minimax.chat/v1',
    defaultModel: 'abab6.5s-chat',
    maxTokens: 24576,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsTools: true,
    defaultTimeout: 60000,
    defaultMaxRetries: 3,
  },
  [ProviderType.QWEN]: {
    type: ProviderType.QWEN,
    name: 'Qwen (Alibaba)',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    maxTokens: 128000,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsTools: true,
    defaultTimeout: 60000,
    defaultMaxRetries: 3,
  },
};

/**
 * Get provider metadata by type
 */
export function getProviderMetadata(type: ProviderType): ProviderMetadata {
  return PROVIDER_METADATA[type];
}

/**
 * Get all available provider types
 */
export function getProviderTypes(): ProviderType[] {
  return Object.values(ProviderType);
}
