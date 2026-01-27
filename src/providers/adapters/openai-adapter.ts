/**
 * OpenAI-Compatible API Adapter
 *
 * Handles the standard OpenAI API format used by most providers:
 * - OpenAI
 * - Kimi (Moonshot AI)
 * - DeepSeek
 * - Qwen
 * - GLM (with custom endpoint path)
 */

import { BaseAPIAdapter, APIRequestBody, APIResponse } from './base-adapter.js';
import { Message, LLMOptions } from '../base.js';
import { DEFAULT_TEMPERATURE } from '../../agent/types.js';

export interface OpenAIAdapterOptions {
  /** Endpoint path override (e.g., '/api/paas/v4/chat/completions') */
  endpointPath?: string;
  /** Organization ID (OpenAI only) */
  organization?: string;
  /** Custom API key header name (e.g., 'api-key' for Azure) */
  apiKeyHeader?: string;
  /** API key prefix (default: 'Bearer'; set '' to omit) */
  apiKeyPrefix?: string;
  /** Additional static headers */
  defaultHeaders?: Record<string, string>;
}

export interface OpenAITransformOptions extends LLMOptions {
  /** Extra fixed body fields */
  extraBody?: Record<string, unknown>;
  /** Whether to send reasoning_split flag (default true) */
  enableReasoningSplit?: boolean;
}

/**
 * OpenAI-compatible adapter
 *
 * Used by providers that follow the OpenAI API format.
 */
export class OpenAIAdapter extends BaseAPIAdapter {
  readonly endpointPath: string;
  readonly organization?: string;
  readonly apiKeyHeader?: string;
  readonly apiKeyPrefix?: string;
  readonly defaultHeaders?: Record<string, string>;

  constructor(options: OpenAIAdapterOptions = {}) {
    super();
    this.endpointPath = options.endpointPath ?? '/v1/chat/completions';
    this.organization = options.organization;
    this.apiKeyHeader = options.apiKeyHeader;
    this.apiKeyPrefix = options.apiKeyPrefix;
    this.defaultHeaders = options.defaultHeaders;
  }

  transformRequest(messages: Message[], options?: OpenAITransformOptions): APIRequestBody {
    const body: APIRequestBody = {
      model: options?.model || 'gpt-4o-mini',
      messages: messages
        .map((msg) => this.cleanMessageWithReasoning(msg))
        .filter((msg) => this.isMessageUsable(msg)) as Array<{
          role: string;
          content?: unknown;
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

    if (options?.enableReasoningSplit !== false) {
      (body as any).reasoning_split = true;
    }

    if (options?.extraBody) {
      Object.assign(body, options.extraBody);
    }

    return body;
  }

  transformResponse(response: unknown): APIResponse {
    const data = response as {
      choices: Array<{
        index: number;
        message?: {
          role: string;
          content: string | null | Array<{ type?: string; text?: string; image_url?: { url: string } }>;
          reasoning_content?: string;
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
    const message = choice.message || {
      role: choice.role || 'assistant',
      content: choice.content || '',
    };
    const reasoningContent = (message as any).reasoning_content;
    const normalized = this.normalizeContent(message.content ?? choice.content ?? '');
    const content =
      (typeof normalized === 'string' ? normalized : normalized ?? '') ||
      (typeof reasoningContent === 'string' ? reasoningContent : '');
   
    return {
      content,
      reasoning_content: typeof reasoningContent === 'string' ? reasoningContent : undefined,
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

  getHeaders(apiKey: string, config?: Record<string, unknown>): Headers {
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...(this.defaultHeaders || {}),
    });

    const headerName = this.apiKeyHeader || 'Authorization';
    const prefix = this.apiKeyPrefix ?? 'Bearer';

    if (headerName && apiKey) {
      const value = prefix ? `${prefix} ${apiKey}`.trim() : apiKey;
      headers.set(headerName, value);
    }

    if (this.organization) {
      headers.set('OpenAI-Organization', this.organization);
    }

    return headers;
  }

  getEndpointPath(): string {
    return this.endpointPath;
  }

  private normalizeContent(
    content: string | null | Array<{ type?: string; text?: string; image_url?: { url: string } }> | undefined
  ): string | Array<{ type?: string; text?: string; image_url?: { url: string } }> {
    if (content === null || content === undefined) return '';
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) return content;
    return '';
  }

  /** Kimi 等要求 tool_call 消息必须携带 reasoning_content */
  protected cleanMessageWithReasoning(msg: Message): {
    role: string;
    content?: unknown;
    tool_call_id?: string;
    tool_calls?: Array<{
      id: string;
      type: string;
      function: {
        name: string;
        arguments: string;
      };
    }>;
    reasoning_content?: string;
  } {
    const base = super.cleanMessage(msg) as any;
    if (msg.reasoning_content !== undefined) {
      base.reasoning_content = msg.reasoning_content;
    } else if (base.tool_calls && base.tool_calls.length > 0 && msg.role === 'assistant') {
      // 默认用文本内容兜底，避免 Kimi 报错
      base.reasoning_content =
        typeof msg.content === 'string'
          ? msg.content
          : Array.isArray(msg.content)
            ? msg.content.map((p: any) => p?.text ?? '').join('')
            : '';
    }
    return base;
  }
}
