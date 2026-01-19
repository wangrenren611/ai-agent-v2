/**
 * Agent Hook 系统集成示例
 * 展示完整的 EventBus + Hook 系统集成
 */

import { ScopedLogger } from "../../util/log";
import { typedEventBus, createLoggingMiddleware } from "../../util/event-bus";
import Agent from "../index-eventbus";
import { HookManager, StatisticsHookPlugin } from "./index";
import { 
    RateLimitHookPlugin, 
    SecurityHookPlugin, 
    CostMonitoringHookPlugin,
    ResponseFormatHookPlugin 
} from "./examples";
import { AgentHook } from "../../util/event-bus-agent";

// 模拟的 LLM Provider（仅用于示例）
const mockLLMProvider = {
    maxOutputTokens: 8000,
    maxTokens: 8000,
    async generate(messages: any[], options: any) {
        console.log('Mock LLM called with:', { messages: messages.length, options });
        
        // 模拟工具调用
        if (options.tools && options.tools.length > 0) {
            return {
                content: 'I need to use a tool to answer this.',
                tool_calls: [{
                    id: 'tool_123',
                    function: {
                        name: 'web_search',
                        arguments: JSON.stringify({ query: 'weather today' })
                    }
                }]
            };
        }
        
        // 模拟最终响应
        return {
            content: 'This is a mock response from the LLM.',
            tool_calls: []
        };
    }
};

// 模拟的 Session Manager（仅用于示例）
const mockSessionManager = {
    async addMessage(message: any) {
        console.log('Mock session: added message', { role: message.role, type: message.type });
    },
    async getMessages() {
        return [];
    }
};

/**
 * 完整的集成示例
 */
export async function runIntegrationExample() {
    const logger = new ScopedLogger('IntegrationExample');
    
    logger.info('Starting Agent Hook system integration example...');
    
    // 1. 创建 EventBus 实例（使用全局实例或创建新的）
    const eventBus = typedEventBus;
    
    // 添加日志中间件
    eventBus.use(createLoggingMiddleware('AgentIntegration'));
    
    // 2. 创建 Agent 实例
    const agent = new Agent({
        llmProvider: mockLLMProvider as any,
        sessionManager: mockSessionManager as any,
        systemPrompt: 'You are a helpful assistant.',
        enableEventLogging: true,
        eventBus, // 使用自定义 EventBus
    });
    
    logger.info('Agent created with EventBus integration');
    
    // 3. 创建钩子管理器
    const hookManager = new HookManager();
    
    // 4. 注册默认插件
    hookManager.registerDefaultPlugins(agent);
    logger.info('Default plugins registered');
    
    // 5. 注册自定义插件
    const rateLimitPlugin = new RateLimitHookPlugin('CustomRateLimit', 10); // 10次/分钟
    const securityPlugin = new SecurityHookPlugin();
    const costPlugin = new CostMonitoringHookPlugin();
    const formatPlugin = new ResponseFormatHookPlugin();
    
    hookManager.registerPlugin('rateLimit', rateLimitPlugin, agent);
    hookManager.registerPlugin('security', securityPlugin, agent);
    hookManager.registerPlugin('cost', costPlugin, agent);
    hookManager.registerPlugin('format', formatPlugin, agent);
    
    logger.info('Custom plugins registered');
    
    // 6. 配置自定义插件
    securityPlugin.addBlockedPattern(/malicious-pattern/i);
    costPlugin.setToolCost('web_search', 0.001);
    costPlugin.setCostModel('deepseek-chat', 0.000001, 0.000002);

    // 7. 直接监听 EventBus 事件
    const subscriptions = [
        (eventBus as any).on('agent.run.start', (data: any) => {
            logger.info(`Event: Agent run started - "${data.query}"`);
        }),

        (eventBus as any).on('agent.llm.call.start', (data: any) => {
            logger.debug(`Event: LLM call #${data.iteration} starting`);
        }),

        (eventBus as any).on('agent.tool.call.complete', (data: any) => {
            logger.debug(`Event: Tool ${data.toolName} completed in ${data.duration}ms`);
        }),

        (eventBus as any).on('agent.performance.slow.tool', (data: any) => {
            logger.warn(`Event: Slow tool detected - ${data.toolName} (${data.duration}ms)`);
        }),

        (eventBus as any).on('agent.cost.summary', (data: any) => {
            logger.info(`Event: Cost summary - $${data.totalCost.toFixed(6)} total`);
        }),
    ];
    
    // 8. 注册单个钩子（不通过插件）
    const customHookId = agent.registerHook(AgentHook.BEFORE_RUN, (data: any) => {
        logger.info(`Custom hook: About to process query: "${data.query}"`);
    }, { priority: 1 });
    
    // 9. 运行 Agent
    logger.info('Running Agent with hook system...');
    
    try {
        // 第一次运行
        const response1 = await agent.run('What is the weather today?');
        logger.info(`First run response: ${response1?.content}`);
        
        // 第二次运行（测试缓存和限流）
        const response2 = await agent.run('Tell me about AI agents');
        logger.info(`Second run response: ${response2?.content}`);
        
        // 第三次运行（测试安全检查）
        try {
            const response3 = await agent.run('<script>alert("xss")</script>');
            logger.info(`Third run response: ${response3?.content}`);
        } catch (error) {
            logger.error(`Security check caught malicious input: ${error}`);
        }
        
    } catch (error) {
        logger.error(`Agent run failed: ${error}`);
    }
    
    // 10. 展示统计信息
    const statsPlugin = hookManager.getPlugin('statistics');
    if (statsPlugin instanceof StatisticsHookPlugin) {
        const stats = statsPlugin.getStats();
        logger.info(`Final statistics: ${JSON.stringify(stats)}`);
    }
    
    const costStats = costPlugin.getCosts();
    logger.info(`Cost statistics: ${JSON.stringify(costStats)}`);
    
    // 11. 清理
    // 移除自定义钩子
    agent.unregisterHook(AgentHook.BEFORE_RUN, customHookId);
    
    // 取消事件订阅
    subscriptions.forEach(sub => sub.unsubscribe());
    
    // 清空所有钩子
    agent.clearHooks();
    
    logger.info('Integration example completed');
    
    return {
        agent,
        hookManager,
        plugins: {
            rateLimitPlugin,
            securityPlugin,
            costPlugin,
            formatPlugin,
        },
        eventBus,
    };
}

