/**
 * Agent Hook 使用示例
 * 展示如何创建和使用自定义钩子插件
 */

import { AgentHook } from "../../util/event-bus-agent";
import type { HookAgent, HookPlugin, HookRegistration } from "./index";
import { ScopedLogger } from "../../util/log";

/**
 * 示例 1: 自定义钩子插件 - 请求限流
 */
export class RateLimitHookPlugin implements HookPlugin {
    private logger: ScopedLogger;
    private requestCount = 0;
    private lastResetTime = Date.now();
    private readonly limitPerMinute: number;

    constructor(loggerName = 'RateLimitHook', limitPerMinute = 60) {
        this.logger = new ScopedLogger(loggerName);
        this.limitPerMinute = limitPerMinute;
    }

    registerAllHooks(agent: HookAgent): HookRegistration[] {
        const registrations: HookRegistration[] = [];
        const register = <T>(
            hook: AgentHook,
            handler: (_data: T) => void | Promise<void>
        ) => {
            const handlerId = agent.registerHook(hook, handler, { priority: 2 });
            registrations.push({ hook, handlerId });
        };

        // 运行前检查限流
        register(AgentHook.BEFORE_RUN, (data: any) => {
            this.checkRateLimit(data.query);
        });

        // 每分钟重置计数器
        setInterval(() => {
            this.requestCount = 0;
            this.lastResetTime = Date.now();
            this.logger.debug('Rate limit counter reset');
        }, 60 * 1000);

        return registrations;
    }

    private checkRateLimit(_query: string): void {
        const now = Date.now();
        
        // 如果超过1分钟，重置计数器
        if (now - this.lastResetTime > 60 * 1000) {
            this.requestCount = 0;
            this.lastResetTime = now;
        }

        this.requestCount++;
        
        if (this.requestCount > this.limitPerMinute) {
            const waitTime = Math.ceil((60 * 1000 - (now - this.lastResetTime)) / 1000);
            throw new Error(`Rate limit exceeded: ${this.limitPerMinute} requests per minute. Please wait ${waitTime} seconds.`);
        }

        this.logger.debug(`Request ${this.requestCount}/${this.limitPerMinute} this minute`);
    }

    getStats() {
        return {
            requestCount: this.requestCount,
            limitPerMinute: this.limitPerMinute,
            timeSinceReset: Date.now() - this.lastResetTime,
        };
    }
}

/**
 * 示例 2: 自定义钩子插件 - 响应格式化
 */
export class ResponseFormatHookPlugin implements HookPlugin {
    private logger: ScopedLogger;

    constructor(loggerName = 'ResponseFormatHook') {
        this.logger = new ScopedLogger(loggerName);
    }

    registerAllHooks(agent: HookAgent): HookRegistration[] {
        const registrations: HookRegistration[] = [];
        const register = <T>(
            hook: AgentHook,
            handler: (_data: T) => void | Promise<void>,
            priority: number
        ) => {
            const handlerId = agent.registerHook(hook, handler, { priority });
            registrations.push({ hook, handlerId });
        };

        // 格式化最终响应
        register(AgentHook.AFTER_RUN, (data: any) => {
            if (data.response && data.response.content) {
                const formatted = this.formatResponse(data.response.content);
                data.response.content = formatted;
                this.logger.debug('Formatted response');
            }
        }, 80);

        // 格式化工具结果
        register(AgentHook.AFTER_TOOL_CALL, (data: any) => {
            if (typeof data.result === 'string') {
                data.result = this.formatToolResult(data.result);
            }
        }, 75);

        return registrations;
    }

    private formatResponse(content: string): string {
        // 简单的格式化逻辑
        let formatted = content.trim();
        
        // 确保以句号结尾
        if (!formatted.endsWith('.') && !formatted.endsWith('!') && !formatted.endsWith('?')) {
            formatted += '.';
        }
        
        // 首字母大写
        if (formatted.length > 0) {
            formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
        }
        
        return formatted;
    }

