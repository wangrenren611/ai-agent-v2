/**
 * ToolRegistry 类型定义
 */

import type { ToolResult } from './base';

/**
 * 工具执行上下文
 */
export type ToolContext = {
  environment: string;
  platform: string;
  time: string;
  sessionId?: string;
  sessionPath?: string;
  /** 允许的工具列表（可选） */
  allowedTools?: string[];
};

/**
 * 工具注册表配置
 */
export interface ToolRegistryConfig {
  /** AgentContext 实例 */
  agentContext?: any;
  /** 上下文信息 */
  context?: ToolContext;
  /** 允许的工具列表 */
  allowedTools?: string[];
}

/**
 * 工具注册表状态
 */
export interface ToolRegistryState {
  /** 上下文信息 */
  context: ToolContext;
  /** AgentContext 实例 */
  agentContext: any | null;
}