/**
 * 简化的使用示例
 */
export async function simpleExample() {
    const logger = new ScopedLogger('SimpleExample');
    
    logger.info('Simple Agent Hook example...');
    
    // 创建 Agent
    const agent = new Agent({
        llmProvider: mockLLMProvider as any,
        sessionManager: mockSessionManager as any,
        enableEventLogging: false, // 禁用详细日志
    });
    
    // 只注册必要的钩子
    agent.registerHook(AgentHook.BEFORE_RUN, (data: any) => {
        logger.info(`Processing: ${data.query}`);
    }, { priority: 10 });
    
    agent.registerHook(AgentHook.AFTER_RUN, (data: any) => {
        logger.info(`Completed in ${data.duration}ms`);
    }, { priority: 90 });
    
    // 运行
    const response = await agent.run('Simple test query');
    logger.info(`Response: ${response?.content}`);
    
    return { agent, response };
}

/**
 * 性能监控示例
 */
export async function performanceMonitoringExample() {
    const logger = new ScopedLogger('PerformanceExample');
    
    logger.info('Performance monitoring example...');
    
    const agent = new Agent({
        llmProvider: mockLLMProvider as any,
        sessionManager: mockSessionManager as any,
    });
    
    // 创建性能插件
    const { PerformanceHookPlugin } = await import('./index');
    const performancePlugin = new PerformanceHookPlugin(
        'PerfMonitor',
        1000, // 慢工具阈值：1秒
        2000  // 慢 LLM 阈值：2秒
    );
    
    performancePlugin.registerAllHooks(agent);

    // 监听性能事件
    const eventBus = agent.getEventBus();
    (eventBus as any).on('agent.performance.slow.tool', (data: any) => {
        logger.warn(`PERFORMANCE ALERT: Slow tool ${data.toolName} (${data.duration}ms)`);
    });

    (eventBus as any).on('agent.performance.slow.llm', (data: any) => {
        logger.warn(`PERFORMANCE ALERT: Slow LLM call (${data.duration}ms)`);
    });

    // 运行测试
    await agent.run('Test performance monitoring');

    return { agent, performancePlugin };
}

// 导出示例函数
export const IntegrationExamples = {
    runIntegrationExample,
    simpleExample,
    performanceMonitoringExample,
};

// 如果直接运行此文件
if (require.main === module) {
    runIntegrationExample().catch(console.error);
}
