/**
 * MCP 模块
 *
 * Model Context Protocol (MCP) 客户端模块
 * 支持连接第三方 MCP 服务器并使用其工具
 */

// =============================================================================
// 公共 API
// =============================================================================

export * from './types.js';
export * from './client.js';
export * from './tool-adapter.js';
export * from './manager.js';
export * from './config-loader.js';
export * from './json-schema-to-zod.js';

// =============================================================================
// 便捷导出
// =============================================================================

export { initializeMcp, getMcpManager } from './manager.js';
export { loadMcpConfig, findConfigFile } from './config-loader.js';
export { McpClient, ConnectionState } from './client.js';
export { McpToolAdapter, createToolAdapters } from './tool-adapter.js';
export { jsonSchemaToZod } from './json-schema-to-zod.js';

// =============================================================================
// 类型
// =============================================================================

export type {
  McpServerConfig,
  McpConnectionInfo,
  Tool,
  ToolCallRequest,
  ToolCallResponse,
} from './types.js';

export type { McpConfigFile as ConfigFile } from './config-loader.js';
