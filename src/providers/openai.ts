/**
 * ============================================================================
 * @ai-context/compressor - OpenAI Provider
 * ============================================================================
 *
 * OpenAI API provider implementation.
 */

import { LLMProvider, LLMOptions, LLMResponse, Message, type ProviderConfig } from './base'

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
function fixMalformedJson(potentiallyMalformedJson: string): string {
  const originalError: { message: string; attempt?: number }[] = [];

  // 如果 JSON 本身是有效的，直接返回
  try {
    JSON.parse(potentiallyMalformedJson);
    return potentiallyMalformedJson;
  } catch (e) {
    originalError.push({ message: e instanceof Error ? e.message : String(e) });
  }

  let fixed = potentiallyMalformedJson;

  // 尝试 1: 修复截断的 JSON（未闭合的字符串）
  const fixed1 = fixTruncatedJson(fixed);
  if (fixed1 !== fixed) {
    try {
      JSON.parse(fixed1);
      return fixed1;
    } catch (e) {
      originalError.push({ message: e instanceof Error ? e.message : String(e), attempt: 1 });
    }
    fixed = fixed1;
  }

  // 尝试 2: 处理 JSON 字符串值中的未转义换行符
  // 这是最常见的问题：LLM 在生成字符串值时直接包含换行而不是 \n
  if (!fixed.includes('\\n')) {
    // 只有在没有转义换行符的情况下才尝试这个修复
    // 如果已经有 \n，说明 JSON 可能是正确的，只是有其他问题
    const fixed2 = fixUnescapedNewlinesInStrings(fixed);
    try {
      JSON.parse(fixed2);
      return fixed2;
    } catch (e) {
      originalError.push({ message: e instanceof Error ? e.message : String(e), attempt: 2 });
    }
    fixed = fixed2;
  }

  // 尝试 3: 去除所有控制字符并替换为转义序列
  const fixed3 = fixed.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  try {
    JSON.parse(fixed3);
    return fixed3;
  } catch (e) {
    originalError.push({ message: e instanceof Error ? e.message : String(e), attempt: 3 });
  }

  // 尝试 4: 尝试闭合未完成的 JSON 结构
  const fixed4 = attemptToCloseJson(fixed);
  try {
    JSON.parse(fixed4);
    return fixed4;
  } catch (e) {
    originalError.push({ message: e instanceof Error ? e.message : String(e), attempt: 4 });
  }

  // 所有尝试都失败，抛出原始错误
  throw new Error(`Failed to fix malformed JSON. Original errors: ${JSON.stringify(originalError)}`);
}

/**
 * 修复截断的 JSON - 尝试恢复被截断的部分
 * 主要处理未闭合的字符串和对象
 */
function fixTruncatedJson(json: string): string {
  let result = json;
  let inString = false;
  let escapeNext = false;
  let braceDepth = 0;
  let bracketDepth = 0;
  let lastUnquotedQuotePos = -1;

  for (let i = 0; i < result.length; i++) {
    const char = result[i];

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
        inString = true;
        lastUnquotedQuotePos = i;
      } else {
        inString = false;
        lastUnquotedQuotePos = -1;
      }
      continue;
    }

    if (!inString) {
      if (char === '{') braceDepth++;
      if (char === '}') braceDepth--;
      if (char === '[') bracketDepth++;
      if (char === ']') bracketDepth--;
    }
  }

  // 如果字符串未闭合，尝试闭合它
  if (inString && lastUnquotedQuotePos >= 0) {
    // 检查是否在字符串值中（通常在 : 之后）
    const beforeQuote = result.substring(0, lastUnquotedQuotePos);
    const afterQuote = result.substring(lastUnquotedQuotePos + 1);

    // 简单策略：在末尾添加引号闭合字符串
    result = result + '"';
  }

  // 尝试闭合未完成的对象/数组
  while (braceDepth > 0) {
    result = result + '}';
    braceDepth--;
  }
  while (bracketDepth > 0) {
    result = result + ']';
    bracketDepth--;
  }

  return result;
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
 * 修复 JSON 字符串值中未转义的换行符
 *
 * 通过解析 JSON 结构，找到所有字符串值，并转义其中的特殊字符。
 */
function fixUnescapedNewlinesInStrings(json: string): string {
  // 这是一个简化的实现，处理最常见的模式
  // 模式: "key": "value with
  // actual newline"

  const lines = json.split('\n');
  const result: string[] = [];
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inString) {
      result.push(line);
      // 检查这一行后是否进入字符串状态
      for (const char of line) {
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
        }
      }
    } else {
      // 在字符串中，添加转义的换行
      result.push('\\n' + line.trim());
      // 检查这一行后是否退出字符串状态
      for (const char of line) {
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
        }
      }
    }
  }

  return result.join('\n');
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
 * Uses the OpenAI Chat Completions API.
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

    let currentMessages = [...messages];
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
