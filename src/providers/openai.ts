/**
 * 兼容旧路径的 OpenAI Provider 封装
 * - 复用新的通用实现（OpenAICompatibleProvider）
 * - 保持旧测试用例预期的默认值与错误返回格式
 */

import { DEFAULT_TEMPERATURE } from '../agent/types.js';
import { Message, LLMOptions, LLMResponse } from './base.js';
import {
  OpenAIProvider as CoreOpenAIProvider,
  OPENAI_METADATA,
  OpenAIProviderConfig as CoreOpenAIConfig,
} from './providers/openai.provider.js';

export interface OpenAIConfig extends CoreOpenAIConfig {}

export class OpenAIProvider extends CoreOpenAIProvider {
  constructor(config: OpenAIConfig) {
    // 维持旧实现的默认值（maxTokens=200000、maxOutputTokens=8000）
    const merged: OpenAIConfig = {
      baseURL: config.baseURL ?? OPENAI_METADATA.baseURL,
      model: config.model ?? 'gpt-4o-mini',
      maxTokens: config.maxTokens ?? 200_000,
      maxOutputTokens: config.maxOutputTokens ?? 8_000,
      temperature: config.temperature ?? DEFAULT_TEMPERATURE,
      ...config,
    };
    super(merged);
  }

  /**
   * 保持旧测试预期：若抛错则返回带前缀的错误文本，而不是直接抛出
   */
  async generate(messages: Message[], options?: LLMOptions): Promise<LLMResponse | null> {
    try {
      return await super.generate(messages, options);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('OpenAI API error:', message);
      return {
        content: `LLM API error: ${message}`,
        role: 'assistant',
        type: 'text',
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        finishReason: 'error',
      };
    }
  }
}

export { OPENAI_METADATA };
