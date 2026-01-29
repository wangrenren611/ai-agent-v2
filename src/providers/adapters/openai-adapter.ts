/**
 * OpenAI-Compatible API Adapter
 *
 * Handles the standard OpenAI API format used by most providers:
 * - OpenAI
 * - Kimi (Moonshot AI)
 * - DeepSeek
 * - Qwen
 */

import { StandardAdapter, StandardTransformOptions } from './standard-adapter';
import { Message } from '../providers/base';

export interface OpenAIAdapterOptions {
  /** Endpoint path override */
  endpointPath?: string;
  /** Organization ID (OpenAI only) */
  organization?: string;
  /** Custom API key header name */
  apiKeyHeader?: string;
  /** API key prefix (default: 'Bearer'; set '' to omit) */
  apiKeyPrefix?: string;
  /** Additional static headers */
  defaultHeaders?: Record<string, string>;
}

export interface OpenAITransformOptions extends StandardTransformOptions {
  /** Extra fixed body fields */
  extraBody?: Record<string, unknown>;
  /** Whether to send reasoning_split flag (default true) */
  enableReasoningSplit?: boolean;
}

/**
 * OpenAI-compatible adapter
 *
 * Extends StandardAdapter with OpenAI-specific features like reasoning_split.
 */
export class OpenAIAdapter extends StandardAdapter {
  readonly organization?: string;
  readonly apiKeyHeader?: string;
  readonly apiKeyPrefix?: string;
  readonly defaultHeaders?: Record<string, string>;

  constructor(options: OpenAIAdapterOptions = {}) {
    super({
      endpointPath: options.endpointPath ?? '/chat/completions',
      defaultModel: 'gpt-4o',
    });
    this.organization = options.organization;
    this.apiKeyHeader = options.apiKeyHeader;
    this.apiKeyPrefix = options.apiKeyPrefix;
    this.defaultHeaders = options.defaultHeaders;
  }

  protected enrichRequestBody(body: any, options?: OpenAITransformOptions): any {
    // Add reasoning_split flag for Kimi compatibility
    if (options?.enableReasoningSplit !== false) {
      body.reasoning_split = true;
    }

    // Add extra body fields if provided
    if (options?.extraBody) {
      Object.assign(body, options.extraBody);
    }

    return body;
  }

  getHeaders(apiKey: string): Headers {
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

  /** Kimi 等要求 tool_call 消息必须携带 reasoning_content */
  protected cleanMessageWithReasoning(msg: Message): {
    role: string;
    content?: unknown;
    tool_call_id?: string;
    tool_calls?: Array<{
      id: string;
      type: string;
      function: { name: string; arguments: string };
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

  transformRequest(messages: Message[], options?: OpenAITransformOptions) {
    const body = super.transformRequest(messages, options);
    // Use cleanMessageWithReasoning for OpenAI-compatible format
    (body as any).messages = messages
      .map((msg) => this.cleanMessageWithReasoning(msg))
      .filter((msg) => this.isMessageUsable(msg));
    return body;
  }
}
