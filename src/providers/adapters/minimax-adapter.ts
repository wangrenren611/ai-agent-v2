/**
 * MiniMax API Adapter
 *
 * Handles MiniMax-specific API differences:
 * - Custom authentication format: Bearer {GroupId}.{ApiKey}
 * - Different endpoint path: /v1/text/chatcompletion_v2
 */

import { StandardAdapter, StandardTransformOptions } from './standard-adapter';

export interface MiniMaxAdapterOptions {
  /** Group ID for authentication */
  groupId?: string;
}

export interface MiniMaxTransformOptions extends StandardTransformOptions {
  /** Model name (for request body) */
  model?: string;
}

/**
 * MiniMax adapter
 *
 * Extends StandardAdapter with custom authentication format.
 */
export class MiniMaxAdapter extends StandardAdapter {
  readonly groupId?: string;

  constructor(options: MiniMaxAdapterOptions = {}) {
    super({
      endpointPath: '/v1/text/chatcompletion_v2',
      defaultModel: 'MiniMax-M2.1',
    });
    this.groupId = options.groupId;
  }

  getHeaders(apiKey: string): Headers {
    const groupId = this.groupId || '';

    // MiniMax uses custom auth format: Bearer {GroupId}.{ApiKey}
    const authorization = groupId
      ? `Bearer ${groupId}.${apiKey}`
      : `Bearer ${apiKey}`;

    return new Headers({
      'Content-Type': 'application/json',
      'Authorization': authorization,
    });
  }

  /**
   * Override to handle MiniMax's alternative response format
   */
  transformResponse(response: unknown) {
    const data = response as {
      choices?: Array<{
        index: number;
        message?: {
          role: string;
          content: string | null;
          tool_calls?: Array<{
            id: string;
            type: 'function';
            function: { name: string; arguments: string };
          }>;
        };
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

    // Handle standard format with reply field
    if (!data.choices || data.choices.length === 0) {
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

    // Use standard response transformation
    return super.transformResponse(response);
  }
}
