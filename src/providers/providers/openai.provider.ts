/**
 * OpenAI Provider（新架构）
 * 现基于通用 OpenAICompatibleProvider，复用 openai.ts 同步的请求/流处理逻辑。
 */

import { OpenAIAdapter } from '../adapters/openai-adapter.js';
import { ProviderMetadata, getProviderMetadata } from '../config.js';
import { OpenAICompatibleProvider, OpenAICompatibleConfig } from './openai-compatible.base.js';

/**
 * OpenAI Provider metadata
 */
export const OPENAI_METADATA: ProviderMetadata = {
  type: 'openai' as any,
  name: 'OpenAI',
  baseURL: 'https://api.openai.com/v1',
  defaultModel: 'gpt-4o-mini',
  maxTokens: 128000,
  maxOutputTokens: 4096,
  supportsStreaming: true,
  supportsTools: true,
  defaultTimeout: 60000,
  defaultMaxRetries: 3,
};

export interface OpenAIProviderConfig extends OpenAICompatibleConfig {
  organization?: string;
}

export class OpenAIProvider extends OpenAICompatibleProvider {
  constructor(config: OpenAIProviderConfig) {
    super(
      OPENAI_METADATA,
      new OpenAIAdapter({
        endpointPath: '/chat/completions',
        organization: config.organization,
        apiKeyHeader: config.apiKeyHeader,
        apiKeyPrefix: config.apiKeyPrefix,
        defaultHeaders: config.defaultHeaders,
      }),
      config,
    );
  }
}

// 兼容旧的 getProviderMetadata 用例
export { getProviderMetadata };
