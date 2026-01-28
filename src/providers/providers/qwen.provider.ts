/**
 * Qwen Provider（阿里通义）
 * 采用通用 OpenAICompatibleProvider。
 */

import { BaseProviderConfig } from './base';
import { OpenAIAdapter } from '../adapters/openai-adapter';
import { OpenAICompatibleProvider } from './openai-compatible.base';


export class QwenProvider extends OpenAICompatibleProvider {
  constructor(config: BaseProviderConfig) {
    super(
      new OpenAIAdapter({ endpointPath: '/chat/completions' }),
      config,
    );
  }
}
