/**
 * Agent - AI 代理 (基于 EventBus)
 * 负责编排 LLM 调用和会话管理
 *
 * @module Agent
 */
import { TypedEventBus } from '../util/event-bus';
import {
    AgentEvents,
    AgentConfig,
    AgentRunOptions,
    AgentResponse,
    LLMResponse,
    Message,
    StreamChunk,
    ToolResult,
    ToolCall,
    DEFAULT_MAX_LOOP,
    DEFAULT_NO_PROGRESS_LIMIT,
    MAX_NETWORK_RETRIES,
    VALID_FINISH_REASONS,
    ToolSchema,
} from './types';
import { ToolError } from './ToolError';
import { isRetryableError, isPermanentError, isAbortedError, LLMAuthError, LLMNotFoundError } from '../providers/providers/errors';
import { ScopedLogger } from '../util/log';
import { SessionManager } from '../session-v2';
import { ToolRegistry } from '../tool/registry';
import { Compaction } from '../session-v2/compaction';
import { AgentContext, getAgentContext } from '../context';

// =============================================================================
// 错误信息接口（内部使用）
// =============================================================================

interface ErrorInfo {
    message: string;
    isAborted: boolean;
    isRetryable: boolean;
    isPermanent: boolean;
    isAuth: boolean;
    isModelNotFound: boolean;
    resourceType?: string;
}

// =============================================================================
// Agent 类
// =============================================================================

export class Agent {
    // -------------------------------------------------------------------------
    // 私有属性
    // -------------------------------------------------------------------------
    private readonly llmProvider: AgentConfig['llmProvider'];
    private readonly logger: ScopedLogger;
    private readonly systemPrompt: string;
    private readonly maxLoop: number;
    private readonly noProgressLimit: number;
    private readonly compaction: Compaction;
    private readonly temperature: number;

    // -------------------------------------------------------------------------
    // 公开属性
    // -------------------------------------------------------------------------
    public readonly sessionManager: SessionManager;
    public readonly context: AgentContext;
    public readonly events: TypedEventBus<AgentEvents>;
    tools: ToolSchema[];
    maxOutputTokens: number;
    maxTokens: number;

    // -------------------------------------------------------------------------
    // 构造函数
    // -------------------------------------------------------------------------

    constructor(config: AgentConfig) {
        this.llmProvider = config.llmProvider;
        this.systemPrompt = config.systemPrompt;
        this.maxLoop = config.maxLoop ?? DEFAULT_MAX_LOOP;
        this.noProgressLimit = Math.max(0, config.noProgressLimit ?? DEFAULT_NO_PROGRESS_LIMIT);
        this.tools = config.tools || [];
 
        // 初始化上下文
        this.context = getAgentContext({
            session: {
                sessionId: config.sessionId || `session_${Date.now()}`,
                userId: 'default',
            },
            
        });
        this.context.initialize();

        // 初始化事件总线
        this.events = new TypedEventBus<AgentEvents>();

        // 初始化会话管理器
        this.sessionManager = new SessionManager({
            sessionId: this.context.sessionId,
            sessionDir: this.context.sessionDir,
            llmProvider: this.llmProvider,
        });

    

        // 设置 AgentContext 到 ToolRegistry
        ToolRegistry.setAgentContext(this.context);

        // 初始化日志器
        this.logger = new ScopedLogger('Agent');

        // 初始化 Token 限制
        this.maxOutputTokens = config.maxOutputTokens || this.llmProvider.config.maxOutputTokens;
        this.maxTokens =config.maxTokens || this.llmProvider.config.maxTokens;
       console.log('maxTokens', this.maxTokens);

        // 初始化上下文压缩器
        this.temperature = config.temperature || this.llmProvider.config.temperature;

        this.compaction = new Compaction({
            maxTokens: this.maxTokens,
            maxOutputTokens: this.maxOutputTokens,
            llmProvider: this.llmProvider,
        });
    }

