/**
 * ProviderRegistry - 统一的 Provider 创建和元数据管理系统
 *
 * 设计说明：
 * - ProviderType: 厂商类型（如 GLM、OpenAI），不包含具体模型名
 * - ModelConfig: 单个模型的配置（包含模型名、最大 token、特性等）
 * - ProviderMetadata: 厂商元数据（包含该厂商支持的所有模型）
 * - 使用 Adapter 模式处理不同厂商/模型的差异
 */

import { LLMProvider } from './providers/base';
import { OpenAICompatibleProvider, OpenAICompatibleConfig } from './providers/openai-compatible.base';
import { BaseAPIAdapter } from './adapters/base-adapter';
import { OpenAIAdapter } from './adapters/openai-adapter';
import { MiniMaxAdapter } from './adapters/minimax-adapter';
import { GLMAdapter } from './adapters/glm-adapter';

/**
 * 厂商类型（与模型名称分离）
 */
export enum ProviderType {
  OPENAI = 'openai',
  KIMI = 'kimi',
  DEEPSEEK = 'deepseek',
  GLM = 'glm-4.7',
  MINIMAX = 'minimax',
  QWEN = 'qwen',
}

/**
 * 单个模型的配置
 */
export interface ModelConfig {
  /** 模型名称 */
  name: string;
  /** 显示名称 */
  displayName: string;
  /** 最大输入 token 数 */
  maxTokens: number;
  /** 最大输出 token 数 */
  outputMaxTokens: number;
  /** 支持的特性 */
  features: string[];
}

/**
 * 厂商元数据
 */
export interface ProviderMetadata {
  /** 厂商类型 */
  type: ProviderType;
  /** 厂商名称 */
  name: string;
  /** 该厂商支持的所有模型 */
  models: Record<string, ModelConfig>;
  /** 默认模型名称 */
  defaultModel: string;
  /** API 基础 URL */
  baseURL: string;
  /** 端点路径 */
  endpointPath: string;
  /** API Key 环境变量名 */
  envApiKey: string;
  /** Base URL 环境变量名 */
  envBaseURL: string;
}

/**
 * Provider 元数据配置
 */
export const PROVIDER_METADATA: Record<ProviderType, ProviderMetadata> = {
  [ProviderType.OPENAI]: {
    type: ProviderType.OPENAI,
    name: 'OpenAI',
    defaultModel: 'gpt-4o',
    baseURL: 'https://api.openai.com/v1',
    endpointPath: '/chat/completions',
    envApiKey: 'OPENAI_API_KEY',
    envBaseURL: 'OPENAI_API_BASE',
    models: {
      'gpt-4o': {
        name: 'gpt-4o',
        displayName: 'GPT-4o',
           maxTokens: 200*1000,
        outputMaxTokens: 8000,
        features: ['streaming', 'function-calling', 'vision'],
      }
    },
  },
  [ProviderType.KIMI]: {
    type: ProviderType.KIMI,
    name: 'Kimi (Moonshot AI)',
    defaultModel: 'kimi-3.5',
    baseURL: 'https://api.kimi.ai/v1',
    endpointPath: '/chat/completions',
    envApiKey: 'KIMI_API_KEY',
    envBaseURL: 'KIMI_API_BASE',
    models: {
      'kimi-3.5': {
        name: 'kimi-3.5',
        displayName: 'Kimi 3.5',
        maxTokens: 200*1000,
        outputMaxTokens: 8000,
        features: ['streaming', 'function-calling', 'reasoning'],
      },
      'kimi-2.5': {
        name: 'kimi-2.5',
        displayName: 'Kimi 2.5',
        maxTokens: 200*1000,
        outputMaxTokens: 8000,
        features: ['streaming', 'function-calling', 'reasoning'],
      },
    },
  },
  [ProviderType.DEEPSEEK]: {
    type: ProviderType.DEEPSEEK,
    name: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    baseURL: 'https://api.deepseek.com/v1',
    endpointPath: '/chat/completions',
    envApiKey: 'DEEPSEEK_API_KEY',
    envBaseURL: 'DEEPSEEK_API_BASE',
    models: {
      'deepseek-chat': {
        name: 'deepseek-chat',
        displayName: 'DeepSeek Chat',
        maxTokens: 64000,
        outputMaxTokens: 200*1000,
        features: ['streaming', 'function-calling'],
      },
      'deepseek-coder': {
        name: 'deepseek-coder',
        displayName: 'DeepSeek Coder',
        maxTokens: 64000,
        outputMaxTokens: 200*1000,
        features: ['streaming', 'function-calling'],
      },
    },
  },
  [ProviderType.GLM]: {
    type: ProviderType.GLM,
    name: 'GLM (智谱)',
    defaultModel: 'glm-4.7',
    baseURL: 'https://open.bigmodel.cn/api/coding/paas/v4',
    endpointPath: '/chat/completions',
    envApiKey: 'GLM_API_KEY',
    envBaseURL: 'GLM_API_BASE',
    models: {
      'glm-4.7': {
        name: 'glm-4.7',
        displayName: 'GLM-4.7',
        maxTokens: 200*1000,
        outputMaxTokens: 8000,
        features: ['streaming', 'function-calling', 'vision'],
      },
    },
  },
  [ProviderType.MINIMAX]: {
    type: ProviderType.MINIMAX,
    name: 'MiniMax',
    defaultModel: 'MiniMax-M2.1',
    baseURL: 'https://api.minimaxi.com/v1',
    endpointPath: '/chat/completion',
    envApiKey: 'MINIMAX_API_KEY',
    envBaseURL: 'MINIMAX_API_BASE',
    models: {
      'MiniMax-M2.1': {
        name: 'MiniMax-M2.1',
        displayName: 'MiniMax M2.1',
         maxTokens: 200*1000,
        outputMaxTokens: 8000,
        features: ['streaming', 'function-calling'],
      },
    },
  },
  [ProviderType.QWEN]: {
    type: ProviderType.QWEN,
    name: 'Qwen (通义千问)',
    defaultModel: 'qwen-3.5',
    baseURL: 'https://api.qwen.cn/v1',
    endpointPath: '/chat/completions',
    envApiKey: 'QWEN_API_KEY',
    envBaseURL: 'QWEN_API_BASE',
    models: {
      'qwen-3.5': {
        name: 'qwen-3.5',
        displayName: 'Qwen 3.5',
         maxTokens: 200*1000,
        outputMaxTokens: 8000,
        features: ['streaming', 'function-calling', 'vision'],
      },
    },
  },
};

