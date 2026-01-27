/**
 * OpenAI/LLM Provider Implementation
 *
 * Supports OpenAI-compatible API endpoints (OpenAI, Azure, DeepSeek, MiniMax, etc.)
 */

import {
  LLMProvider,
  LLMResponse,
  LLMOptions,
  Message,
} from './base';
import {
  LLMError,
  createErrorFromStatus,
} from './errors';
import fs from 'fs';
// =============================================================================
// 类型定义
// =============================================================================

/**
 * API 响应类型定义
 * 支持 OpenAI 标准格式和 MiniMax 变体格式
 */
interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message?: {
      role: string;
      content: string | null;
      type?: 'text' | 'tool_call' | 'audio';
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
    finish_reason?: 'stop' | 'length' | 'content_filter' | 'tool_calls' | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    total_characters?: number;
    completion_tokens_details?: {
      reasoning_tokens?: number;
    };
  };
}

/**
 * SSE stream chunk from OpenAI
 */
interface StreamChunkData {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta?: {
      content?: string;
      role?: string;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        index: number;
        function: {
          name?: string;
          arguments?: string;
        };
      }>;
      audio?: unknown;
    };
    message?: {
      content?: string;
      role?: string;
    };
    finish_reason?: 'stop' | 'length' | 'content_filter' | 'tool_calls' | null;
  }>;
}

/**
 * 累积的工具调用
 */
interface AccumulatedToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// =============================================================================
// 常量定义
// =============================================================================

const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MAX_TOKENS = 200 * 1000;
const DEFAULT_MAX_OUTPUT_TOKENS = 8000;
const DEFAULT_TEMPERATURE = 0.1;
const CHAT_COMPLETIONS_PATH = '/chat/completions';

// =============================================================================
// 工具函数
// =============================================================================

function createHeaders(apiKey: string, organization?: string): Headers {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  });
  if (organization) {
    headers.set('OpenAI-Organization', organization);
  }
  return headers;
}

function cleanMessage(msg: Message): Record<string, unknown> {

  const cleaned: Record<string, unknown> = {
    role: msg.role,
    content: msg.content,
  };
  if (msg.tool_call_id) {
    cleaned.tool_call_id = msg.tool_call_id;
  }
  if (msg.tool_calls && msg.tool_calls.length > 0) {
    cleaned.tool_calls = msg.tool_calls;
  }
  return cleaned;
}

function parseSseLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith(':')) {
    return null;
  }
  if (trimmed.startsWith('data: ')) {
    return trimmed.slice(6).trim();
  }
  if (trimmed.startsWith('{')) {
    return trimmed;
  }
  return null;
}

function isStreamEnd(data: string): boolean {
  return data === '[DONE]';
}

