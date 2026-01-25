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
import { BaseTool, ToolOutput } from './base';

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
Launch a new agent to handle complex, multistep tasks autonomously.

Available agent types and the tools they have access to:
{agents}

When using the Task tool, you must specify a subagent_type parameter to select which agent type to use.

When to use the Task tool:
- When you are instructed to execute custom slash commands. Use the Task tool with the slash command invocation as the entire prompt. The slash command can take arguments. For example: Task(description="Check the file", prompt="/check-file path/to/file.py")

When NOT to use the Task tool:
- If you want to read a specific file path, use the Read or Glob tool instead of the Task tool, to find the match more quickly
- If you are searching for a specific class definition like "class Foo", use the Glob tool instead, to find the match more quickly
- If you are searching for code within a specific file or set of 2-3 files, use the Read tool instead of the Task tool, to find the match more quickly
- Other tasks that are not related to the agent descriptions above


Usage notes:
1. Launch multiple agents concurrently whenever possible, to maximize performance; to do that, use a single message with multiple tool uses
2. When the agent is done, it will return a single message back to you. The result returned by the agent is not visible to the user. To show the user the result, you should send a text message back to the user with a concise summary of the result.
3. Each agent invocation is stateless unless you provide a session_id. Your prompt should contain a highly detailed task description for the agent to perform autonomously and you should specify exactly what information the agent should return back to you in its final and only message to you.
4. The agent's outputs should generally be trusted
5. Clearly tell the agent whether you expect it to write code or just to do research (search, file reads, web fetches, etc.), since it is not aware of the user's intent
6. If the agent description mentions that it should be used proactively, then you should try your best to use it without the user having to ask for it first. Use your judgement.

Example usage (NOTE: The agents below are fictional examples for illustration only - use the actual agents listed above):

<example_agent_descriptions>
"code-reviewer": use this agent after you are done writing a significant piece of code
"greeting-responder": use this agent when to respond to user greetings with a friendly joke
</example_agent_description>

<example>
user: "Please write a function that checks if a number is prime"
assistant: Sure let me write a function that checks if a number is prime
assistant: First let me use the Write tool to write a function that checks if a number is prime
assistant: I'm going to use the Write tool to write the following code:
<code>
function isPrime(n) {
  if (n <= 1) return false
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false
  }
  return true
}
</code>
<commentary>
Since a significant piece of code was written and the task was completed, now use the code-reviewer agent to review the code
</commentary>
assistant: Now let me use the code-reviewer agent to review the code
assistant: Uses the Task tool to launch the code-reviewer agent
</example>

<example>
user: "Hello"
<commentary>
Since the user is greeting, use the greeting-responder agent to respond with a friendly joke
</commentary>
assistant: "I'm going to use the Task tool to launch the with the greeting-responder agent"
</example>
`.trim();

const parameters = z.object({
  description: z.string().describe('A short (3-5 words) description of the task'),
  prompt: z.string().describe('The task for the agent to perform'),
  subagent_type: z.string().describe('The type of specialized agent to use for this task'),
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
export class TaskTool extends BaseTool<typeof parameters> {
  name = 'task';

  description = buildDescription();

  schema = parameters;


  

  /**
   * 执行任务
   * 验证 subagent_type 后调用基类的 execute 方法
   */
  async execute(args: z.infer<typeof parameters>): Promise<ToolOutput> {

  
  }
}

export default TaskTool;
