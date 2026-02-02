/**
 * Base API Adapter
 */

import type { Message, APIRequestBody, APIResponse, LLMOptions } from '../types';

export interface TransformOptions extends LLMOptions {
  model: string;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  extraBody?: Record<string, unknown>;
  enableReasoningSplit?: boolean;
}

export abstract class BaseAPIAdapter {
  /**
   * 转换请求
   */
  abstract transformRequest(messages: Message[], options: TransformOptions): Record<string, unknown>;

  /**
   * 转换响应
   */
  abstract transformResponse(response: unknown): Record<string, unknown>;

  /**
   * 获取请求头
   */
  abstract getHeaders(apiKey: string): Headers;

  /**
   * 获取端点路径
   */
  abstract getEndpointPath(): string;

  /**
   * 检查消息是否可用
   */
  protected isMessageUsable(msg: {
    role: string;
    content?: unknown;
    tool_call_id?: string;
    tool_calls?: unknown[];
  }): boolean {
    if (!msg) return false;

    const hasContent =
      msg.content !== undefined &&
      msg.content !== null &&
      (typeof msg.content !== 'string' || msg.content !== '') &&
      (!Array.isArray(msg.content) || msg.content.length > 0);

    const hasToolCalls = Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0;
    const hasToolCallId = Boolean(msg.tool_call_id);

    return hasContent || hasToolCalls || hasToolCallId;
  }

  /**
   * 清理消息（移除内部字段）
   */
  protected cleanMessage(msg: Message): {
    role: string;
    content?: unknown;
    tool_call_id?: string;
    tool_calls?: unknown[];
    reasoning_content?: string;
  } {
    const cleaned: Record<string, unknown> = {
      role: msg.role,
      content: msg.content || '',
    };

    if (msg.tool_call_id) cleaned.tool_call_id = msg.tool_call_id;
    if (msg.tool_calls?.length) cleaned.tool_calls = msg.tool_calls;
    if (msg.reasoning_content) cleaned.reasoning_content = msg.reasoning_content;

    return cleaned as {
      role: string;
      content?: unknown;
      tool_call_id?: string;
      tool_calls?: unknown[];
      reasoning_content?: string;
    };
  }
}
