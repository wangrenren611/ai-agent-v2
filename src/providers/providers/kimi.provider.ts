/**
 * Kimi (Moonshot AI) Provider
 * 采用通用 OpenAICompatibleProvider。
 */

import { BaseProviderConfig } from '../base';
import { OpenAIAdapter } from '../adapters/openai-adapter';
import { ProviderMetadata } from '../config';
import { OpenAICompatibleProvider } from './openai-compatible.base';

export const KIMI_METADATA: ProviderMetadata = {
  type: 'kimi' as any,
  name: 'Kimi (Moonshot AI)',
  baseURL: 'https://api.moonshot.cn/v1',
  defaultModel: 'kimi-k2.5',
  maxTokens: 256000,
  maxOutputTokens: 8000,
  supportsStreaming: true,
  supportsTools: true,
  defaultTimeout: 60000,
  defaultMaxRetries: 3,

};

export class KimiProvider extends OpenAICompatibleProvider {
  constructor(config: BaseProviderConfig) {
    super(
      KIMI_METADATA,
      new OpenAIAdapter({ endpointPath: '/chat/completions' }),
      {...config, temperature: 0.6, extraBody: {
        thinking: {
          type: 'disabled',
        }}}
    );
  }
}