function safeJsonParse<T>(data: string): T | null {
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

// =============================================================================
// OpenAI Provider
// =============================================================================

export interface OpenAIConfig {
  apiKey: string;
  baseURL?: string;
  model?: string;
  maxTokens?: number;
  maxOutputTokens?: number;
  temperature?: number;
  organization?: string;
}

export class OpenAIProvider extends LLMProvider {
  readonly baseURL: string;
  readonly organization?: string;
  readonly maxOutputTokens: number;

  get model(): string {
    return this.config.model || DEFAULT_MODEL;
  }

  get maxTokens(): number {
    return this.config.maxTokens || DEFAULT_MAX_TOKENS;
  }

  constructor(config: OpenAIConfig) {
    super({
      apiKey: config.apiKey,
      model: config.model || DEFAULT_MODEL,
      maxTokens: config.maxTokens || DEFAULT_MAX_TOKENS,
      temperature: config.temperature ?? DEFAULT_TEMPERATURE,
    });

    this.baseURL = config.baseURL?.replace(/\/$/, '') || DEFAULT_BASE_URL;
    this.organization = config.organization;
    this.maxOutputTokens = config.maxOutputTokens || DEFAULT_MAX_OUTPUT_TOKENS;
  }

  async generate(
    messages: Message[],
    options?: LLMOptions
  ): Promise<LLMResponse | null> {
    if (messages.length === 0) {
      return null;
    }

    const requestBody = this.buildRequestBody({
      messages,
      model: options?.model,
      maxTokens: options?.max_tokens,
      temperature: options?.temperature,
      tools: options?.tools,
      stream: options?.stream,
    });

    if (options?.stream) {
      return await this.generateStream(requestBody, options.streamCallback, options?.abortSignal);
    }

    return await this.generateNonStream(requestBody, options?.abortSignal);
  }

  private buildRequestBody(params: {
    messages: Message[];
    model?: string;
    maxTokens?: number;
    temperature?: number;
    tools?: LLMOptions['tools'];
    stream?: boolean;
  }): Record<string, unknown> {
    const { messages, model, maxTokens, temperature, tools, stream } = params;

    const body: Record<string, unknown> = {
      model: model || this.model,
      messages: messages.map(cleanMessage).filter((msg: Record<string, any>) => msg !== null || msg?.content !== ''),
      max_tokens: maxTokens || this.maxOutputTokens,
      temperature: temperature ?? DEFAULT_TEMPERATURE,
      stream: stream ?? false,
      reasoning_split: true,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
    }
    
    fs.writeFileSync('./openai_request.json', JSON.stringify(body, null, 2));
    return body;
  }

  private async fetchCompletion(body: Record<string, unknown>, abortSignal?: AbortSignal): Promise<Response> {
    const url = `${this.baseURL}${CHAT_COMPLETIONS_PATH}`;

    // 打印请求详情用于调试
    console.log('=== API Request ===');
    console.log('URL:', url);
    console.log('Model:', body.model);

    const response = await fetch(url, {
      method: 'POST',
      headers: createHeaders(this.config.apiKey || '', this.organization),
      body: JSON.stringify(body),
      signal: abortSignal,
    });

    console.log('=== API Response ===');
    console.log('Status:', response.status,);

    // 检查 HTTP 错误状态，并在非流式模式下抛出异常
    // 流式模式下会在 generateStream 中单独处理
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error Response Body:', errorText);

      // 检查是否是 AbortError
      if (abortSignal?.aborted) {
        const abortError = new LLMError('Request was aborted', 'ABORTED');
        throw abortError;
      }

      // 根据状态码创建对应的错误
      throw createErrorFromStatus(response.status, response.statusText, errorText);
    }

    return response;
  }

  private async generateNonStream(requestBody: Record<string, unknown>, abortSignal?: AbortSignal): Promise<LLMResponse> {
 
    const response = await this.fetchCompletion(requestBody, abortSignal);
  
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as ChatCompletionResponse;

    if (!data.choices || data.choices.length === 0) {
      throw new Error('Empty choices in response');
    }

    const choice = data.choices[0];
    const message = choice.message || { role: choice.role || 'assistant', content: choice.content || '' };
    const content = message.content || choice.content || '';
    const finishReason = choice.finish_reason;




    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;
    const totalTokens = data.usage?.total_tokens || 0;

    if (totalTokens === 0 || (promptTokens === 0 && completionTokens === 0)) {
      throw new Error('API returned zero tokens - possible service malfunction or incomplete response');
    }

    // 🔧 修复: 只在完全无效时抛出错误（既没有 content 也没有 tool_calls 且 finishReason 不是 'stop'）
    const hasToolCalls = message?.tool_calls?.length > 0;
    if (!content && !hasToolCalls && finishReason !== 'stop') {
      throw new Error('Empty content in response without tool calls or stop reason');
    }

    // 如果是空 content + finishReason: 'stop'，发出警告但不抛出错误
    // 让 Agent 层的空响应处理逻辑来处理这种情况
    if (!content && !hasToolCalls && finishReason === 'stop') {
       console.warn('Empty response with finishReason: stop - this will be handled by Agent layer');
    }

    return {
      content: content,
      role: 'assistant',
      type: 'text',
      tool_calls: message.tool_calls?.map(tc => ({
        id: tc.id,
        type: tc.type,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
      },
      finishReason: finishReason || undefined,
    };
  }

  private async generateStream(
    requestBody: Record<string, unknown>,
    streamCallback?: LLMOptions['streamCallback'],
    abortSignal?: AbortSignal
  ): Promise<LLMResponse | null> {

    const response = await this.fetchCompletion(requestBody, abortSignal);
    // fetchCompletion 已经处理了 HTTP 错误，这里只需要检查 body
    
    if (!response.body) {
      throw new LLMError('Response body is not readable', 'NO_BODY');
    }

    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let accumulatedContent = '';
    const toolCallsMap = new Map<number, AccumulatedToolCall>();
    let finishReason: string | undefined;

    try {
      await this.processStream(reader, decoder, {
        onContent: (content) => {
          accumulatedContent += content;
          streamCallback?.({ content });
        },
        onToolCall: (toolCall) => {
          const existing = toolCallsMap.get(toolCall.index);
          toolCallsMap.set(toolCall.index, {
            id: existing?.id || toolCall.id || '',
            type: 'function',
            function: {
              name: existing?.function.name || toolCall.function.name || '',
              arguments: (existing?.function.arguments || '') + (toolCall.function.arguments || ''),
            },
          });
        },
        onFinish: (reason) => {
          finishReason = reason;
        },
      });
    } catch (error) {
      console.error('Stream processing error:', error);
      // 重新抛出异常，让上层 Agent 处理
      throw error;
    }

    // 🔧 P0 修复: 只检测完全无效的响应（既没有 content 也没有 tool_calls 且 finishReason 不是 'stop'）
    // 注意：空 content + finishReason: 'stop' 是有效的，由 Agent 层处理
    const hasToolCalls = toolCallsMap.size > 0;
    if (!accumulatedContent && !hasToolCalls && finishReason !== 'stop') {
      // 完全空的响应且不是正常结束
      console.warn('Stream ended with no content, no tool calls, and finishReason:', finishReason);
      throw new Error('Empty content in response without tool calls or stop reason');
    }

    // 如果是空 content + finishReason: 'stop'，发出警告但不抛出错误
    // 让 Agent 层的空响应处理逻辑来处理这种情况
    if (!accumulatedContent && !hasToolCalls && finishReason === 'stop') {
      console.warn('Stream ended with empty content and finishReason: stop - will be handled by Agent layer');
    }

    return {
      content: accumulatedContent || '',  // 确保返回空字符串而非 undefined
      role: 'assistant',
      type: 'text',
      tool_calls: hasToolCalls ? [...toolCallsMap.values()] : undefined,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      finishReason,
    };
  }

  private async processStream(
    reader: ReadableStreamDefaultReader,
    decoder: typeof TextDecoder.prototype,
    handlers: {
      onContent: (content: string) => void;
      onToolCall: (tc: { index: number; id?: string; type?: string; function: { name?: string; arguments?: string } }) => void;
      onFinish: (reason: string | undefined) => void;
    }
  ): Promise<void> {
    let buffer = '';
    let shouldStop = false;

    while (!shouldStop) {
      const { done, value } = await reader.read();
 
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/[\r\n]+/);
      buffer = lines.pop() || '';

      for (const line of lines) {
        const data = parseSseLine(line);

        if (!data) continue;
        
        
        if (isStreamEnd(data)) {
          shouldStop = true;
          break;
        }

        const chunk = safeJsonParse<StreamChunkData>(data);
        if (!chunk) continue;

        const choice = chunk.choices[0];
        const delta = choice.delta;
        const message = choice.message;

        const content = delta?.content || message?.content;
        if (content) {
          handlers.onContent(content);
        }

        const toolCallsDelta = delta?.tool_calls;
        if (toolCallsDelta && toolCallsDelta.length > 0) {
          for (const tc of toolCallsDelta) {
            handlers.onToolCall({
              index: tc.index,
              id: tc.id,
              type: tc.type,
              function: {
                name: tc.function.name,
                arguments: tc.function.arguments,
              },
            });
          }
        }

        const choiceFinishReason = choice.finish_reason;
        if (choiceFinishReason) {
          handlers.onFinish(choiceFinishReason);
        }
      }
    }
  }
}
