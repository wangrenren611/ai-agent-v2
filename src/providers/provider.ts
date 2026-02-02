/**
 * LLM Provider 抽象基类
 */

import type { BaseProviderConfig, LLMResponse, LLMOptions, Message } from './types';

export abstract class LLMProvider {
  abstract readonly config: BaseProviderConfig;

  /**
   * 生成响应
   */
  abstract generate(messages: Message[], options?: LLMOptions): Promise<LLMResponse | null>;
}
