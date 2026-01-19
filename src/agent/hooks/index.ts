/**
 * Agent 钩子系统
 * 提供预定义的钩子处理器和插件
 */

import { AgentHook, AgentHookConfig } from "../../util/event-bus-agent";
import { ScopedLogger } from "../../util/log";

export type HookRegistration = {
    hook: AgentHook;
    handlerId: string;
};

export interface HookAgent {
    registerHook<T>(
        hook: AgentHook,
        handler: (_data: T) => void | Promise<void>,
        config?: AgentHookConfig
    ): string;
    unregisterHook?(hook: AgentHook, handlerId: string): boolean;
    getEventBus?(): { emit: (event: string, data: any) => Promise<void> | void };
}

export interface HookPlugin {
    registerAllHooks(agent: HookAgent): HookRegistration[];
}

type BeforeRunData = { query: string };
type AfterRunData = { query: string; duration: number; response: { content: string } | null };
type ErrorData = { error: Error; duration: number };
type BeforeLLMCallData = { prompt: string; model?: string; tools?: unknown[]; iteration: number };
type AfterLLMCallData = {
    prompt: string;
    model?: string;
    tools?: unknown[];
    response: string;
    duration: number;
    iteration: number;
};
type LLMResponseData = { content: string; toolCalls?: unknown[]; iteration: number };
type BeforeToolCallData = { toolName: string; params: unknown; toolCallId: string; iteration: number };
type AfterToolCallData = { toolName: string; result: unknown; duration: number; toolCallId: string; iteration: number };
type ToolErrorData = { toolName: string; error: Error; params: unknown; toolCallId: string; iteration: number };
type PerformanceData = {
    totalDuration: number;
    llmCalls: number;
    toolCalls: number;
    avgToolDuration: number;
    avgLLMDuration: number;
    iteration: number;
};

/**
 * 日志钩子插件
 * 记录 Agent 执行过程中的关键事件
 */
export class LoggingHookPlugin implements HookPlugin {
    private logger: ScopedLogger;

    constructor(loggerName = 'AgentHook') {
        this.logger = new ScopedLogger(loggerName);
    }

    /**
     * 注册所有日志钩子
     */
    registerAllHooks(agent: HookAgent): HookRegistration[] {
        const registrations: HookRegistration[] = [];
        const register = <T>(
            hook: AgentHook,
            handler: (_data: T) => void | Promise<void>,
            config?: AgentHookConfig
        ) => {
            const handlerId = agent.registerHook(hook, handler, config);
            registrations.push({ hook, handlerId });
        };

        // 运行开始/结束日志
        register(AgentHook.BEFORE_RUN, (data: BeforeRunData) => {
                this.logger.info(`Agent run starting: ${data.query}`);
            }, { priority: 10 });

        register(AgentHook.AFTER_RUN, (data: AfterRunData) => {
                this.logger.info(`Agent run completed: ${data.query} (${data.duration}ms)`);
            }, { priority: 90 });

        // LLM 调用日志
        register(AgentHook.BEFORE_LLM_CALL, (data: BeforeLLMCallData) => {
            this.logger.debug(`LLM call #${data.iteration}: ${data.model}`);
        }, { priority: 20 });

        register(AgentHook.AFTER_LLM_CALL, (data: AfterLLMCallData) => {
            this.logger.debug(`LLM call #${data.iteration} completed (${data.duration}ms)`);
        }, { priority: 80 });

        // 工具调用日志
        register(AgentHook.BEFORE_TOOL_CALL, (data: BeforeToolCallData) => {
            this.logger.debug(`Tool call: ${data.toolName}(${JSON.stringify(data.params).slice(0, 100)}...)`);
        }, { priority: 30 });

        register(AgentHook.AFTER_TOOL_CALL, (data: AfterToolCallData) => {
            this.logger.debug(`Tool ${data.toolName} completed (${data.duration}ms)`);
        }, { priority: 70 });

        // 错误日志
        register(AgentHook.ON_ERROR, (data: ErrorData) => {
                this.logger.error(`Agent error: ${data.error.message} (${data.duration}ms)`);
            }, { priority: 1 });

        register(AgentHook.ON_TOOL_ERROR, (data: ToolErrorData) => {
                this.logger.error(`Tool error: ${data.toolName} - ${data.error.message}`);
            }, { priority: 1 });

        return registrations;
    }
}