    private formatToolResult(result: string): string {
        // 格式化工具结果
        if (result.startsWith('Error:')) {
            return `⚠️ ${result}`;
        }
        
        // 截断过长的结果
        if (result.length > 500) {
            return result.slice(0, 497) + '...';
        }
        
        return result;
    }
}

/**
 * 示例 3: 自定义钩子插件 - 安全检查
 */
export class SecurityHookPlugin implements HookPlugin {
    private logger: ScopedLogger;
    private blockedPatterns: RegExp[];

    constructor(loggerName = 'SecurityHook') {
        this.logger = new ScopedLogger(loggerName);
        
        // 定义需要阻止的模式
        this.blockedPatterns = [
            /<script\b[^>]*>/i, // 脚本标签
            /javascript:/i,     // JavaScript URL
            /on\w+\s*=/i,       // 事件处理器
            /eval\s*\(/i,       // eval 调用
            /union\s+select/i,  // SQL 注入
            /drop\s+table/i,    // SQL 注入
            /delete\s+from/i,   // SQL 注入
        ];
    }

    registerAllHooks(agent: HookAgent): HookRegistration[] {
        const registrations: HookRegistration[] = [];
        const register = <T>(
            hook: AgentHook,
            handler: (_data: T) => void | Promise<void>,
            priority: number
        ) => {
            const handlerId = agent.registerHook(hook, handler, { priority });
            registrations.push({ hook, handlerId });
        };

        // 检查用户输入
        register(AgentHook.BEFORE_RUN, (data: any) => {
            this.checkSecurity(data.query, 'user query');
        }, 1);

        // 检查 LLM 响应
        register(AgentHook.ON_LLM_RESPONSE, (data: any) => {
            if (data.content) {
                this.checkSecurity(data.content, 'LLM response');
            }
        }, 45);

        // 检查工具参数
        register(AgentHook.BEFORE_TOOL_CALL, (data: any) => {
            if (typeof data.params === 'string') {
                this.checkSecurity(data.params, 'tool parameters');
            } else if (data.params) {
                this.checkSecurity(JSON.stringify(data.params), 'tool parameters');
            }
        }, 20);

        return registrations;
    }

    private checkSecurity(text: string, context: string): void {
        for (const pattern of this.blockedPatterns) {
            if (pattern.test(text)) {
                const match = pattern.exec(text)?.[0] || 'unknown pattern';
                this.logger.error(`Security violation detected in ${context}: ${match}`);
                throw new Error(`Security check failed: potentially malicious content detected in ${context}`);
            }
        }
    }

    addBlockedPattern(pattern: RegExp): void {
        this.blockedPatterns.push(pattern);
        this.logger.debug(`Added blocked pattern: ${pattern}`);
    }

    getBlockedPatterns(): RegExp[] {
        return [...this.blockedPatterns];
    }
}

/**
 * 示例 4: 自定义钩子插件 - 成本监控
 */
export class CostMonitoringHookPlugin implements HookPlugin {
    private logger: ScopedLogger;
    private costs = {
        totalLLMCost: 0,
        totalToolCost: 0,
        llmCalls: 0,
        toolCalls: 0,
    };

    // 假设的成本模型（示例值）
    private costModel: Record<string, any> = {
        'deepseek-chat': {
            input: 0.000001,  // 每 token 成本
            output: 0.000002, // 每 token 成本
        },
        'gpt-4': {
            input: 0.00003,
            output: 0.00006,
        },
        // 工具成本（按调用次数）
        'web_search': 0.001,
        'calculator': 0.0001,
        'database_query': 0.005,
    };

    constructor(loggerName = 'CostMonitoringHook') {
        this.logger = new ScopedLogger(loggerName);
    }

