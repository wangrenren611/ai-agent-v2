/**
 * OpenAI Compatible Provider
 * 
 * 通用 OpenAI 兼容 Provider 实现，配合 Adapter 支持多家服务
 */

import type {
  BaseProviderConfig,
  LLMResponse,
  LLMOptions,
  Message,
  StreamChunk,
  ToolCall,
} from './types';
import type { BaseAPIAdapter } from './adapters/base';
import { HTTPClient } from './http/client';
import { StreamParser } from './http/stream-parser';
import { LLMError } from './utils/errors';
import { OpenAIAdapter } from './adapters/openai-adapter';

export interface OpenAICompatibleConfig extends BaseProviderConfig {
  organization?: string;
  apiKeyHeader?: string;
  apiKeyPrefix?: string;
  defaultHeaders?: Record<string, string>;
  extraBody?: Record<string, unknown>;
  enableReasoningSplit?: boolean;
}

export class OpenAICompatibleProvider {
  readonly config: OpenAICompatibleConfig;
  private httpClient: HTTPClient;
  private adapter: any;

  constructor(config: OpenAICompatibleConfig, adapter?: any) {
    this.config = {
      ...config,
      baseURL: config.baseURL.replace(/\/$/, ''),
    };
    this.adapter = adapter ?? new OpenAIAdapter();
    this.httpClient = new HTTPClient({
      timeout: config.timeout,
      maxRetries: config.maxRetries,
      debug: config.debug,
    });
  }

  /**
   * 生成响应
   */
  async generate(messages: Message[], options?: LLMOptions): Promise<LLMResponse | null> {
    if (messages.length === 0) return null;

    const requestBody = this.buildRequestBody(messages, options);
    const url = this.buildUrl();
    const headers = this.buildHeaders();

    return options?.stream
      ? this.generateStream(url, requestBody, headers, options)
      : this.generateNonStream(url, requestBody, headers, options);
  }

  /**
   * 构建请求体
   */
  private buildRequestBody(messages: Message[], options?: LLMOptions): Record<string, unknown> {
    return this.adapter.transformRequest(messages, {
      model: this.config.model,
      max_tokens: options?.maxOutputTokens || this.config.maxOutputTokens,
      temperature: options?.temperature ?? this.config.temperature,
      stream: options?.stream ?? false,
      tools: options?.tools,
      extraBody: this.config.extraBody,
      enableReasoningSplit: this.config.enableReasoningSplit,
    });
  }

  /**
   * 构建请求 URL
   */
  private buildUrl(): string {
    return `${this.config.baseURL}${this.adapter.getEndpointPath()}`;
  }

  /**
   * 构建请求头
   */
  private buildHeaders(): Headers {
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...this.config.defaultHeaders,
    });
    
    // Debug
    if (this.config.debug) {
      console.log('[OpenAICompatibleProvider] Building headers with apiKey:', this.config.apiKey ? '***' : 'none');
      console.log('[OpenAICompatibleProvider] defaultHeaders:', this.config.defaultHeaders);
    }

    const headerName = this.config.apiKeyHeader || 'Authorization';
    const prefix = this.config.apiKeyPrefix ?? 'Bearer';

    if (this.config.apiKey) {
      const value = prefix ? `${prefix} ${this.config.apiKey}`.trim() : this.config.apiKey;
      headers.set(headerName, value);
    }

    if (this.config.organization) {
      headers.set('OpenAI-Organization', this.config.organization);
    }

    return headers;
  }

  /**
   * 非流式生成
   */
  private async generateNonStream(
    url: string,
    body: Record<string, unknown>,
    headers: Headers,
    options?: LLMOptions
  ): Promise<LLMResponse> {
    // Debug: log headers
    if (this.config.debug) {
      const headerObj: Record<string, string> = {};
      headers.forEach((value, key) => { headerObj[key] = value; });
      console.log('[OpenAICompatibleProvider] Headers:', headerObj);
    }
    
    const response = await this.httpClient.fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: options?.abortSignal,
    });

    const data = await response.json();
    const apiResponse = this.adapter.transformResponse(data);

    return {
      content: String(apiResponse.content || ''),
      role: 'assistant',
      type: 'text',
      tool_calls: (apiResponse.tool_calls as ToolCall[] | undefined)?.length ? apiResponse.tool_calls as ToolCall[] : undefined,
      usage: (apiResponse.usage as { prompt_tokens: number; completion_tokens: number; total_tokens: number }) || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      finishReason: apiResponse.finish_reason as string | undefined,
    };
  }

  /**
   * 流式生成
   */
  private async generateStream(
    url: string,
    body: Record<string, unknown>,
    headers: Headers,
    options: LLMOptions
  ): Promise<LLMResponse> {
    const response = await this.httpClient.fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: options.abortSignal,
    });

    if (!response.body) {
      throw new LLMError('Response body is not readable', 'NO_BODY');
    }

    const reader = response.body.getReader();
    let content = '';
    const toolCallsMap = new Map<number, ToolCall>();
    let finishReason: string | undefined;

    await StreamParser.parse(reader, {
      onContent: (chunk) => {
        content += chunk;
        options.streamCallback?.({ content: chunk });
      },
      onToolCall: (tc) => {
        const existing = toolCallsMap.get(tc.index);
        toolCallsMap.set(tc.index, {
          id: existing?.id || tc.id || '',
          type: 'function',
          function: {
            name: existing?.function.name || tc.function.name || '',
            arguments: (existing?.function.arguments || '') + (tc.function.arguments || ''),
          },
        });

        options.streamCallback?.({
          tool_calls: [{
            index: tc.index,
            delta: {
              function: tc.function,
            },
          }],
        });
      },
      onFinish: (reason) => {
        finishReason = reason || undefined;
        options.streamCallback?.({ finish_reason: reason || undefined });
      },
    });

    const hasToolCalls = toolCallsMap.size > 0;

    return {
      content,
      role: 'assistant',
      type: 'text',
      tool_calls: hasToolCalls ? [...toolCallsMap.values()] : undefined,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      finishReason,
    };
  }
}
