export interface ProviderConfig {
  /** API key or credentials */
  apiKey?: string
  /** Base URL for API */
  baseURL?: string
  /** Model name */
  model?: string
  /** Additional options */
  [key: string]: unknown
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

export interface LLMOptions {
  model?: string
  max_tokens?: number
  temperature?: number,
  system_prompt?: string
  tools?: ToolSchema[]
}
export type message = {
  role: 'user' | 'system' | 'assistant' | 'tool';
  content: string;
  type?: 'text' | 'tool' | 'tool_call';
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

export type LLMResponse = {
  content: string;
  role:'assistant';
  type?: 'text' | 'tool' | 'tool_call';
  tool_calls?: {
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }[];
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
  
  /**
   * 从提供商生成响应
   * @param prompt The input prompt for the model
   * @returns A promise that resolves to the model's response
   */
  abstract generate(messages: message[], options?: LLMOptions): Promise<LLMResponse|null>
}
