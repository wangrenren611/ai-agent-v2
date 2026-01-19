/**
 * Agent - AI 代理
 * 负责编排 LLM 调用和会话管理
 * 
 * 注意：此文件是旧版 Agent，建议使用 index-eventbus.ts 以获得 EventBus 集成
 * 要启用 EventBus 功能，请导入 './index-eventbus' 而不是此文件
 */
import EventEmitter from "events";
import { LLMProvider, LLMResponse, ToolSchema } from "../providers/base";
import { ScopedLogger } from "../util/log";
import { formatToolResult } from "../util/log-format";
import { SessionManager } from "../session-v2";
import { SYSTEM_PROMPT } from "../prompts/system";
import { ToolRegistry } from "../tool/registry";

export interface AgentConfig {
    llmProvider: LLMProvider;
    sessionManager: SessionManager;
    systemPrompt?: string;
    /** 默认工具列表（可选），不传则使用 ToolRegistry 中所有工具 */
    defaultTools?: ToolSchema[];
    /** 最大循环次数，防止无限循环，默认 10 */
    maxLoop?: number;
    /** 最大 token 数，默认 8000 */
    maxTokens?: number;
    /** 最大输出 token 数，默认 8000 */
    maxOutputTokens?: number;
    /** 工具并发上限，默认 4 */
    toolConcurrency?: number;
    /** 单次工具调用超时（毫秒），默认 120000 */
    toolTimeoutMs?: number;
    /** 连续重复的工具调用轮次上限，默认 2 */
    noProgressLimit?: number;
}

export interface AgentResponse {
    content: string;
    role: 'assistant';
}

export default class Agent extends EventEmitter {
    private llmProvider: LLMProvider;
    private logger: ScopedLogger;
    private sessionManager: SessionManager;
    private systemPrompt: string;
    private defaultTools: ToolSchema[] | undefined;
    private maxLoop: number;
    maxOutputTokens: number;
    maxTokens: number;
    private toolConcurrency: number;
    private toolTimeoutMs: number;
    private noProgressLimit: number;
    constructor(config: AgentConfig) {
        super();
        this.llmProvider = config.llmProvider;
        this.sessionManager = config.sessionManager;
        this.systemPrompt = config.systemPrompt || SYSTEM_PROMPT;
        this.defaultTools = config.defaultTools;
        this.logger = new ScopedLogger('Agent');
        this.maxLoop = config.maxLoop ?? 1024;
        const providerMaxOutput = this.llmProvider.maxOutputTokens;
        const providerMaxTokens = this.llmProvider.maxTokens;
        this.maxOutputTokens = Math.min(config.maxOutputTokens ?? providerMaxOutput, providerMaxOutput);
        this.maxTokens = Math.min(config.maxTokens ?? providerMaxTokens, providerMaxTokens);
        this.toolConcurrency = Math.max(1, config.toolConcurrency ?? 4);
        this.toolTimeoutMs = config.toolTimeoutMs ?? 120000;
        this.noProgressLimit = Math.max(0, config.noProgressLimit ?? 2);
        this.sessionManager.maxOutputTokens = this.maxOutputTokens;
        this.sessionManager.maxTokens = this.maxTokens;
    }

