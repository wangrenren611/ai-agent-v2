/**
 * Agent - AI 代理
 * 负责编排 LLM 调用和会话管理
 *
 * 注意：此文件是旧版 Agent，建议使用 index-eventbus.ts 以获得 EventBus 集成
 * 要启用 EventBus 功能，请导入 './index-eventbus' 而不是此文件
 */
import EventEmitter from "events";
import { LLMProvider, LLMResponse, Message, ToolCall, ToolSchema, StreamChunk } from "../providers/base";
import {
  LLMError,
  LLMRetryableError,
  LLMPermanentError,
  LLMAbortedError,
  LLMAuthError,
  LLMNotFoundError,
  isRetryableError,
  isPermanentError,
  isAbortedError,
} from "../providers/errors";
import { ScopedLogger } from "../util/log";
import { SessionManager } from "../session-v2";
import { ToolRegistry, ToolResult } from "../tool/registry";
import { Compaction } from "../session-v2/compaction";
import { AgentContext, getAgentContext } from "../context";



class ToolError extends Error {
    constructor(data: Message) {
        super(data.content || 'Tool execution failed');
        this.name = 'ToolError';
        this.data = data;
    }

    /** 工具执行结果数据 */
    data: Message;
}
export interface AgentConfig {
    llmProvider: LLMProvider;
    systemPrompt: string;
    /** 默认工具列表（可选），不传则使用 ToolRegistry 中所有工具 */
    defaultTools?: ToolSchema[];
    /** 最大循环次数，0 或 null 表示无限制，默认 1024 */
    maxLoop?: number | null;
    /** 最大 token 数，默认 8000 */
    maxTokens?: number;
    /** 最大输出 token 数，默认 8000 */
    maxOutputTokens?: number;
    /** 工具并发上限，默认 1 */
    toolConcurrency?: number;
    /** 单次工具调用超时（毫秒），默认 300000 (5分钟) */
    toolTimeoutMs?: number;
    /** 连续错误次数上限，默认 2 */
    noProgressLimit?: number;
    /** 会话 ID */
    sessionId?: string;
}

export interface AgentRunOptions {
    silent?: boolean;
    tools?: ToolSchema[];
    /** 启用流式响应 */
    stream?: boolean;
    /** 流式回调函数 */
    streamCallback?: (chunk: StreamChunk) => void;
    /** Abort signal for cancelling the request */
    abortSignal?: AbortSignal;
}

export interface AgentResponse {
    content: string;
    role: Message['role'];
    type?: Message['type'];
}

export default class Agent extends EventEmitter {
    private llmProvider: LLMProvider;
    private logger: ScopedLogger;
    public readonly sessionManager: SessionManager;
    public readonly context: AgentContext;
    private systemPrompt: string;
    private defaultTools: ToolSchema[] | undefined;
    private maxLoop: number | null | undefined;
    private maxOutputTokens: number;
    private maxTokens: number;
    private noProgressLimit: number;
    private compaction: Compaction;

    constructor(config: AgentConfig) {
        super();
        this.llmProvider = config.llmProvider;

        // 获取或创建 AgentContext
        this.context = getAgentContext({
            session: {
                sessionId: config.sessionId || `session_${Date.now()}`,
                userId: 'default',
            },
        });

        // 初始化上下文
        this.context.initialize();

        this.sessionManager = new SessionManager({
            sessionId: this.context.sessionId,
            sessionDir: this.context.sessionDir,
            llmProvider: this.llmProvider,
        });

        // 将 AgentContext 设置到 ToolRegistry
        ToolRegistry.setAgentContext(this.context);

        this.systemPrompt = config.systemPrompt;
        this.defaultTools = config.defaultTools;
        this.logger = new ScopedLogger('Agent');
        this.maxLoop = config.maxLoop;
        const providerMaxOutput = this.llmProvider.maxOutputTokens;
        const providerMaxTokens = this.llmProvider.maxTokens;
        this.maxOutputTokens = Math.min(config.maxOutputTokens ?? providerMaxOutput, providerMaxOutput);
        this.maxTokens = Math.min(config.maxTokens ?? providerMaxTokens, providerMaxTokens);
        this.noProgressLimit = Math.max(0, config.noProgressLimit ?? 2);
        this.sessionManager.maxOutputTokens = this.maxOutputTokens;
        this.sessionManager.maxTokens = this.maxTokens;
        this.compaction = new Compaction({
            maxTokens: this.maxTokens,
            maxOutputTokens: this.maxOutputTokens,
            llmProvider: this.llmProvider,
        });
    }

