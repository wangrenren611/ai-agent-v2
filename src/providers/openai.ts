/**
 * ============================================================================
 * @ai-context/compressor - OpenAI Provider
 * ============================================================================
 *
 * OpenAI API provider implementation.
 */

import { LLMProvider, LLMOptions, LLMResponse, Message, type ProviderConfig } from './base'
import json5 from 'json5';
const parseJson5=json5.parse;

/**
 * 修复 LLM 生成的格式错误的 JSON
 *
 * DeepSeek 等 LLM 在生成工具调用参数时，有时会生成格式错误的 JSON。
 * 最常见的问题是：
 * 1. 字符串值中包含未转义的换行符
 * 2. 响应被截断（token 限制），导致 JSON 不完整
 *
 * 此函数尝试修复这些常见问题。
 */
// 1. 使用 JSON5 或类似库处理宽松的 JSON


function fixMalformedJson(potentiallyMalformedJson: string): string {
    const originalError: { message: string; attempt?: number }[] = [];

    // 快速路径: 尝试直接解析
    try {
        JSON.parse(potentiallyMalformedJson);
        return potentiallyMalformedJson;
    } catch (e) {
        originalError.push({ message: e instanceof Error ? e.message : String(e) });
    }

    // 使用 json5 解析更宽松的 JSON
    try {
        const parsed = parseJson5(potentiallyMalformedJson);
        return JSON.stringify(parsed);
    } catch (e) {
        originalError.push({ message: e instanceof Error ? e.message : String(e), attempt: 1 });
    }

    // 只有在 json5 失败后才执行复杂的修复逻辑
    let fixed = potentiallyMalformedJson;
    
    // 检查最常见的截断问题
    const openBraces = (fixed.match(/{/g) || []).length;
    const closeBraces = (fixed.match(/}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;

    if (openBraces > closeBraces || openBrackets > closeBrackets) {
        const braceDiff = openBraces - closeBraces;
        const bracketDiff = openBrackets - closeBrackets;
        fixed += '}'.repeat(braceDiff) + ']'.repeat(bracketDiff);
        
        try {
            JSON.parse(fixed);
            return fixed;
        } catch (e) {
            originalError.push({ message: e instanceof Error ? e.message : String(e), attempt: 2 });
        }
    }

    // 最后的尝试
    const fixed2 = attemptToCloseJson(fixed);
    try {
        JSON.parse(fixed2);
        return fixed2;
    } catch (e) {
        originalError.push({ message: e instanceof Error ? e.message : String(e), attempt: 3 });
    }

    throw new Error(`Failed to fix malformed JSON. Original errors: ${JSON.stringify(originalError)}`);
}



/**
 * 尝试通过智能闭合来修复 JSON
 */
function attemptToCloseJson(json: string): string {
  let result = json.trim();

  // 移除末尾可能的未完成部分
  // 如果最后一个字符是逗号，移除它
  if (result.endsWith(',')) {
    result = result.slice(0, -1);
  }

  // 统计括号
  const counts = countBraces(result);

  // 如果缺少闭合引号，添加
  if (counts.openQuotes % 2 !== 0) {
    result = result + '"';
  }

  // 闭合括号
  for (let i = 0; i < counts.openBraces - counts.closeBraces; i++) {
    result = result + '}';
  }
  for (let i = 0; i < counts.openBrackets - counts.closeBrackets; i++) {
    result = result + ']';
  }

  return result;
}

/**
 * 统计 JSON 中的括号和引号
 */
function countBraces(json: string) {
  const counts = {
    openBraces: 0,
    closeBraces: 0,
    openBrackets: 0,
    closeBrackets: 0,
    openQuotes: 0,
  };

  let inString = false;
  let escapeNext = false;

  for (const char of json) {
    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      if (!inString) {
        counts.openQuotes++;
        inString = true;
      } else {
        counts.openQuotes++; // 计数，不区分开闭
        inString = false;
      }
      continue;
    }

    if (!inString) {
      if (char === '{') counts.openBraces++;
      if (char === '}') counts.closeBraces++;
      if (char === '[') counts.openBrackets++;
      if (char === ']') counts.closeBrackets++;
    }
  }

  return counts;
}



/**
 * OpenAI provider configuration
 */
export interface OpenAIConfig extends ProviderConfig {
  /** OpenAI API key */
  apiKey: string
  /** Base URL (default: https://api.openai.com/v1) */
  baseURL?: string
  /** Model name (default: gpt-4o-mini) */
  model?: string
  /** Organization ID */
  organization?: string,
  maxTokens?: number;
  maxOutputTokens?: number;
}

/**
 * Chat Completion API response structure
 */
interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
      type?: 'text' | 'tool' | 'tool_call';
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason?: 'stop' | 'length' | 'content_filter' | 'tool_calls' | string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI API provider
 *
 * Uses OpenAI Chat Completions API.
 */
export class OpenAIProvider extends LLMProvider {
  baseURL: string
  model: string
  maxTokens: number;
  maxOutputTokens: number;

  constructor(config: OpenAIConfig) {
    super(config)
    this.baseURL = config.baseURL || 'https://api.openai.com/v1'
    this.model = config.model || 'gpt-4o-mini'
    this.maxTokens = config.maxTokens || 128 * 1024;
    this.maxOutputTokens = config.maxOutputTokens || 8000;
  }

  async generate(messages: Message[], options?: LLMOptions): Promise<LLMResponse | null> {
    const { model, max_tokens, temperature, tools } = options || {}
    const MAX_CONTINUE_ROUNDS = 2; // 最多续写 2 次

    let accumulatedContent = '';
    let accumulatedToolCalls: Array<{
      id: string;
      type: 'function';
      function: { name: string; arguments: string };
    }> = [];
    let totalUsage = {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };

    // 🔧 清理消息格式，只保留 OpenAI/DeepSeek API 支持的字段
    // 过滤掉内部使用的 type 字段（如 "summary"）等不兼容的字段
    const cleanMessage = (msg: Message) => {
      const cleaned: Record<string, unknown> = {
        role: msg.role,
        content: msg.content
      };
      // 保留 tool_call_id（tool 回复必需）
      if (msg.tool_call_id) {
        cleaned.tool_call_id = msg.tool_call_id;
      }
      // 保留 tool_calls（assistant 调用工具必需）
      if (msg.tool_calls) {
        cleaned.tool_calls = msg.tool_calls;
      }
      return cleaned;
    };

    let currentMessages = messages.map(cleanMessage);
    let continueRound = 0;

    while (continueRound <= MAX_CONTINUE_ROUNDS) {
      try {
        const requestBody: Record<string, unknown> = {
          model: model || this.model,
          messages: currentMessages,
          max_tokens: max_tokens || this.maxOutputTokens,
          temperature: temperature || 0.1,
        };

        // 添加 tools 参数（如果提供）
        if (tools && tools.length > 0) {
          requestBody.tools = tools;
        }

        const response = await fetch(`${this.baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error('API Error Response:', errorBody);
          throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorBody}`);
        }

        const data = await response.json() as ChatCompletionResponse;
        const finishReason = data.choices[0]?.finish_reason;

        // 累加使用量
        if (data.usage) {
          totalUsage.prompt_tokens += data.usage.prompt_tokens;
          totalUsage.completion_tokens += data.usage.completion_tokens;
          totalUsage.total_tokens += data.usage.total_tokens;
        }

        const messageContent = data.choices[0]?.message?.content || '';
        const messageToolCalls = data.choices[0]?.message?.tool_calls || [];

        // 尝试修复 tool_calls 中可能格式错误的 arguments
        const fixedToolCalls = messageToolCalls.map(tc => ({
          ...tc,
          function: {
            ...tc.function,
            arguments: fixMalformedJson(tc.function.arguments),
          },
        }));

        // 累加内容
        if (continueRound === 0) {
          accumulatedContent = messageContent;
          accumulatedToolCalls = fixedToolCalls;
        } else {
          // 续写时追加内容
          accumulatedContent += messageContent;
          // 续写时可能需要合并 tool_calls
          if (fixedToolCalls.length > 0) {
            accumulatedToolCalls = fixedToolCalls;
          }
        }

        // 检查是否需要续写
        if (finishReason === 'length' && continueRound < MAX_CONTINUE_ROUNDS) {
          // 需要续写
          continueRound++;

          // 构建续写消息：将当前部分响应作为 assistant 消息添加
          currentMessages = [
            ...currentMessages,
            {
              role: 'assistant' as const,
              content: accumulatedContent,
              tool_calls: messageToolCalls, // 使用原始的 tool_calls 用于续写
            },
          ];

          console.log(`[OpenAIProvider] Response truncated, continuing... (round ${continueRound}/${MAX_CONTINUE_ROUNDS})`);
          continue;
        }

        // 正常返回
        return {
          content: accumulatedContent,
          role: 'assistant',
          type: data.choices[0]?.message?.type || 'text',
          tool_calls: accumulatedToolCalls,
          usage: totalUsage,
        };

      } catch (error) {
        // 如果在续写过程中出错，返回已累积的内容
        if (continueRound > 0) {
          console.warn('[OpenAIProvider] Error during continuation, returning partial result:', error);
          return {
            content: accumulatedContent || 'LLM API error: ' + (error instanceof Error ? error.message : 'Unknown error'),
            role: 'assistant',
            type: 'text',
            tool_calls: accumulatedToolCalls,
            usage: totalUsage,
          };
        }

        console.error('OpenAI API error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: 'LLM API error: ' + errorMsg,
          role: 'assistant',
          type: 'text',
          tool_calls: [],
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
        };
      }
    }

    // 不应该到这里，但作为保险
    return {
      content: accumulatedContent,
      role: 'assistant',
      type: 'text',
      tool_calls: accumulatedToolCalls,
      usage: totalUsage,
    };
  }

}
