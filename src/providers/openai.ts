/**
 * ============================================================================
 * @ai-context/compressor - OpenAI Provider
 * ============================================================================
 *
 * OpenAI API provider implementation.
 */

import { LLMProvider, LLMptions, LLMResponse, message, type ProviderConfig } from './base'

/**
 * OpenAI provider configuration
 */
export interface OpenAIConfig extends ProviderConfig {
  /** OpenAI API key */
  apiKey: string
  /** Base URL (default: https://api.openai.com/v1) */
  baseURL?: string
  /** Model name (default: gpt-4o-mini) */
  model?: string
  /** Organization ID */
  organization?: string
}


/**
 * OpenAI API provider
 *
 * Uses the OpenAI Chat Completions API for summarization.
 */
export class OpenAIProvider extends LLMProvider {
  baseURL: string
  model: string
  promptTokens: number;
  completionTokens: number;
  constructor(config: OpenAIConfig) {
    super(config)
    this.baseURL = config.baseURL || 'https://api.openai.com/v1'
    this.model = config.model || 'gpt-4o-mini'
    this.promptTokens = 0;
    this.completionTokens = 0;
  }

  async generate(messages: message[], options?: LLMptions): Promise<LLMResponse|null> {
    const { model, max_tokens, temperature } = options || {}
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: model || this.model,
          messages,
          max_tokens: max_tokens || 2000,
          temperature: temperature || 0.7,
        }),
      })

      const data: any = await response.json();
//       {
//   id: '46750164-6995-4d41-91e5-002f754e389f',
//   object: 'chat.completion',
//   created: 1768388546,
//   model: 'deepseek-chat',
//   choices: [
//     {
//       index: 0,
//       message: [Object],
//       logprobs: null,
//       finish_reason: 'stop'
//     }
//   ],
//   usage: {
//     prompt_tokens: 11,
//     completion_tokens: 29,
//     total_tokens: 40,
//     prompt_tokens_details: { cached_tokens: 0 },
//     prompt_cache_hit_tokens: 0,
//     prompt_cache_miss_tokens: 11
//   },
//   system_fingerprint: 'fp_eaab8d114b_prod0820_fp8_kvcache'
// }
      return {
        content: data.choices[0].message.content || '',
        role: 'assistant',
        type: data?.choices[0].message.type || 'text',
        tool_calls: data?.choices[0].message.tool_calls || [],
        usage: {
          prompt_tokens: data?.usage.prompt_tokens || 0,
          completion_tokens: data?.usage.completion_tokens || 0,
          total_tokens: data?.usage.total_tokens || 0,
        },
      };

    } catch (error: any) {
      console.error('OpenAI API error:', error);
      return {
        content: 'LLM API error: ' + error.message,
        role: 'assistant',
        type: 'text',
        tool_calls: [],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      }
    }

  }

}
