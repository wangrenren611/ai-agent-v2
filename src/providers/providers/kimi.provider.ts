/**
 * Kimi (Moonshot AI) Provider
 * 采用通用 OpenAICompatibleProvider。
 */

import { BaseProviderConfig } from './base';
import { OpenAICompatibleProvider } from './openai-compatible.base';



export class KimiProvider extends OpenAICompatibleProvider {
  constructor(config: BaseProviderConfig) {
    super(config);
  }
  
}
