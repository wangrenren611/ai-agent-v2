/**
 * Standard Adapter
 * 
 * 标准 OpenAI API 格式适配器
 */

import { BaseAPIAdapter, type TransformOptions } from './base';
import type { Message } from '../types';

export class StandardAdapter extends BaseAPIAdapter {
  private endpointPath: string;
  private defaultModel: string;

  constructor(options: { endpointPath: string; defaultModel: string }) {
    super();
    this.endpointPath = options.endpointPath;
    this.defaultModel = options.defaultModel;
  }

  transformRequest(messages: Message[], options: TransformOptions): Record<string, unknown> {
    const cleanedMessages = messages
      .map(m => this.cleanMessage(m))
      .filter(m => this.isMessageUsable(m));

    const body: Record<string, unknown> = {
      model: options.model || this.defaultModel,
      messages: cleanedMessages,
    };

    if (options.max_tokens !== undefined) body.max_tokens = options.max_tokens;
    if (options.temperature !== undefined) body.temperature = options.temperature;
    if (options.stream !== undefined) body.stream = options.stream;
    if (options.tools?.length) {
      body.tools = options.tools.map(t => ({
        type: t.type,
        function: t.function,
      }));
    }

    return this.enrichRequestBody(body, options);
  }

  protected enrichRequestBody(body: Record<string, unknown>, _options: TransformOptions): Record<string, unknown> {
    return body;
  }

  transformResponse(response: unknown): Record<string, unknown> {
    const resp = response as Record<string, unknown>;
    const choice = (resp.choices as Record<string, unknown>[])?.[0];
    const message = choice?.message as Record<string, unknown>;
    const usage = resp.usage as { prompt_tokens: number; completion_tokens: number; total_tokens: number };

    return {
      content: (message?.content as string) || '',
      tool_calls: message?.tool_calls,
      finish_reason: (choice?.finish_reason as string) || undefined,
      usage: usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }

  getHeaders(apiKey: string): Headers {
    return new Headers({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    });
  }

  getEndpointPath(): string {
    return this.endpointPath;
  }
}
