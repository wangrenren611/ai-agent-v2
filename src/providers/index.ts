/**
 * Providers Module
 *
 * Unified export for all provider-related functionality.
 * Auto-registers all providers on import.
 */

// Base class (value) + Base types
export { LLMProvider } from './base.js';
export type {
  BaseProviderConfig as ProviderConfig,
  Message,
  LLMResponse,
  LLMOptions,
  StreamChunk,
  StreamCallback,
  ToolSchema,
} from './base.js';

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
} from './errors.js';

// Configuration types
export {
  ProviderType,
  PROVIDER_METADATA,
  getProviderMetadata,
  getProviderTypes,
} from './config.js';
export type {
  BaseProviderConfig,
  OpenAIConfig,
  KimiConfig,
  DeepSeekConfig,
  GLMConfig,
  MiniMaxConfig,
  QwenConfig,
  ProviderConfig as FullProviderConfig,
  ProviderMetadata,
} from './config.js';

// Provider Registry
export {
  ProviderRegistry,
} from './registry.js';

// Adapters
export {
  BaseAPIAdapter,
  OpenAIAdapter,
  MiniMaxAdapter,
} from './adapters/index.js';
export type {
  APIRequestBody,
  APIResponse,
  OpenAIAdapterOptions,
  MiniMaxAdapterOptions,
} from './adapters/index.js';

// Utilities
export {
  HTTPClient,
  StreamParser,
} from './utils/index.js';
export type {
  HttpClientOptions,
  StreamCallbacks,
} from './utils/index.js';

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
} from './providers/index.js';

// Auto-register all providers
import { ProviderRegistry } from './registry.js';
import { ProviderType } from './config.js';
import { OpenAIProvider } from './providers/openai.provider.js';
import { KimiProvider } from './providers/kimi.provider.js';
import { DeepSeekProvider } from './providers/deepseek.provider.js';
import { GLMProvider } from './providers/glm.provider.js';
import { MiniMaxProvider } from './providers/minimax.provider.js';
import { QwenProvider } from './providers/qwen.provider.js';

// Register all providers with the registry
ProviderRegistry.register(ProviderType.OPENAI, OpenAIProvider as any);
ProviderRegistry.register(ProviderType.KIMI, KimiProvider as any);
ProviderRegistry.register(ProviderType.DEEPSEEK, DeepSeekProvider as any);
ProviderRegistry.register(ProviderType.GLM, GLMProvider as any);
ProviderRegistry.register(ProviderType.MINIMAX, MiniMaxProvider as any);
ProviderRegistry.register(ProviderType.QWEN, QwenProvider as any);
