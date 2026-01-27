/**
 * DeepSeek Provider
 * 基于通用 OpenAICompatibleProvider（OpenAI 协议兼容）。
 */

import { BaseProviderConfig } from '../base.js';
import { OpenAIAdapter } from '../adapters/openai-adapter.js';
import { ProviderMetadata } from '../config.js';
import { OpenAICompatibleProvider } from './openai-compatible.base.js';

export const DEEPSEEK_METADATA: ProviderMetadata = {
  type: 'deepseek' as any,
  name: 'DeepSeek',
  baseURL: 'https://api.deepseek.com',
  defaultModel: 'deepseek-chat',
  maxTokens: 128000,
  maxOutputTokens: 8192,
  supportsStreaming: true,
  supportsTools: true,
  defaultTimeout: 60000,
  defaultMaxRetries: 3,
};

export class DeepSeekProvider extends OpenAICompatibleProvider {
  constructor(config: BaseProviderConfig) {
    super(
      DEEPSEEK_METADATA,
      new OpenAIAdapter({ endpointPath: '/chat/completions' }),
      config,
    );
  }
}
