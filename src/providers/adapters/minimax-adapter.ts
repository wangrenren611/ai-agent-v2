/**
 * MiniMax API Adapter
 *
 * Handles MiniMax-specific API differences:
 * - Custom authentication format: Bearer {GroupId}.{ApiKey}
 * - Different endpoint path: /v1/text/chatcompletion_v2
 */

import { BaseAPIAdapter, APIRequestBody, APIResponse } from './base-adapter.js';
import { Message, LLMOptions } from '../base.js';
import { DEFAULT_TEMPERATURE } from '../../agent/types.js';

export interface MiniMaxAdapterOptions {
  /** Group ID for authentication */
  groupId?: string;
}

/**
 * MiniMax adapter
 *
 * MiniMax uses a custom authentication format and different endpoint.
 */
export class MiniMaxAdapter extends BaseAPIAdapter {
  readonly groupId?: string;

  constructor(options: MiniMaxAdapterOptions = {}) {
    super();
    this.groupId = options.groupId;
  }

  transformRequest(messages: Message[], options?: LLMOptions): APIRequestBody {
    const body: APIRequestBody = {
      model: options?.model || 'abab6.5s-chat',
      messages: messages
        .map((msg) => this.cleanMessage(msg))
        .filter((msg) => this.isMessageUsable(msg)) as Array<{
          role: string;
          content?: string | null;
          tool_call_id?: string;
          tool_calls?: Array<{
            id: string;
            type: string;
            function: {
              name: string;
              arguments: string;
            };
          }>;
        }>,
      max_tokens: options?.max_tokens,
      temperature: options?.temperature ?? DEFAULT_TEMPERATURE,
      stream: options?.stream ?? false,
    };

    // Add tools if provided
    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools;
    }

    return body;
  }

  transformResponse(response: unknown): APIResponse {
    // MiniMax response format may differ slightly
    const data = response as {
      choices?: Array<{
        index: number;
        message?: {
          role: string;
          content: string | null;
          tool_calls?: Array<{
            id: string;
            type: 'function';
            function: {
              name: string;
              arguments: string;
            };
          }>;
        };
        content?: string;
        role?: string;
        finish_reason?: string;
      }>;
      base_resp?: {
        status_code: number;
        status_msg: string;
      };
      usage?: {
        total_tokens?: number;
      };
      // Alternative MiniMax format
      reply?: string;
      // Some MiniMax responses use different structure
      messages?: Array<{
        sender_type: string;
        text: string;
      }>;
    };

    // Handle alternative MiniMax response format
    if (data.messages && data.messages.length > 0) {
      const lastMessage = data.messages[data.messages.length - 1];
      if (lastMessage.sender_type === 'BOT' || lastMessage.sender_type === 'assistant') {
        return {
          content: lastMessage.text,
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: data.usage?.total_tokens || 0,
          },
        };
      }
    }

    // Handle standard OpenAI-compatible format
    if (!data.choices || data.choices.length === 0) {
      // If there's a reply field, use it
      if (data.reply) {
        return {
          content: data.reply,
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: data.usage?.total_tokens || 0,
          },
        };
      }

      throw new Error('Empty choices in response');
    }

    const choice = data.choices[0];
    const message = choice.message || {
      role: choice.role || 'assistant',
      content: choice.content || ''
    };

    return {
      content: message.content || choice.content || '',
      tool_calls: message.tool_calls?.map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
      finish_reason: choice.finish_reason,
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: data.usage?.total_tokens || 0,
      },
    };
  }

  getHeaders(apiKey: string, config?: Record<string, unknown>): Headers {
    const groupId = this.groupId || (config?.groupId as string) || '';

    // MiniMax uses custom auth format: Bearer {GroupId}.{ApiKey}
    const authorization = groupId
      ? `Bearer ${groupId}.${apiKey}`
      : `Bearer ${apiKey}`;

    return new Headers({
      'Content-Type': 'application/json',
      'Authorization': authorization,
    });
  }

  getEndpointPath(): string {
    return '/v1/text/chatcompletion_v2';
  }
}
