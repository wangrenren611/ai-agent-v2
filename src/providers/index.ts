/**
 * Provider Configuration System
 *
 * Defines types and interfaces for all LLM providers.
 * Uses discriminated unions for type-safe provider-specific configs.
 */

import { OpenAICompatibleProvider } from "./providers/openai-compatible.base";

import { KimiProvider } from "./providers";

import { GLMProvider } from "./providers";

import { MiniMaxProvider } from "./providers";

import { QwenProvider } from "./providers";

/**
 * Supported LLM providers
 */
export enum ModelType {
  OPENAI = 'openai',
  KIMI = 'kimi',
  DEEPSEEK = 'deepseek',
  GLM = 'glm-4.7',
  MINIMAX = 'minimax',
  QWEN = 'qwen',
}

/**
 * Base provider configuration - common fields for all providers
 */
export interface BaseProviderConfig {
  /** API key or credentials */
  apiKey: string;
  /** Base URL for API (overrides default) */
  baseURL?: string;
  /** Model name (overrides default) */
  model?: string;
  /** Maximum input tokens (context window) */
  maxTokens?: number;
  /** Maximum output tokens to generate */
  maxOutputTokens?: number;
  /** Temperature for sampling (0-2) */
  temperature?: number;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum number of retries for transient errors */
  maxRetries?: number;
  /** Enable debug logging */
  debug?: boolean;
}



 const PROVIDERS: Record<ModelType, () => OpenAICompatibleProvider> = {
   [ModelType.KIMI]: () => new KimiProvider(
     {
       apiKey: process.env.KIMI_API_KEY || '',
       baseURL: process.env.KIMI_API_BASE || 'https://api.kimi.ai/v1',
       temperature: 0.7,
       model: 'kimi-3.5',
       maxTokens: 2048,
       maxOutputTokens: 2048,
     }
   ),
   // [ModelType.DEEPSEEK]: DeepseekProvider,
   [ModelType.GLM]: () => new GLMProvider({
     apiKey: process.env.GLM_API_KEY || '',
     baseURL: process.env.GLM_API_BASE || 'https://open.bigmodel.cn/api/coding/paas/v4',
     temperature: 0.7,
     model: 'glm-4.7',
     maxTokens: 200*100,
     maxOutputTokens: 8000,
   }),
   [ModelType.MINIMAX]: () => new MiniMaxProvider({
     apiKey: process.env.MINIMAX_API_KEY || '',
     baseURL: process.env.MINIMAX_API_BASE || 'https://api.minimaxi.com/v1',
     temperature: 0.7,
     model: 'MiniMax-M2.1',
     maxTokens: 200*100,
     maxOutputTokens: 8000,
   }),
   [ModelType.QWEN]: () => new QwenProvider({
     apiKey: process.env.QWEN_API_KEY || '',
     baseURL: process.env.QWEN_API_BASE || 'https://api.qwen.cn/v1',
     temperature: 0.7,
     model: 'qwen-3.5',
     maxTokens: 2048,
     maxOutputTokens: 2048,
   }),
   [ModelType.OPENAI]: function (): OpenAICompatibleProvider {
     throw new Error("Function not implemented.");
   },
   [ModelType.DEEPSEEK]: function (): OpenAICompatibleProvider {
     throw new Error("Function not implemented.");
   }
 };
/**
 * Get provider metadata by type
 */
export function getModel(type: ModelType) {
 
  return PROVIDERS[type]();
}

/**
 * Get all available provider types
 */
export function getModelTypes(): ModelType[] {
  return Object.keys(PROVIDERS) as ModelType[];
}
