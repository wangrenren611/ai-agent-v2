/**
 * Qwen Provider（阿里通义）
 * 采用通用 OpenAICompatibleProvider。
 */

import { BaseProviderConfig } from '../base.js';
import { OpenAIAdapter } from '../adapters/openai-adapter.js';
import { ProviderMetadata } from '../config.js';
import { OpenAICompatibleProvider } from './openai-compatible.base.js';

export const QWEN_METADATA: ProviderMetadata = {
  type: 'qwen' as any,
  name: 'Qwen (DashScope)',
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  defaultModel: 'qwen-plus',
  maxTokens: 128000,
  maxOutputTokens: 8192,
  supportsStreaming: true,
  supportsTools: true,
  defaultTimeout: 60000,
  defaultMaxRetries: 3,
};

export class QwenProvider extends OpenAICompatibleProvider {
  constructor(config: BaseProviderConfig) {
    super(
      QWEN_METADATA,
      new OpenAIAdapter({ endpointPath: '/chat/completions' }),
      config,
    );
  }
}
