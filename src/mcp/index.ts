/**
 * MCP Module
 *
 * Model Context Protocol (MCP) 客户端模块
 * 支持连接第三方 MCP 服务器并使用其工具
 */

// =============================================================================
// Public API
// =============================================================================

export * from './types';
export * from './client';
export * from './tool-adapter';
export * from './manager';
export * from './config-loader';
export * from './json-schema-to-zod';

// =============================================================================
// Convenience Exports
// =============================================================================

export { initializeMcp, getMcpManager } from './manager';
export { loadMcpConfig, findConfigFile } from './config-loader';
export { McpClient, ConnectionState } from './client';
export { McpToolAdapter, createToolAdapters } from './tool-adapter';
export { jsonSchemaToZod } from './json-schema-to-zod';

// =============================================================================
// Types
// =============================================================================

export type {
  McpServerConfig,
  McpConnectionInfo,
  Tool,
  ToolCallRequest,
  ToolCallResponse,
} from './types';

export type { McpConfigFile as ConfigFile } from './config-loader';
