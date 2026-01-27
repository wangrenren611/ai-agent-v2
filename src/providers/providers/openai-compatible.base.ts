/**
 * 通用 OpenAI 兼容 Provider 基类
 * 复用统一的请求/流处理逻辑，配合不同 Adapter 与元数据即可支持多家兼容服务。
 */

import {
  LLMProvider,
  LLMResponse,
  LLMOptions,
  Message,
  BaseProviderConfig,
} from '../base.js';
import { ProviderMetadata } from '../config.js';
import { BaseAPIAdapter } from '../adapters/base-adapter.js';
import { HTTPClient } from '../utils/http-client.js';
import { StreamParser } from '../utils/stream-parser.js';
import { LLMError } from '../errors.js';
import { DEFAULT_TEMPERATURE } from '../../agent/types.js';

export interface OpenAICompatibleConfig extends BaseProviderConfig {
  organization?: string;
  /** 自定义 chat/completions 路径或构造器（兼容 Azure/自托管） */
  chatCompletionsPath?: string | ((model: string, config: OpenAICompatibleConfig) => string);
  /** Azure 兼容：API 版本号 */
  apiVersion?: string;
  /** Azure 兼容：部署名，默认与 model 同名 */
  deploymentId?: string;
  /** API Key 头部名称（如 Azure 使用 api-key） */
  apiKeyHeader?: string;
  /** API Key 前缀，默认 Bearer；传空字符串则不加前缀 */
  apiKeyPrefix?: string;
  /** 附加的固定请求头 */
  defaultHeaders?: Record<string, string>;
  /** 附加的固定请求体字段（如 response_format 等） */
  extraBody?: Record<string, unknown>;
  /** 针对支持的模型开启 reasoning_split（默认 true） */
  enableReasoningSplit?: boolean;
  /** 兼容 MiniMax：groupId */
  groupId?: string;
  /** 温度 */
  temperature?: number;
  [key: string]: unknown;
}

export abstract class OpenAICompatibleProvider extends LLMProvider {
  readonly adapter: BaseAPIAdapter;
  readonly httpClient: HTTPClient;
  readonly baseURL: string;
  readonly maxOutputTokens: number;
  protected readonly metadata: ProviderMetadata;
  protected readonly rawConfig: OpenAICompatibleConfig;

  get model(): string {
    return this.config.model || this.metadata.defaultModel;
  }

  get maxTokens(): number {
    return this.config.maxTokens || this.metadata.maxTokens;
  }

  protected constructor(
    metadata: ProviderMetadata,
    adapter: BaseAPIAdapter,
    config: OpenAICompatibleConfig
  ) {
    super({
      apiKey: config.apiKey,
      model: config.model || metadata.defaultModel,
      maxTokens: config.maxTokens || metadata.maxTokens,
      temperature: config.temperature ?? DEFAULT_TEMPERATURE,
    });

    this.metadata = metadata;
    this.adapter = adapter;
    this.rawConfig = {
      ...config,
      baseURL: (config.baseURL || metadata.baseURL).replace(/\/$/, ''),
    };
    
    this.baseURL = this.rawConfig.baseURL as string;
    this.maxOutputTokens = this.rawConfig.maxOutputTokens || metadata.maxOutputTokens;

    this.httpClient = new HTTPClient({
      timeout: config.timeout ?? metadata.defaultTimeout,
      maxRetries: config.maxRetries ?? metadata.defaultMaxRetries,
      debug: config.debug,
    });
  }

  async generate(
    messages: Message[],
    options?: LLMOptions
  ): Promise<LLMResponse | null> {
    if (messages.length === 0) return null;
    const requestBody = this.adapter.transformRequest(messages, {
      model: options?.model || this.model,
      max_tokens: options?.max_tokens ?? this.maxOutputTokens,
      extraBody: (this.rawConfig as any).extraBody,
      enableReasoningSplit: (this.rawConfig as any).enableReasoningSplit,
      temperature: this.rawConfig.temperature,
      ...(options || {}),
    } as any);
    
    const url = this.resolveEndpoint(String(requestBody.model || this.model));
    const headers = this.adapter.getHeaders(
      this.config.apiKey || '',
      this.rawConfig
    );

    if (options?.stream) {
      return await this.generateStream(url, requestBody, headers, options.streamCallback, options.abortSignal);
    }

    return await this.generateNonStream(url, requestBody, headers, options?.abortSignal);
  }

  private resolveEndpoint(model: string): string {
    const base = this.baseURL;
    const pathCfg = (this.rawConfig as any).chatCompletionsPath;

    if (typeof pathCfg === 'function') {
      const custom = pathCfg(model, this.rawConfig);
      return custom.startsWith('http') ? custom : `${base}${custom}`;
    }
    if (typeof pathCfg === 'string' && pathCfg.length > 0) {
      return pathCfg.startsWith('http') ? pathCfg : `${base}${pathCfg}`;
    }
    if ((this.rawConfig as any).apiVersion && /azure\.com/i.test(base)) {
      const deployment = (this.rawConfig as any).deploymentId || model;
      return `${base}/openai/deployments/${deployment}/chat/completions?api-version=${(this.rawConfig as any).apiVersion}`;
    }
    return `${base}${this.adapter.getEndpointPath()}`;
  }

  private async generateNonStream(
    url: string,
    body: Record<string, unknown>,
    headers: Headers,
    abortSignal?: AbortSignal
  ): Promise<LLMResponse> {
    const response = await this.httpClient.fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: abortSignal,
    });

    const data = await response.json() as Record<string, unknown>;
    const apiResponse = this.adapter.transformResponse(data);

    return {
      content: typeof apiResponse.content === 'string' ? apiResponse.content : '',
      role: 'assistant',
      type: 'text',
      tool_calls: apiResponse.tool_calls && apiResponse.tool_calls.length > 0 ? apiResponse.tool_calls : undefined,
      usage: apiResponse.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      finishReason: apiResponse.finish_reason || undefined,
    };
  }

  private async generateStream(
    url: string,
    body: Record<string, unknown>,
    headers: Headers,
    streamCallback?: LLMOptions['streamCallback'],
    abortSignal?: AbortSignal
  ): Promise<LLMResponse | null> {
    const response = await this.httpClient.fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: abortSignal,
    });

    if (!response.body) {
      throw new LLMError('Response body is not readable', 'NO_BODY');
    }

    const reader = response.body.getReader();
    let accumulatedContent = '';
    const toolCallsMap = new Map<number, { id: string; type: 'function'; function: { name: string; arguments: string } }>();
    let finishReason: string | undefined;

    try {
      await StreamParser.parse(reader, {
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
      throw error;
    }

    const hasToolCalls = toolCallsMap.size > 0;
    if (!accumulatedContent && !hasToolCalls && finishReason !== 'stop') {
      console.warn('Stream ended with no content, no tool calls, and finishReason:', finishReason);
      throw new Error('Empty content in response without tool calls or stop reason');
    }

    if (!accumulatedContent && !hasToolCalls && finishReason === 'stop') {
      console.warn('Stream ended with empty content and finishReason: stop - will be handled by Agent layer');
    }

    return {
      content: accumulatedContent || '',
      role: 'assistant',
      type: 'text',
      tool_calls: hasToolCalls ? [...toolCallsMap.values()] : undefined,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      finishReason,
    };
  }
}

