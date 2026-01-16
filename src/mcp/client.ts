/**
 * MCP Client
 *
 * Model Context Protocol 客户端实现
 * 支持 stdio 传输方式
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcNotification,
  InitializeParams,
  InitializeResult,
  ToolsListRequest,
  ToolsListResponse,
  ToolCallRequest,
  McpServerConfig,
} from './types';
import { ConnectionState, Tool, ToolCallResponse } from './types';

// =============================================================================
// MCP Client
// =============================================================================

/**
 * MCP 客户端类
 *
 * 负责与 MCP 服务器通信，管理连接生命周期
 */
export class McpClient extends EventEmitter {
  /** 服务器配置 */
  private config: McpServerConfig;

  /** 子进程 */
  private process: ChildProcess | null = null;

  /** 连接状态 */
  private _state: ConnectionState = ConnectionState.Disconnected;

  /** 请求ID计数器 */
  private requestId = 0;

  /** 待处理的请求 */
  private pendingRequests = new Map<number | string, {
    resolve: (value: JsonRpcResponse) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  /** 请求超时时间（毫秒） */
  private readonly REQUEST_TIMEOUT = 120000;

  /** 初始化结果 */
  private initializeResult: InitializeResult | null = null;

  /** 缓存的工具列表 */
  private cachedTools: Tool[] = [];

  constructor(config: McpServerConfig) {
    super();
    this.config = config;
  }

  // -------------------------------------------------------------------------
  // Connection Management
  // -------------------------------------------------------------------------

  /**
   * 连接到 MCP 服务器
   */
  async connect(): Promise<void> {
    if (this._state === ConnectionState.Connected || this._state === ConnectionState.Connecting) {
      throw new Error(`Client is already ${this._state}`);
    }

    this.setState(ConnectionState.Connecting);

    try {
      console.log(`[MCP:${this.serverName}] Starting process: ${this.config.command} ${(this.config.args || []).join(' ')}`);

      // 启动服务器进程
      this.process = spawn(this.config.command, this.config.args || [], {
        env: { ...process.env, ...this.config.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // 设置输出处理
      this.process.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        console.log(`[MCP:${this.serverName}] stdout:`, output);
        this.handleMessage(output);
      });

      // 设置错误处理
      this.process.stderr?.on('data', (data: Buffer) => {
        const output = data.toString();
        console.error(`[MCP:${this.serverName}] stderr:`, output);
        this.emit('stderr', output);
      });

      // 设置进程退出处理
      this.process.on('close', (code) => {
        console.log(`[MCP:${this.serverName}] Process closed with code ${code}`);
        this.setState(ConnectionState.Disconnected);
        this.emit('close', code);
        this.rejectAllPendingRequests(new Error(`Process closed with code ${code}`));
      });

      this.process.on('error', (error) => {
        console.error(`[MCP:${this.serverName}] Process error:`, error.message);
        this.setState(ConnectionState.Error);
        this.emit('error', error);
        this.rejectAllPendingRequests(error);
      });

      // 初始化握手
      console.log(`[MCP:${this.serverName}] Sending initialize request...`);
      await this.initialize();

      this.setState(ConnectionState.Connected);
      console.log(`[MCP:${this.serverName}] Connected successfully`);
      this.emit('connected');
    } catch (error) {
      console.error(`[MCP:${this.serverName}] Connection failed:`, error);
      this.setState(ConnectionState.Error);
      throw error;
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.setState(ConnectionState.Disconnected);
    this.rejectAllPendingRequests(new Error('Client disconnected'));
  }

  // -------------------------------------------------------------------------
  // Protocol Methods
  // -------------------------------------------------------------------------

  /**
   * 初始化连接
   */
  private async initialize(): Promise<InitializeResult> {
    const initParams: InitializeParams = {
      protocolVersion: '2025-11-25',
      capabilities: {
        roots: {},
      },
      clientInfo: {
        name: 'ai-agent-v2',
        version: '1.0.0',
      },
    };

    const response = await this.sendRequest('initialize', initParams as any);
    this.initializeResult = response.result as unknown as InitializeResult;
    return this.initializeResult!;
  }

  /**
   * 列出可用工具
   */
  async listTools(cursor?: string): Promise<ToolsListResponse> {
    const params: ToolsListRequest = cursor ? { cursor } : {};
    const response = await this.sendRequest('tools/list', params as any);
    const result = response.result as any;
    this.cachedTools = result.tools;
    return result;
  }

  /**
   * 调用工具
   */
  async callTool(request: ToolCallRequest): Promise<ToolCallResponse> {
    const response = await this.sendRequest('tools/call', request as any);
    return response.result as any;
  }

  /**
   * 获取缓存的工具列表
   */
  getTools(): Tool[] {
    return this.cachedTools;
  }

  // -------------------------------------------------------------------------
  // Message Handling
  // -------------------------------------------------------------------------

  /**
   * 发送请求
   */
  private async sendRequest(method: string, params?: Record<string, unknown>): Promise<JsonRpcResponse> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params: params as Record<string, unknown>,
      };

      // 设置超时
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, this.REQUEST_TIMEOUT);

      // 存储待处理的请求
      this.pendingRequests.set(id, { resolve, reject, timeout });

      // 发送请求
      this.sendMessage(request);
    });
  }

  /**
   * 发送消息到服务器
   */
  private sendMessage(message: JsonRpcRequest): void {
    if (!this.process?.stdin) {
      throw new Error('Process not connected');
    }

    const data = JSON.stringify(message);
    this.process.stdin.write(data + '\n');
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(data: string): void {
    // MCP 使用 JSON-RPC 2.0，消息可能是多行的
    const lines = data.split('\n').filter(line => line.trim().length > 0);

    for (const line of lines) {
      try {
        const message = JSON.parse(line);

        // 检查是否是响应
        if ('id' in message) {
          this.handleResponse(message as JsonRpcResponse);
        } else {
          // 通知
          this.handleNotification(message as JsonRpcNotification);
        }
      } catch (error) {
        this.emit('parseError', error);
      }
    }
  }

  /**
   * 处理响应
   */
  private handleResponse(response: JsonRpcResponse): void {
    const pending = this.pendingRequests.get(response.id);

    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(response.id);

      if (response.error) {
        pending.reject(new Error(`${response.error.code}: ${response.error.message}`));
      } else {
        pending.resolve(response);
      }
    }
  }

  /**
   * 处理通知
   */
  private handleNotification(notification: JsonRpcNotification): void {
    // 处理工具列表变更通知
    if (notification.method === 'notifications/tools/list_changed') {
      this.emit('toolsChanged');
    }

    this.emit('notification', notification);
  }

  /**
   * 拒绝所有待处理的请求
   */
  private rejectAllPendingRequests(error: Error): void {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }

  // -------------------------------------------------------------------------
  // State Management
  // -------------------------------------------------------------------------

  /**
   * 设置连接状态
   */
  private setState(state: ConnectionState): void {
    const oldState = this._state;
    this._state = state;
    this.emit('stateChanged', { oldState, newState: state });
  }

  /**
   * 获取连接状态
   */
  get state(): ConnectionState {
    return this._state;
  }

  /**
   * 获取服务器名称
   */
  get serverName(): string {
    return this.config.name;
  }
}

// =============================================================================
// Exports
// =============================================================================

export { ConnectionState, Tool };
