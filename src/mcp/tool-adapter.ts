/**
 * MCP Tool Adapter
 *
 * 将 MCP 工具适配到 BaseTool 接口
 */

import { z } from 'zod';
import { BaseTool } from '../tool/base';
import type { McpClient, Tool as McpTool } from './client';
import { ToolCallResponse } from './types';
import { jsonSchemaToZod } from './json-schema-to-zod';

// =============================================================================
// MCP Tool Adapter
// =============================================================================

/**
 * MCP 工具适配器
 *
 * 将 MCP 服务器暴露的工具适配为 BaseTool 接口
 */
export class McpToolAdapter extends BaseTool<z.ZodType<any>> {
  /** MCP 客户端 */
  private client: McpClient;

  /** MCP 工具定义 */
  private toolDefinition: McpTool;

  /** 服务器名称前缀 */
  private serverName: string;

  /** 符合 OpenAI API 要求的工具名称 */
  private _sanitizedName: string;

  /**
   * 构造函数
   */
  constructor(client: McpClient, toolDefinition: McpTool, serverName: string) {
    super();

    this.client = client;
    this.toolDefinition = toolDefinition;
    this.serverName = serverName;

    // 将 JSON Schema 转换为 Zod schema
    this.schema = jsonSchemaToZod(toolDefinition.inputSchema);

    // 生成符合 OpenAI API 要求的工具名称（只包含字母、数字、下划线、连字符）
    this._sanitizedName = this.sanitizeName(`${serverName}_${toolDefinition.name}`);
  }

  // -------------------------------------------------------------------------
  // BaseTool Implementation
  // -------------------------------------------------------------------------

  /**
   * 工具名称（带服务器前缀以避免冲突）
   * 使用下划线代替斜杠，符合 OpenAI API 要求
   */
  get name(): string {
    return this._sanitizedName;
  }

  /**
   * 清理工具名称，使其符合 OpenAI API 要求
   * 只允许字母、数字、下划线和连字符
   */
  private sanitizeName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9_-]/g, '_')  // 替换非法字符为下划线
      .replace(/-+/g, '_')              // 将连字符替换为下划线
      .replace(/^_+|_+$/g, '');         // 移除开头和结尾的下划线
  }

  /**
   * 工具描述
   */
  get description(): string {
    const baseDesc = this.toolDefinition.description || this.toolDefinition.name;
    return `[MCP:${this.serverName}] ${baseDesc}`;
  }

  /**
   * 参数 schema
   */
  declare schema: z.ZodType<any>;

  /**
   * 执行工具
   */
  async execute(args: z.infer<typeof this.schema>): Promise<string> {
    try {
      const response = await this.client.callTool({
        name: this.toolDefinition.name,
        arguments: args,
      });

      return this.formatToolResponse(response);
    } catch (error) {
      if (error instanceof Error) {
        return `Error executing tool: ${error.message}`;
      }
      return 'Error executing tool: Unknown error';
    }
  }

  // -------------------------------------------------------------------------
  // Private Methods
  // -------------------------------------------------------------------------

  /**
   * 格式化工具响应
   */
  private formatToolResponse(response: ToolCallResponse): string {
    if (response.isError) {
      return `Tool execution error: ${this.extractTextContent(response)}`;
    }

    // 如果有结构化内容，优先返回
    if (response.structuredContent) {
      return JSON.stringify(response.structuredContent, null, 2);
    }

    // 否则返回文本内容
    return this.extractTextContent(response);
  }

  /**
   * 提取文本内容
   */
  private extractTextContent(response: ToolCallResponse): string {
    const textContents = response.content
      .filter((item: any) => item.type === 'text')
      .map((item: any) => item.text)
      .join('\n');

    return textContents || 'No text content in response';
  }
}

// =============================================================================
// Batch Adapter
// =============================================================================

/**
 * 批量创建工具适配器
 *
 * @param client - MCP 客户端
 * @param tools - MCP 工具列表
 * @param serverName - 服务器名称
 * @returns 工具适配器数组
 */
export function createToolAdapters(
  client: McpClient,
  tools: McpTool[],
  serverName: string
): McpToolAdapter[] {
  return tools.map(tool => new McpToolAdapter(client, tool, serverName));
}
