import { z } from 'zod';
import { BaseTool, ToolResult } from '../tool/base';
import type { McpClient, Tool as McpTool } from './client';
import { ToolCallResponse } from './types';
import { jsonSchemaToZod } from './json-schema-to-zod';

export class McpToolAdapter extends BaseTool<z.ZodType<any>> {
  private client: McpClient;
  private toolDefinition: McpTool;
  private serverName: string;
  private _sanitizedName: string;

  constructor(client: McpClient, toolDefinition: McpTool, serverName: string) {
    super();

    this.client = client;
    this.toolDefinition = toolDefinition;
    this.serverName = serverName;

    this.schema = jsonSchemaToZod(toolDefinition.inputSchema);
    this._sanitizedName = this.sanitizeName(`${serverName}_${toolDefinition.name}`);
  }

  get name(): string {
    return this._sanitizedName;
  }

  private sanitizeName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/-+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  get description(): string {
    const baseDesc = this.toolDefinition.description || this.toolDefinition.name;
    return `[MCP:${this.serverName}] ${baseDesc}`;
  }

  declare schema: z.ZodType<any>;

  async execute(args: z.infer<typeof this.schema>): Promise<ToolResult> {
    try {
      const response = await this.client.callTool({
        name: this.toolDefinition.name,
        arguments: args,
      });

      return this.formatToolResponse(response);
    } catch (error) {
      if (error instanceof Error) {
        return this.fail(
          `MCP tool execution error: ${error.message}`,
          { code: 'MCP_ERROR', server: this.serverName, tool: this.toolDefinition.name }
        );
      }
      return this.fail(
        'MCP tool execution error: Unknown error',
        { code: 'MCP_ERROR', server: this.serverName, tool: this.toolDefinition.name }
      );
    }
  }

  private formatToolResponse(response: ToolCallResponse): ToolResult {
    if (response.isError) {
      return this.fail(
        `MCP tool error: ${this.extractTextContent(response)}`,
        { code: 'MCP_TOOL_ERROR', server: this.serverName, tool: this.toolDefinition.name }
      );
    }

    if (response.structuredContent) {
      return this.success({
        structuredContent: response.structuredContent,
        textContent: this.extractTextContent(response),
      });
    }

    return this.success({
      textContent: this.extractTextContent(response),
    });
  }

  private extractTextContent(response: ToolCallResponse): string {
    const textContents = response.content
      .filter((item: any) => item.type === 'text')
      .map((item: any) => item.text)
      .join('\n');

    return textContents || 'No text content in response';
  }
}

export function createToolAdapters(
  client: McpClient,
  tools: McpTool[],
  serverName: string
): McpToolAdapter[] {
  return tools.map(tool => new McpToolAdapter(client, tool, serverName));
}
