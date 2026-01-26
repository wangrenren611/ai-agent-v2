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

    try {
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
    } catch (error) {
      return this.handleError(error);
    }
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
      messages: messages.map(cleanMessage),
      max_tokens: maxTokens || this.maxOutputTokens,
      temperature: temperature ?? DEFAULT_TEMPERATURE,
      stream: stream ?? false,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    return body;
  }

  private async fetchCompletion(body: Record<string, unknown>, abortSignal?: AbortSignal): Promise<Response> {
    const url = `${this.baseURL}${CHAT_COMPLETIONS_PATH}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: createHeaders(this.config.apiKey || '', this.organization),
      body: JSON.stringify(body),
      signal: abortSignal,
    });

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

    if(!content&&!message?.tool_calls?.length){
      throw new Error('Empty content in response');
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
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0,
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

    if (!response.body) {
      throw new Error('Response body is not readable');
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
      return this.handleError(error);
    }

    return {
      content: accumulatedContent,
      role: 'assistant',
      type: 'text',
      tool_calls: toolCallsMap.size > 0 ? [...toolCallsMap.values()] : undefined,
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

  private handleError(error: unknown): LLMResponse {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`OpenAI API error: ${errorMessage}`);

    return {
      content: `LLM API error: ${errorMessage}`,
      role: 'assistant',
      type: 'text',
      finishReason: 'error',
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }
}
