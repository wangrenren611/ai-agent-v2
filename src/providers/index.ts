/**
 * Providers 模块
 * 
 * 统一的 LLM Provider 管理模块
 */

// =============================================================================
// 核心类型
// =============================================================================

export type {
  BaseProviderConfig,
  Message,
  MessageRole,
  MessageContent,
  MessageContentPart,
  ToolCall,
  ToolSchema,
  LLMOptions,
  LLMResponse,
  StreamChunk,
  StreamCallback,
  StreamCallbacks,
  HttpClientOptions,
  RequestInitWithOptions,
  ProviderMetadata,
  // 新类型
  ModelConfig,
  ModelId,
} from './types';

export { ProviderType } from './types';

// =============================================================================
// Provider 基类
// =============================================================================

export { LLMProvider } from './provider';

// =============================================================================
// Provider 实现
// =============================================================================

export { OpenAICompatibleProvider } from './openai-compatible';
export type { OpenAICompatibleConfig } from './openai-compatible';

// =============================================================================
// Provider 注册表
// =============================================================================

export { ProviderRegistry, MODEL_CONFIGS, Models } from './registry';
// 向后兼容
export { MODEL_CONFIGS as PROVIDER_METADATA } from './registry';

// =============================================================================
// HTTP 客户端
// =============================================================================

export { HTTPClient } from './http/client';
export { StreamParser } from './http/stream-parser';

// =============================================================================
// 适配器
// =============================================================================

export { BaseAPIAdapter, type TransformOptions } from './adapters/base';
export { StandardAdapter } from './adapters/standard';
export { OpenAIAdapter } from './adapters/openai';
export { MiniMaxAdapter } from './adapters/minimax';
export { GLMAdapter } from './adapters/glm';

// =============================================================================
// 错误处理
// =============================================================================

export {
  LLMError,
  LLMRetryableError,
  LLMRateLimitError,
  LLMPermanentError,
  LLMAuthError,
  LLMNotFoundError,
  LLMBadRequestError,
  LLMAbortedError,
  createErrorFromStatus,
  isRetryableError,
  isPermanentError,
  isAbortedError,
} from './utils/errors';