/**
 * 性能监控钩子插件
 * 监控 Agent 执行性能并报告慢操作
 */
export class PerformanceHookPlugin implements HookPlugin {
    private logger: ScopedLogger;
    private slowToolThreshold: number; // 毫秒
    private slowLLMThreshold: number; // 毫秒

    constructor(
        loggerName = 'PerformanceHook',
        slowToolThreshold = 5000,
        slowLLMThreshold = 10000
    ) {
        this.logger = new ScopedLogger(loggerName);
        this.slowToolThreshold = slowToolThreshold;
        this.slowLLMThreshold = slowLLMThreshold;
    }

    /**
     * 注册性能监控钩子
     */
    registerAllHooks(agent: HookAgent): HookRegistration[] {
        const registrations: HookRegistration[] = [];
        const register = <T>(
            hook: AgentHook,
            handler: (_data: T) => void | Promise<void>,
            config?: AgentHookConfig
        ) => {
            const handlerId = agent.registerHook(hook, handler, config);
            registrations.push({ hook, handlerId });
        };

        // 慢工具检测
        register(AgentHook.AFTER_TOOL_CALL, (data: AfterToolCallData) => {
                if (data.duration > this.slowToolThreshold) {
                    this.logger.warn(`Slow tool detected: ${data.toolName} took ${data.duration}ms (threshold: ${this.slowToolThreshold}ms)`);
                    
                    // 发布性能事件
                    agent.getEventBus()?.emit('agent.performance.slow.tool', {
                        toolName: data.toolName,
                        duration: data.duration,
                        threshold: this.slowToolThreshold,
                        iteration: data.iteration,
                    });
                }
            }, { priority: 50 });

        // 慢 LLM 检测
        register(AgentHook.AFTER_LLM_CALL, (data: AfterLLMCallData) => {
                if (data.duration > this.slowLLMThreshold) {
                    this.logger.warn(`Slow LLM call detected: iteration #${data.iteration} took ${data.duration}ms (threshold: ${this.slowLLMThreshold}ms)`);
                    
                    // 发布性能事件
                    agent.getEventBus()?.emit('agent.performance.slow.llm', {
                        duration: data.duration,
                        threshold: this.slowLLMThreshold,
                        iteration: data.iteration,
                    });
                }
            }, { priority: 50 });

        // 性能指标汇总
        register(AgentHook.ON_PERFORMANCE_METRICS, (data: PerformanceData) => {
                this.logger.info(`Performance metrics: ${data.totalDuration}ms total, ${data.llmCalls} LLM calls, ${data.toolCalls} tool calls`);
                this.logger.info(`Average LLM duration: ${data.avgLLMDuration.toFixed(2)}ms, Average tool duration: ${data.avgToolDuration.toFixed(2)}ms`);
            }, { priority: 60 });

        return registrations;
    }
}

/**
 * 消息验证钩子插件
 * 验证输入和输出消息的格式和内容
 */
export class ValidationHookPlugin implements HookPlugin {
    private logger: ScopedLogger;

    constructor(loggerName = 'ValidationHook') {
        this.logger = new ScopedLogger(loggerName);
    }

    /**
     * 注册验证钩子
     */
    registerAllHooks(agent: HookAgent): HookRegistration[] {
        const registrations: HookRegistration[] = [];
        const register = <T>(
            hook: AgentHook,
            handler: (_data: T) => void | Promise<void>,
            config?: AgentHookConfig
        ) => {
            const handlerId = agent.registerHook(hook, handler, config);
            registrations.push({ hook, handlerId });
        };

        // 运行前验证
        register(AgentHook.BEFORE_RUN, (data: BeforeRunData) => {
                if (!data.query || data.query.trim().length === 0) {
                    throw new Error('Query cannot be empty');
                }
                if (data.query.length > 10000) {
                    this.logger.warn(`Query is very long: ${data.query.length} characters`);
                }
            }, { priority: 5 });

        // LLM 响应验证
        register(AgentHook.ON_LLM_RESPONSE, (data: LLMResponseData) => {
                if (!data.content && (!data.toolCalls || data.toolCalls.length === 0)) {
                    this.logger.warn(`Empty LLM response in iteration #${data.iteration}`);
                }
                
                if (data.content && data.content.length > 5000) {
                    this.logger.debug(`Long LLM response: ${data.content.length} characters`);
                }
            }, { priority: 40 });

        // 工具参数验证
        register(AgentHook.BEFORE_TOOL_CALL, (data: BeforeToolCallData) => {
                if (!data.toolName || data.toolName.trim().length === 0) {
                    throw new Error('Tool name cannot be empty');
                }
                
                // 检查参数是否过长
                if (data.params && JSON.stringify(data.params).length > 10000) {
                    this.logger.warn(`Tool parameters are very large: ${JSON.stringify(data.params).length} characters`);
                }
            }, { priority: 25 });

        return registrations;
    }
}

