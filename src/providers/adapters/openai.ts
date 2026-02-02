/**
 * OpenAI Adapter
 */

import { StandardAdapter } from './standard';
import type { TransformOptions } from './base';
import type { Message } from '../types';

export class OpenAIAdapter extends StandardAdapter {
  constructor() {
    super({
      endpointPath: '/chat/completions',
      defaultModel: 'gpt-4o',
    });
  }

  protected enrichRequestBody(body: Record<string, unknown>, options: TransformOptions): Record<string, unknown> {
    // 添加 reasoning_split 标志（Kimi 兼容）
    if (options.enableReasoningSplit !== false) {
      body.reasoning_split = true;
    }

    // 添加额外请求体字段
    if (options.extraBody) {
      Object.assign(body, options.extraBody);
    }

    return body;
  }

  protected cleanMessageWithReasoning(msg: Message): Record<string, unknown> {
    const base: Record<string, unknown> = {
      role: msg.role,
      content: msg.content || '',
    };

    if (msg.tool_call_id) base.tool_call_id = msg.tool_call_id;
    if (msg.tool_calls?.length) base.tool_calls = msg.tool_calls;

    // Kimi 要求 tool_call 消息携带 reasoning_content
    if (msg.reasoning_content !== undefined) {
      base.reasoning_content = msg.reasoning_content;
    } else if (msg.tool_calls?.length && msg.role === 'assistant') {
      base.reasoning_content =
        typeof msg.content === 'string'
          ? msg.content
          : Array.isArray(msg.content)
            ? msg.content.map((p: any) => p?.text ?? '').join('')
            : '';
    }

    return base;
  }

  transformRequest(messages: Message[], options: TransformOptions): Record<string, unknown> {
    // 先构建基础 body
    const cleanedMessages = messages
      .map(m => this.cleanMessageWithReasoning(m))
      .filter(m => m.content || (m.tool_calls as any[])?.length || m.tool_call_id);

    const body: Record<string, unknown> = {
      model: options.model || 'gpt-4o',
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
}
