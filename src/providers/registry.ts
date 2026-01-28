/**
 * Provider Registry
 *
 * Central registry and factory for creating LLM providers.
 * Supports auto-detection from environment variables (like Claude Code).
 *
 * ## Universal API Key Support
 *
 * - `ANTHROPIC_API_KEY`: Universal key (similar to Claude Code's approach)
 * - `GLM_API_KEY`: GLM (Zhipu AI) specific key
 * - `KIMI_API_KEY`: Kimi (Moonshot AI) specific key
 * - `DEEPSEEK_API_KEY`: DeepSeek specific key
 * - `OPENAI_API_KEY`: OpenAI specific key
 * - `MINIMAX_API_KEY`: MiniMax specific key
 * - `QWEN_API_KEY`: Qwen (Alibaba) specific key
 *
 * ## Priority Order
 *
 * 1. `ANTHROPIC_API_KEY` (universal API key)
 * 2. Provider-specific API keys (GLM_API_KEY, KIMI_API_KEY, etc.)
 * 3. AI_MODEL environment variable
 */

import { LLMProvider } from './base';
import {
  ProviderType,
  ProviderConfig,
  BaseProviderConfig,
  getProviderMetadata,
  MiniMaxConfig,
} from './config';

/**
 * Provider constructor with metadata
 */
interface ProviderConstructor {
  new (config: BaseProviderConfig): LLMProvider;
}

/**
 * Registry entry
 */
interface RegistryEntry {
  Constructor: ProviderConstructor;
  configType: ProviderType;
}

/**
 * Priority order for provider auto-detection
 */
const PROVIDER_PRIORITY: ProviderType[] = [
  ProviderType.DEEPSEEK,
  ProviderType.KIMI,
  ProviderType.GLM,
  ProviderType.MINIMAX,
  ProviderType.QWEN,
  ProviderType.OPENAI,
];

/**
 * Provider Registry
 *
 * Manages provider registration and creation.
 * Implements factory pattern for dynamic provider instantiation.
 */
export class ProviderRegistry {
  private static readonly registry = new Map<ProviderType, RegistryEntry>();

  // ==========================================================================
  // Registration Methods
  // ==========================================================================

  /**
   * Register a provider constructor
   */
  static register(
    type: ProviderType,
    Constructor: ProviderConstructor
  ): void {
    this.registry.set(type, { Constructor, configType: type });
  }

  // ==========================================================================
  // Factory Methods
  // ==========================================================================

  /**
   * Create a provider from configuration object
   */
  static create(config: ProviderConfig): LLMProvider {
    const entry = this.registry.get(config.type);

    if (!entry) {
      throw new Error(`Unknown provider type: ${config.type}`);
    }

    const metadata = getProviderMetadata(config.type);

    // Build base config with defaults from metadata
    const baseConfig: BaseProviderConfig = {
      ...config,
      apiKey: config.apiKey,
      baseURL: config.baseURL || metadata.baseURL,
      model: config.model || metadata.defaultModel,
      maxTokens: config.maxTokens ?? metadata.maxTokens,
      maxOutputTokens: config.maxOutputTokens ?? metadata.maxOutputTokens,
      temperature: config.temperature,
      timeout: config.timeout ?? metadata.defaultTimeout,
      maxRetries: config.maxRetries ?? metadata.defaultMaxRetries,
      debug: config.debug,
    };

    return new entry.Constructor(baseConfig);
  }

