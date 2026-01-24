/**
 * Agent - AI 代理（EventBus 集成版）
 * 负责编排 LLM 调用和会话管理，集成事件驱动架构
 */
import EventEmitter from "events";
import { LLMProvider, LLMResponse, Message, ToolSchema } from "../providers/base";
import { ScopedLogger } from "../util/log";
import { formatToolResult } from "../util/log-format";
import { SessionManager } from "../session-v2";
import { SYSTEM_PROMPT } from "../prompts/system";
import { ToolRegistry } from "../tool/registry";
import type { ToolOutput } from "../tool/base";
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
    /** 工具并发上限，默认 4 */
    toolConcurrency?: number;
    /** 单次工具调用超时（毫秒），默认 120000 */
    toolTimeoutMs?: number;
    /** 连续重复的工具调用轮次上限，默认 2 */
    noProgressLimit?: number;
    /** 覆盖模型名称（可选），默认使用 AI_MODEL */
    model?: string;
}

export interface AgentResponse {
    content: string;
    role: 'assistant';
}

type AgentMessage = {
    role: 'user' | 'assistant' | 'tool' | 'system';
    content: string;
    type: 'text' | 'tool' | 'tool_call';
    tool_call_id?: string;
    tool_calls?: LLMResponse['tool_calls'];
};

type ToolCall = NonNullable<LLMResponse['tool_calls']>[number];
type ToolCallResult = { toolCall: ToolCall; result: string; error?: string };
type ToolStats = { calls: number; duration: number };

