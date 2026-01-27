import { z } from 'zod';
import { BaseTool, ToolResult } from './base.js';

const EXPLORE_CONFIG = {
  name: 'explore',
  description: 'Fast READ-ONLY explorer for searching and understanding codebases',
  tools: ['grep', 'glob', 'read_file'],
  systemPrompt: `You are a file search specialist. You excel at thoroughly navigating and exploring codebases.`,
};

const SUBAGENTS = [EXPLORE_CONFIG];

const DESCRIPTION_TEMPLATE = `
Launch a new agent to handle complex, multistep tasks autonomously.

Available agent types:
{subagents}

When to use:
- Execute custom slash commands

When NOT to use:
- Use Read/Glob for specific file paths
- Use grep for keyword searches

Usage notes:
1. Launch multiple agents concurrently when possible
2. Each agent invocation is stateless unless session_id is provided
`.trim();

const parameters = z.object({
  description: z.string().describe('A short (3-5 words) description of the task'),
  prompt: z.string().describe('The task for the agent to perform'),
  subagent_type: z.string().describe('The type of specialized agent to use'),
});

function buildDescription(): string {
  const agentList = SUBAGENTS.map(
    (agent) => `- ${agent.name}: ${agent.description} (tools: ${agent.tools.join(', ')})`
  ).join('\n');
  return DESCRIPTION_TEMPLATE.replace('{subagents}', agentList || '(no subagents configured)');
}

export class TaskTool extends BaseTool<typeof parameters> {
  name = 'task';
  description = buildDescription();
  schema = parameters;

  async execute(args: z.infer<typeof parameters>): Promise<ToolResult> {
    const subagent = SUBAGENTS.find(s => s.name === args.subagent_type);

    // === 业务错误：子代理类型不存在 ===
    if (!subagent) {
      return this.fail(
        `Unknown subagent type: ${args.subagent_type}`,
        {
          code: 'SUBAGENT_NOT_FOUND',
          subagent_type: args.subagent_type,
          available_types: SUBAGENTS.map(s => s.name)
        }
      );
    }

    return this.success({
      description: args.description,
      subagent_type: args.subagent_type,
      prompt: args.prompt,
      subagent: {
        name: subagent.name,
        description: subagent.description,
        tools: subagent.tools,
      },
      message: `Task dispatched to ${subagent.name}. Implementation required for subagent execution.`,
    });
  }
}

export default TaskTool;
