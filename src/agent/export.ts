/**
 * Agent 导出文件
 * 提供不同版本的 Agent 供选择
 */

// 导出旧版 Agent（无 EventBus）
export { default as LegacyAgent } from './index';
export type { AgentConfig as LegacyAgentConfig, AgentResponse as LegacyAgentResponse } from './index';

// 导出新版 Agent（带 EventBus 集成）
export { default as EventBusAgent } from './index-eventbus';
export type { AgentConfig as EventBusAgentConfig, AgentResponse as EventBusAgentResponse } from './index-eventbus';

// 默认导出新版 Agent（推荐使用）
export { default } from './index-eventbus';
export type { AgentConfig, AgentResponse } from './index-eventbus';

// Agent 管理器
export { AgentManager } from './manager';
export type {
    AgentDefinition,
    AgentFilters,
    AgentInstance,
    AgentManagerOptions,
    AgentMode,
    AgentStorage,
    AgentType,
    GenerationContext
} from './manager';

// 导出钩子系统
export * from './hooks';
export * from './hooks/examples';

// 导出类型
export { AgentHook } from '../util/event-bus-agent';
export type { 
    AgentHookHandler, 
    AgentHookConfig, 
    AgentHookRegistration 
} from '../util/event-bus-agent';

/**
 * 工具函数：创建配置好的 Agent
 */
export async function createAgent(config: any, useEventBus = true) {
    if (useEventBus) {
        const { default: EventBusAgent } = await import('./index-eventbus');
        return new EventBusAgent(config);
    } else {
        const { default: LegacyAgent } = await import('./index');
        return new LegacyAgent(config);
    }
}

/**
 * 工具函数：迁移旧版 Agent 到新版
 */
export async function migrateToEventBusAgent(oldAgent: any, configOverrides = {}) {
    const { default: EventBusAgent } = await import('./index-eventbus');
    
    return new EventBusAgent({
        llmProvider: oldAgent.llmProvider,
        sessionManager: oldAgent.sessionManager,
        systemPrompt: oldAgent.systemPrompt,
        defaultTools: oldAgent.defaultTools,
        maxLoop: oldAgent.maxLoop,
        maxOutputTokens: oldAgent.maxOutputTokens,
        maxTokens: oldAgent.maxTokens,
        ...configOverrides,
    });
}
