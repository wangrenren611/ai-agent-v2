/**
 * DeepSeek Provider
 * 基于通用 OpenAICompatibleProvider（OpenAI 协议兼容）。
 */

import { BaseProviderConfig } from './base';
import { OpenAIAdapter } from '../adapters/openai-adapter';
import { OpenAICompatibleProvider } from './openai-compatible.base';


export class DeepSeekProvider extends OpenAICompatibleProvider {
  constructor(config: BaseProviderConfig) {
    super(
      new OpenAIAdapter({ endpointPath: '/chat/completions' }),
      config,
    );
  }
}
