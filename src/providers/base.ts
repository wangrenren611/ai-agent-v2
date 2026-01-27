export interface BaseProviderConfig {
  /** API key or credentials */
  apiKey?: string;
  /** Base URL for API */
  baseURL?: string;
  /** Model name */
  model?: string;
  /** Maximum tokens */
  maxTokens?: number;
  /** Maximum output tokens to generate */
  maxOutputTokens?: number;
  /** Temperature */
  temperature?: number;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum number of retries */
  maxRetries?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Additional options */
  [key: string]: unknown;
}



export interface ToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    strict?: boolean;
    parameters: Record<string, unknown>;
  };
}

/** Stream chunk type for streaming responses */
export type StreamChunk = {
  content?: string;
  tool_calls?: Array<{
    index: number;
    delta: {
      type?: 'function';
      function?: {
        name?: string;
        arguments?: string;
      };
    };
  }>;
  finish_reason?: string;
}

/** Stream callback type for receiving chunks */
export type StreamCallback = (chunk: StreamChunk) => void

export interface LLMOptions {
  model?: string
  max_tokens?: number
  temperature?: number,
  system_prompt?: string
  tools?: ToolSchema[]
  /** Enable streaming response */
  stream?: boolean
  /** Callback for receiving streaming chunks */
  streamCallback?: StreamCallback
  /** Abort signal for cancelling the request */
  abortSignal?: AbortSignal
}

export type MessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export type MessageContent = string | MessageContentPart[];

export type Message = {
  role: 'user' | 'system' | 'assistant' | 'tool';
  content: MessageContent;
  type?: 'text' | 'tool' | 'tool_call'| 'summary';
  /** 思维链/推理内容，部分模型（如 Kimi）在启用 thinking 时要求携带 */
  reasoning_content?: string;
  /** Tool call ID (required for tool response messages) */
  tool_call_id?: string;
  /** Tool calls (for assistant messages that request tool execution) */
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

export type ToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export type LLMResponse = {
  content: string;
  role:'assistant';
  type?: 'text' | 'tool' | 'tool_call';
  tool_calls?: ToolCall[];
  finishReason?: string;
  /** Token usage metrics */
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export abstract class LLMProvider{
   protected constructor(
    protected readonly config: BaseProviderConfig
   ) {}

   abstract maxOutputTokens:number;
   abstract maxTokens:number;
   /**
    * 从提供商生成响应
    * @param messages The messages for the model
    * @param options Optional parameters including stream callback
    * @returns A promise that resolves to the model's response
    */
   abstract generate(messages: Message[], options?: LLMOptions): Promise<LLMResponse|null>
}
