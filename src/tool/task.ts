/**
 * Task Tool
 *
 * 通用子代理调度器，可以动态选择不同的子代理类型来处理任务。
 *
 * 支持的子代理类型：
 * - explore: 只读代码库探索（也可以直接使用 explore 工具）
 * - plan: 规划专家（预留）
 * - general: 通用全权限代理（预留）
 *
 * @example
 * ```ts
 * // 直接使用 explore 工具（推荐）
 * explore({ prompt: 'Find all API endpoints' })
 *
 * // 通过 TaskTool 调用 explore
 * task({
 *   subagent_type: 'explore',
 *   description: 'Find API endpoints',
 *   prompt: 'Search the codebase for all API endpoint definitions'
 * })
 * ```
 */

import { z } from 'zod';
import { SubAgentTool, SubAgentConfig } from './subagent';
import { EXPLORE_CONFIG } from './explore';

/**
 * 可用的子代理配置
 *
 * explore 配置从 ExploreTool 导入，避免重复定义
 */
const SUBAGENTS: SubAgentConfig[] = [
  EXPLORE_CONFIG,
  // 预留给未来的子代理类型：
  // {
  //   name: 'plan',
  //   description: 'Planning specialist that breaks broad work into ordered, actionable steps with dependencies.',
  //   tools: ['todo_write'],
  //   systemPrompt: '...',
  // },
  // {
  //   name: 'general',
  //   description: 'Full-access agent for tasks that require code modifications.',
  //   tools: ['bash', 'glob', 'grep', 'read_file', 'write_file', 'precise_replace', 'batch_replace', 'web_search', 'skill'],
  //   systemPrompt: '...',
  // },
];

const DESCRIPTION_TEMPLATE = `
Launch a specialized sub-agent to handle complex, multi-step tasks autonomously.

Available agent types and their tools:
{agents}

## Agent Selection Guide

### explore (Read-only, Fast)
- Purpose: Quick codebase exploration and searching
- Use when: ONLY need to find/read/search without any edits
- Tools: glob, grep, read_file, web_search (NO write)
- Examples: "Find all API endpoints", "Where is auth implemented?"
- **Shortcut**: Use the dedicated \`explore\` tool directly

### plan (Read-only, Planning) - Coming Soon
- Purpose: Produce a concise ordered plan before executing
- Use when: Need structured steps, dependencies, and risks/assumptions

### general (Full Access, Multi-step) - Coming Soon
- Purpose: Tasks that WRITE/MODIFY code, run builds/tests, or execute workflows
- Use when: Any edits, commands, migrations, refactors, or fixes are needed

Decision flow:
1) Trivial single-file Q&A only? -> skip this tool
2) Read/search only? -> explore (or use the explore tool directly)
3) Planning only? -> plan (coming soon)
4) Any edits/commands/tests OR uncertain? -> general (coming soon)

Usage notes:
1) Always set subagent_type using the guide above
2) Provide a clear prompt, expected outputs, and whether edits are allowed
3) Each call creates its own session; reuse session_id to continue a prior run
`.trim();

const parameters = z.object({
  description: z.string().describe('A short (3-5 words) description of the task'),
  prompt: z.string().describe('The task for the agent to perform'),
  subagent_type: z.string().describe('The type of specialized agent to use for this task'),
  session_id: z.string().describe('Existing Task session to continue').optional(),
  command: z.string().describe('The command that triggered this task').optional(),
});

function buildDescription(): string {
  const agentList = SUBAGENTS.map(
    (agent) =>
      `- ${agent.name}: ${agent.description} (tools: ${agent.tools.join(', ')})`,
  ).join('\n');

  return DESCRIPTION_TEMPLATE.replace('{agents}', agentList || '(no subagents configured)');
}

/**
 * Task 工具 - 通用子代理调度器
 *
 * 可以动态选择不同的子代理类型来处理任务。
 * explore 子代理也可以直接使用独立的 explore 工具。
 */
export class TaskTool extends SubAgentTool<typeof parameters> {
  name = 'task';

  description = buildDescription();

  schema = parameters;

  private lastArgs?: z.infer<typeof parameters>;

  /**
   * 获取子代理配置
   * 根据参数中的 subagent_type 动态选择配置
   */
  protected getConfig(): SubAgentConfig {
    const subagent = SUBAGENTS.find((a) => a.name === this.lastArgs?.subagent_type);
    if (!subagent) {
      const available = SUBAGENTS.map((a) => a.name).join(', ');
      throw new Error(
        `Unknown subagent_type: ${this.lastArgs?.subagent_type}. Available: ${available || '(none)'}`,
      );
    }
    return subagent;
  }

  protected getSessionId(args: z.infer<typeof parameters>): string | undefined {
    return args.session_id;
  }

  protected buildTaskPrompt(args: z.infer<typeof parameters>): string {
    return [
      `Task: ${args.description}`,
      args.command ? `Command trigger: ${args.command}` : null,
      'Work autonomously using the allowed tools. Do not ask the user follow-up questions.',
      'Return a concise final summary with key findings, file:line references, and any remaining gaps.',
      args.prompt,
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  /**
   * 执行任务
   * 验证 subagent_type 后调用基类的 execute 方法
   */
  async execute(args: z.infer<typeof parameters>): Promise<string> {
    const subagent = SUBAGENTS.find((a) => a.name === args.subagent_type);
    if (!subagent) {
      const available = SUBAGENTS.map((a) => a.name).join(', ');
      throw new Error(
        `Unknown subagent_type: ${args.subagent_type}. Available: ${available || '(none)'}`,
      );
    }

    this.lastArgs = args;

    // 调用基类的 execute 方法
    return super.execute(args);
  }
}

export default TaskTool;
