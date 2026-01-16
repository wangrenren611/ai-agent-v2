/**
 * MCP Manager
 *
 * 管理多个 MCP 服务器连接
 * 负责启动、停止和协调所有 MCP 服务器
 */

import { McpClient } from './client';
import { createToolAdapters } from './tool-adapter';
import { ToolRegistry } from '../tool/index';
import { loadMcpConfig } from './config-loader';
import type { McpServerConfig,  McpConnectionInfo } from './types';
import { ConnectionState } from './types';

// =============================================================================
// MCP Manager
// =============================================================================

/**
 * MCP 管理器
 *
 * 单例模式，负责管理所有 MCP 服务器连接
 */
export class McpManager {
  /** 单例实例 */
  private static instance: McpManager | null = null;

  /** 所有活跃的客户端 */
  private clients = new Map<string, McpClient>();

  /** 连接信息 */
  private connectionInfo = new Map<string, McpConnectionInfo>();

  /** 私有构造函数 */
  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): McpManager {
    if (!McpManager.instance) {
      McpManager.instance = new McpManager();
    }
    return McpManager.instance;
  }

  // -------------------------------------------------------------------------
  // Connection Management
  // -------------------------------------------------------------------------

  /**
   * 从配置文件加载并连接所有启用的 MCP 服务器
   */
  async loadAndConnect(configPath?: string): Promise<void> {
    const config = await loadMcpConfig(configPath);

    for (const serverConfig of config.mcpServers) {
      if (serverConfig.enabled !== false) {
        await this.connectServer(serverConfig);
      }
    }
  }

  /**
   * 连接到单个 MCP 服务器
   */
  async connectServer(config: McpServerConfig): Promise<void> {
    if (this.clients.has(config.name)) {
      throw new Error(`Server "${config.name}" is already connected`);
    }

    try {
      const client = new McpClient(config);

      // 监听连接状态变化
      client.on('stateChanged', ({ newState }) => {
        this.updateConnectionInfo(config.name, client, newState);
      });

      // 监听工具列表变更
      client.on('toolsChanged', async () => {
        await this.refreshServerTools(config.name);
      });

      // 监听错误
      client.on('error', (error) => {
        console.error(`[MCP:${config.name}] Error:`, error.message);
      });

      // 连接到服务器
      await client.connect();

      // 获取工具列表
      const toolsResponse = await client.listTools();

      // 存储客户端
      this.clients.set(config.name, client);

      // 创建工具适配器并注册
      const adapters = createToolAdapters(client, toolsResponse.tools, config.name);
      ToolRegistry.register(adapters);

      // 更新连接信息
      this.updateConnectionInfo(config.name, client, ConnectionState.Connected);

      console.log(`[MCP] Connected to "${config.name}" with ${toolsResponse.tools.length} tools`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.connectionInfo.set(config.name, {
        serverName: config.name,
        state: ConnectionState.Error,
        tools: [],
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * 断开指定服务器连接
   */
  async disconnectServer(serverName: string): Promise<void> {
    const client = this.clients.get(serverName);
    if (!client) {
      return;
    }

    // 注销该服务器的所有工具
    const tools = client.getTools();
    for (const tool of tools) {
      const toolName = `${serverName}/${tool.name}`;
      ToolRegistry.unregister(toolName);
    }

    // 断开连接
    await client.disconnect();

    // 移除客户端
    this.clients.delete(serverName);
    this.connectionInfo.delete(serverName);

    console.log(`[MCP] Disconnected from "${serverName}"`);
  }

  /**
   * 断开所有连接
   */
  async disconnectAll(): Promise<void> {
    const serverNames = Array.from(this.clients.keys());
    await Promise.all(serverNames.map(name => this.disconnectServer(name)));
  }

  // -------------------------------------------------------------------------
  // Tool Management
  // -------------------------------------------------------------------------

  /**
   * 刷新指定服务器的工具列表
   */
  private async refreshServerTools(serverName: string): Promise<void> {
    const client = this.clients.get(serverName);
    if (!client) {
      return;
    }

    // 先注销旧工具
    const oldTools = client.getTools();
    for (const tool of oldTools) {
      const toolName = `${serverName}/${tool.name}`;
      ToolRegistry.unregister(toolName);
    }

    // 获取新工具列表
    const toolsResponse = await client.listTools();

    // 创建并注册新工具
    const adapters = createToolAdapters(client, toolsResponse.tools, serverName);
    ToolRegistry.register(adapters);

    // 更新连接信息
    this.updateConnectionInfo(serverName, client, ConnectionState.Connected);

    console.log(`[MCP] Refreshed ${toolsResponse.tools.length} tools from "${serverName}"`);
  }

  // -------------------------------------------------------------------------
  // Status & Information
  // -------------------------------------------------------------------------

  /**
   * 获取所有连接信息
   */
  getConnectionInfo(): McpConnectionInfo[] {
    return Array.from(this.connectionInfo.values());
  }

  /**
   * 获取指定服务器的连接信息
   */
  getServerInfo(serverName: string): McpConnectionInfo | undefined {
    return this.connectionInfo.get(serverName);
  }

  /**
   * 获取所有已连接的服务器名称
   */
  getConnectedServers(): string[] {
    return Array.from(this.clients.keys()).filter(name => {
      const client = this.clients.get(name);
      return client?.state === ConnectionState.Connected;
    });
  }

  /**
   * 获取所有 MCP 工具数量
   */
  getTotalToolsCount(): number {
    let count = 0;
    for (const info of this.connectionInfo.values()) {
      count += info.tools.length;
    }
    return count;
  }

  // -------------------------------------------------------------------------
  // Private Methods
  // -------------------------------------------------------------------------

  /**
   * 更新连接信息
   */
  private updateConnectionInfo(
    serverName: string,
    client: McpClient,
    state: ConnectionState
  ): void {
    this.connectionInfo.set(serverName, {
      serverName,
      state,
      tools: client.getTools(),
    });
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * 初始化 MCP 管理器并加载所有配置的服务器
 *
 * @param configPath - 配置文件路径（可选）
 * @returns MCP 管理器实例
 */
export async function initializeMcp(configPath?: string): Promise<McpManager> {
  const manager = McpManager.getInstance();
  await manager.loadAndConnect(configPath);
  return manager;
}

/**
 * 获取 MCP 管理器实例
 */
export function getMcpManager(): McpManager {
  return McpManager.getInstance();
}
