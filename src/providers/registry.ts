/**
 * Provider Registry
 *
 * Central registry and factory for creating LLM providers.
 * Supports auto-detection from environment variables (like Claude Code).
 * 
 * Universal API Key Support:
 * - ANTHROPIC_API_KEY: Universal key (similar to Claude Code's approach)
 * - GLM_API_KEY: GLM (Zhipu AI) specific key
 * - KIMI_API_KEY: Kimi (Moonshot AI) specific key
 * - DEEPSEEK_API_KEY: DeepSeek specific key
 * - OPENAI_API_KEY: OpenAI specific key
 * - MINIMAX_API_KEY: MiniMax specific key
 * - QWEN_API_KEY: Qwen (Alibaba) specific key
 */

import { LLMProvider } from './base';
import {
  ProviderType,
  ProviderConfig,
  BaseProviderConfig,
  getProviderMetadata,
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
 * Provider Registry
 *
 * Manages provider registration and creation.
 * Implements factory pattern for dynamic provider instantiation.
 * 
 * Priority order (similar to Claude Code):
 * 1. ANTHROPIC_API_KEY (universal API key)
 * 2. Provider-specific API keys (GLM_API_KEY, KIMI_API_KEY, etc.)
 * 3. AI_MODEL environment variable
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
  
    // Merge config with defaults from metadata while preserving custom fields
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
   * Detection order (similar to Claude Code):
   * 1. ANTHROPIC_API_KEY (universal key, like Claude Code)
   * 2. Provider-specific keys (GLM_API_KEY, KIMI_API_KEY, etc.)
   * 3. AI_MODEL environment variable
   * 4. Explicit type parameter
   */
  static createFromEnv(type?: ProviderType): LLMProvider {
    // Priority 1: Check for universal ANTHROPIC_API_KEY (like Claude Code)
    const universalApiKey = process.env.ANTHROPIC_API_KEY;
    if (universalApiKey) {
      console.log('[ProviderRegistry] Using ANTHROPIC_API_KEY (universal key)');
      
      // Try to detect provider from AI_MODEL or ANTHROPIC_MODEL
      const modelFromEnv = process.env.AI_MODEL || process.env.ANTHROPIC_MODEL;
      const detectedType = modelFromEnv ? this.detectTypeFromModel(modelFromEnv) : null;
      
      // Default to GLM if no model specified (like Claude Code defaults)
      const providerType = detectedType || ProviderType.GLM;
      
      return this.createFromEnvWithKey(providerType, universalApiKey);
    }

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

    // Fall back to checking for existing API keys (provider-specific)
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
      'Please set one of:\n' +
      '  - ANTHROPIC_API_KEY (universal key, like Claude Code)\n' +
      '  - DEEPSEEK_API_KEY\n' +
      '  - KIMI_API_KEY\n' +
      '  - GLM_API_KEY\n' +
      '  - MINIMAX_API_KEY\n' +
      '  - QWEN_API_KEY\n' +
      '  - OPENAI_API_KEY'
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
        `Please set ${this.getEnvKeyName(type)} or ANTHROPIC_API_KEY (universal key)`
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
   * Create provider with specific API key
   */
  private static createFromEnvWithKey(
    type: ProviderType,
    apiKey: string
  ): LLMProvider {
    const metadata = getProviderMetadata(type);

    // Get base URL from environment (optional)
    const baseURL = this.getBaseUrlForType(type);

    // Get model from environment (optional)
    const model = process.env.AI_MODEL || process.env.ANTHROPIC_MODEL || metadata.defaultModel;

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
