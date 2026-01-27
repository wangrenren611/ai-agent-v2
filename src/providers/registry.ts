/**
 * Provider Registry
 *
 * Central registry and factory for creating LLM providers.
 * Supports auto-detection from environment variables.
 */

import { LLMProvider } from './base.js';
import {
  ProviderType,
  ProviderConfig,
  BaseProviderConfig,
  getProviderMetadata,
} from './config.js';

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
 * Provider Registry
 *
 * Manages provider registration and creation.
 * Implements factory pattern for dynamic provider instantiation.
 */
export class ProviderRegistry {
  private static readonly registry = new Map<ProviderType, RegistryEntry>();

  /**
   * Register a provider
   */
  static register(
    type: ProviderType,
    Constructor: ProviderConstructor
  ): void {
    this.registry.set(type, { Constructor, configType: type });
  }

  /**
   * Create a provider from configuration
   */
  static create(config: ProviderConfig): LLMProvider {
    const entry = this.registry.get(config.type);

    if (!entry) {
      throw new Error(`Unknown provider type: ${config.type}`);
    }

    const metadata = getProviderMetadata(config.type);
  
    // Merge config with defaults from metadata while保留自定义字段
    const baseConfig: BaseProviderConfig = {
      ...config, // keep any provider-specific fields (e.g., organization, apiKeyHeader, extraBody)
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
    console.log(baseConfig);
    return new entry.Constructor(baseConfig);
  }

  /**
   * Auto-detect and create provider from environment variables
   *
   * Detection order:
   * 1. Explicit type parameter
   * 2. AI_MODEL environment variable
   * 3. Existing API keys (DEEPSEEK_API_KEY, etc.)
   */
  static createFromEnv(type?: ProviderType): LLMProvider {
    // If type is explicitly provided, use it
    if (type) {
      return this.createFromEnvType(type);
    }

    // Check AI_MODEL environment variable
    const aiModel = process.env.AI_MODEL?.toLowerCase();

    if (aiModel) {
      const detectedType = this.detectTypeFromModel(aiModel);
      if (detectedType) {
        return this.createFromEnvType(detectedType);
      }
    }

    // Fall back to checking for existing API keys
    // Check in order of preference
    const envTypes: ProviderType[] = [
      ProviderType.DEEPSEEK,
      ProviderType.KIMI,
      ProviderType.GLM,
      ProviderType.MINIMAX,
      ProviderType.QWEN,
      ProviderType.OPENAI,
    ];

    for (const envType of envTypes) {
      try {
        return this.createFromEnvType(envType);
      } catch {
        // Continue to next provider
      }
    }

    throw new Error(
      'No provider credentials found in environment. ' +
      'Please set one of: DEEPSEEK_API_KEY, KIMI_API_KEY, GLM_API_KEY, ' +
      'MINIMAX_API_KEY, QWEN_API_KEY, or OPENAI_API_KEY'
    );
  }

  /**
   * Create provider from specific type using environment variables
   */
  private static createFromEnvType(type: ProviderType): LLMProvider {
    const metadata = getProviderMetadata(type);

    // Get API key from environment
    const apiKey = this.getApiKeyForType(type);

    if (!apiKey) {
      throw new Error(
        `API key not found for ${metadata.name}. ` +
        `Please set ${this.getEnvKeyName(type)}`
      );
    }

    // Get base URL from environment (optional)
    const baseURL = this.getBaseUrlForType(type);

    // Get model from environment (optional)
    const model = process.env.AI_MODEL || metadata.defaultModel;

    // Build config
    const config: ProviderConfig = {
      type,
      apiKey,
      baseURL,
      model,
      temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
    };

    // Add MiniMax-specific config
    if (type === ProviderType.MINIMAX) {
      (config as any).groupId = process.env.MINIMAX_GROUP_ID;
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
    // Special handling for DeepSeek (existing env variable)
    if (type === ProviderType.DEEPSEEK) {
      return process.env.DEEPSEEK_BASE_URL;
    }

    // Generic pattern
    const envKey = `${type.toUpperCase()}_BASE_URL`;
    return process.env[envKey];
  }

  /**
   * Get environment variable name for API key
   */
  private static getEnvKeyName(type: ProviderType): string {
    // Special case: DeepSeek uses DEEPSEEK_API_KEY (existing)
    if (type === ProviderType.DEEPSEEK) {
      return 'DEEPSEEK_API_KEY';
    }

    // Generic pattern: {TYPE}_API_KEY
    return `${type.toUpperCase()}_API_KEY`;
  }

  /**
   * Detect provider type from model name
   */
  private static detectTypeFromModel(model: string): ProviderType | null {
    const modelLower = model.toLowerCase();

    if (modelLower.includes('kimi') || modelLower.includes('moonshot')) {
      return ProviderType.KIMI;
    }

    if (modelLower.includes('deepseek')) {
      return ProviderType.DEEPSEEK;
    }

    if (modelLower.includes('glm') || modelLower.includes('zhipu')) {
      return ProviderType.GLM;
    }

    if (modelLower.includes('abab') || modelLower.includes('minimax')) {
      return ProviderType.MINIMAX;
    }

    if (modelLower.includes('qwen') || modelLower.includes('dashscope')) {
      return ProviderType.QWEN;
    }

    if (modelLower.includes('gpt')) {
      return ProviderType.OPENAI;
    }

    return null;
  }

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