/**
 * 统计钩子插件
 * 收集 Agent 执行统计信息
 */
export class StatisticsHookPlugin implements HookPlugin {
    private stats = {
        totalRuns: 0,
        totalQueries: 0,
        totalLLMCalls: 0,
        totalToolCalls: 0,
        totalErrors: 0,
        totalDuration: 0,
        lastRunTime: 0,
    };

    private logger: ScopedLogger;

    constructor(loggerName = 'StatisticsHook') {
        this.logger = new ScopedLogger(loggerName);
    }

    /**
     * 注册统计钩子
     */
    registerAllHooks(agent: HookAgent): HookRegistration[] {
        const registrations: HookRegistration[] = [];
        const register = <T>(
            hook: AgentHook,
            handler: (_data: T) => void | Promise<void>,
            config?: AgentHookConfig
        ) => {
            const handlerId = agent.registerHook(hook, handler, config);
            registrations.push({ hook, handlerId });
        };

        // 运行统计
        register(AgentHook.BEFORE_RUN, () => {
                this.stats.totalRuns++;
                this.stats.totalQueries++;
            }, { priority: 95 });

        // LLM 调用统计
        register(AgentHook.BEFORE_LLM_CALL, () => {
                this.stats.totalLLMCalls++;
            }, { priority: 95 });

        // 工具调用统计
        register(AgentHook.BEFORE_TOOL_CALL, () => {
                this.stats.totalToolCalls++;
            }, { priority: 95 });

        // 错误统计
        register(AgentHook.ON_ERROR, () => {
                this.stats.totalErrors++;
            }, { priority: 95 });

        // 性能统计
        register(AgentHook.ON_PERFORMANCE_METRICS, (data: PerformanceData) => {
                this.stats.totalDuration += data.totalDuration;
                this.stats.lastRunTime = Date.now();
            }, { priority: 95 });

        // 运行完成时打印统计
        register(AgentHook.AFTER_RUN, () => {
                this.logger.info(`Current statistics: ${JSON.stringify(this.getStats())}`);
            }, { priority: 99 });

        return registrations;
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * 重置统计信息
     */
    resetStats() {
        this.stats = {
            totalRuns: 0,
            totalQueries: 0,
            totalLLMCalls: 0,
            totalToolCalls: 0,
            totalErrors: 0,
            totalDuration: 0,
            lastRunTime: 0,
        };
    }
}

/**
 * 缓存钩子插件
 * 缓存 LLM 响应和工具结果
 */
export class CacheHookPlugin implements HookPlugin {
    private cache = new Map<string, any>();
    private logger: ScopedLogger;
    private ttl: number; // 缓存存活时间（毫秒）

    constructor(loggerName = 'CacheHook', ttl = 5 * 60 * 1000) { // 默认5分钟
        this.logger = new ScopedLogger(loggerName);
        this.ttl = ttl;
    }

