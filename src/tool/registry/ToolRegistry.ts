/**
 * ToolRegistry - 工具注册表主类
 * 单例模式，管理所有可用的工具
 */

import { BaseTool, ToolResult } from '../base';
import { AgentContext } from '../../context';
import { SchemaConverter } from './schema-converter';
import type { ToolContext, ToolRegistryConfig, ToolRegistryState } from './types';

/**
 * 工具注册表类
 */
export class ToolRegistry {
  /** 已注册的工具映射 */
  private static tools: Map<string, BaseTool<any>> = new Map();
  
  /** 注册表状态 */
  private static state: ToolRegistryState = {
    context: {
      environment: process.cwd(),
      platform: process.platform,
      time: new Date().toISOString(),
    },
    agentContext: null,
  };

  /** 私有构造函数，防止外部实例化 */
  private constructor() {}

  /**
   * 设置 AgentContext 实例
   */
  static setAgentContext(context: AgentContext): void {
    this.state.agentContext = context;

    // 自动同步 sessionId
    this.setContext({
      sessionId: context.sessionId,
      sessionPath: context.sessionDir,
    });
  }

  /**
   * 获取 AgentContext 实例
   */
  static getAgentContext(): AgentContext | null {
    return this.state.agentContext;
  }

  /**
   * 设置上下文
   */
  static setContext(context: Partial<ToolContext>): void {
    const next = { ...this.state.context, ...context };
    if ('allowedTools' in context && context.allowedTools === undefined) {
      delete (next as any).allowedTools;
    }
    this.state.context = next as ToolContext;

    // 同步到所有工具实例
    for (const tool of this.tools.values()) {
      tool.sessionId = next.sessionId;
    }
  }

  /**
   * 获取上下文
   */
  static getContext(): ToolContext {
    return this.state.context;
  }

  /**
   * 注册工具
   * 
   * 支持单个工具或工具数组
   * 
   * @param tool - 工具实例或工具数组
   * @throws 如果工具名称已存在
   */
  static register<T extends BaseTool<any>>(tool: T | T[]): void {
    const tools = Array.isArray(tool) ? tool : [tool];
    for (const t of tools) {
      if (this.tools.has(t.name)) {
        // 静默忽略重复注册（可能是 React StrictMode 重新挂载）
        continue;
      }
      this.tools.set(t.name, t);

      // 注入 context 到工具实例
      if (this.state.agentContext) {
        t.sessionId = this.state.agentContext.sessionId;
      }
    }
  }

  /**
   * 注销工具
   * 
   * @param name - 工具名称
   * @returns 是否成功注销
   */
  static unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * 根据名称获取工具
   * 
   * @param name - 工具名称
   * @returns 工具实例，如果不存在则返回 undefined
   */
  static get<T extends BaseTool<any> = BaseTool<any>>(name: string): T | undefined {
    return this.tools.get(name) as T | undefined;
  }

  /**
   * 获取所有已注册的工具
   * 
   * @returns 工具实例数组
   */
  static getAll(): BaseTool<any>[] {
    return Array.from(this.tools.values());
  }

  /**
   * 获取所有工具的名称
   * 
   * @returns 工具名称数组
   */
  static getNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * 检查工具是否已注册
   * 
   * @param name - 工具名称
   * @returns 是否已注册
   */
  static has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * 获取已注册工具的数量
   * 
   * @returns 工具数量
   */
  static get size(): number {
    return this.tools.size;
  }

  /**
   * 清空所有已注册的工具
   * 
   * @warning 这通常只在测试中使用
   */
  static clear(): void {
    this.tools.clear();
  }

  /**
   * 执行指定工具
   * 
   * @param name - 工具名称
   * @param args - 工具参数（字符串或对象形式）
   * @returns 统一的工具执行结果
   */
  static async execute(name: string, args: string | Record<string, unknown>): Promise<ToolResult> {
    // 如果是字符串，解析为对象
    const argsObj = typeof args === 'string' ? JSON.parse(args) : args;
    const tool = this.get(name);

    if (!tool) {
      return {
        success: false,
        error: `Tool "${name}" not found`,
        metadata: { toolName: name },
      };
    }

    const allowed = this.state.context.allowedTools;
    if (allowed && !allowed.includes(name)) {
      return {
        success: false,
        error: `Tool "${name}" is not allowed in this context`,
        metadata: { toolName: name },
      };
    }

    // 通过 AgentContext 检查是否需要确认
    if (this.state.agentContext) {
      const permission = await this.state.agentContext.canExecuteTool(name, argsObj);
      if (!permission.allowed) {
        return {
          success: false,
          error: permission.reason || `Tool "${name}" was not executed`,
          metadata: {
            toolName: name,
            requiresConfirmation: permission.requiresConfirmation,
          },
        };
      }
    }

    const startTime = Date.now();

    try {
      // 验证参数
      const parsed = tool.schema.safeParse(argsObj);

      if (!parsed.success) {
        // 🔧 P1 修复: 提供更详细的参数验证错误信息
        const errors = parsed.error.errors;
        const errorDetails = errors.map((e: any) => {
          const path = e.path?.join('.') || 'root';
          return `"${path}": ${e.message}`;
        }).join('; ');

        return {
          success: false,
          error: `Invalid arguments for tool "${name}": ${errorDetails}`,
          metadata: {
            toolName: name,
            duration: Date.now() - startTime,
            received: JSON.stringify(argsObj, null, 2),
            // 提供期望格式的提示
            hint: `Expected valid arguments matching the tool's parameter schema`,
          },
        };
      }

      const result = await tool.execute(parsed.data);
      const duration = Date.now() - startTime;

      return {
        ...result,
        metadata: {
          ...result.metadata,
          toolName: name,
          duration,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Tool execution error: ${errorMsg}`,
        metadata: {
          toolName: name,
          duration,
        },
      };
    }
  }
  
  /**
   * 获取工具的 schema（用于 LLM 函数调用）
   * 
   * 返回符合 OpenAI function calling 格式：
   * https://platform.openai.com/docs/guides/function-calling
   * 
   * @returns 所有工具的 schema 数组
   */
  static getSchemas(): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      strict?: boolean;
      parameters: Record<string, unknown>;
    };
  }> {
    return this.getAll().map(tool => {
      // 将 zod schema 转换为 JSON Schema 格式
      const zodSchema = tool.schema;
      const jsonSchema = SchemaConverter.zodToJsonSchema(zodSchema);

      return {
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          strict: true,
          parameters: jsonSchema,
        },
      };
    });
  }
}
