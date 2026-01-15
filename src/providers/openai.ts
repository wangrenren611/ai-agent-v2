/**
 * ============================================================================
 * @ai-context/compressor - OpenAI Provider
 * ============================================================================
 *
 * OpenAI API provider implementation.
 */

import { LLMProvider, LLMOptions, LLMResponse, message, ToolSchema, type ProviderConfig } from './base'

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
 * Chat Completion API response structure
 */
interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
      type?: 'text' | 'tool' | 'tool_call';
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI API provider
 *
 * Uses the OpenAI Chat Completions API.
 */
export class OpenAIProvider extends LLMProvider {
  baseURL: string
  model: string

  constructor(config: OpenAIConfig) {
    super(config)
    this.baseURL = config.baseURL || 'https://api.openai.com/v1'
    this.model = config.model || 'gpt-4o-mini'
  }

  async generate(messages: message[], options?: LLMOptions): Promise<LLMResponse|null> {
    const { model, max_tokens, temperature, tools } = options || {}
    try {
      const requestBody: Record<string, unknown> = {
        model: model || this.model,
        messages,
        max_tokens: max_tokens || 2000,
        temperature: temperature || 0.1,
      };

      // 添加 tools 参数（如果提供）
      if (tools && tools.length > 0) {
        requestBody.tools = tools;
        // 调试：打印工具 schemas
        // console.log('Tools sent to API:', JSON.stringify(tools, null, 2));
      }

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('API Error Response:', errorBody);
        throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorBody}`);
      }

      const data = await response.json() as ChatCompletionResponse;

      return {
        content: data.choices[0]?.message?.content || '',
        role: 'assistant',
        type: data.choices[0]?.message?.type || 'text',
        tool_calls: data.choices[0]?.message?.tool_calls || [],
        usage: {
          prompt_tokens: data.usage?.prompt_tokens || 0,
          completion_tokens: data.usage?.completion_tokens || 0,
          total_tokens: data.usage?.total_tokens || 0,
        },
      };

    } catch (error) {
      console.error('OpenAI API error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: 'LLM API error: ' + errorMsg,
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
