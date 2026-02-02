/**
 * Provider Registry
 * 
 * 模型级别的 Provider 工厂和注册表
 * 支持从环境变量创建 Provider，以具体模型为单位
 */

import type { LLMProvider } from './provider';
import { OpenAICompatibleProvider } from './openai-compatible';
import type { BaseProviderConfig, ModelConfig, ModelId, ProviderType } from './types';
import { OpenAIAdapter } from './adapters/openai-adapter';
import { MiniMaxAdapter } from './adapters/minimax-adapter';
import { GLMAdapter } from './adapters/glm-adapter';
import type { BaseAPIAdapter } from './adapters/base-adapter';

export { type ModelConfig, type ModelId, type ProviderType, type BaseProviderConfig };

// =============================================================================
// 模型配置表（以模型 ID 为键）
// =============================================================================

export const MODEL_CONFIGS: Record<ModelId, ModelConfig> = {
  // GLM 系列
  'glm-4.7': {
    id: 'glm-4.7',
    provider: 'glm',
    name: 'GLM-4.7',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    endpointPath: '/chat/completions',
    envApiKey: 'GLM_API_KEY',
    envBaseURL: 'GLM_API_BASE',
    model: 'glm-4.7',
    maxTokens: 128000,
    maxOutputTokens: 8000,
    features: ['streaming', 'function-calling', 'vision'],
  },
  'glm-4.6': {
    id: 'glm-4.6',
    provider: 'glm',
    name: 'GLM-4.6',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    endpointPath: '/chat/completions',
    envApiKey: 'GLM_API_KEY',
    envBaseURL: 'GLM_API_BASE',
    model: 'glm-4.6',
    maxTokens: 64000,
    maxOutputTokens: 4000,
    features: ['streaming', 'function-calling'],
  },
  'glm-4-flash': {
    id: 'glm-4-flash',
    provider: 'glm',
    name: 'GLM-4-Flash',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    endpointPath: '/chat/completions',
    envApiKey: 'GLM_API_KEY',
    envBaseURL: 'GLM_API_BASE',
    model: 'glm-4-flash',
    maxTokens: 128000,
    maxOutputTokens: 8000,
    features: ['streaming', 'function-calling', 'vision'],
  },

  // MiniMax 系列
  'minimax-2.1': {
    id: 'minimax-2.1',
    provider: 'minimax',
    name: 'MiniMax-2.1',
    baseURL: 'https://api.minimaxi.chat/v1',
    endpointPath: '/text/chatcompletion_v2',
    envApiKey: 'MINIMAX_API_KEY',
    envBaseURL: 'MINIMAX_API_BASE',
    model: 'MiniMax-Text-01',
    maxTokens: 1000000,
    maxOutputTokens: 8000,
    features: ['streaming', 'function-calling'],
  },
  'minimax-2': {
    id: 'minimax-2',
    provider: 'minimax',
    name: 'MiniMax-2',
    baseURL: 'https://api.minimaxi.chat/v1',
    endpointPath: '/text/chatcompletion_v2',
    envApiKey: 'MINIMAX_API_KEY',
    envBaseURL: 'MINIMAX_API_BASE',
    model: 'MiniMax-Text-01-legacy',
    maxTokens: 200000,
    maxOutputTokens: 4000,
    features: ['streaming', 'function-calling'],
  },

  // Kimi 系列
  'kimi-k2.5': {
    id: 'kimi-k2.5',
    provider: 'kimi',
    name: 'Kimi K2.5',
    baseURL: 'https://api.moonshot.cn/v1',
    endpointPath: '/chat/completions',
    envApiKey: 'KIMI_API_KEY',
    envBaseURL: 'KIMI_API_BASE',
    model: 'kimi-k2.5',
    maxTokens: 200000,
    maxOutputTokens: 8000,
    features: ['streaming', 'function-calling', 'reasoning'],
  },

  // DeepSeek 系列
  'deepseek-chat': {
    id: 'deepseek-chat',
    provider: 'deepseek',
    name: 'DeepSeek Chat',
    baseURL: 'https://api.deepseek.com/v1',
    endpointPath: '/chat/completions',
    envApiKey: 'DEEPSEEK_API_KEY',
    envBaseURL: 'DEEPSEEK_API_BASE',
    model: 'deepseek-chat',
    maxTokens: 64000,
    maxOutputTokens: 8000,
    features: ['streaming', 'function-calling'],
  },

  // OpenAI 系列
  'gpt-4o': {
    id: 'gpt-4o',
    provider: 'openai',
    name: 'GPT-4o',
    baseURL: 'https://api.openai.com/v1',
    endpointPath: '/chat/completions',
    envApiKey: 'OPENAI_API_KEY',
    envBaseURL: 'OPENAI_API_BASE',
    model: 'gpt-4o',
    maxTokens: 128000,
    maxOutputTokens: 16000,
    features: ['streaming', 'function-calling', 'vision'],
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    provider: 'openai',
    name: 'GPT-4o Mini',
    baseURL: 'https://api.openai.com/v1',
    endpointPath: '/chat/completions',
    envApiKey: 'OPENAI_API_KEY',
    envBaseURL: 'OPENAI_API_BASE',
    model: 'gpt-4o-mini',
    maxTokens: 128000,
    maxOutputTokens: 8000,
    features: ['streaming', 'function-calling', 'vision'],
  },
};

// =============================================================================
// Provider Registry
// =============================================================================

