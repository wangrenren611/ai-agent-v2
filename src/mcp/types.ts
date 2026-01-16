/**
 * MCP Protocol Types
 *
 * Model Context Protocol (MCP) 类型定义
 * 基于 MCP 2025-11-25 规范
 */

// =============================================================================
// JSON-RPC 2.0 Base Types
// =============================================================================

/**
 * JSON-RPC 2.0 请求
 */
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

/**
 * JSON-RPC 2.0 响应
 */
export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: Record<string, unknown>;
  error?: JsonRpcError;
}

/**
 * JSON-RPC 2.0 错误
 */
export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

/**
 * JSON-RPC 2.0 通知
 */
export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

// =============================================================================
// MCP Initialization
// =============================================================================

/**
 * MCP 初始化请求参数
 */
export interface InitializeParams {
  protocolVersion: string;
  capabilities: ClientCapabilities;
  clientInfo: ClientInfo;
}

/**
 * 客户端能力
 */
export interface ClientCapabilities {
  roots?: {
    listChanged?: boolean;
  };
  sampling?: Record<string, unknown>;
}

/**
 * 客户端信息
 */
export interface ClientInfo {
  name: string;
  version: string;
}

/**
 * MCP 初始化结果
 */
export interface InitializeResult {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: ServerInfo;
}

/**
 * 服务器能力
 */
export interface ServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
}

/**
 * 服务器信息
 */
export interface ServerInfo {
  name: string;
  version: string;
}

// =============================================================================
// MCP Tools
// =============================================================================

/**
 * 工具列表请求
 */
export interface ToolsListRequest {
  cursor?: string;
}

/**
 * 工具列表响应
 */
export interface ToolsListResponse {
  tools: Tool[];
  nextCursor?: string;
}

/**
 * 工具定义
 */
export interface Tool {
  name: string;
  description?: string;
  title?: string;
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;
  icons?: ToolIcon[];
}

/**
 * 工具图标
 */
export interface ToolIcon {
  src: string;
  mimeType: string;
  sizes?: string[];
}

/**
 * JSON Schema 基础类型
 */
export type JsonSchema = Record<string, unknown>;

/**
 * 工具调用请求
 */
export interface ToolCallRequest {
  name: string;
  arguments?: Record<string, unknown>;
}

/**
 * 工具调用响应
 */
export interface ToolCallResponse {
  content: ToolContent[];
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
}

/**
 * 工具内容项
 */
export type ToolContent =
  | TextContent
  | ImageContent
  | ResourceLinkContent
  | EmbeddedResourceContent;

/**
 * 文本内容
 */
export interface TextContent {
  type: 'text';
  text: string;
}

/**
 * 图片内容
 */
export interface ImageContent {
  type: 'image';
  data: string;
  mimeType: string;
  annotations?: Record<string, unknown>;
}

/**
 * 资源链接内容
 */
export interface ResourceLinkContent {
  type: 'resource_link';
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
  annotations?: Record<string, unknown>;
}

/**
 * 嵌入资源内容
 */
export interface EmbeddedResourceContent {
  type: 'resource';
  resource: {
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
    annotations?: Record<string, unknown>;
  };
}

// =============================================================================
// MCP Notifications
// =============================================================================

/**
 * 工具列表变更通知
 */
export interface ToolsListChangedNotification {
  method: 'notifications/tools/list_changed';
}

// =============================================================================
// MCP Server Configuration
// =============================================================================

/**
 * MCP 服务器配置
 */
export interface McpServerConfig {
  /** 服务器名称（唯一标识） */
  name: string;
  /** 传输类型 */
  transport: 'stdio';
  /** 命令（对于 stdio） */
  command: string;
  /** 命令参数（对于 stdio） */
  args?: string[];
  /** 环境变量 */
  env?: Record<string, string>;
  /** 是否启用 */
  enabled?: boolean;
}

// =============================================================================
// MCP Connection State
// =============================================================================

/**
 * MCP 连接状态
 */
export enum ConnectionState {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Error = 'error',
}

/**
 * MCP 连接信息
 */
export interface McpConnectionInfo {
  serverName: string;
  state: ConnectionState;
  tools: Tool[];
  error?: string;
}
