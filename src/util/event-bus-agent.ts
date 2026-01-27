/**
 * Agent 事件类型定义
 * 用于在 Agent 执行过程中发布和监听事件
 */

import { ToolSchema } from '../providers/base.js';

/**
 * Agent 生命周期事件
 */
export interface AgentLifecycleEvents {
  // Agent 启动和运行
  'agent.run.start': { query: string; sessionId?: string; userId?: string };
  'agent.run.complete': { query: string; response: string | null; duration: number };
  'agent.run.error': { query: string; error: Error; sessionId?: string };
  
  // Agent 循环控制
  'agent.loop.start': { iteration: number; maxLoop: number };
  'agent.loop.complete': { iteration: number; hasToolCalls: boolean };
  'agent.loop.max.reached': { maxLoop: number; query: string };
  
  // Agent 配置相关
  'agent.config.loaded': { config: any };
  'agent.config.updated': { oldConfig: any; newConfig: any };
}

/**
 * LLM 相关事件
 */
export interface AgentLLMEvents {
  // LLM 调用
  'agent.llm.call.start': { 
    prompt: string; 
    model: string; 
    tools?: ToolSchema[];
    iteration: number;
  };
  'agent.llm.call.complete': { 
    response: string; 
    hasToolCalls: boolean;
    duration: number;
    tokenUsage?: any;
    iteration: number;
  };
  'agent.llm.call.error': { 
    error: Error; 
    prompt: string;
    iteration: number;
  };
  
  // LLM 响应处理
  'agent.llm.response.received': { 
    content: string; 
    toolCalls?: any[];
    iteration: number;
  };
  'agent.llm.response.processed': { 
    content: string; 
    hasToolCalls: boolean;
    iteration: number;
  };
}

/**
 * 工具相关事件
 */
export interface AgentToolEvents {
  // 工具调用
  'agent.tool.call.start': { 
    toolName: string; 
    params: any;
    toolCallId: string;
    iteration: number;
  };
  'agent.tool.call.complete': { 
    toolName: string; 
    result: any;
    duration: number;
    toolCallId: string;
    iteration: number;
  };
  'agent.tool.call.error': { 
    toolName: string; 
    error: Error;
    params: any;
    toolCallId: string;
    iteration: number;
  };
  
  // 工具参数处理
  'agent.tool.params.parse.start': { 
    toolName: string; 
    rawArguments: string;
    toolCallId: string;
  };
  'agent.tool.params.parse.complete': { 
    toolName: string; 
    parsedParams: any;
    toolCallId: string;
  };
  'agent.tool.params.parse.error': { 
    toolName: string; 
    rawArguments: string;
    error: Error;
    toolCallId: string;
  };
  
  // 工具批量执行
  'agent.tools.batch.start': { 
    toolCalls: any[];
    iteration: number;
  };
  'agent.tools.batch.complete': { 
    results: Array<{ toolName: string; result: any; error?: Error }>;
    duration: number;
    iteration: number;
  };
}

/**
 * 会话管理事件
 */
export interface AgentSessionEvents {
  // 消息管理
  'agent.message.added': { 
    role: 'user' | 'assistant' | 'tool' | 'system';
    content: string;
    type: 'text' | 'tool_call' | 'tool';
    sessionId?: string;
  };
  'agent.messages.retrieved': { 
    count: number;
    sessionId?: string;
    iteration: number;
  };
  
  // 会话状态
  'agent.session.initialized': { 
    sessionId?: string;
    userId?: string;
    systemPrompt: string;
  };
  'agent.session.updated': { 
    sessionId?: string;
    messageCount: number;
    iteration: number;
  };
}

/**
 * 性能监控事件
 */
export interface AgentPerformanceEvents {
  'agent.performance.metrics': {
    totalDuration: number;
    llmCalls: number;
    toolCalls: number;
    avgToolDuration: number;
    avgLLMDuration: number;
    tokenUsage?: any;
    iteration: number;
  };
  
  'agent.performance.slow.tool': {
    toolName: string;
    duration: number;
    threshold: number;
    iteration: number;
  };
  
  'agent.performance.slow.llm': {
    duration: number;
    threshold: number;
    iteration: number;
  };
}

/**
 * 钩子系统事件
 */
export interface AgentHookEvents {
  'agent.hook.registered': { 
    hookName: string;
    handlerId: string;
    priority: number;
  };
  
  'agent.hook.triggered': { 
    hookName: string;
    data: any;
    handlerCount: number;
  };
  
  'agent.hook.completed': { 
    hookName: string;
    data: any;
    handlerCount: number;
    duration: number;
  };
  
  'agent.hook.error': { 
    hookName: string;
    error: Error;
    handlerId: string;
  };
}

/**
 * 所有 Agent 事件的联合类型
 */
export type AgentEvents = 
  & AgentLifecycleEvents
  & AgentLLMEvents
  & AgentToolEvents
  & AgentSessionEvents
  & AgentPerformanceEvents
  & AgentHookEvents;

/**
 * Agent 钩子名称枚举
 * 注意：钩子名称与事件名称不同，钩子是用于插入自定义逻辑的点
 */
export enum AgentHook {
  // 生命周期钩子
  BEFORE_RUN = 'before.run',
  AFTER_RUN = 'after.run',
  ON_ERROR = 'on.error',
  
  // LLM 钩子
  BEFORE_LLM_CALL = 'before.llm.call',
  AFTER_LLM_CALL = 'after.llm.call',
  ON_LLM_RESPONSE = 'on.llm.response',
  
  // 工具钩子
  BEFORE_TOOL_CALL = 'before.tool.call',
  AFTER_TOOL_CALL = 'after.tool.call',
  ON_TOOL_ERROR = 'on.tool.error',
  
  // 消息钩子
  // 循环钩子
  BEFORE_LOOP_ITERATION = 'before.loop.iteration',
  AFTER_LOOP_ITERATION = 'after.loop.iteration',
  
  // 性能钩子
  ON_PERFORMANCE_METRICS = 'on.performance.metrics',
}

/**
 * Agent 钩子处理器类型
 */
export type AgentHookHandler<T = any> = (data: T) => void | Promise<void>;

/**
 * Agent 钩子配置
 */
export interface AgentHookConfig {
  priority?: number; // 优先级，数字越小优先级越高
  async?: boolean;   // 是否异步执行
  timeout?: number;  // 超时时间（毫秒）
}

/**
 * Agent 钩子注册信息
 */
export interface AgentHookRegistration {
  hook: AgentHook;
  handler: AgentHookHandler;
  config: AgentHookConfig;
  handlerId: string;
}
