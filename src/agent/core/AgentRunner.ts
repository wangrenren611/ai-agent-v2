/**
 * Agent 运行协调器
 * 
 * 职责：
 * 1. 管理主循环生命周期
 * 2. 协调错误处理、工具执行、消息处理
 * 3. 状态机模式处理不同运行阶段
 */

import type { LLMProvider, StreamChunk as LLMStreamChunk } from '../../providers/providers/base';
import type { SessionManager } from '../../session-v2/SessionManager';
import { toProviderMessageList } from '../message-converter';
import type { Message } from '../message';
import type { AgentResponse, AgentRunOptions, StreamChunk, ToolSchema } from '../types';
import { ErrorHandler } from './ErrorHandler';
import { ToolExecutor } from './ToolExecutor';
import { uuid } from 'uuidv4';

export type RunPhase = 
  | 'idle'
  | 'compressing'
  | 'generating'
  | 'executing_tools'
  | 'completed'
  | 'error'
  | 'cancelled';

export interface AgentRunnerConfig {
  llmProvider: LLMProvider;
  sessionManager: SessionManager;
  systemPrompt: string;
  maxLoop: number;
  temperature: number;
  maxTokens: number;
  maxOutputTokens: number;
  tools?: ToolSchema[];
}

export interface AgentRunnerDependencies {
  errorHandler: ErrorHandler;
  toolExecutor: ToolExecutor;
}

export interface RunContext {
  query: string;
  options: AgentRunOptions;
  step: number;
  phase: RunPhase;
  lastResponse: AgentResponse | null;
}

export class AgentRunner {
  private config: AgentRunnerConfig;
  private deps: AgentRunnerDependencies;

  constructor(
    config: AgentRunnerConfig,
    deps: AgentRunnerDependencies
  ) {
    this.config = config;
    this.deps = deps;
  }

  /**
   * 执行运行
   */
  async run(
    query: string,
    options: AgentRunOptions,
    eventHandlers: {
      onStreamChunk?: (chunk: StreamChunk) => void;
      onThinking?: (step: number) => void;
      onThinkingEnd?: (step: number, hasToolCalls: boolean) => void;
      onToolCallsStart?: (count: number) => void;
      onToolCallsEnd?: (summary: string, hasErrors: boolean) => void;
      onToolCall?: (data: { messageId: string; toolName: string; args: unknown }) => void;
      onToolResult?: (data: { messageId: string; toolName: string; result: unknown; duration: number }) => void;
      onTokenUsage?: (used: number, total: number) => void;
      onComplete?: (response: AgentResponse) => void;
      onError?: (error: Error, phase: string) => void;
    }
  ): Promise<AgentResponse | null> {
    const tools = this.gatherTools(options);
    const context: RunContext = {
      query,
      options,
      step: 0,
      phase: 'idle',
      lastResponse: null,
    };

    // 添加用户消息
    await this.addUserMessage(query);

    // 主循环
    while (true) {
      context.step++;

      // 检查循环限制
      if (this.config.maxLoop > 0 && context.step > this.config.maxLoop) {
        return this.complete(
          `Max loop limit reached (${this.config.maxLoop})`,
          context,
          eventHandlers
        );
      }

      // 执行单次迭代
      const result = await this.runIteration(context, tools, eventHandlers);

      if (result.type === 'complete') {
        return result.response;
      }

      if (result.type === 'error') {
        return result.lastResponse;
      }

      if (result.type === 'continue') {
        continue;
      }
    }
  }