    /**
     * 注册缓存钩子
     */
    registerAllHooks(agent: HookAgent): HookRegistration[] {
        const registrations: HookRegistration[] = [];
        const register = <T>(
            hook: AgentHook,
            handler: (_data: T) => void | Promise<void>,
            config?: AgentHookConfig
        ) => {
            const handlerId = agent.registerHook(hook, handler, config);
            registrations.push({ hook, handlerId });
        };

        // LLM 响应缓存
        register(AgentHook.BEFORE_LLM_CALL, async (data: BeforeLLMCallData) => {
                const cacheKey = this.generateLLMCacheKey(data);
                const cached = this.cache.get(cacheKey);
                
                if (cached && Date.now() - cached.timestamp < this.ttl) {
                    this.logger.debug(`Cache hit for LLM call: ${cacheKey}`);
                    // 这里可以返回缓存的响应，但需要修改 Agent 流程
                    // 目前只记录命中率
                }
            }, { priority: 15, async: true });

        register(AgentHook.AFTER_LLM_CALL, (data: AfterLLMCallData) => {
                const cacheKey = this.generateLLMCacheKey(data);
                this.cache.set(cacheKey, {
                    response: data.response,
                    timestamp: Date.now(),
                });
                this.logger.debug(`Cached LLM response: ${cacheKey}`);
            }, { priority: 85 });

        // 工具结果缓存
        register(AgentHook.BEFORE_TOOL_CALL, async (data: BeforeToolCallData) => {
                const cacheKey = this.generateToolCacheKey(data);
                const cached = this.cache.get(cacheKey);
                
                if (cached && Date.now() - cached.timestamp < this.ttl) {
                    this.logger.debug(`Cache hit for tool: ${data.toolName}`);
                    // 这里可以返回缓存的结果
                }
            }, { priority: 35, async: true });

        register(AgentHook.AFTER_TOOL_CALL, (data: AfterToolCallData) => {
                const cacheKey = this.generateToolCacheKey(data);
                this.cache.set(cacheKey, {
                    result: data.result,
                    timestamp: Date.now(),
                });
                this.logger.debug(`Cached tool result: ${data.toolName}`);
            }, { priority: 65 });

        return registrations;
    }

    private generateLLMCacheKey(data: BeforeLLMCallData | AfterLLMCallData): string {
        return `llm:${data.model}:${JSON.stringify(data.prompt)}:${JSON.stringify(data.tools || [])}`;
    }

    private generateToolCacheKey(data: BeforeToolCallData | AfterToolCallData): string {
        return `tool:${data.toolName}:${JSON.stringify(data.params)}`;
    }

    /**
     * 获取缓存统计
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }

    /**
     * 清空缓存
     */
    clearCache() {
        this.cache.clear();
        this.logger.info('Cache cleared');
    }
}

/**
 * 钩子管理器
 * 方便地管理多个钩子插件
 */
export class HookManager {
    private plugins = new Map<string, HookPlugin>();
    private registeredHandlers = new Map<string, HookRegistration[]>();
    private logger: ScopedLogger;

    constructor(loggerName = 'HookManager') {
        this.logger = new ScopedLogger(loggerName);
    }

    /**
     * 注册插件
     */
    registerPlugin(name: string, plugin: HookPlugin, agent: HookAgent): void {
        if (this.plugins.has(name)) {
            this.logger.warn(`Plugin ${name} already registered, replacing`);
            this.unregisterPlugin(name, agent);
        }

        this.plugins.set(name, plugin);
        
        // 注册插件的所有钩子
        if (plugin.registerAllHooks) {
            const registrations = plugin.registerAllHooks(agent);
            this.registeredHandlers.set(name, registrations);
            this.logger.info(`Registered plugin ${name} with ${registrations.length} handlers`);
        }
    }

    /**
     * 移除插件
     */
    unregisterPlugin(name: string, agent: HookAgent): boolean {
        const plugin = this.plugins.get(name);
        if (!plugin) return false;

        // 移除插件的所有钩子
        const registrations = this.registeredHandlers.get(name) || [];
        if (agent.unregisterHook) {
            for (const registration of registrations) {
                agent.unregisterHook(registration.hook, registration.handlerId);
            }
        }

        this.plugins.delete(name);
        this.registeredHandlers.delete(name);
        this.logger.info(`Unregistered plugin ${name}`);

        return true;
    }

    /**
     * 获取所有插件
     */
    getPlugins(): Map<string, HookPlugin> {
        return new Map(this.plugins);
    }

    /**
     * 获取插件
     */
    getPlugin(name: string): HookPlugin | undefined {
        return this.plugins.get(name);
    }

    /**
     * 注册默认插件集合
     */
    registerDefaultPlugins(agent: HookAgent): void {
        this.registerPlugin('logging', new LoggingHookPlugin(), agent);
        this.registerPlugin('performance', new PerformanceHookPlugin(), agent);
        this.registerPlugin('validation', new ValidationHookPlugin(), agent);
        this.registerPlugin('statistics', new StatisticsHookPlugin(), agent);
        this.registerPlugin('cache', new CacheHookPlugin(), agent);
        
        this.logger.info('Registered default plugins: logging, performance, validation, statistics, cache');
    }
}
