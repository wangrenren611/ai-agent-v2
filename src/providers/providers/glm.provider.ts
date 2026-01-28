/**
 * GLM Provider（智谱）
 * 采用通用 OpenAICompatibleProvider。
 */

import { BaseProviderConfig } from './base';
import { OpenAIAdapter } from '../adapters/openai-adapter';
import { OpenAICompatibleProvider } from './openai-compatible.base';


export class GLMProvider extends OpenAICompatibleProvider {
  constructor(config: BaseProviderConfig) {
    super(config);
    this.model = config.model || 'glm-4.7';
  }
}
