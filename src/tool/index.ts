/**
 * Tool Registry - 工具注册中心
 *
 * 管理所有可用的工具，提供统一的工具执行接口
 * 
 * @example
 * ```ts
 * import { ToolRegistry } from './index.js';
 *
 * // 获取所有工具
 * const tools = ToolRegistry.getAll();
 *
 * // 根据名称获取工具
 * const bashTool = ToolRegistry.get('bash');
 *
 * // 执行工具
 * const result = await bashTool.execute({ command: 'ls' });
 * ```
 */

import { ToolRegistry } from './registry/ToolRegistry.js';
import BashTool from './bash.js';
import GlobTool from './glob.js';
import { ReadFileTool } from './file.js';
import { WriteFileTool } from './file.js';
import GrepTool from './grep.js';
import { SurgicalEditTool } from './surgical.js';
import { BatchReplaceTool } from './batch-replace.js';
import TodoTools from './todo.js';
import { initializeMcp } from '../mcp/index.js';
import { WebSearchTool } from './web-search.js';
import { WebFetchTool } from './web-fetch.js';
import { SkillTool, initializeSkills } from '../skills/index.js';

// =============================================================================
// 重新导出
// =============================================================================

export { ToolRegistry } from './registry/ToolRegistry.js';
export { BaseTool } from './base.js';
export type { ToolResult } from './base.js';

// =============================================================================
// 默认工具注册
// =============================================================================

/**
 * 注册所有默认工具（同步版本）
 * 
 * 在应用启动时调用此函数
 */
export function registerDefaultTools(): void {
  ToolRegistry.register([
    new BashTool(),
    new GlobTool(),
    new GrepTool(),
    new ReadFileTool(),
    new WriteFileTool(),
    new SurgicalEditTool(),
    new BatchReplaceTool(),
    new WebSearchTool(),
    new WebFetchTool(),
    new SkillTool(),
    ...TodoTools(),
  ]);
}

/**
 * 注册所有工具（异步版本，包括 MCP 服务器工具）
 * 
 * 在应用启动时调用此函数，异步加载 MCP 服务器
 * 
 * @param configPath - MCP 配置文件路径（可选）
 * @returns MCP 管理器实例
 * 
 * @example
 * ```ts
 * import { registerDefaultToolsAsync } from './tool.js';
 *
 * // 使用默认配置路径
 * await registerDefaultToolsAsync();
 *
 * // 或指定配置文件路径
 * await registerDefaultToolsAsync('./my-mcp-config.json');
 * ```
 */
export async function registerDefaultToolsAsync(configPath?: string) {
  // 初始化技能加载器（在注册 SkillTool 之前）
  try {
    await initializeSkills();
  } catch (error) {
    console.warn('[Skills] Failed to initialize skills:', error);
  }

  // 注册内置工具
  registerDefaultTools();

  // 初始化 MCP 服务器（如果配置文件存在）
  try {
    const manager = await initializeMcp(configPath);
    const servers = manager.getConnectedServers();
    const totalTools = manager.getTotalToolsCount();

    if (servers.length > 0) {
      console.log(`[MCP] Loaded ${totalTools} tools from ${servers.length} server(s)`);
    }

    return manager;
  } catch (error) {
    // MCP 加载失败不应该阻止应用启动
    if (error instanceof Error && !error.message.includes('not found')) {
      console.warn('[MCP] Failed to load MCP servers:', error.message);
    }
    return null;
  }
}

// =============================================================================
// 工具导出
// =============================================================================

export { default as BashTool } from './bash.js';
export { getBashParser } from './bash-parser.js';
export type { CommandInfo, SecurityIssue, ParseResult } from './bash-parser.js';
export { BatchReplaceTool } from './batch-replace.js';
export { default as TaskTool } from './task.js';

export { initializeSkills, getSkillLoader } from '../skills/loader.js';
export type { Skill, SkillMetadata, SkillLoaderOptions } from '../skills/types.js';
export { default as CompleteTaskTool } from './complete-task.js';