export default class Agent extends EventEmitter {
    private llmProvider: LLMProvider;
    private logger: ScopedLogger;
    private sessionManager: SessionManager;
    private systemPrompt: string;
    private defaultTools: ToolSchema[] | undefined;
    private maxLoop: number;
    private maxOutputTokens: number;
    private maxTokens: number;
    private toolConcurrency: number;
    private toolTimeoutMs: number;
    private noProgressLimit: number;
    private model: string | undefined;
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
        this.maxLoop = config.maxLoop ?? 10;
        const providerMaxOutput = this.llmProvider.maxOutputTokens;
        const providerMaxTokens = this.llmProvider.maxTokens;
        this.maxOutputTokens = Math.min(config.maxOutputTokens ?? providerMaxOutput, providerMaxOutput);
        this.maxTokens = Math.min(config.maxTokens ?? providerMaxTokens, providerMaxTokens);
        this.eventBus = config.eventBus || typedEventBus;
        this.toolConcurrency = Math.max(1, config.toolConcurrency ?? 4);
        this.toolTimeoutMs = config.toolTimeoutMs ?? 120000;
        this.noProgressLimit = Math.max(0, config.noProgressLimit ?? 2);
        this.model = config.model ?? process.env.AI_MODEL;
        this.sessionManager.maxOutputTokens = this.maxOutputTokens;
        this.sessionManager.maxTokens = this.maxTokens;

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
        const normalizedConfig: Required<AgentHookConfig> = {
            priority: config.priority ?? 100,
            async: config.async ?? false,
            timeout: config.timeout ?? 5000,
        };
        const registration: AgentHookRegistration = {
            hook,
            handler,
            config: normalizedConfig,
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
                await this.executeHookHandler(registration, hook, data);
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

    private isPromiseLike(value: unknown): value is Promise<unknown> {
        return !!value && typeof (value as Promise<unknown>).then === 'function';
    }

    private async executeHookHandler<T>(
        registration: AgentHookRegistration,
        hook: AgentHook,
        data: T
    ): Promise<void> {
        const { handler, config } = registration;
        try {
            const result = handler(data);
            if (config.async) {
                await this.withTimeout(
                    Promise.resolve(result),
                    config.timeout ?? 5000,
                    `Hook timeout: ${hook}`
                );
                return;
            }

            if (this.isPromiseLike(result)) {
                result.catch(async (error) => {
                    await this.eventBus.emit('agent.hook.error', {
                        hookName: hook,
                        error: error instanceof Error ? error : new Error(String(error)),
                        handlerId: registration.handlerId,
                    });
                    this.logger.warn(`Hook error in ${hook}: ${error}`);
                });
            }
        } catch (error) {
            await this.eventBus.emit('agent.hook.error', {
                hookName: hook,
                error: error instanceof Error ? error : new Error(String(error)),
                handlerId: registration.handlerId,
            });
            this.logger.warn(`Hook error in ${hook}: ${error}`);
        }
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

    private resolveTools(options?: { tools?: ToolSchema[] }): ToolSchema[] {
        return options?.tools ?? this.defaultTools ?? ToolRegistry.getSchemas();
    }

    private normalizeToolSchemas(tools: ToolSchema[]): ToolSchema[] | undefined {
        return tools.length > 0 ? tools : undefined;
    }

    private async recordMessage(message: AgentMessage): Promise<void> {
        this.sessionManager.addMessage(message);
        await this.eventBus.emit('agent.message.added', {
            role: message.role,
            content: message.content,
            type: message.type,
        });
    }

    private async generateLLMResponse(params: {
        query: string;
        llmMessages: Message[];
        toolSchemas?: ToolSchema[];
        iteration: number;
        model?: string;
    }): Promise<{ response: LLMResponse | null; duration: number }> {
        const { query, llmMessages, toolSchemas, iteration, model } = params;
        const spinner = this.logger.spinner(`Thinking-${iteration}...`);

        await this.triggerHook(AgentHook.BEFORE_LLM_CALL, {
            prompt: query,
            model,
            tools: toolSchemas,
            iteration,
        });

        const llmStartTime = Date.now();
        await this.eventBus.emit('agent.llm.call.start', {
            prompt: query,
            model,
            tools: toolSchemas,
            iteration,
        });

        let llmResponse: LLMResponse | null = null;
        try {
            llmResponse = await this.llmProvider.generate([
                {
                    role: 'system',
                    content: this.systemPrompt,
                },
                ...llmMessages,
            ], {
                model,
                tools: toolSchemas,
                max_tokens: this.maxOutputTokens,
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            spinner.fail(`Thinking-${iteration} failed`);
            await this.eventBus.emit('agent.llm.call.error', {
                error: new Error(errorMsg),
                prompt: query,
                iteration,
            });
            throw error;
        }

        const llmDuration = Date.now() - llmStartTime;

        if (!llmResponse) {
            await this.eventBus.emit('agent.llm.call.error', {
                error: new Error('LLM returned null response'),
                prompt: query,
                iteration,
            });

            this.logger.error("LLM error");
            spinner.fail(`Thinking-${iteration} failed`);
            return { response: null, duration: llmDuration };
        }

        spinner.succeed(`Thinking-${iteration} end`);

        await this.eventBus.emit('agent.llm.call.complete', {
            response: llmResponse.content,
            hasToolCalls: !!(llmResponse.tool_calls && llmResponse.tool_calls.length > 0),
            duration: llmDuration,
            iteration,
        });

        await this.triggerHook(AgentHook.AFTER_LLM_CALL, {
            prompt: query,
            model,
            tools: toolSchemas,
            response: llmResponse.content,
            toolCalls: llmResponse.tool_calls,
            duration: llmDuration,
            iteration,
        });

        await this.triggerHook(AgentHook.ON_LLM_RESPONSE, {
            content: llmResponse.content,
            toolCalls: llmResponse.tool_calls,
            iteration,
        });

        await this.eventBus.emit('agent.llm.response.received', {
            content: llmResponse.content,
            toolCalls: llmResponse.tool_calls,
            iteration,
        });

        return { response: llmResponse, duration: llmDuration };
    }

    private async executeToolCall(
        toolCall: ToolCall,
        iteration: number,
        options: { silent?: boolean } | undefined,
        stats: ToolStats
    ): Promise<ToolCallResult> {
        const { id, function: fn } = toolCall;

        await this.triggerHook(AgentHook.BEFORE_TOOL_CALL, {
            toolName: fn.name,
            params: fn.arguments,
            toolCallId: id,
            iteration,
        });

        const toolStartTime = Date.now();
        await this.eventBus.emit('agent.tool.call.start', {
            toolName: fn.name,
            params: fn.arguments,
            toolCallId: id,
            iteration,
        });

        try {
            await this.eventBus.emit('agent.tool.params.parse.start', {
                toolName: fn.name,
                rawArguments: fn.arguments,
                toolCallId: id,
            });

            let args: unknown;
            try {
                args = JSON.parse(fn.arguments);
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

            let result: ToolOutput;
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

            const normalizedResult = typeof result === 'string' ? result : result.output;

            if (!options?.silent) {
                this.logger.info(`Tool ${fn.name} result: ${formatToolResult(fn.name, normalizedResult)}`);
            }

            const toolDuration = Date.now() - toolStartTime;
            stats.calls += 1;
            stats.duration += toolDuration;

            await this.triggerHook(AgentHook.AFTER_TOOL_CALL, {
                toolName: fn.name,
                result: normalizedResult,
                duration: toolDuration,
                toolCallId: id,
                iteration,
            });

            await this.eventBus.emit('agent.tool.call.complete', {
                toolName: fn.name,
                result: normalizedResult,
                duration: toolDuration,
                toolCallId: id,
                iteration,
            });

            return { toolCall, result: normalizedResult, error: undefined };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);

            await this.triggerHook(AgentHook.ON_TOOL_ERROR, {
                toolName: fn.name,
                error: error instanceof Error ? error : new Error(errorMsg),
                params: fn.arguments,
                toolCallId: id,
                iteration,
            });

            await this.eventBus.emit('agent.tool.call.error', {
                toolName: fn.name,
                error: error instanceof Error ? error : new Error(errorMsg),
                params: fn.arguments,
                toolCallId: id,
                iteration,
            });

            this.logger.error(`Tool execution error: ${errorMsg}`);

            return { toolCall, result: `Error: ${errorMsg}`, error: errorMsg };
        }
    }

    private async handleToolCalls(params: {
        toolCalls: ToolCall[];
        content: string;
        iteration: number;
        options?: { silent?: boolean };
        stats: ToolStats;
        progress: { lastToolSignature: string | null; repeatedToolCalls: number };
    }): Promise<{ lastToolSignature: string | null; repeatedToolCalls: number }> {
        const { toolCalls, content, iteration, options, stats, progress } = params;

        const toolSignature = this.buildToolSignature(toolCalls);
        if (toolSignature && toolSignature === progress.lastToolSignature) {
            progress.repeatedToolCalls += 1;
        } else {
            progress.repeatedToolCalls = 0;
            progress.lastToolSignature = toolSignature;
        }

        if (this.noProgressLimit > 0 && progress.repeatedToolCalls >= this.noProgressLimit) {
            throw new Error(
                `Repeated tool_calls detected for ${this.noProgressLimit + 1} iterations, aborting to prevent loop.`
            );
        }

        await this.recordMessage({
            role: 'assistant',
            content,
            type: 'tool_call',
            tool_calls: toolCalls,
        });

        this.logger.info(`Tool tips: ${content}`);

        const toolsBatchStartTime = Date.now();
        await this.eventBus.emit('agent.tools.batch.start', {
            toolCalls,
            iteration,
        });

        const toolConcurrency = Math.min(this.toolConcurrency, toolCalls.length);
        const results = await this.runWithConcurrency(toolCalls, toolConcurrency, (toolCall) => (
            this.executeToolCall(toolCall, iteration, options, stats)
        ));

        for (const { toolCall, result } of results) {
            await this.recordMessage({
                role: 'tool',
                content: result,
                type: 'tool',
                tool_call_id: toolCall.id,
            });
        }

        const toolsBatchDuration = Date.now() - toolsBatchStartTime;
        await this.eventBus.emit('agent.tools.batch.complete', {
            results: results.map(r => ({
                toolName: r.toolCall.function.name,
                result: r.result,
                error: r.error,
            })),
            duration: toolsBatchDuration,
            iteration,
        });

        await this.eventBus.emit('agent.loop.complete', {
            iteration,
            hasToolCalls: true,
        });

        await this.triggerHook(AgentHook.AFTER_LOOP_ITERATION, {
            iteration,
            hasToolCalls: true,
        });

        return { ...progress };
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

            const model = this.model;
            const toolSchemas = this.normalizeToolSchemas(this.resolveTools(options));
            const toolStats: ToolStats = { calls: 0, duration: 0 };

            await this.recordMessage({
                role: 'user',
                type: 'text',
                content: query,
            });

            // 3. LLM 调用循环
            let i = 0;
            let finalResponse: AgentResponse | null = null;
            const progress = { lastToolSignature: null as string | null, repeatedToolCalls: 0 };

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

                const { response: llmResponse } = await this.generateLLMResponse({
                    query,
                    llmMessages,
                    toolSchemas,
                    iteration: i,
                    model,
                });
                if (!llmResponse) {
                    return null;
                }

                // 检查是否有工具调用
                if (llmResponse.tool_calls && llmResponse.tool_calls.length > 0) {
                    const updatedProgress = await this.handleToolCalls({
                        toolCalls: llmResponse.tool_calls,
                        content: llmResponse.content,
                        iteration: i,
                        options,
                        stats: toolStats,
                        progress,
                    });
                    progress.lastToolSignature = updatedProgress.lastToolSignature;
                    progress.repeatedToolCalls = updatedProgress.repeatedToolCalls;

                    // 继续循环
                    continue;
                }

                // 没有工具调用，这是最终响应
                await this.recordMessage({
                    role: 'assistant',
                    type: 'text',
                    content: llmResponse.content,
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
                toolCalls: toolStats.calls,
                avgToolDuration: toolStats.calls > 0 ? toolStats.duration / toolStats.calls : 0,
                avgLLMDuration: totalDuration / i,
                iteration: i,
            });

            // 触发性能指标钩子
            await this.triggerHook(AgentHook.ON_PERFORMANCE_METRICS, {
                totalDuration,
                llmCalls: i,
                toolCalls: toolStats.calls,
                avgToolDuration: toolStats.calls > 0 ? toolStats.duration / toolStats.calls : 0,
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