    start() {
        this.sessionManager.init();
    }

    /**
     * 执行单个工具调用
     * @returns 工具结果消息，如果执行失败返回包含错误的消息
     */
    private async executeToolCall(toolCall: ToolCall): Promise<Message> {
        const { name, arguments: args } = toolCall.function;
        if (!name) {
            throw new ToolError({
                role: 'tool',
                type: 'text',
                content: 'Error: Tool name is empty',
                tool_call_id: toolCall.id,
            });
        }

        try {
            const result = await ToolRegistry.execute(name, args);
            const content = this.formatToolResult(result);
            this.logger.info(`Tool "${name}" execution successful: ${content}`);
            return {
                role: 'tool',
                type: 'text',
                content,
                tool_call_id: toolCall.id,
            };
        } catch (error) {
            // 工具执行错误不向上抛出，而是返回错误消息
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Tool "${name}" execution failed: ${errorMsg}`);

            throw new ToolError({
                role: 'tool',
                type: 'text',
                content: `Error: Tool execution failed - ${errorMsg}`,
                tool_call_id: toolCall.id,
            });
        }
    }

    /**
     * 格式化工具结果为字符串内容
     */
    private formatToolResult(result: ToolResult): string {
        if (result.success) {
            // 成功：优先返回 data，其次返回 metadata
            if (result.data !== undefined) {
                if (typeof result.data === 'string') {
                    return result.data;
                }
                return JSON.stringify(result.data, null, 2);
            }
            if (result.metadata) {
                return JSON.stringify(result.metadata, null, 2);
            }
            return 'Tool executed successfully';
        } else {
            // 失败：返回错误信息
            return `Error: ${result.error || 'Unknown error'}`;
        }
    }

    /**
     * 处理工具调用，返回是否有工具被调用
     * @returns { hasToolCalls: boolean, hasError: boolean }
     */
    private async handleToolCalls(
        llmResponse: LLMResponse,
        spinner: ReturnType<ScopedLogger['spinner']>
    ): Promise<{ hasToolCalls: boolean; hasError: boolean }> {
        if (!llmResponse.tool_calls || llmResponse.tool_calls.length === 0) {
            return { hasToolCalls: false, hasError: false };
        }

        const toolResults: Message[] = [];
        let hasExecutionError = false;


        // 顺序执行工具调用（避免并发导致的资源竞争问题）
        for (const call of llmResponse.tool_calls) {
            try {
                const result = await this.executeToolCall(call);
                toolResults.push(result);
                // 检查是否是错误结果
            } catch (error:any) {
                if (error instanceof ToolError) {
                    toolResults.push(error.data);
                    hasExecutionError = true;
                } else {
                    // 其他未知错误继续抛出
                    toolResults.push({
                        role: 'tool',
                        type: 'text',
                        content: `Error: Unknown tool execution error - ${error?.message}`,
                        tool_call_id: call.id,
                    });
                }
            }
        }

        this.sessionManager.addMessage(toolResults);

        // 提取 content 字段进行拼接
        const summaries = toolResults
            .map(r => {
                const content = r.content ?? '';
                return content.length > 50 ? content.slice(0, 47) + '...' : content;
            })
            .join(', ');

        if (hasExecutionError) {
            spinner.warn(`Tool calls completed with errors: ${summaries}`);
        } else {
            spinner.succeed(`Tool calls: ${summaries}`);
        }

        return { hasToolCalls: true, hasError: hasExecutionError };
    }

    /**
    /**
     * 运行 Agent 处理用户查询
     * @param query 用户查询
     * @param options 选项
     * @returns Agent 响应
     */
    async run(
        query: string,
        options?: AgentRunOptions
    ): Promise<AgentResponse | null> {
        const tools = options?.tools ?? this.defaultTools ?? [];
        let consecutiveErrorCount = 0;
        let networkErrorCount = 0;
        let i = 0;
        const streamEnabled = options?.stream ?? false;
        const streamCallback = options?.streamCallback;
        const externalAbortSignal = options?.abortSignal;

        // 添加用户消息
        this.sessionManager.addMessage({
            role: 'user',
            type: 'text',
            content: query,
        });

        while (true) {
            i++;

            // maxLoop 为 0 或 null 表示无限制
            if (this.maxLoop && this.maxLoop > 0 && i > this.maxLoop) {
                return {
                    content: `Max loop limit reached (${this.maxLoop})`,
                    role: 'assistant',
                };
            }

            const meessages = this.sessionManager.getMessages();
            const { totalUsed, usableLimit } = this.compaction.getToken(meessages);

            this.logger.info(`totalUsed: ${totalUsed}/${usableLimit}`);

            const { isCompacted, list: llmMessages } = await this.compaction.compact(meessages);

            if (isCompacted) {
                this.sessionManager.setMessages(llmMessages);
            }

            const spinner = this.logger.spinner(`Thinking-${i}...`);

            // 创建 AbortController 用于取消请求
            const abortController = new AbortController();
            const currentAbortSignal = externalAbortSignal || abortController.signal;

            // 如果有外部 abortSignal，监听它以同步内部的 abortController
            if (externalAbortSignal) {
                externalAbortSignal.addEventListener('abort', () => {
                    abortController.abort();
                });
            }

            try {
                // 构建包装的流式回调，用于停止 spinner
                let spinnerStopped = false;
                const wrappedStreamCallback = streamCallback ? (chunk: StreamChunk) => {
                    if (!spinnerStopped) {
                        spinner.stop();
                        spinnerStopped = true;
                    }
                    // 调用原始回调
                    streamCallback(chunk);
                    // 发送事件
                    this.emit('stream-chunk', chunk);
                } : undefined;

                const llmResponse = await this.llmProvider.generate(
                    [
                        { role: 'system', content: this.systemPrompt },
                        ...llmMessages,
                    ],
                    {
                        model: process.env.AI_MODEL,
                        tools: tools.length > 0 ? tools : undefined,
                        max_tokens: this.maxOutputTokens,
                        stream: streamEnabled,
                        streamCallback: wrappedStreamCallback,
                        abortSignal: currentAbortSignal,
                    }
                );

                if (!llmResponse) {
                    throw new Error('LLM response is null');
                }

                this.sessionManager.addMessage(llmResponse);

                const { hasToolCalls, hasError: toolHasError } = await this.handleToolCalls(llmResponse, spinner);

                if (toolHasError) {
                    // 🔧 P1 修复: 工具错误恢复机制
                    this.logger.warn('Tool execution had errors');
                    consecutiveErrorCount++;

                    if (consecutiveErrorCount > this.noProgressLimit) {
                        spinner.fail(`Max tool errors reached (${consecutiveErrorCount})`);
                        return {
                            content: `Agent stopped: ${consecutiveErrorCount} consecutive tool errors occurred. Please review the error messages and try a different approach.`,
                            role: 'assistant',
                        };
                    }

                    // 添加恢复提示，引导 LLM 尝试其他方法
                    this.sessionManager.addMessage({
                        role: 'user',
                        type: 'text',
                        content: 'Some tools failed. Please analyze the error messages and try a different approach. Consider: 1) Checking if the parameters are correct, 2) Using alternative tools, 3) Asking the user for clarification.',
                    });
                    continue;
                }

                if (!hasToolCalls) {
                    // 单次无工具调用即返回，无需继续循环
                    // 正常结束状态：'stop'、'eos'、undefined；其他值可能是异常
                    const messages = this.sessionManager.getMessages();
                    const lastMessageRole = messages[messages.length - 1].role;
                    const lastMessageType = messages[messages.length - 1].type;

                    const validEnd = ['stop', 'eos', undefined].includes(llmResponse.finishReason as string);
                    if (!validEnd) {
                        spinner.fail(`Unexpected finishReason: ${llmResponse.finishReason}`);
                        consecutiveErrorCount++;

                        if (consecutiveErrorCount > this.noProgressLimit) {
                            return {
                                content: `Max error limit reached: unexpected finishReason "${llmResponse.finishReason}"`,
                                role: 'assistant',
                            };
                        }
                        // 继续循环，尝试让 LLM 恢复
                        continue;
                    } else if (lastMessageRole === 'assistant' && lastMessageType === 'text') {
                        // 🔧 P0 修复: 检查空响应
                        const responseContent = llmResponse?.content ?? '';
                        if (!responseContent || responseContent.trim() === '') {
                            spinner.warn('LLM returned empty response');
                            consecutiveErrorCount++;

                            if (consecutiveErrorCount > this.noProgressLimit) {
                                return {
                                    content: `Agent stopped: LLM returned ${consecutiveErrorCount} consecutive empty responses`,
                                    role: 'assistant',
                                };
                            }

                            // 添加恢复提示
                            this.sessionManager.addMessage({
                                role: 'user',
                                type: 'text',
                                content: 'The previous response was empty. Please continue with your task - describe what you were trying to do or ask for help.',
                            });
                            continue;
                        }

                        spinner.succeed('\nTask success!');
                        spinner.clear();
                        return {
                            content: responseContent,
                            role: 'assistant',
                        };
                    } else if (lastMessageRole === 'assistant' && lastMessageType === 'summary') {
                        continue;
                    }
                }

                // 工具调用成功，重置连续错误计数
                consecutiveErrorCount = 0;
                networkErrorCount = 0;

            } catch (error) {
                // 使用新的错误类型处理
                const errorMsg = error instanceof Error ? error.message : String(error);

                // 处理取消错误
                if (isAbortedError(error)) {
                    spinner.fail('Task cancelled');
                    this.logger.info('Task cancelled by user');
                    this.sessionManager.addMessage({
                        role: 'assistant',
                        type: 'text',
                        content: '\n[Task cancelled - press Enter to continue]',
                        tool_calls: undefined,
                    });
                    return {
                        content: '[Task cancelled]',
                        role: 'assistant',
                    };
                }

                // 处理可重试错误（网络错误、服务器错误、速率限制）
                if (isRetryableError(error)) {
                    networkErrorCount++;

                    // 获取建议的重试延迟
                    const backoffMs = error.getBackoff(networkErrorCount);
                    spinner.warn(`Retryable error (attempt ${networkErrorCount}): ${errorMsg}`);

                    const maxNetworkRetries = 3;
                    if (networkErrorCount > maxNetworkRetries) {
                        this.logger.error(`Max retries (${maxNetworkRetries}) reached`);
                        this.sessionManager.addMessage({
                            role: 'assistant',
                            type: 'text',
                            content: `[Retryable Error] After ${maxNetworkRetries} attempts: ${errorMsg}`,
                        });
                        return {
                            content: `Service unavailable after ${maxNetworkRetries} retries. ${errorMsg}`,
                            role: 'assistant',
                        };
                    }

                    this.logger.info(`Retrying in ${backoffMs / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, backoffMs));
                    continue;
                }

