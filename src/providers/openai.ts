/**
 * ============================================================================
 * @ai-context/compressor - OpenAI Provider
 * ============================================================================
 *
 * OpenAI API provider implementation.
 */

import { LLMProvider, LLMOptions, LLMResponse, Message, ToolSchema, type ProviderConfig } from './base'

/**
 * 修复 LLM 生成的格式错误的 JSON
 *
 * DeepSeek 等 LLM 在生成工具调用参数时，有时会生成格式错误的 JSON。
 * 最常见的问题是字符串值中包含未转义的换行符。
 *
 * 例如：
 * {"content": "line1
 * line2"}
 *
 * 应该是：
 * {"content": "line1\\nline2"}
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

    // 尝试 1: 处理 JSON 字符串值中的未转义换行符
    // 这是最常见的问题：LLM 在生成字符串值时直接包含换行而不是 \n
    // 策略：找到所有字符串值（在引号之间），转义其中的特殊字符
    if (!fixed.includes('\\n')) {
        // 只有在没有转义换行符的情况下才尝试这个修复
        // 如果已经有 \n，说明 JSON 可能是正确的，只是有其他问题
        const fixed1 = fixUnescapedNewlinesInStrings(fixed);
        try {
            JSON.parse(fixed1);
            return fixed1;
        } catch (e) {
            originalError.push({ message: e instanceof Error ? e.message : String(e), attempt: 1 });
        }
        fixed = fixed1;
    }

    // 尝试 2: 去除所有控制字符并替换为转义序列
    const fixed2 = fixed.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    try {
        JSON.parse(fixed2);
        return fixed2;
    } catch (e) {
        originalError.push({ message: e instanceof Error ? e.message : String(e), attempt: 2 });
    }

    // 所有尝试都失败，抛出原始错误
    throw new Error(`Failed to fix malformed JSON. Original errors: ${JSON.stringify(originalError)}`);
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
  organization?: string
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

  constructor(config: OpenAIConfig) {
    super(config)
    this.baseURL = config.baseURL || 'https://api.openai.com/v1'
    this.model = config.model || 'gpt-4o-mini'
  }

  async generate(messages: Message[], options?: LLMOptions): Promise<LLMResponse|null> {
    const { model, max_tokens, temperature, tools } = options || {}
    try {
      const requestBody: Record<string, unknown> = {
        model: model || this.model,
        messages,
        max_tokens: max_tokens || 2000,
        temperature: temperature || 0.1,
      };

      // 添加 tools 参数（如果提供）
      if (tools && tools.length > 0) {
        requestBody.tools = tools;
        // 调试：打印工具 schemas
        // console.log('Tools sent to API:', JSON.stringify(tools, null, 2));
      }
    
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('API Error Response:', errorBody);
        throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorBody}`);
      }

      const data = await response.json() as ChatCompletionResponse;

      // 修复 tool_calls 中可能格式错误的 arguments
      const toolCalls = (data.choices[0]?.message?.tool_calls || []).map(tc => ({
        ...tc,
        function: {
          ...tc.function,
          arguments: fixMalformedJson(tc.function.arguments),
        },
      }));

      return {
        content: data.choices[0]?.message?.content || '',
        role: 'assistant',
        type: data.choices[0]?.message?.type || 'text',
        tool_calls: toolCalls,
        usage: {
          prompt_tokens: data.usage?.prompt_tokens || 0,
          completion_tokens: data.usage?.completion_tokens || 0,
          total_tokens: data.usage?.total_tokens || 0,
        },
      };

    } catch (error) {
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
      }
    }

  }

}
