/**
 * ============================================================================
 * @ai-context/compressor - OpenAI Provider
 * ============================================================================
 *
 * OpenAI API provider implementation.
 */

import { Console } from 'node:console';
import { LLMProvider, LLMOptions, LLMResponse, Message, StreamChunk, StreamCallback, type ProviderConfig, ToolCall } from './base'
import fs from 'node:fs';

/**
 * OpenAI provider configuration
 */
export interface OpenAIConfig extends ProviderConfig {
  /** OpenAI API key */
  apiKey: string
  /** 基础 URL（默认: https://api.openai.com/v1） */
  baseURL?: string
  /** Model name (default: gpt-4o-mini) */
  model?: string
  /** Organization ID */
  organization?: string,
  maxTokens?: number;
  maxOutputTokens?: number;
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
    finish_reason?: 'stop' | 'length' | 'content_filter' | 'tool_calls' | string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * SSE (Server-Sent Events) stream chunk structure
 */
interface StreamChunkData {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      content?: string;
      index: number;
      tool_calls?: Array<{
        type: 'function';
        id: string;
        index: number;
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason?: string;
  }>;
}

/**
 * OpenAI API provider
 *
 * Uses OpenAI Chat Completions API.
 */
export class OpenAIProvider extends LLMProvider {
  baseURL: string
  model: string
  maxTokens: number;
  maxOutputTokens: number;

  constructor(config: OpenAIConfig) {
    super(config)
    this.baseURL = config.baseURL || 'https://api.openai.com/v1'
    this.model = config.model || 'gpt-4o-mini'
    this.maxTokens = config.maxTokens || 128 * 1024;
    this.maxOutputTokens = config.maxOutputTokens || 8000;
  }

  async generate(messages: Message[], options?: LLMOptions): Promise<LLMResponse | null> {
    const { model, max_tokens, temperature, tools, stream, streamCallback } = options || {}

    // 🔧 清理消息格式，只保留 OpenAI/DeepSeek API 支持的字段
    // 过滤掉内部使用的 type 字段（如 "summary"）等不兼容的字段
    const cleanMessage = (msg: Message) => {
      const cleaned: Record<string, unknown> = {
        role: msg.role,
        content: msg.content
      };
      // 保留 tool_call_id（tool 回复必需）
      if (msg.tool_call_id) {
        cleaned.tool_call_id = msg.tool_call_id;
      }
      // 保留 tool_calls（assistant 调用工具必需）
      if (msg.tool_calls) {
        cleaned.tool_calls = msg.tool_calls;
      }
      return cleaned;
    };

    const currentMessages = messages.map(cleanMessage);

    try {
      const requestBody: Record<string, unknown> = {
        model: model || this.model,
        messages: currentMessages,
        max_tokens: max_tokens || this.maxOutputTokens,
        temperature: temperature || 0.1,
        stream: stream ?? false, // Default to non-streaming
        reasoning_split: true,
      };

      // 添加 tools 参数（如果提供）
      if (tools && tools.length > 0) {
        requestBody.tools = tools;
      }

      fs.writeFileSync('./openai-request.json', JSON.stringify(requestBody, null, 2));

      // 如果启用了流式响应
      if (requestBody.stream) {
        return await this.generateStream(requestBody, streamCallback);
      }

      // 非流式响应
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('API Error Response:', errorBody);
        throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorBody}`);
      }

      const data = await response.json() as ChatCompletionResponse;
      const finishReason = data.choices[0]?.finish_reason;

      const messageContent = data.choices[0]?.message?.content || '';
      const messageToolCalls = data.choices[0]?.message?.tool_calls || [];

      // 直接使用 API 返回的 tool_calls，不做任何修复
      return {
        content: messageContent,
        role: 'assistant',
        type: data.choices[0]?.message?.type || 'text',
        tool_calls: messageToolCalls,
        usage: data.usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
        finishReason,
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
        finishReason: 'error',
      };
    }
  }

  /**
   * 处理流式响应
   */
  private async generateStream(
    requestBody: Record<string, unknown>,
    streamCallback?: StreamCallback
  ): Promise<LLMResponse | null> {
    let accumulatedContent = '';
    const toolCalls = new Map<number, {
      id: string;
      type: 'function';
      function: { name: string; arguments: string };
    }>();

    let finishReason: string | undefined;
    const usage = {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('API Error Response:', errorBody);
        throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorBody}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let shouldStop = false;

      while (!shouldStop) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();

          if (!trimmedLine || trimmedLine.startsWith(':')) continue;

          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6).trim();

            if (data === '[DONE]') {
              shouldStop = true;
              break;
            }

            try {
              const chunk = JSON.parse(data) as StreamChunkData;

              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                accumulatedContent += content;
                streamCallback?.({ content });
              }

              const toolCallsDelta = chunk?.choices[0]?.delta?.tool_calls;
              if (toolCallsDelta && toolCallsDelta.length > 0) {
                for (const toolCall of toolCallsDelta) {
                  const existing = toolCalls.get(toolCall.index);
                  toolCalls.set(toolCall.index, {
                    id: existing?.id || toolCall.id || '',
                    type: existing?.type || toolCall.type || 'function',
                    function: {
                      name: existing?.function?.name || toolCall.function.name || '',
                      arguments: (existing?.function?.arguments || '') + (toolCall.function.arguments || ''),
                    },
                  });
                }
              }

              const choiceFinishReason = chunk.choices[0]?.finish_reason;
              if (choiceFinishReason) {
                finishReason = choiceFinishReason;
              }

            } catch (error) {
              console.warn('Failed to parse SSE chunk:', error);
            }
          }
        }
      }

      const toolCallsArray: ToolCall[] = [...toolCalls.values()];

      return {
        content: accumulatedContent,
        role: 'assistant',
        type: 'text',
        tool_calls: toolCallsArray.length > 0 ? toolCallsArray : undefined,
        usage,
        finishReason,
      };

    } catch (error) {
      console.error('OpenAI streaming API error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: 'LLM API error: ' + errorMsg,
        role: 'assistant',
        type: 'text',
        tool_calls: [],
        usage,
        finishReason: 'error',
      };
    }
  }
}
