/**
 * GLM Provider（智谱）
 * 采用通用 OpenAICompatibleProvider。
 */

import { BaseProviderConfig } from '../base.js';
import { OpenAIAdapter } from '../adapters/openai-adapter.js';
import { ProviderMetadata } from '../config.js';
import { OpenAICompatibleProvider } from './openai-compatible.base.js';

export const GLM_METADATA: ProviderMetadata = {
  type: 'glm' as any,
  name: 'GLM (Zhipu)',
  baseURL: 'https://open.bigmodel.cn/api/paas/v4',
  defaultModel: 'glm-4-air',
  maxTokens: 128000,
  maxOutputTokens: 8192,
  supportsStreaming: true,
  supportsTools: true,
  defaultTimeout: 60000,
  defaultMaxRetries: 3,
};

export class GLMProvider extends OpenAICompatibleProvider {
  constructor(config: BaseProviderConfig) {
    super(
      GLM_METADATA,
      new OpenAIAdapter({ endpointPath: '/chat/completions' }),
      config,
    );
  }
}
