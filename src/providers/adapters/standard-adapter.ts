/**
 * Standard OpenAI-Compatible Adapter
 *
 * Provides base implementation for common OpenAI-compatible operations.
 * Specific adapters can override methods as needed.
 */

import { BaseAPIAdapter, APIRequestBody, APIResponse } from './base-adapter';
import { Message, LLMOptions } from '../providers/base';
import { DEFAULT_TEMPERATURE } from '../../agent/types';

export interface StandardTransformOptions extends LLMOptions {
  /** Model name (for request body) */
  model?: string;
  /** Default model to use if not specified */
  defaultModel?: string;
}

/**
 * Standard adapter for OpenAI-compatible APIs
 *
 * Handles common request/response transformation logic.
 * Subclasses can override specific methods for custom behavior.
 */
export class StandardAdapter extends BaseAPIAdapter {
  readonly endpointPath: string;
  readonly defaultModel: string;

  constructor(options: { endpointPath?: string; defaultModel?: string } = {}) {
    super();
    this.endpointPath = options.endpointPath ?? '/chat/completions';
    this.defaultModel = options.defaultModel ?? 'gpt-4o';
  }

  /**
   * Transform request - base implementation
   */
  transformRequest(messages: Message[], options?: StandardTransformOptions): APIRequestBody {
    const body: APIRequestBody = {
      model: options?.model || this.defaultModel,
      messages: messages
        .map((msg) => this.cleanMessage(msg))
        .filter((msg) => this.isMessageUsable(msg)) as Array<{
          role: string;
          content?: unknown;
          tool_call_id?: string;
          tool_calls?: Array<{
            id: string;
            type: string;
            function: { name: string; arguments: string };
          }>;
        }>,
      max_tokens: options?.maxTokens,
      temperature: options?.temperature ?? DEFAULT_TEMPERATURE,
      stream: options?.stream ?? false,
    };

    // Add tools if provided
    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools;
    }

    // Allow subclasses to add custom transformations
    return this.enrichRequestBody(body, options);
  }

  /**
   * Hook for subclasses to add custom fields to request body
   * Override this method to add provider-specific fields.
   */
  protected enrichRequestBody(body: APIRequestBody, _options?: StandardTransformOptions): APIRequestBody {
    return body;
  }

  /**
   * Transform response - base implementation
   */
  transformResponse(response: unknown): APIResponse {
    const data = response as {
      choices: Array<{
        index: number;
        message?: {
          role: string;
          content: string | null;
          reasoning_content?: string;
          tool_calls?: Array<{
            id: string;
            type: 'function';
            function: { name: string; arguments: string };
          }>;
        };
        finish_reason?: string;
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    if (!data.choices || data.choices.length === 0) {
      throw new Error('Empty choices in response');
    }

    const choice = data.choices[0];
    const message = choice.message ?? {
      role: 'assistant',
      content: null,
    };

    return {
      content: message.content ?? '',
      reasoning_content: message.reasoning_content,
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
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0,
      },
    };
  }

  /**
   * Get standard HTTP headers
   */
  getHeaders(apiKey: string): Headers {
    return new Headers({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    });
  }

  /**
   * Get endpoint path
   */
  getEndpointPath(): string {
    return this.endpointPath;
  }
}