export class ProviderRegistry {
  /**
   * 从环境变量创建 Provider
   * @param type Provider 类型，未指定时自动检测
   * @param model 可选的模型名称，不指定则使用默认模型
   * @param config 可选的配置覆盖，用于动态设置 temperature、maxTokens 等参数
   */
  static createFromEnv(
    providerType:ProviderType,
    config?: Partial<OpenAICompatibleConfig>
 ): LLMProvider {

    if(!providerType){
        throw new Error('ProviderType is required');
    }
    
    // 如果未指定类型，自动检测
    let metadata =  PROVIDER_METADATA?.[providerType];
    let modelName = metadata?.defaultModel;

    // 如果providerType不是ProviderType类型，检查是否为model名称
    if (!metadata && providerType) {
        providerType = Object.keys(PROVIDER_METADATA).find(key=>providerType.includes(key)) as ProviderType;
        metadata = PROVIDER_METADATA[providerType];
        modelName = providerType;
    }

    const apiKey = process.env[metadata.envApiKey] || '';
    const baseURL = process.env[metadata.envBaseURL] || metadata.baseURL;
    const modelConfig = metadata.models[modelName] || metadata.models[metadata.defaultModel];

    // 基础配置
    const baseConfig: OpenAICompatibleConfig = {
      apiKey,
      baseURL,
      model: modelName,
      temperature: 0.7,
      maxTokens: modelConfig.maxTokens,
      maxOutputTokens: 8000,
    };

    // 合并用户自定义配置
    const finalConfig: OpenAICompatibleConfig = {
      ...baseConfig,
      ...config,
    };

    // 创建对应的 Adapter
    const adapter = ProviderRegistry.createAdapter(providerType, finalConfig);

    return new OpenAICompatibleProvider(finalConfig, adapter);
  }

  /**
   * 创建指定类型的 Provider（使用 Adapter 模式）
   */
  static create(type: ProviderType, config: OpenAICompatibleConfig): LLMProvider {
    const adapter = ProviderRegistry.createAdapter(type, config);
    return new OpenAICompatibleProvider(config, adapter);
  }

  /**
   * 创建对应的 Adapter
   */
  private static createAdapter(type: ProviderType, config: OpenAICompatibleConfig): BaseAPIAdapter {
    switch (type) {
      case ProviderType.GLM:
        return new GLMAdapter();
      case ProviderType.MINIMAX:
        return new MiniMaxAdapter({ groupId: config.groupId });
      case ProviderType.OPENAI:
        return new OpenAIAdapter({
          endpointPath: '/chat/completions',
          organization: config.organization,
          apiKeyHeader: config.apiKeyHeader,
          apiKeyPrefix: config.apiKeyPrefix,
          defaultHeaders: config.defaultHeaders,
        });
      case ProviderType.KIMI:
      case ProviderType.DEEPSEEK:
      case ProviderType.QWEN:
      default:
        // 使用标准 OpenAI Adapter
        return new OpenAIAdapter({ endpointPath: '/chat/completions' });
    }
  }

  /**
   * 从环境变量自动检测 Provider 类型
   */
  private static detectFromEnv(): ProviderType {
    // 检测优先级顺序
    const detectionOrder: ProviderType[] = [
      ProviderType.OPENAI,
      ProviderType.KIMI,
      ProviderType.DEEPSEEK,
      ProviderType.GLM,
      ProviderType.MINIMAX,
      ProviderType.QWEN,
    ];

    for (const type of detectionOrder) {
      const metadata = PROVIDER_METADATA[type];
      if (process.env[metadata.envApiKey]) {
        return type;
      }
    }

    throw new Error('No API key found in environment variables. Please set one of: ' +
      detectionOrder.map(t => PROVIDER_METADATA[t].envApiKey).join(', '));
  }

  /**
   * 获取所有可用的 Provider 元数据
   */
  static listProviders(): ProviderMetadata[] {
    return Object.values(PROVIDER_METADATA);
  }

  /**
   * 获取指定类型的元数据
   */
  static getMetadata(type: ProviderType): ProviderMetadata {
    return PROVIDER_METADATA[type];
  }

  /**
   * 获取指定厂商的所有模型
   */
  static getModels(): ProviderType[] {
    return Object.keys(PROVIDER_METADATA) as ProviderType[];
  }

  /**
   * 获取指定厂商的指定模型配置
   */
  static getModelConfig(providerType: ProviderType, modelName: string): ModelConfig | undefined {
    const metadata = PROVIDER_METADATA[providerType];
    return metadata.models[modelName];
  }
}