  /**
   * 单次迭代
   */
  private async runIteration(
    context: RunContext,
    tools: ToolSchema[],
    handlers: Parameters<AgentRunner['run']>[2]
  ): Promise<
    | { type: 'complete'; response: AgentResponse }
    | { type: 'error'; lastResponse: AgentResponse | null }
    | { type: 'continue' }
  > {
    const { step, options } = context;

    // 1. 压缩上下文
    context.phase = 'compressing';
    const messages = await this.compressContext(tools);

    // 2. 发送思考开始事件
    context.phase = 'generating';
    handlers.onThinking?.(step);
    handlers.onTokenUsage?.(
      this.config.sessionManager.calculateTokens(tools),
      this.config.maxTokens
    );

    // 3. 调用 LLM
    try {
      const llmResponse = await this.callLLM(messages, tools, options, handlers.onStreamChunk);

      if (!llmResponse) {
        throw new Error('LLM response is null');
      }

      // 4. 保存 LLM 响应
      await this.config.sessionManager.addMessage(llmResponse);

      // 5. 处理工具调用
      if (llmResponse.tool_calls?.length) {
        context.phase = 'executing_tools';
        handlers.onThinkingEnd?.(step, true);
        handlers.onToolCallsStart?.(llmResponse.tool_calls.length);

        const toolResult = await this.executeTools(llmResponse, handlers);

        // 保存工具结果
        await this.config.sessionManager.addMessages(toolResult.messages);

        handlers.onToolCallsEnd?.(toolResult.summary, toolResult.hasError);

        if (toolResult.hasError) {
          const decision = this.deps.errorHandler.handle(new Error('Tool execution failed'));
          if (decision.type === 'stop') {
            return {
              type: 'complete',
              response: { content: decision.userMessage, role: 'assistant' },
            };
          }
        } else {
          // 工具执行成功，重置错误计数
          this.deps.errorHandler.markSuccess();
        }

        return { type: 'continue' };
      }

      // 6. 无工具调用，检查是否完成
      handlers.onThinkingEnd?.(step, false);

      // 从 LLM 响应获取必要字段
      const content = typeof llmResponse.content === 'string' 
        ? llmResponse.content 
        : JSON.stringify(llmResponse.content);
      const finishReason = (llmResponse as any).finishReason || 'stop';

      // 检查 finish reason
      if (!['stop', 'eos', undefined].includes(finishReason)) {
        const decision = this.deps.errorHandler.handle(
          new Error(`Unexpected finishReason: ${finishReason}`)
        );
        if (decision.type === 'stop') {
          return {
            type: 'complete',
            response: { content: decision.userMessage, role: 'assistant' },
          };
        }
        return { type: 'continue' };
      }

      // 检查空响应
      if (!content?.trim?.()) {
        const decision = this.deps.errorHandler.handle(new Error('Empty response'));
        if (decision.type === 'stop') {
          return {
            type: 'complete',
            response: { content: decision.userMessage, role: 'assistant' },
          };
        }
        return { type: 'continue' };
      }

      // 正常完成
      return {
        type: 'complete',
        response: this.complete(content || '', context, handlers),
      };
    } catch (error) {
      // 处理错误
      const decision = this.deps.errorHandler.handle(error);
      handlers.onError?.(error instanceof Error ? error : new Error(String(error)), context.phase);

      switch (decision.type) {
        case 'abort':
        case 'stop':
          return {
            type: 'complete',
            response: this.complete(decision.userMessage, context, handlers),
          };

        case 'retry':
          await this.delay(decision.backoffMs);
          return { type: 'continue' };

        case 'continue':
          return { type: 'continue' };

        default:
          return { type: 'error', lastResponse: context.lastResponse };
      }
    }
  }

  /**
   * 压缩上下文
   */
  private async compressContext(tools: ToolSchema[]): Promise<Message[]> {
    const allMessages = this.config.sessionManager.getMessages();

    // 检查是否需要压缩
    if (this.config.sessionManager.shouldCompact(tools)) {
      const result = await this.config.sessionManager.compact(tools);
      if (result.isCompacted) {
        return [
          { role: 'system', content: this.config.systemPrompt } as Message,
          ...result.messages,
        ];
      }
    }

    return [
      { role: 'system', content: this.config.systemPrompt } as Message,
      ...allMessages,
    ];
  }

  /**
   * 调用 LLM
   */
  private async callLLM(
    messages: Message[],
    tools: ToolSchema[],
    options: AgentRunOptions,
    onStreamChunk?: (chunk: StreamChunk) => void
  ): Promise<Message> {
    const messageId = uuid();

    const wrappedCallback = onStreamChunk
      ? (chunk: LLMStreamChunk) => {
          onStreamChunk({ messageId, ...chunk } as StreamChunk);
        }
      : undefined;

    const providerMessages = toProviderMessageList(messages);

    const response = await this.config.llmProvider.generate(
      providerMessages,
      {
        tools: tools.length > 0 ? tools : undefined,
        maxOutputTokens: options.maxOutputTokens ?? this.config.maxOutputTokens,
        stream: options.stream ?? false,
        streamCallback: wrappedCallback,
        abortSignal: options.abortSignal,
        temperature: options.temperature ?? this.config.temperature,
      }
    );

    if (!response) {
      throw new Error('LLM response is null');
    }

    return {
      messageId,
      ...response,
      role: 'assistant',
    } as Message;
  }

  /**
   * 执行工具调用
   */
  private async executeTools(
    llmResponse: Message,
    handlers: Parameters<AgentRunner['run']>[2]
  ): ReturnType<ToolExecutor['executeBatch']> {
    return this.deps.toolExecutor.executeBatch(
      llmResponse.tool_calls || [],
      {
        baseMessageId: llmResponse.messageId,
        onToolCall: handlers.onToolCall,
        onToolResult: handlers.onToolResult,
      }
    );
  }

  /**
   * 添加用户消息
   */
  private async addUserMessage(query: string): Promise<void> {
    await this.config.sessionManager.addMessage({
      role: 'user',
      type: 'text',
      content: query,
    } as Message);
  }

  /**
   * 完成运行
   */
  private complete(
    content: string,
    context: RunContext,
    handlers: Parameters<AgentRunner['run']>[2]
  ): AgentResponse {
    const response: AgentResponse = { content, role: 'assistant' };
    context.lastResponse = response;
    context.phase = 'completed';
    handlers.onComplete?.(response);
    return response;
  }

  /**
   * 收集工具
   * 优先使用运行时传入的工具，其次使用配置的工具
   */
  private gatherTools(options: AgentRunOptions): ToolSchema[] {
    return options.tools || this.config.tools || [];
  }

  /**
   * 延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
