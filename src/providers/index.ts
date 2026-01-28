/**
 * Providers Module
 *
 * Unified export for all provider-related functionality.
 * Auto-registers all providers on import.
 */

// Base class (value) + Base types
export { LLMProvider } from './base';
export type {
  Message,
  LLMResponse,
  LLMOptions,
  StreamChunk,
  StreamCallback,
  ToolSchema,
} from './base';

// Error types
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
} from './errors';

// Configuration types
export {
  ProviderType,
  PROVIDER_METADATA,
  getProviderMetadata,
  getProviderTypes,
} from './config';
export type {
  BaseProviderConfig,
  OpenAIConfig,
  KimiConfig,
  DeepSeekConfig,
  GLMConfig,
  MiniMaxConfig,
  QwenConfig,
  ProviderConfig,
  ProviderMetadata,
} from './config';

// Provider Registry
export {
  ProviderRegistry,
} from './registry';

// Adapters
export {
  BaseAPIAdapter,
  OpenAIAdapter,
  MiniMaxAdapter,
} from './adapters';
export type {
  APIRequestBody,
  APIResponse,
  OpenAIAdapterOptions,
  MiniMaxAdapterOptions,
} from './adapters';

// Utilities
export {
  HTTPClient,
  StreamParser,
} from './utils';
export type {
  HttpClientOptions,
  StreamCallbacks,
} from './utils';

// Provider implementations
export {
  OpenAIProvider,
  KimiProvider,
  DeepSeekProvider,
  GLMProvider,
  MiniMaxProvider,
  QwenProvider,
  OPENAI_METADATA,
  KIMI_METADATA,
  DEEPSEEK_METADATA,
  GLM_METADATA,
  MINIMAX_METADATA,
  QWEN_METADATA,
} from './providers';

// Auto-register all providers
import { ProviderRegistry } from './registry';
import { ProviderType } from './config';
import { OpenAIProvider } from './providers/openai.provider';
import { KimiProvider } from './providers/kimi.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { GLMProvider } from './providers/glm.provider';
import { MiniMaxProvider } from './providers/minimax.provider';
import { QwenProvider } from './providers/qwen.provider';

// Register all providers with registry
ProviderRegistry.register(ProviderType.OPENAI, OpenAIProvider as any);
ProviderRegistry.register(ProviderType.KIMI, KimiProvider as any);
ProviderRegistry.register(ProviderType.DEEPSEEK, DeepSeekProvider as any);
ProviderRegistry.register(ProviderType.GLM, GLMProvider as any);
ProviderRegistry.register(ProviderType.MINIMAX, MiniMaxProvider as any);
ProviderRegistry.register(ProviderType.QWEN, QwenProvider as any);