  /**
   * Auto-detect and create provider from environment variables
   *
   * Detection order:
   * 1. `ANTHROPIC_API_KEY` (universal key, like Claude Code)
   * 2. Provider-specific keys (GLM_API_KEY, KIMI_API_KEY, etc.)
   * 3. AI_MODEL environment variable
   * 4. Explicit type parameter
   */
  static createFromEnv(type?: ProviderType): LLMProvider {
    // Priority 1: Check for universal ANTHROPIC_API_KEY
    const universalApiKey = process.env.ANTHROPIC_API_KEY;
    if (universalApiKey) {
      return this.createFromUniversalKey(universalApiKey);
    }

    // Priority 2: If type is explicitly provided, use it
    if (type) {
      return this.createFromEnvType(type);
    }

    // Priority 3: Check AI_MODEL environment variable
    const aiModel = process.env.AI_MODEL?.toLowerCase();
    if (aiModel) {
      const detectedType = this.detectTypeFromModel(aiModel);
      if (detectedType) {
        return this.createFromEnvType(detectedType);
      }
    }

    // Priority 4: Fall back to checking for provider-specific API keys
    for (const providerType of PROVIDER_PRIORITY) {
      const apiKey = this.getApiKeyForType(providerType);
      if (apiKey) {
        return this.buildProviderConfig(providerType, apiKey);
      }
    }

    // No provider credentials found
    throw new Error(this.getNoCredentialsError());
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Create provider using universal ANTHROPIC_API_KEY
   */
  private static createFromUniversalKey(apiKey: string): LLMProvider {
    const modelFromEnv = process.env.AI_MODEL || process.env.ANTHROPIC_MODEL;
    const detectedType = modelFromEnv ? this.detectTypeFromModel(modelFromEnv) : null;
    const providerType = detectedType || ProviderType.GLM;

    return this.buildProviderConfig(providerType, apiKey);
  }

  /**
   * Create provider from specific type using environment variables
   */
  private static createFromEnvType(type: ProviderType): LLMProvider {
    const apiKey = this.getApiKeyForType(type);

    if (!apiKey) {
      const metadata = getProviderMetadata(type);
      throw new Error(
        `API key not found for ${metadata.name}. ` +
        `Please set ${this.getEnvKeyName(type)} or ANTHROPIC_API_KEY (universal key)`
      );
    }

    return this.buildProviderConfig(type, apiKey);
  }

  /**
   * Build provider configuration from type and API key
   *
   * This is the unified configuration builder used by all creation methods.
   */
  private static buildProviderConfig(type: ProviderType, apiKey: string): LLMProvider {
    const metadata = getProviderMetadata(type);
    const baseURL = this.getBaseUrlForType(type);
    const model = process.env.AI_MODEL || process.env.ANTHROPIC_MODEL || metadata.defaultModel;
    const temperature = parseFloat(process.env.TEMPERATURE || '0.7');

    // Build base config
    const config: ProviderConfig = {
      type,
      apiKey,
      baseURL,
      model,
      temperature,
    };

    // Add MiniMax-specific configuration
    if (type === ProviderType.MINIMAX) {
      const groupId = process.env.MINIMAX_GROUP_ID;
      (config as MiniMaxConfig).groupId = groupId;
    }

    return this.create(config);
  }

  /**
   * Get API key for provider type from environment
   */
  private static getApiKeyForType(type: ProviderType): string | undefined {
    const envKey = this.getEnvKeyName(type);
    return process.env[envKey];
  }

  /**
   * Get base URL for provider type from environment
   */
  private static getBaseUrlForType(type: ProviderType): string | undefined {
    const envKey = `${type.toUpperCase()}_BASE_URL`;
    return process.env[envKey];
  }

  /**
   * Get environment variable name for API key
   */
  private static getEnvKeyName(type: ProviderType): string {
    return `${type.toUpperCase()}_API_KEY`;
  }

  /**
   * Detect provider type from model name
   */
  private static detectTypeFromModel(model: string): ProviderType | null {
    const modelLower = model.toLowerCase();
    const keywordMap: Record<string, ProviderType> = {
      'kimi': ProviderType.KIMI,
      'moonshot': ProviderType.KIMI,
      'deepseek': ProviderType.DEEPSEEK,
      'glm': ProviderType.GLM,
      'zhipu': ProviderType.GLM,
      'abab': ProviderType.MINIMAX,
      'minimax': ProviderType.MINIMAX,
      'qwen': ProviderType.QWEN,
      'dashscope': ProviderType.QWEN,
      'gpt': ProviderType.OPENAI,
    };

    for (const [keyword, providerType] of Object.entries(keywordMap)) {
      if (modelLower.includes(keyword)) {
        return providerType;
      }
    }

    return null;
  }

  /**
   * Get error message when no credentials are found
   */
  private static getNoCredentialsError(): string {
    const supportedKeys = [
      'ANTHROPIC_API_KEY (universal key, like Claude Code)',
      ...PROVIDER_PRIORITY.map(type => `${type.toUpperCase()}_API_KEY`),
    ].join('\n  - ');

    return (
      'No provider credentials found in environment.\n' +
      'Please set one of:\n' +
      `  - ${supportedKeys}`
    );
  }

  // ==========================================================================
  // Public Query Methods
  // ==========================================================================

  /**
   * Get metadata for a provider type
   */
  static getMetadata(type: ProviderType) {
    return getProviderMetadata(type);
  }

  /**
   * List all registered provider types
   */
  static listProviders(): ProviderType[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Check if a provider type is registered
   */
  static isRegistered(type: ProviderType): boolean {
    return this.registry.has(type);
  }
}
