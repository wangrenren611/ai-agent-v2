export interface ProviderConfig {
  /** API key or credentials */
  apiKey?: string;
  /** Base URL for API */
  baseURL?: string;
  /** Model name */
  model?: string;
  /** Maximum tokens */
  maxTokens?: number;
  /** Temperature */
  temperature?: number;
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

export type Message = {
  role: 'user' | 'system' | 'assistant' | 'tool';
  content: string;
  type?: 'text' | 'tool' | 'tool_call'| 'summary';
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
    protected readonly config: ProviderConfig
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
