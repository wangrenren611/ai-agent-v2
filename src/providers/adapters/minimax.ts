/**
 * MiniMax Adapter
 */

import { BaseAPIAdapter, type TransformOptions } from './base';
import type { Message } from '../types';

export class MiniMaxAdapter extends BaseAPIAdapter {
  transformRequest(messages: Message[], options: TransformOptions): Record<string, unknown> {
    const cleanedMessages = messages
      .map(m => this.cleanMessage(m))
      .filter(m => this.isMessageUsable(m));

    return {
      model: options.model,
      messages: cleanedMessages,
      max_tokens: options.max_tokens,
      temperature: options.temperature,
      stream: options.stream,
    };
  }

  transformResponse(response: unknown): Record<string, unknown> {
    const resp = response as Record<string, unknown>;
    const choice = (resp.choices as Record<string, unknown>[])?.[0];
    const message = choice?.message as Record<string, unknown>;

    return {
      content: (message?.content as string) || '',
      finish_reason: (choice?.finish_reason as string) || undefined,
      usage: (resp.usage as { prompt_tokens: number; completion_tokens: number; total_tokens: number }) || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  }

  getHeaders(apiKey: string): Headers {
    return new Headers({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    });
  }

  getEndpointPath(): string {
    return '/text/chatcompletion_v2';
  }
}
