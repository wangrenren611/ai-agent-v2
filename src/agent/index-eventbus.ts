/**
 * Agent - AI 代理（EventBus 集成版）
 * 负责编排 LLM 调用和会话管理，集成事件驱动架构
 */
import EventEmitter from "events";
import { LLMProvider, ToolSchema } from "../providers/base";
import { ScopedLogger } from "../util/log";
import { formatToolResult } from "../util/log-format";
import { SessionManager } from "../session-v2";
import { SYSTEM_PROMPT } from "../prompts/system";
import { ToolRegistry } from "../tool";
import { typedEventBus, createLoggingMiddleware } from "../util/event-bus";
import { AgentHook, AgentHookConfig, AgentHookRegistration } from "../util/event-bus-agent";

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
    /** 事件总线实例（可选），不传则使用全局实例 */
    eventBus?: any;
    /** 是否启用事件日志 */
    enableEventLogging?: boolean;
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
    private maxOutputTokens: number;
    private maxTokens: number;
    private eventBus: any;
    private hooks = new Map<AgentHook, AgentHookRegistration[]>();
    private hookCounter = 0;

    constructor(config: AgentConfig) {
        super();
        this.llmProvider = config.llmProvider;
        this.sessionManager = config.sessionManager;
        this.systemPrompt = config.systemPrompt || SYSTEM_PROMPT;
        this.defaultTools = config.defaultTools;
        this.logger = new ScopedLogger('Agent');
        this.maxLoop = config.maxLoop || 10;
        this.maxOutputTokens = config.maxOutputTokens || this.llmProvider.maxOutputTokens;
        this.maxTokens = config.maxTokens || this.llmProvider.maxTokens;
        this.eventBus = config.eventBus || typedEventBus;

        // 启用事件日志中间件
        if (config.enableEventLogging !== false) {
            this.eventBus.use(createLoggingMiddleware('Agent'));
        }
    }

    /**
     * 注册钩子处理器
     */
    registerHook<T = unknown>(
        hook: AgentHook,
        handler: (_data: T) => void | Promise<void>,
        config: AgentHookConfig = {}
    ): string {
        const handlerId = `hook_${++this.hookCounter}_${Date.now()}`;
        const registration: AgentHookRegistration = {
            hook,
            handler,
            config: {
                priority: config.priority || 100,
                async: config.async || false,
                timeout: config.timeout || 5000,
                ...config,
            },
            handlerId,
        };

        // 按优先级排序存储
        const existingHooks = this.hooks.get(hook) || [];
        existingHooks.push(registration);
        existingHooks.sort((a, b) => a.config.priority! - b.config.priority!);
        this.hooks.set(hook, existingHooks);

        // 发布钩子注册事件
        this.eventBus.emit('agent.hook.registered', {
            hookName: hook,
            handlerId,
            priority: registration.config.priority!,
        });

        return handlerId;
    }

    /**
     * 移除钩子处理器
     */
    unregisterHook(hook: AgentHook, handlerId: string): boolean {
        const hooks = this.hooks.get(hook);
        if (!hooks) return false;

        const initialLength = hooks.length;
        const filteredHooks = hooks.filter(h => h.handlerId !== handlerId);
        
        if (filteredHooks.length === initialLength) {
            return false;
        }

        if (filteredHooks.length === 0) {
            this.hooks.delete(hook);
        } else {
            this.hooks.set(hook, filteredHooks);
        }

        return true;
    }

    /**
     * 触发钩子
     */
    private async triggerHook<T>(hook: AgentHook, data: T): Promise<void> {
        const hooks = this.hooks.get(hook);
        if (!hooks || hooks.length === 0) return;

        // 发布钩子触发事件
        await this.eventBus.emit('agent.hook.triggered', {
            hookName: hook,
            data,
            handlerCount: hooks.length,
        });

        const startTime = Date.now();

        try {
            // 按优先级顺序执行钩子
            for (const registration of hooks) {
                const { handler, config } = registration;

                try {
                    if (config.async) {
                        // 异步执行，带超时
                        await Promise.race([
                            handler(data),
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error(`Hook timeout: ${hook}`)), config.timeout)
                            ),
                        ]);
                    } else {
                        // 同步执行
                        handler(data);
                    }
                } catch (error) {
                    // 发布钩子错误事件
                    await this.eventBus.emit('agent.hook.error', {
                        hookName: hook,
                        error: error instanceof Error ? error : new Error(String(error)),
                        handlerId: registration.handlerId,
                    });
                    
                    // 继续执行其他钩子，不中断流程
                    this.logger.warn(`Hook error in ${hook}: ${error}`);
                }
            }

            // 发布钩子完成事件
            const duration = Date.now() - startTime;
            await this.eventBus.emit('agent.hook.completed', {
                hookName: hook,
                data,
                handlerCount: hooks.length,
                duration,
            });

        } catch (error) {
            this.logger.error(`Failed to trigger hook ${hook}: ${error}`);
        }
    }

    /**
     * 运行 Agent 处理用户查询
     */
    async run(
        query: string,
        options?: { silent?: boolean; tools?: ToolSchema[] }
    ): Promise<AgentResponse | null> {
        const startTime = Date.now();

        try {
            // 触发运行前钩子
            await this.triggerHook(AgentHook.BEFORE_RUN, { query });

            // 发布运行开始事件
            await this.eventBus.emit('agent.run.start', { query });

            // 初始化统计变量
            let totalToolCalls = 0;
            let totalToolDuration = 0;

            // 1. 获取工具 schemas
            const tools = options?.tools ?? this.defaultTools ?? ToolRegistry.getSchemas();

            // 2. 添加用户消息
            this.sessionManager.addMessage({
                role: 'user',
                type: 'text',
                content: query,
            });

            // 发布消息添加事件
            await this.eventBus.emit('agent.message.added', {
                role: 'user',
                content: query,
                type: 'text',
            });

            // 3. LLM 调用循环
            let i = 0;
            let finalResponse: AgentResponse | null = null;

            while (i < this.maxLoop) {
                i++;

                // 触发循环迭代前钩子
                await this.triggerHook(AgentHook.BEFORE_LOOP_ITERATION, { iteration: i, maxLoop: this.maxLoop });

                // 发布循环开始事件
                await this.eventBus.emit('agent.loop.start', { iteration: i, maxLoop: this.maxLoop });

                // 获取会话消息
                const llmMessages = await this.sessionManager.getMessages();

                // 发布消息获取事件
                await this.eventBus.emit('agent.messages.retrieved', {
                    count: llmMessages.length,
                    iteration: i,
                });

                const spinner = this.logger.spinner(`Thinking-${i}...`);

                // 触发 LLM 调用前钩子
                await this.triggerHook(AgentHook.BEFORE_LLM_CALL, {
                    prompt: query,
                    model: 'deepseek-chat',
                    tools: tools.length > 0 ? tools : undefined,
                    iteration: i,
                });

                // 发布 LLM 调用开始事件
                const llmStartTime = Date.now();
                await this.eventBus.emit('agent.llm.call.start', {
                    prompt: query,
                    model: 'deepseek-chat',
                    tools: tools.length > 0 ? tools : undefined,
                    iteration: i,
                });

                // 调用 LLM
                const llmResponse = await this.llmProvider.generate([
                    {
                        role: 'system',
                        content: this.systemPrompt,
                    },
                    ...llmMessages,
                ], {
                    model: 'deepseek-chat',
                    tools: tools.length > 0 ? tools : undefined,
                    max_tokens: this.maxOutputTokens,
                });

                const llmDuration = Date.now() - llmStartTime;
                spinner.succeed(`Thinking-${i} end`);

                if (!llmResponse) {
                    // 发布 LLM 错误事件
                    await this.eventBus.emit('agent.llm.call.error', {
                        error: new Error('LLM returned null response'),
                        prompt: query,
                        iteration: i,
                    });

                    this.logger.error("LLM error");
                    return null;
                }

                // 发布 LLM 调用完成事件
                await this.eventBus.emit('agent.llm.call.complete', {
                    response: llmResponse.content,
                    hasToolCalls: !!(llmResponse.tool_calls && llmResponse.tool_calls.length > 0),
                    duration: llmDuration,
                    iteration: i,
                });

                // 触发 LLM 响应钩子
                await this.triggerHook(AgentHook.ON_LLM_RESPONSE, {
                    content: llmResponse.content,
                    toolCalls: llmResponse.tool_calls,
                    iteration: i,
                });

                // 发布 LLM 响应接收事件
                await this.eventBus.emit('agent.llm.response.received', {
                    content: llmResponse.content,
                    toolCalls: llmResponse.tool_calls,
                    iteration: i,
                });

                // 检查是否有工具调用
                if (llmResponse.tool_calls && llmResponse.tool_calls.length > 0) {
                    // 添加 assistant 消息
                    this.sessionManager.addMessage({
                        role: 'assistant',
                        content: llmResponse.content,
                        type: 'tool_call',
                        tool_calls: llmResponse.tool_calls,
                    });

                    // 发布消息添加事件
                    await this.eventBus.emit('agent.message.added', {
                        role: 'assistant',
                        content: llmResponse.content,
                        type: 'tool_call',
                    });

                    this.logger.info(`Tool tips: ${llmResponse.content}`);

                    // 发布工具批量开始事件
                    const toolsBatchStartTime = Date.now();
                    await this.eventBus.emit('agent.tools.batch.start', {
                        toolCalls: llmResponse.tool_calls,
                        iteration: i,
                    });

                    // 并行执行所有工具调用
                    const toolPromises = llmResponse.tool_calls.map(async (toolCall) => {
                        const { id, function: fn } = toolCall;

                        // 触发工具调用前钩子
                        await this.triggerHook(AgentHook.BEFORE_TOOL_CALL, {
                            toolName: fn.name,
                            params: fn.arguments,
                            toolCallId: id,
                            iteration: i,
                        });

                        // 发布工具调用开始事件
                        const toolStartTime = Date.now();
                        await this.eventBus.emit('agent.tool.call.start', {
                            toolName: fn.name,
                            params: fn.arguments,
                            toolCallId: id,
                            iteration: i,
                        });

                        try {
                            // 发布参数解析开始事件
                            await this.eventBus.emit('agent.tool.params.parse.start', {
                                toolName: fn.name,
                                rawArguments: fn.arguments,
                                toolCallId: id,
                            });

                            // 解析参数
                            let args: unknown;
                            try {
                                args = JSON.parse(fn.arguments);
                                
                                // 发布参数解析完成事件
                                await this.eventBus.emit('agent.tool.params.parse.complete', {
                                    toolName: fn.name,
                                    parsedParams: args,
                                    toolCallId: id,
                                });
                            } catch (parseError) {
                                const truncatedArgs = fn.arguments.length > 200
                                    ? fn.arguments.slice(0, 200) + '...'
                                    : fn.arguments;
                                const parseErrorMsg = parseError instanceof Error ? parseError.message : String(parseError);
                                const errorMsg = `Invalid JSON in tool parameters: ${parseErrorMsg}\nReceived: ${truncatedArgs}`;
                                
                                // 发布参数解析错误事件
                                await this.eventBus.emit('agent.tool.params.parse.error', {
                                    toolName: fn.name,
                                    rawArguments: fn.arguments,
                                    error: new Error(errorMsg),
                                    toolCallId: id,
                                });

                                this.logger.error(errorMsg);
                                return {
                                    toolCall,
                                    result: `Error: Failed to parse tool arguments. The JSON was malformed. Please try again with properly formatted parameters.`,
                                    error: errorMsg,
                                };
                            }

                            const spinner = this.logger.spinner(`Tool ${fn.name}(...)`);

                            // 执行工具
                            const result = await ToolRegistry.execute(fn.name, args);
                            spinner.succeed(`Tool ${fn.name} completed`);

                            if (!options?.silent) {
                                this.logger.info(`Tool ${fn.name} result: ${formatToolResult(fn.name, result)}`);
                            }

                            const toolDuration = Date.now() - toolStartTime;
                            
                            // 更新统计
                            totalToolCalls++;
                            totalToolDuration += toolDuration;

                            // 触发工具调用后钩子
                            await this.triggerHook(AgentHook.AFTER_TOOL_CALL, {
                                toolName: fn.name,
                                result,
                                duration: toolDuration,
                                toolCallId: id,
                                iteration: i,
                            });

                            // 发布工具调用完成事件
                            await this.eventBus.emit('agent.tool.call.complete', {
                                toolName: fn.name,
                                result,
                                duration: toolDuration,
                                toolCallId: id,
                                iteration: i,
                            });

                            return { toolCall, result, error: undefined };
                        } catch (error) {
                            const errorMsg = error instanceof Error ? error.message : String(error);
                            // 工具执行时间（当前未使用）

                            // 触发工具错误钩子
                            await this.triggerHook(AgentHook.ON_TOOL_ERROR, {
                                toolName: fn.name,
                                error: error instanceof Error ? error : new Error(errorMsg),
                                params: fn.arguments,
                                toolCallId: id,
                                iteration: i,
                            });

                            // 发布工具调用错误事件
                            await this.eventBus.emit('agent.tool.call.error', {
                                toolName: fn.name,
                                error: error instanceof Error ? error : new Error(errorMsg),
                                params: fn.arguments,
                                toolCallId: id,
                                iteration: i,
                            });

                            this.logger.error(`Tool execution error: ${errorMsg}`);

                            return { toolCall, result: `Error: ${errorMsg}`, error: errorMsg };
                        }
                    });

                    // 等待所有工具调用完成
                    const results = await Promise.all(toolPromises);

                    // 按原始顺序添加工具结果消息
                    for (const { toolCall, result } of results) {
                        const { id } = toolCall;

                        this.sessionManager.addMessage({
                            role: 'tool',
                            content: result,
                            type: 'tool',
                            tool_call_id: id,
                        });

                        // 发布消息添加事件
                        await this.eventBus.emit('agent.message.added', {
                            role: 'tool',
                            content: result,
                            type: 'tool',
                        });
                    }

                    const toolsBatchDuration = Date.now() - toolsBatchStartTime;

                    // 发布工具批量完成事件
                    await this.eventBus.emit('agent.tools.batch.complete', {
                        results: results.map(r => ({
                            toolName: r.toolCall.function.name,
                            result: r.result,
                            error: r.error,
                        })),
                        duration: toolsBatchDuration,
                        iteration: i,
                    });

                    // 发布循环完成事件
                    await this.eventBus.emit('agent.loop.complete', {
                        iteration: i,
                        hasToolCalls: true,
                    });

                    // 触发循环迭代后钩子
                    await this.triggerHook(AgentHook.AFTER_LOOP_ITERATION, {
                        iteration: i,
                        hasToolCalls: true,
                    });

                    // 继续循环
                    continue;
                }

                // 没有工具调用，这是最终响应
                this.sessionManager.addMessage({
                    role: 'assistant',
                    type: 'text',
                    content: llmResponse.content,
                });

                // 发布消息添加事件
                await this.eventBus.emit('agent.message.added', {
                    role: 'assistant',
                    content: llmResponse.content,
                    type: 'text',
                });

                finalResponse = {
                    content: llmResponse.content,
                    role: 'assistant',
                };

                // 发布 LLM 响应处理事件
                await this.eventBus.emit('agent.llm.response.processed', {
                    content: llmResponse.content,
                    hasToolCalls: false,
                    iteration: i,
                });

                // 发布循环完成事件
                await this.eventBus.emit('agent.loop.complete', {
                    iteration: i,
                    hasToolCalls: false,
                });

                // 触发循环迭代后钩子
                await this.triggerHook(AgentHook.AFTER_LOOP_ITERATION, {
                    iteration: i,
                    hasToolCalls: false,
                });

                break;
            }

            if (i >= this.maxLoop) {
                // 发布最大循环达到事件
                await this.eventBus.emit('agent.loop.max.reached', {
                    maxLoop: this.maxLoop,
                    query,
                });

                this.logger.error('Max iterations reached, possible infinite loop');
                return null;
            }

            const totalDuration = Date.now() - startTime;

            // 发布性能指标事件
            await this.eventBus.emit('agent.performance.metrics', {
                totalDuration,
                llmCalls: i,
                toolCalls: totalToolCalls,
                avgToolDuration: totalToolCalls > 0 ? totalToolDuration / totalToolCalls : 0,
                avgLLMDuration: totalDuration / i,
                iteration: i,
            });

            // 触发性能指标钩子
            await this.triggerHook(AgentHook.ON_PERFORMANCE_METRICS, {
                totalDuration,
                llmCalls: i,
                toolCalls: totalToolCalls,
                avgToolDuration: totalToolCalls > 0 ? totalToolDuration / totalToolCalls : 0,
                avgLLMDuration: totalDuration / i,
                iteration: i,
            });

            // 发布运行完成事件
            await this.eventBus.emit('agent.run.complete', {
                query,
                response: finalResponse?.content || null,
                duration: totalDuration,
            });

            // 触发运行后钩子
            await this.triggerHook(AgentHook.AFTER_RUN, {
                query,
                response: finalResponse,
                duration: totalDuration,
            });

            return finalResponse;

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            const duration = Date.now() - startTime;

            // 触发错误钩子
            await this.triggerHook(AgentHook.ON_ERROR, {
                query,
                error: error instanceof Error ? error : new Error(errorMsg),
                duration,
            });

            // 发布运行错误事件
            await this.eventBus.emit('agent.run.error', {
                query,
                error: error instanceof Error ? error : new Error(errorMsg),
                duration,
            });

            this.logger.error(`Agent error: ${errorMsg}`);
            return null;
        }
    }

    /**
     * 获取事件总线实例
     */
    getEventBus(): any {
        return this.eventBus;
    }

    /**
     * 获取钩子注册信息
     */
    getHooks(): Map<AgentHook, AgentHookRegistration[]> {
        return new Map(this.hooks);
    }

    /**
     * 清空所有钩子
     */
    clearHooks(): void {
        this.hooks.clear();
    }
}