    private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
        if (!timeoutMs || timeoutMs <= 0) {
            return promise;
        }

        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
        });

        return Promise.race([promise, timeoutPromise]).finally(() => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        });
    }

    private async runWithConcurrency<T, R>(
        items: T[],
        limit: number,
        task: (item: T, index: number) => Promise<R>
    ): Promise<R[]> {
        if (items.length === 0) {
            return [];
        }

        if (limit <= 1) {
            const results: R[] = [];
            for (let i = 0; i < items.length; i++) {
                results.push(await task(items[i], i));
            }
            return results;
        }

        const results = new Array<R>(items.length);
        let nextIndex = 0;
        const workerCount = Math.min(limit, items.length);

        const workers = Array.from({ length: workerCount }, async () => {
            while (true) {
                const currentIndex = nextIndex++;
                if (currentIndex >= items.length) {
                    break;
                }
                results[currentIndex] = await task(items[currentIndex], currentIndex);
            }
        });

        await Promise.all(workers);
        return results;
    }

    private buildToolSignature(toolCalls: NonNullable<LLMResponse['tool_calls']>): string {
        try {
            return JSON.stringify(
                toolCalls.map((call) => ({
                    name: call.function.name,
                    arguments: call.function.arguments,
                }))
            );
        } catch (_) {
            return '';
        }
    }

    /**
     * 运行 Agent 处理用户查询
     * @param sessionId 会话 ID
     * @param userId 用户 ID
     * @param query 用户查询
     * @param options 选项
     * @returns Agent 响应
     */
    async run(
        query: string,
        options?: { silent?: boolean; tools?: ToolSchema[] }
    ): Promise<AgentResponse | null> {

     
        try {

            // 3. 获取工具 schemas（优先级：传入参数 > 默认配置 > ToolRegistry 全部）
            const tools = options?.tools ?? this.defaultTools ?? ToolRegistry.getSchemas();

            // 4. LLM 调用循环（处理工具调用）
            let i = 0; // 防止无限循环
            let finalResponse: AgentResponse | null = null;
            let lastToolSignature: string | null = null;
            let repeatedToolCalls = 0;
  
  
            this.sessionManager.addMessage({
                role: 'user',
                type: 'text',
                content: query
            });

            while (i < this.maxLoop) {
                i++; // 在循环开始时递增计数器

                const llmMessages = await this.sessionManager.getMessages();

                const spinner = this.logger.spinner(`Thinking-${i}...`);
                let llmResponse: Awaited<ReturnType<LLMProvider['generate']>> = null;
                try {
                    // 调用 LLM
                    llmResponse = await this.llmProvider.generate([
                        {
                            role: 'system',
                            content: this.systemPrompt,
                        },
                        ...llmMessages
                    ], {
                        model: process.env.AI_MODEL,
                        tools: tools.length > 0 ? tools : undefined,
                        max_tokens: this.maxOutputTokens,
                    });
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    spinner.fail(`Thinking-${i} failed`);
                    this.emit('failure', { error: errorMsg });
                    this.logger.error(`LLM error: ${errorMsg}`);
                    return null;
                }

                if (!llmResponse) {
                    this.emit('failure', {error: 'LLM returned null response' });
                    this.logger.error("LLM error")
                    spinner.fail(`Thinking-${i} failed`);
                    return null;
                }
                spinner.succeed(`Thinking-${i} end`);

                // 检查是否有工具调用
                if (llmResponse.tool_calls && llmResponse.tool_calls.length > 0) {
                    const toolSignature = this.buildToolSignature(llmResponse.tool_calls);
                    if (toolSignature && toolSignature === lastToolSignature) {
                        repeatedToolCalls += 1;
                    } else {
                        repeatedToolCalls = 0;
                        lastToolSignature = toolSignature;
                    }

                    if (this.noProgressLimit > 0 && repeatedToolCalls >= this.noProgressLimit) {
                        const errorMsg = `Repeated tool_calls detected for ${this.noProgressLimit + 1} iterations, aborting to prevent loop.`;
                        this.logger.error(errorMsg);
                        this.emit('failure', { error: errorMsg });
                        return null;
                    }

                    // 添加 assistant 消息（包含 tool_calls）
                    this.sessionManager.addMessage({
                        role: 'assistant',
                        content: llmResponse.content,
                        type: 'tool_call',
                        tool_calls: llmResponse.tool_calls,
                    });

                    this.logger.info(`Tool tips: ${llmResponse.content}`);

                    const toolCalls = llmResponse.tool_calls;
                    const toolConcurrency = Math.min(this.toolConcurrency, toolCalls.length);

                    const results = await this.runWithConcurrency(toolCalls, toolConcurrency, async (toolCall) => {
                        const { id,function: fn } = toolCall;
                        try {
                            // 解析参数（带容错处理）
                            let args: unknown;
                            try {
                                args = JSON.parse(fn.arguments);
                            } catch (parseError) {
                                // JSON 解析失败 - 记录详细信息并返回友好的错误信息
                                const truncatedArgs = fn.arguments.length > 200
                                    ? fn.arguments.slice(0, 200) + '...'
                                    : fn.arguments;
                                const parseErrorMsg = parseError instanceof Error ? parseError.message : String(parseError);
                                const errorMsg = `Invalid JSON in tool parameters: ${parseErrorMsg}\nReceived: ${truncatedArgs}`;
                                this.logger.error(errorMsg);
                                return {
                                    toolCall,
                                    result: `Error: Failed to parse tool arguments. The JSON was malformed. Please try again with properly formatted parameters.`,
                                    error: errorMsg,
                                    id,
                                };
                            }

                            const spinner = this.logger.spinner(`Tool ${fn.name}(...)`);
                            // 执行工具
                            let result: string;
                            try {
                                result = await this.withTimeout(
                                    ToolRegistry.execute(fn.name, args),
                                    this.toolTimeoutMs,
                                    `Tool ${fn.name} timed out after ${this.toolTimeoutMs}ms`
                                );
                                spinner.succeed(`Tool ${fn.name} completed`);
                            } catch (error) {
                                spinner.fail(`Tool ${fn.name} failed`);
                                throw error;
                            }

                            if (!options?.silent) {
                                this.logger.info(`Tool ${fn.name} result: ${formatToolResult(fn.name, result)}`);
                            }

                            // 返回成功结果
                            return { toolCall, result, error: undefined ,id};
                        } catch (error) {
                            const errorMsg = error instanceof Error ? error.message : String(error);
                            this.logger.error(`Tool execution error: ${errorMsg}`);

                            // 返回错误结果
                            return { toolCall, result: `Error: ${errorMsg}`, error: errorMsg,id };
                        }
                    });

                    // 按原始顺序添加工具结果消息
                    for (const { toolCall, result, error: _error } of results) {
                        const { id } = toolCall;

                        this.sessionManager.addMessage({
                            role: 'tool',
                            content: result,
                            type: 'tool',
                            tool_call_id: id,
                        });
                    }

                    // 继续循环，让 LLM 基于工具结果生成响应
                    continue;
                }

                // 没有工具调用，这是最终响应
                this.sessionManager.addMessage({
                    role: 'assistant',
                    type: 'text',
                    content: llmResponse.content,
                });

                finalResponse = {
                    content: llmResponse.content,
                    role: 'assistant',
                };

                break;
            }

            if (i >= this.maxLoop) {
                this.logger.error('Max iterations reached, possible infinite loop');
                return null;
            }

    

            return finalResponse;

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Agent error: ${errorMsg}`);
            return null;
        }
    }

}