export class ProviderRegistry {
  /**
   * 从环境变量创建 Provider（以模型为单位）
   * 
   * @param modelId 模型唯一标识，如 'glm-4.7', 'minimax-2.1'
   * @param config 可选的配置覆盖
   * 
   * @example
   * ```ts
   * // 创建 GLM-4.7 实例
   * const provider = ProviderRegistry.createFromEnv('glm-4.7');
   * 
   * // 创建 MiniMax-2.1 实例，并覆盖温度
   * const provider = ProviderRegistry.createFromEnv('minimax-2.1', { temperature: 0.5 });
   * ```
   */
  static createFromEnv(
    modelId: ModelId,
    config?: Partial<BaseProviderConfig>
  ): OpenAICompatibleProvider {
    if (!modelId) {
      throw new Error('ModelId is required. Available models: ' + this.getModelIds().join(', '));
    }

    const modelConfig = MODEL_CONFIGS[modelId];
    if (!modelConfig) {
      throw new Error(
        `Unknown model: ${modelId}. Available models: ${this.getModelIds().join(', ')}`
      );
    }

    const apiKey = process.env[modelConfig.envApiKey] || '';
    const baseURL = process.env[modelConfig.envBaseURL] || modelConfig.baseURL;

    const baseConfig: BaseProviderConfig = {
      apiKey,
      baseURL,
      model: modelConfig.model,
      temperature: 0.7,
      maxTokens: modelConfig.maxTokens,
      maxOutputTokens: modelConfig.maxOutputTokens,
    };

    const finalConfig = { ...baseConfig, ...config };
    const adapter = this.createAdapter(modelConfig.provider);

    return new OpenAICompatibleProvider(finalConfig, adapter);
  }

  /**
   * 创建指定类型的 Provider
   */
  static create(modelId: ModelId, config: BaseProviderConfig): OpenAICompatibleProvider {
    const modelConfig = MODEL_CONFIGS[modelId];
    if (!modelConfig) {
      throw new Error(`Unknown model: ${modelId}`);
    }

    const adapter = this.createAdapter(modelConfig.provider);
    return new OpenAICompatibleProvider(config, adapter);
  }

  /**
   * 创建适配器
   */
  private static createAdapter(provider: ProviderType): BaseAPIAdapter {
    switch (provider) {
      case 'glm':
        return new GLMAdapter();
      case 'minimax':
        return new MiniMaxAdapter();
      case 'kimi':
      case 'deepseek':
      case 'openai':
      default:
        return new OpenAIAdapter();
    }
  }

  /**
   * 获取所有模型配置
   */
  static listModels(): ModelConfig[] {
    return Object.values(MODEL_CONFIGS);
  }

  /**
   * 获取指定厂商的所有模型
   */
  static listModelsByProvider(provider: ProviderType): ModelConfig[] {
    return Object.values(MODEL_CONFIGS).filter(m => m.provider === provider);
  }

  /**
   * 获取所有模型 ID
   */
  static getModelIds(): ModelId[] {
    return Object.keys(MODEL_CONFIGS) as ModelId[];
  }

  /**
   * 获取指定模型的配置
   */
  static getModelConfig(modelId: ModelId): ModelConfig {
    const config = MODEL_CONFIGS[modelId];
    if (!config) {
      throw new Error(`Unknown model: ${modelId}`);
    }
    return config;
  }

  /**
   * 获取模型显示名称
   */
  static getModelName(modelId: ModelId): string {
    return MODEL_CONFIGS[modelId]?.name || modelId;
  }

  /**
   * 获取所有支持的厂商类型
   */
  static getProviders(): ProviderType[] {
    const providers = new Set<ProviderType>();
    Object.values(MODEL_CONFIGS).forEach(m => providers.add(m.provider));
    return Array.from(providers);
  }

  // =============================================================================
  // 向后兼容方法
  // =============================================================================

  /**
   * @deprecated 使用 getModelIds() 替代
   */
  static getTypes(): ModelId[] {
    return this.getModelIds();
  }

  /**
   * @deprecated 使用 getModelIds() 替代
   */
  static getModels(): ModelId[] {
    return this.getModelIds();
  }

  /**
   * @deprecated 使用 listModels() 替代
   */
  static listProviders(): ModelConfig[] {
    return this.listModels();
  }

  /**
   * @deprecated 使用 getModelConfig() 替代
   */
  static getMetadata(modelId: ModelId): ModelConfig {
    return this.getModelConfig(modelId);
  }
}

// =============================================================================
// 便捷的模型访问器
// =============================================================================

export const Models = {
  // GLM
  get glm47(): ModelConfig { return MODEL_CONFIGS['glm-4.7']; },
  get glm46(): ModelConfig { return MODEL_CONFIGS['glm-4.6']; },
  get glm4Flash(): ModelConfig { return MODEL_CONFIGS['glm-4-flash']; },
  
  // MiniMax
  get minimax21(): ModelConfig { return MODEL_CONFIGS['minimax-2.1']; },
  get minimax2(): ModelConfig { return MODEL_CONFIGS['minimax-2']; },
  
  // Kimi
  get kimiK25(): ModelConfig { return MODEL_CONFIGS['kimi-k2.5']; },
  
  // DeepSeek
  get deepseekChat(): ModelConfig { return MODEL_CONFIGS['deepseek-chat']; },
  
  // OpenAI
  get gpt4o(): ModelConfig { return MODEL_CONFIGS['gpt-4o']; },
  get gpt4oMini(): ModelConfig { return MODEL_CONFIGS['gpt-4o-mini']; },
};
