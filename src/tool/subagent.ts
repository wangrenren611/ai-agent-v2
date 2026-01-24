/**
 * SubAgent Tool Base Class
 *
 * 子代理工具的抽象基类，提供子代理工作流的模板方法。
 * 负责会话管理、工具过滤、系统提示构建等公共逻辑。
 *
 * @example
 * ```ts
 * class ExploreTool extends SubAgentTool<typeof schema> {
 *   name = 'explore';
 *   description = 'Fast READ-ONLY explorer...';
 *   schema = schema;
 *
 *   protected getConfig(): SubAgentConfig {
 *     return { name: 'explore', tools: ['grep', 'glob'], ... };
 *   }
 *
 *   protected getSessionId(args): string | undefined {
 *     return args.session_id;
 *   }
 *
 *   protected buildTaskPrompt(args): string {
 *     return `Explore: ${args.prompt}`;
 *   }
 * }
 * ```
 */

import { z } from 'zod';
import { BaseTool, ToolOutput } from './base';
import { ToolRegistry } from './registry';
import Agent from '../agent';
import { SessionManager } from '../session-v2';
import { OpenAIProvider } from '../providers/openai';
import type { ToolSchema } from '../providers/base';

/**
 * 子代理配置
 */
export type SubAgentConfig = {
  /** 子代理名称 */
  name: string;
  /** 子代理描述 */
  description: string;
  /** 允许使用的工具列表 */
  tools: string[];
  /** 自定义系统提示（可选） */
  systemPrompt?: string;
};

/**
 * 子代理工具的抽象基类
 *
 * 提供模板方法 execute()，编排子代理的完整工作流：
 * 1. 验证配置并创建/获取会话
 * 2. 过滤允许的工具
 * 3. 构建系统提示
 * 4. 运行子代理
 * 5. 清理上下文并返回结果
 */
export abstract class SubAgentTool<T extends z.ZodType> extends BaseTool<T> {
  /**
   * 子类实现：返回子代理配置
   */
  protected abstract getConfig(): SubAgentConfig;

  /**
   * 子类实现：从参数中获取会话 ID（如果有的话）
   */
  protected abstract getSessionId(args: z.infer<T>): string | undefined;

  /**
   * 子类实现：构建任务提示
   */
  protected abstract buildTaskPrompt(args: z.infer<T>): string;

  /**
   * 模板方法：执行子代理工作流
   */
  async execute(args: z.infer<T>): Promise<ToolOutput> {
    const config = this.getConfig();
    const sessionId = this.getSessionId(args) || this.createSessionId(config.name);
    const taskPrompt = this.buildTaskPrompt(args);

    // 验证 API key
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(`Missing API key: set DEEPSEEK_API_KEY or OPENAI_API_KEY for the ${this.name} tool.`);
    }

    // 创建 LLM Provider
    const provider = new OpenAIProvider({
      apiKey,
      baseURL: process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL,
    });

    // 创建会话管理器
    const sessionManager = new SessionManager({
      sessionId,
      llmProvider: provider,
    });
    await sessionManager.init();

    // 过滤工具
    const toolSchemas = this.filterTools(config.tools);

    // 构建系统提示
    const systemPrompt = this.buildSystemPrompt(config);
    const context = this.getContext();

    const environment = [
        `Here is some useful information about the environment you are running in:`,
        `<env>`,
        `  Working directory: ${context.environment}`,
        `  Platform: ${context.platform}`,
        `  Today's date: ${context.time}`,
        `</env>`,
    ].join("\n");
    // 创建子代理
    const agent = new Agent({
      llmProvider: provider,
      sessionManager,
      systemPrompt: `${systemPrompt}\n${environment}`,
      defaultTools: toolSchemas,
      maxLoop: 1024,
      toolConcurrency: 3,
    });

    // 设置工具白名单上下文
    const previousContext = ToolRegistry.getContext();
    ToolRegistry.setContext({
      ...previousContext,
      sessionId: sessionManager.id,
      sessionPath: sessionManager.sessionPath,
      allowedTools: config.tools,
    });

    // 运行子代理
    const response = await agent.run(taskPrompt, { silent: true, tools: toolSchemas }).finally(() => {
      // 清理子代理的工具白名单，恢复主 Agent 上下文
      ToolRegistry.setContext({ ...previousContext, allowedTools: undefined });
    });

    if (!response?.content) {
      throw new Error(`Subagent "${config.name}" did not return a final response`);
    }

    const outputText = response.content.trim();
    // const toolsUsed = this.summarizeToolUsage(sessionManager.messageList);

    const result = {
      output: outputText,
      metadata: {
        ok: true,
        sessionId,
        subagent: config.name,
        result: outputText,
      },
    };

    return result;
  }

  /**
   * 过滤工具：根据允许的工具列表过滤可用工具
   */
  protected filterTools(allowed: string[]): ToolSchema[] {
    const available = new Map(
      ToolRegistry.getSchemas()
        .filter((schema) => schema.function.name !== this.name)
        .map((schema) => [schema.function.name, schema]),
    );

    const missing: string[] = [];
    const schemas: ToolSchema[] = [];

    for (const name of allowed) {
      const schema = available.get(name);
      if (schema) {
        schemas.push(schema);
      } else {
        missing.push(name);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Unknown tools for ${this.name}: ${missing.join(', ')}`);
    }

    return schemas;
  }

  /**
   * 构建系统提示
   */
  protected buildSystemPrompt(config: SubAgentConfig): string {
    if (config.systemPrompt) return config.systemPrompt;
    return [
      `You are the "${config.name}" sub-agent: ${config.description}`,
      `Allowed tools: ${config.tools.join(', ')}`,
    ].join('\n\n');
  }

  /**
   * 创建会话 ID
   */
  protected createSessionId(subagent: string): string {
    return `task_${subagent}_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 6)}`;
  }

  /**
   * 总结工具使用情况
   */
  protected summarizeToolUsage(messages: SessionManager['messageList']): string[] {
    return Array.from(
      new Set(
        messages
          .filter((msg) => msg.role === 'assistant' && Array.isArray(msg.tool_calls))
          .flatMap((msg) => msg.tool_calls?.map((tc) => tc.function.name) ?? []),
      ),
    );
  }
}