                // 处理永久性错误（认证失败、模型不存在、参数错误等）
                if (isPermanentError(error)) {
                    spinner.fail('Permanent error occurred');
                    this.logger.error(`Permanent error: ${errorMsg}`);

                    let userMessage = `API Error: ${errorMsg}`;

                    // 特殊处理认证错误
                    if (error instanceof LLMAuthError) {
                        userMessage = 'Authentication failed. Please check your API key configuration.';
                    }
                    // 特殊处理模型不存在错误
                    else if (error instanceof LLMNotFoundError) {
                        if (error.resourceType === 'model') {
                            userMessage = `Model not found. Please check AI_MODEL configuration. ${errorMsg}`;
                        } else {
                            userMessage = `Resource not found. ${errorMsg}`;
                        }
                    }

                    // 🔧 P2 修复: 永久性错误也使用 system 消息
                    this.sessionManager.addMessage({
                        role: 'assistant',
                        type: 'text',
                        content: `[Permanent Error] ${userMessage}`,
                    });

                    return {
                        content: userMessage,
                        role: 'assistant',
                    };
                }

                // 处理其他未知错误
                spinner.fail(`Error: ${errorMsg}`);
                this.logger.error(`Unexpected error: ${errorMsg}`);

                // 🔧 P2 修复: 使用 system 消息而非 assistant 消息
                this.sessionManager.addMessage({
                    role: 'assistant',
                    type: 'text',
                    content: `[Error] ${errorMsg}. Please try a different approach.`,
                });

                consecutiveErrorCount++;

                if (consecutiveErrorCount > this.noProgressLimit) {
                    return {
                        content: `Max error limit reached (${this.noProgressLimit} consecutive errors). Last error: ${errorMsg}`,
                        role: 'assistant',
                    };
                }
            }
        }
    }
}
