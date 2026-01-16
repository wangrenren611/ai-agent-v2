/**
 * MCP Config Loader
 *
 * 加载 MCP 配置文件
 * 支持 .mcp.json 和 mcp.json 格式
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { McpServerConfig } from './types';

// =============================================================================
// MCP Config File Structure
// =============================================================================

/**
 * MCP 配置文件结构
 *
 * 兼容常见的 MCP 配置格式
 */
export interface McpConfigFile {
  /** MCP 服务器列表 */
  mcpServers: McpServerConfig[];
}

// =============================================================================
// Config Loader
// =============================================================================

/**
 * 配置文件搜索路径（按优先级排序）
 */
const CONFIG_SEARCH_PATHS = [
  '.mcp.json',
  'mcp.json',
  '.mcp/config.json',
  join('.claude', 'mcp.json'),
  join('.config', 'mcp.json'),
];

/**
 * 加载 MCP 配置文件
 *
 * @param configPath - 配置文件路径（可选，如果不提供则搜索默认路径）
 * @returns MCP 配置
 * @throws 如果找不到配置文件或解析失败
 */
export async function loadMcpConfig(configPath?: string): Promise<McpConfigFile> {
  let filePath: string | undefined;

  if (configPath) {
    filePath = configPath;
    if (!existsSync(filePath)) {
      throw new Error(`Config file not found: ${filePath}`);
    }
  } else {
    // 搜索默认配置文件
    filePath = findConfigFile();
    if (!filePath) {
      // 没有找到配置文件，返回空配置
      return { mcpServers: [] };
    }
  }

  try {
    const content = await readFile(filePath, 'utf-8');
    const rawConfig = JSON.parse(content);

    // 处理不同的配置格式
    return normalizeConfig(rawConfig);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse config file ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * 查找配置文件
 *
 * @returns 找到的配置文件路径，如果没有找到则返回 null
 */
function findConfigFile(): string | undefined {
  for (const path of CONFIG_SEARCH_PATHS) {
    if (existsSync(path)) {
      return path;
    }
  }
  return undefined;
}

/**
 * 标准化配置格式
 *
 * 支持多种配置格式的转换：
 * - Claude Desktop 格式
 * - Cursor 格式
 * - 标准格式
 *
 * @param rawConfig - 原始配置对象
 * @returns 标准化的 MCP 配置
 */
function normalizeConfig(rawConfig: any): McpConfigFile {
  // 检查是否是标准格式
  if ('mcpServers' in rawConfig && Array.isArray(rawConfig.mcpServers)) {
    return {
      mcpServers: rawConfig.mcpServers.map(normalizeServerConfig),
    };
  }

  // 检查是否是 Claude Desktop/Cursor 格式 (mcpServers 是对象)
  if ('mcpServers' in rawConfig && typeof rawConfig.mcpServers === 'object') {
    return {
      mcpServers: Object.entries(rawConfig.mcpServers).map(([name, config]) => {
        const serverConfig = config as any;
        return normalizeServerConfig({
          name,
          ...serverConfig,
        });
      }),
    };
  }

  // 检查是否是简化格式（直接是服务器配置数组）
  if (Array.isArray(rawConfig)) {
    return {
      mcpServers: rawConfig.map(normalizeServerConfig),
    };
  }

  // 未知格式
  console.warn('[MCP] Unknown config format, treating as empty config');
  return { mcpServers: [] };
}

/**
 * 标准化服务器配置
 *
 * 支持多种命令格式的转换：
 * - npx 命令: "npx -y @modelcontextprotocol/server-xyz"
 * - 完整命令: { command: "node", args: ["server.js"] }
 *
 * @param config - 服务器配置
 * @returns 标准化的服务器配置
 */
function normalizeServerConfig(config: any): McpServerConfig {
  const normalized: any = {
    name: config.name || `server_${Date.now()}`,
    transport: 'stdio',
    enabled: config.enabled !== false,
  };

  // 处理命令格式
  if (typeof config.command === 'string') {
    normalized.command = config.command;
    normalized.args = config.args || [];
  } else if (typeof config.command === 'object') {
    normalized.command = config.command;
  } else if (typeof config === 'string') {
    // 简化的 npx 命令格式
    normalized.command = 'npx';
    normalized.args = ['-y', config];
  }

  // 环境变量
  if (config.env) {
    // 处理环境变量中的 ${VAR} 格式
    normalized.env = resolveEnvVars(config.env);
  }

  return normalized as McpServerConfig;
}

/**
 * 解析环境变量
 *
 * 支持 ${VAR_NAME} 格式的环境变量引用
 *
 * @param env - 环境变量对象
 * @returns 解析后的环境变量
 */
function resolveEnvVars(env: Record<string, string>): Record<string, string> {
  const resolved: Record<string, string> = {};

  for (const [key, value] of Object.entries(env)) {
    if (typeof value === 'string') {
      // 匹配 ${VAR_NAME} 格式
      resolved[key] = value.replace(/\$\{([^}]+)\}/g, (_, varName) => {
        return process.env[varName] || '';
      });
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}

// =============================================================================
// Environment Variable Helpers
// =============================================================================

/**
 * 获取环境变量值
 *
 * 优先使用传入的值，如果为 ${VAR} 格式则从环境变量读取
 *
 * @param value - 值或环境变量引用
 * @returns 解析后的值
 */
export function getEnvValue(value: string): string {
  if (value.startsWith('${') && value.endsWith('}')) {
    const varName = value.slice(2, -1);
    return process.env[varName] || '';
  }
  return value;
}

// =============================================================================
// Exports
// =============================================================================

export { findConfigFile, normalizeConfig, normalizeServerConfig };
