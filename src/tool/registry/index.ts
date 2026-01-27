/**
 * Tool Registry - 工具注册中心
 * 管理所有可用的工具
 */

export { ToolRegistry } from './ToolRegistry.js';
export type { ToolContext, ToolRegistryConfig, ToolRegistryState } from './types.js';
export { SchemaConverter } from './schema-converter.js';

// 向后兼容：从旧位置导入
export { BaseTool } from '../base.js';
export type { ToolResult } from '../base.js';
