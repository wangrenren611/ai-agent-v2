/**
 * Base API Adapter
 *
 * Abstract base class for API adapters that handle provider-specific
 * request/response transformations.
 */

import { Message, LLMOptions, LLMResponse, MessageContent } from '../providers/base';

/**
 * Standard request body format for LLM APIs
 */
export interface APIRequestBody {
  model: string;
  messages: Array<{
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
  }>;
  max_tokens?: number | undefined;
  temperature?: number | undefined;
  stream?: boolean | undefined;
  tools?: Array<{
    type: string;
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }> | undefined;
  [key: string]: unknown;
}

/**
 * Standard API response format
 */
export interface APIResponse {
  content: string | unknown;
  /** Kimi 等模型可能额外返回的思考字段 */
  reasoning_content?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  finish_reason?: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Abstract base class for API adapters
 *
 * Adapters handle provider-specific differences in:
 * - Request format (body structure, authentication)
 * - Response format (parsing different response structures)
 * - Endpoint paths
 */
export abstract class BaseAPIAdapter {
  /**
   * Transform messages and options into provider-specific request body
   */
  abstract transformRequest(
    messages: Message[],
    options?: LLMOptions
  ): APIRequestBody;

  /**
   * Transform provider-specific response into standard format
   */
  abstract transformResponse(response: unknown): APIResponse;

  /**
   * Get HTTP headers for the request (including authentication)
   */
  abstract getHeaders(apiKey: string, config?: Record<string, unknown>): Headers;

  /**
   * Get the endpoint path for chat completions
   * e.g., '/v1/chat/completions' or '/api/paas/v4/chat/completions'
   */
  abstract getEndpointPath(): string;

  /**
   * Utility: check whether cleaned message should be sent
   */
  protected isMessageUsable(msg: {
    role: string;
    content?: unknown;
    tool_call_id?: string;
    tool_calls?: Array<{
      id: string;
      type: string;
      function: { name: string; arguments: string };
    }>;
  }): boolean {
    if (!msg) return false;
    const hasContent =
      msg.content !== undefined &&
      msg.content !== null &&
      (typeof msg.content !== 'string' || msg.content !== '') &&
      (!(Array.isArray(msg.content)) || msg.content.length > 0);
    const hasToolCalls = Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0;
    const hasToolCallId = Boolean(msg.tool_call_id);
    return hasContent || hasToolCalls || hasToolCallId;
  }

  /**
   * Clean message for API request (remove internal fields)
   */
  protected cleanMessage(msg: Message): {
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
  } {
    const cleaned: {
      role: string;
      content: MessageContent;
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
    } = {
      role: msg.role,
      content: msg.content || '',
      reasoning_content: msg.reasoning_content || '',
    };

    if (msg.tool_call_id) {
      cleaned.tool_call_id = msg.tool_call_id;
    }

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      cleaned.tool_calls = msg.tool_calls;
    }
    if (msg.reasoning_content) {
      cleaned.reasoning_content = msg.reasoning_content;
    }
    
    return cleaned;
  }
}