    registerAllHooks(agent: HookAgent): HookRegistration[] {
        const registrations: HookRegistration[] = [];
        const register = <T>(
            hook: AgentHook,
            handler: (_data: T) => void | Promise<void>,
            priority: number
        ) => {
            const handlerId = agent.registerHook(hook, handler, { priority });
            registrations.push({ hook, handlerId });
        };

        // 监控 LLM 成本
        register(AgentHook.AFTER_LLM_CALL, (data: any) => {
                const model = data.model || 'deepseek-chat';
                const modelCost = this.costModel[model];
                
                if (modelCost) {
                    // 估算 token 数量（简化）
                    const estimatedTokens = Math.ceil(data.response.length / 4);
                    const cost = estimatedTokens * modelCost.output;
                    
                    this.costs.totalLLMCost += cost;
                    this.costs.llmCalls++;
                    
                    this.logger.debug(`LLM cost: $${cost.toFixed(6)} (estimated ${estimatedTokens} tokens)`);
                }
        }, 85);

        // 监控工具成本
        register(AgentHook.AFTER_TOOL_CALL, (data: any) => {
                const toolCost = this.costModel[data.toolName];
                
                if (typeof toolCost === 'number') {
                    this.costs.totalToolCost += toolCost;
                    this.costs.toolCalls++;
                    
                    this.logger.debug(`Tool cost: $${toolCost.toFixed(4)} for ${data.toolName}`);
                }
        }, 65);

        // 运行完成时汇总成本
        register(AgentHook.AFTER_RUN, (data: any) => {
                const totalCost = this.costs.totalLLMCost + this.costs.totalToolCost;
                
                this.logger.info(`Cost summary for run: $${totalCost.toFixed(6)} total`);
                this.logger.info(`  - LLM: $${this.costs.totalLLMCost.toFixed(6)} (${this.costs.llmCalls} calls)`);
                this.logger.info(`  - Tools: $${this.costs.totalToolCost.toFixed(6)} (${this.costs.toolCalls} calls)`);
                this.logger.info(`  - Duration: ${data.duration}ms`);
                
                // 发布成本事件
                agent.getEventBus?.()?.emit('agent.cost.summary', {
                    totalCost,
                    llmCost: this.costs.totalLLMCost,
                    toolCost: this.costs.totalToolCost,
                    llmCalls: this.costs.llmCalls,
                    toolCalls: this.costs.toolCalls,
                    duration: data.duration,
                    query: data.query,
                });
        }, 95);

        return registrations;
    }

    getCosts() {
        return { ...this.costs };
    }

    resetCosts() {
        this.costs = {
            totalLLMCost: 0,
            totalToolCost: 0,
            llmCalls: 0,
            toolCalls: 0,
        };
        this.logger.info('Costs reset');
    }

    setCostModel(model: string, inputCost: number, outputCost: number): void {
        this.costModel[model] = { input: inputCost, output: outputCost };
        this.logger.debug(`Updated cost model for ${model}`);
    }

    setToolCost(toolName: string, cost: number): void {
        this.costModel[toolName] = cost;
        this.logger.debug(`Set cost for tool ${toolName}: $${cost}`);
    }
}

/**
 * 示例 5: 使用钩子系统的完整示例
 */
export async function exampleUsage() {
    const logger = new ScopedLogger('Example');
    
    logger.info('Starting Agent hook example...');
    
    // 注意：这里需要实际的 Agent 配置才能运行
    // const agent = new Agent({ ... });
    
    logger.info('Hook system setup complete');
    
    return {
        // agent,
        plugins: {
            RateLimitHookPlugin,
            ResponseFormatHookPlugin,
            SecurityHookPlugin,
            CostMonitoringHookPlugin,
        },
    };
}

/**
 * 导出所有示例插件
 */
export const ExamplePlugins = {
    RateLimitHookPlugin,
    ResponseFormatHookPlugin,
    SecurityHookPlugin,
    CostMonitoringHookPlugin,
};
