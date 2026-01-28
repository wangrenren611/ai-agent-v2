/**
 * MiniMax Provider
 * 使用 MiniMaxAdapter（自定义鉴权 Bearer {groupId}.{apiKey}），其余流程复用通用基类。
 */

import { OpenAICompatibleProvider, OpenAICompatibleConfig } from './openai-compatible.base';



export interface MiniMaxProviderConfig extends OpenAICompatibleConfig {
  groupId?: string;
}

export class MiniMaxProvider extends OpenAICompatibleProvider {
  constructor(config: MiniMaxProviderConfig) {
    super(config);
    
  }
}
