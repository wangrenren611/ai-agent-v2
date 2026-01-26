/**
 * Agent - AI 代理
 * 负责编排 LLM 调用和会话管理
 *
 * 注意：此文件是旧版 Agent，建议使用 index-eventbus.ts 以获得 EventBus 集成
 * 要启用 EventBus 功能，请导入 './index-eventbus' 而不是此文件
 */
import EventEmitter from "events";
import { LLMProvider, LLMResponse, Message, ToolCall, ToolSchema, StreamChunk } from "../providers/base";
import { ScopedLogger } from "../util/log";
import { SessionManager } from "../session-v2";
import { ToolRegistry, ToolResult } from "../tool/registry";
import { Compaction } from "../session-v2/compaction";



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

/**
 * 检测是否为网络错误（可重试）
 */
function isNetworkError(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error);
    return (
        msg.includes('fetch') ||
        msg.includes('network') ||
        msg.includes('ECONNRESET') ||
        msg.includes('ETIMEDOUT') ||
        msg.includes('socket hang up') ||
        msg.includes('Failed to fetch') ||
        msg.includes('Service Unavailable') ||
        msg.includes('429') // Rate limit
    );
}

/**
 * 检测是否为取消错误
 */
function isAbortError(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error);
    return (
        msg.includes('abort') ||
        msg.includes('cancelled') ||
        msg.includes('Aborted')
    );
}

export default class Agent extends EventEmitter {
    private llmProvider: LLMProvider;
    private logger: ScopedLogger;
    public readonly sessionManager: SessionManager;
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
        this.sessionManager = new SessionManager({
            sessionId: config.sessionId || new Date().getTime().toString(),
            llmProvider: this.llmProvider,
        });
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
     * 格式化错误消息，用于添加到对话历史
     */
    private formatErrorForHistory(error: Error, isNetworkError: boolean): string {
        if (isNetworkError) {
            return `[Network Error] Temporary connectivity issue. Previous task was interrupted. Please analyze the context and continue from the last valid state.`;
        }
        return `[Error] ${error.message}`;
    }

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
                    // 工具调用出现错误，LLM 需要根据错误信息决定下一步
                    this.logger.warn('Tool execution had errors, continuing for LLM to handle');
                    // 不增加 consecutiveErrorCount，因为工具错误是预期的处理流程
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

                        spinner.succeed('\nTask success!');
                        spinner.clear();
                        return {
                            content: llmResponse?.content ?? '',
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
                const errorMsg = error instanceof Error ? error.message : String(error);
                const isNetError = isNetworkError(error);
                const isAbort = isAbortError(error);

                // 处理取消
                if (isAbort) {
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

                if (isNetError) {
                    networkErrorCount++;
                    spinner.warn(`Network error (attempt ${networkErrorCount}): ${errorMsg}`);

                    // 网络错误：指数退避重试
                    const maxNetworkRetries = 3;
                    if (networkErrorCount > maxNetworkRetries) {
                        this.logger.error(`Network error after ${maxNetworkRetries} retries`);
                        this.sessionManager.addMessage({
                            role: 'assistant',
                            type: 'text',
                            content: this.formatErrorForHistory(error instanceof Error ? error : new Error(errorMsg), true),
                        });
                        return {
                            content: `Network error after ${maxNetworkRetries} attempts. Please check your connection.`,
                            role: 'assistant',
                        };
                    }

                    // 指数退避
                    const backoffMs = Math.pow(2, networkErrorCount) * 1000;
                    spinner.start(`Retrying in ${backoffMs / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, backoffMs));

                    // 网络错误不增加 consecutiveErrorCount
                    continue;
                }

                // 非网络错误
                spinner.fail(`Error: ${errorMsg}`);
                this.logger.error(`LLM call failed: ${errorMsg}`);

                this.sessionManager.addMessage({
                    role: 'assistant',
                    type: 'text',
                    content: this.formatErrorForHistory(error instanceof Error ? error : new Error(errorMsg), false),
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