    // -------------------------------------------------------------------------
    // 公开方法
    // -------------------------------------------------------------------------

    /** 启动 Agent，初始化会话 */
   async start(): Promise<void> {
       await  this.sessionManager.init();
    }
     on(event: keyof AgentEvents, listener: (data: AgentEvents[typeof event]) => void): void {
        this.events.on(event, listener);
    }
    /**
     * 运行 Agent 处理用户查询
     */
    async run(query: string, options?: AgentRunOptions): Promise<AgentResponse | null> {
        // 运行时状态
        const tools = [...this.tools, ...(options?.tools ?? [])];
        const silent = options?.silent ?? false;
        const streamEnabled = options?.stream ?? false;
        const streamCallback = options?.streamCallback;
        const abortSignal = options?.abortSignal;
    

        // 错误计数
        let consecutiveErrorCount = 0;
        let networkErrorCount = 0;
        let lastResponse: AgentResponse | null = null;

        // 辅助方法：发送日志
        const log = (level: 'info' | 'warn' | 'error', message: string) => {
            if (silent) {
                this.events.emit('log', { level, message });
            } else if (level === 'error') {
                this.logger.error(message);
            } else if (level === 'warn') {
                this.logger.warn(message);
            } else {
                this.logger.info(message);
            }
        };

        // 辅助方法：创建 spinner
        let spinner: ReturnType<ScopedLogger['spinner']> | null = null;

        // 辅助方法：完成响应
        const complete = (content: string): AgentResponse => {
            const response = { content, role: 'assistant' as const };
            this.events.emit('complete', { response });
            lastResponse = response;
            return response;
        };

        // 辅助方法：获取错误信息
        const getErrorInfo = (error: unknown): ErrorInfo => {
            const message = error instanceof Error ? error.message : String(error);
            return {
                message,
                isAborted: isAbortedError(error),
                isRetryable: isRetryableError(error),
                isPermanent: isPermanentError(error),
                isAuth: error instanceof LLMAuthError,
                isModelNotFound: error instanceof LLMNotFoundError,
                resourceType: error instanceof LLMNotFoundError ? error.resourceType : undefined,
            };
        };

        // 辅助方法：处理错误
        const handleError = (error: unknown): boolean => {
            const info = getErrorInfo(error);
            this.events.emit('error', { error: error instanceof Error ? error : new Error(info.message), phase: 'generate' });

            // 取消错误
            if (info.isAborted) {
                log('info', 'Task cancelled by user');
                complete('[Task cancelled]');
                this.events.emit('cancelled', { reason: 'user_abort' });
                return true;
            }

            // 可重试错误（网络错误）
            if (info.isRetryable) {
                networkErrorCount++;
                const backoffMs = (error as { getBackoff(n: number): number }).getBackoff(networkErrorCount);

                log('warn', `Retryable error (attempt ${networkErrorCount}): ${info.message}`);

                if (networkErrorCount > MAX_NETWORK_RETRIES) {
                    log('error', `Max retries (${MAX_NETWORK_RETRIES}) reached`);
                    complete(`Service unavailable after ${MAX_NETWORK_RETRIES} retries. ${info.message}`);
                    return true;
                }

                log('info', `Retrying in ${backoffMs / 1000}s...`);
                return false; // 继续循环重试
            }

            // 永久性错误（认证、模型不存在等）
            if (info.isPermanent) {
                log('error', `Permanent error: ${info.message}`);

                let userMessage = `API Error: ${info.message}`;
                if (info.isAuth) {
                    userMessage = 'Authentication failed. Please check your API key configuration.';
                } else if (info.isModelNotFound) {
                    userMessage = info.resourceType === 'model'
                        ? `Model not found. Please check AI_MODEL configuration. ${info.message}`
                        : `Resource not found. ${info.message}`;
                }

                if (++consecutiveErrorCount > this.noProgressLimit) {
                    complete(userMessage);
                    return true;
                }
                return false;
            }

            // 未知错误
            log('error', `Unexpected error: ${info.message}`);

            if (++consecutiveErrorCount > this.noProgressLimit) {
                complete(`Max error limit reached (${this.noProgressLimit} consecutive errors). Last error: ${info.message}`);
                return true;
            }

            return false;
        };

        // 添加用户消息
        const userMessage: Message = { role: 'user', type: 'text', content: query };
        this.sessionManager.addMessage(userMessage);
        this.events.emit('message', { message: userMessage });

        // 主循环
        let step = 0;
        while (true) {
            step++;

            // 检查循环限制
            if (this.maxLoop > 0 && step > this.maxLoop) {
                return complete(`Max loop limit reached (${this.maxLoop})`);
            }

            // 获取并压缩消息
            const messages = this.sessionManager.getMessages();
            const { totalUsed, usableLimit } = this.compaction.getToken(
                [{ role: 'system', content: this.systemPrompt }, ...messages],
                tools
            );
            log('info', `totalUsed: ${totalUsed}/${usableLimit}`);

            const { isCompacted, list: llmMessages } = await this.compaction.compact(
                [{ role: 'system', content: this.systemPrompt }, ...messages],
                tools
            );

            if (isCompacted) {
                this.sessionManager.setMessages(llmMessages);
            }

            // 发送思考开始事件
            this.events.emit('thinking', { step });

         
           

            // 构建 AbortController
            const abortController = new AbortController();
            const currentAbortSignal = abortSignal || abortController.signal;

            if (abortSignal) {
                abortSignal.addEventListener('abort', () => abortController.abort());
            }

            try {
                // 构建流式回调
                const wrappedStreamCallback = streamCallback
                    ? (chunk: StreamChunk) => {
                          streamCallback(chunk);
                          this.events.emit('stream-chunk', chunk);
                      }
                    : (chunk: StreamChunk) => {
                          this.events.emit('stream-chunk', chunk);
                      };
                
                // 调用 LLM
                const llmResponse = await this.llmProvider.generate(
                    [{ role: 'system', content: this.systemPrompt }, ...llmMessages],
                    {
                        tools: tools.length > 0 ? tools : undefined,
                        maxTokens: this.llmProvider.config.maxOutputTokens,
                        stream: streamEnabled,
                        streamCallback: wrappedStreamCallback,
                        abortSignal: currentAbortSignal,
                        temperature: this.temperature,
                    }
                );
                  
                if (!llmResponse) {
                    throw new Error('LLM response is null');
                }

                // 保存 LLM 响应
                this.sessionManager.addMessage(llmResponse as Message);
                this.events.emit('message', { message: llmResponse as Message });

                // 处理工具调用
                const { hasToolCalls, hasError } = await this.handleToolCalls(llmResponse, { silent, spinner, log, complete });

                if (hasError) {
                    log('warn', 'Tool execution had errors');
                    if (++consecutiveErrorCount > this.noProgressLimit) {
                        return complete(
                            `Agent stopped: ${consecutiveErrorCount} consecutive tool errors. ` +
                            'Please review error messages and try a different approach.'
                        );
                    }
                    this.events.emit('thinking-end', { step, hasToolCalls });
                    continue;
                }

                this.events.emit('thinking-end', { step, hasToolCalls });

                // 检查是否需要返回
                if (!hasToolCalls) {
                    const { finishReason, content } = llmResponse;

                    // 检查 finishReason
                    if (!VALID_FINISH_REASONS.includes(finishReason as typeof VALID_FINISH_REASONS[number])) {
                        log('error', `Unexpected finishReason: ${finishReason}`);
                        if (++consecutiveErrorCount > this.noProgressLimit) {
                            return complete(`Max error limit reached: unexpected finishReason "${finishReason}"`);
                        }
                        continue;
                    }

                    // 检查空响应
                    if (!content || content.trim() === '') {
                        log('warn', 'LLM returned empty response');
                        if (++consecutiveErrorCount > this.noProgressLimit) {
                            return complete(`Agent stopped: ${consecutiveErrorCount} consecutive empty responses`);
                        }
                        continue;
                    }

                    // 正常返回
                    return complete(content);
                }

                // 工具调用成功，重置错误计数
                consecutiveErrorCount = 0;
                networkErrorCount = 0;
            } catch (error) {
                if (handleError(error)) {
                    return lastResponse;
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // 私有方法
    // -------------------------------------------------------------------------

    /** 处理工具调用 */
    private async handleToolCalls(
        llmResponse: LLMResponse,
        ctx: { silent: boolean; spinner: ReturnType<ScopedLogger['spinner']> | null; log: (level: 'info' | 'warn' | 'error', message: string) => void; complete: (c: string) => AgentResponse }
    ): Promise<{ hasToolCalls: boolean; hasError: boolean }> {
        if (!llmResponse.tool_calls?.length) {
            return { hasToolCalls: false, hasError: false };
        }

        const toolCount = llmResponse.tool_calls.length;
        this.events.emit('tool-calls-start', { count: toolCount });

        const toolResults: Message[] = [];
        let hasError = false;

        for (const call of llmResponse.tool_calls) {
            try {
                const result = await this.executeTool(call);
                toolResults.push(result);
            } catch (error) {
                if (error instanceof ToolError) {
                    toolResults.push(error.data);
                    hasError = true;
                } else {
                    toolResults.push({
                        role: 'tool',
                        type: 'text',
                        content: `Error: Unknown tool execution error - ${error instanceof Error ? error.message : String(error)}`,
                        tool_call_id: call.id,
                    });
                    hasError = true;
                }
            }
        }

        this.sessionManager.addMessage(toolResults);
        toolResults.forEach(msg => this.events.emit('message', { message: msg }));

        // 生成摘要
        const summary = toolResults
            .map(r => (r.content ?? '').length > 50 ? (r.content ?? '').slice(0, 47) + '...' : (r.content ?? ''))
            .join(', ');

        this.events.emit('tool-calls-end', { count: toolCount, hasErrors: hasError, summary });

        // 输出工具调用结果
        if (ctx.silent) {
            this.events.emit('log', { level: hasError ? 'warn' : 'info', message: `Tool calls: ${summary}` });
        } else if (ctx.spinner) {
            ctx.spinner[hasError ? 'warn' : 'succeed'](`Tool calls: ${summary}`);
        }

        return { hasToolCalls: true, hasError };
    }

    /** 执行单个工具调用 */
    private async executeTool(toolCall: ToolCall): Promise<Message> {
        const { name, arguments: args } = toolCall.function;

        if (!name) {
            throw new ToolError({
                role: 'tool',
                type: 'text',
                content: 'Error: Tool name is empty',
                tool_call_id: toolCall.id,
            });
        }

        this.events.emit('tool-call', { toolName: name, args });

        const startTime = Date.now();
        try {
            const result = await ToolRegistry.execute(name, args);
            const duration = Date.now() - startTime;

            this.events.emit('tool-result', { toolName: name, result, duration });
            return {
                role: 'tool',
                type: 'text',
                content: this.formatToolResult(result),
                tool_call_id: toolCall.id,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMsg = error instanceof Error ? error.message : String(error);

            this.events.emit('tool-result', {
                toolName: name,
                result: { success: false, error: errorMsg },
                duration,
            });

            throw new ToolError({
                role: 'tool',
                type: 'text',
                content: `Error: Tool execution failed - ${errorMsg}`,
                tool_call_id: toolCall.id,
            });
        }
    }

    /** 格式化工具结果 */
    private formatToolResult(result: ToolResult): string {
        if (result.success) {
            if (result.data !== undefined) {
                return typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2);
            }
            if (result.metadata) {
                return JSON.stringify(result.metadata, null, 2);
            }
            return 'Tool executed successfully';
        }
        return `Error: ${result.error || 'Unknown error'}`;
    }
}
