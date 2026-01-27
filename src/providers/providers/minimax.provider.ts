/**
 * MiniMax Provider
 * 使用 MiniMaxAdapter（自定义鉴权 Bearer {groupId}.{apiKey}），其余流程复用通用基类。
 */

import { MiniMaxAdapter } from '../adapters/minimax-adapter';
import { ProviderMetadata } from '../config';
import { OpenAICompatibleProvider, OpenAICompatibleConfig } from './openai-compatible.base';

export const MINIMAX_METADATA: ProviderMetadata = {
  type: 'minimax' as any,
  name: 'MiniMax',
  baseURL: 'https://api.minimax.chat/v1',
  defaultModel: 'abab6.5s-chat',
  maxTokens: 24576,
  maxOutputTokens: 4096,
  supportsStreaming: true,
  supportsTools: true,
  defaultTimeout: 60000,
  defaultMaxRetries: 3,
};

export interface MiniMaxProviderConfig extends OpenAICompatibleConfig {
  groupId?: string;
}

export class MiniMaxProvider extends OpenAICompatibleProvider {
  constructor(config: MiniMaxProviderConfig) {
    super(
      MINIMAX_METADATA,
      new MiniMaxAdapter({ groupId: config.groupId }),
      config,
    );
  }
}
