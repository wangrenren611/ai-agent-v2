/**
 * Tool Registry
 *
 * 工具注册中心，负责管理所有可用的工具
 *
 * @example
 * ```ts
 * import { ToolRegistry } from './index';
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

import { ToolRegistry } from './registry';
import BashTool from './bash';
import GlobTool from './glob';
import { ReadFileTool } from './file';
import { WriteFileTool } from './file';
import GrepTool from './grep';
import { SurgicalEditTool } from './surgical';
import { BatchReplaceTool } from './batch-replace';
import { TodoReadTool } from './todo';
import { TodoWriteTool } from './todo';
import { initializeMcp } from '../mcp/index';
import { WebSearchTool } from './web-search';
import { SkillTool, initializeSkills } from '../skills';
import TaskTool from './task';

// =============================================================================
// Tool Registry
// =============================================================================

export { ToolRegistry } from './registry';

// =============================================================================
// Default Tools Registration
// =============================================================================

/**
 * 初始化并注册所有默认工具
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
        new TodoReadTool(),
        new TodoWriteTool(),
        new WebSearchTool(),
        new SkillTool(),
        new TaskTool(),
    ]);
}

/**
 * 初始化并注册所有工具（包括 MCP 服务器工具）
 *
 * 在应用启动时调用此函数，异步加载 MCP 服务器
 *
 * @param configPath - MCP 配置文件路径（可选）
 * @returns MCP 管理器实例
 *
 * @example
 * ```ts
 * import { registerDefaultToolsAsync } from './tool';
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
// Exports
// =============================================================================

export { BaseTool } from './base';
export { default as BashTool } from './bash';
export { getBashParser } from './bash-parser';
export type { CommandInfo, SecurityIssue, ParseResult } from './bash-parser';
export { BatchReplaceTool } from './batch-replace';
export { default as TaskTool } from './task';

export { initializeSkills, getSkillLoader } from '../skills/loader';
export type { Skill, SkillMetadata, SkillLoaderOptions } from '../skills/types';
export { default as CompleteTaskTool } from './complete-task';
