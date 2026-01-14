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
export interface LLMptions {
  model?: string
  max_tokens?: number
  temperature?: number,
  system_prompt?: string
}
export type message = {
  role: 'user' | 'system' | 'assistant' | 'tool';
  content: string;
  type?: 'text' | 'tool' | 'tool_call';
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
   * Generate a response from the provider
   * @param prompt The input prompt for the model
   * @returns A promise that resolves to the model's response
   */
  abstract generate(messages: message[], options?: LLMptions): Promise<LLMResponse|null>
}
