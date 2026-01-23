import { z } from 'zod';
import Agent from '../agent';
import { SYSTEM_PROMPT } from '../prompts/system';
import { OpenAIProvider } from '../providers/openai';
import { SessionManager } from '../session-v2';
import type { ToolSchema } from '../providers/base';
import { BaseTool } from './base';
import { ToolRegistry } from './registry';

type SubAgentConfig = {
  name: string;
  description: string;
  tools: string[];
  systemPrompt?: string;
};

                                                                                                                                                                                                                     


const SUBAGENTS: SubAgentConfig[] = [
  {
    name: 'explore',
    description:
      'Fast READ-ONLY explorer for searching and understanding codebases. Use this ONLY when you need to find/read files WITHOUT making any changes.',
    tools: ['grep', 'glob', 'read_file', 'web_search'],
    systemPrompt: [
  `You are a file search specialist. You excel at thoroughly navigating and exploring codebases.

Your strengths:
- Rapidly finding files using glob patterns
- Searching code and text with powerful regex patterns
- Reading and analyzing file contents

Guidelines:
- Use Glob for broad file pattern matching
- Use Grep for searching file contents with regex
- Use Read when you know the specific file path you need to read
- Use Bash for file operations like copying, moving, or listing directory contents
- Adapt your search approach based on the thoroughness level specified by the caller
- Return file paths as absolute paths in your final response
- For clear communication, avoid using emojis
- Do not create any files, or run bash commands that modify the user's system state in any way

Complete the user's search request efficiently and report your findings clearly.
`,
    ].join('\n\n'),
  },
  {
    name: 'plan',
    description: 'Planning specialist that breaks broad work into ordered, actionable steps with dependencies.',
    tools: ['batch_replace', 'write_file', 'read_file'],
    systemPrompt: [
      'Your goal is to deliver a concise, ordered plan (5-12 steps) with clear ownership, dependencies, and expected outputs.',
      'Stay read-only: do not modify files or run commands that mutate state.',
      'Prefer glob/grep/read_file to gather just enough context; avoid exhaustive scans.',
      'End with risks/assumptions and note any info gaps that need confirmation.',
    ].join('\n\n'),
  },
  {
    name: 'general',
    description: [`Full-access agent for tasks that require code modifications. Use this when you need to WRITE, EDIT, or EXECUTE commands - not just reading.`].join('\n\n'),
    tools: [
      'bash',
      'glob',
      'grep',
      'read_file',
      'write_file',
      'precise_replace',
      'batch_replace',
      'web_search',
      'skill',
    ],
    systemPrompt: [ ].join('\n\n'),
  },
];

const DESCRIPTION_TEMPLATE = `
Launch a specialized sub-agent to handle complex, multi-step tasks autonomously.

DEFAULT: Use this tool first for any non-trivial request (multi-file, global analysis, planning, refactors, audits, tests, or executions). Skip only for tiny single-file read/answer tasks with no actions.

Trigger this tool when:
- Scope spans multiple files/directories, needs global search, or has unclear boundaries
- Work requires planning, refactoring, running commands/tests, or parallel subtasks
- User asks for reviews/audits/reports or invokes a slash command; pass the entire command as the prompt
- You are unsure whether write access is needed (default to this tool)

Available agent types and their tools:
{agents}

# Agent Selection Guide

## explore (Read-only, Fast)
- Purpose: Quick codebase exploration and searching
- Use when: ONLY need to find/read/search without any edits
- Tools: glob, grep, read_file, web_search (NO write)
- Examples: "Find all API endpoints", "Where is auth implemented?"

## plan (Read-only, Planning)
- Purpose: Produce a concise ordered plan before executing
- Use when: Need structured steps, dependencies, and risks/assumptions
- Tools: glob, grep, read_file, web_search (NO write)
- Examples: "Plan a new feature", "Break down this refactor"

## general (Full Access, Multi-step)
- Purpose: Tasks that WRITE/MODIFY code, run builds/tests, or execute workflows
- Use when: Any edits, commands, migrations, refactors, or fixes are needed
- Tools: bash, glob, grep, read_file, write_file, precise_replace, batch_replace, web_search, skill (FULL access)
- Examples: "Implement feature", "Refactor API layer", "Fix failing tests"

Decision flow:
1) Trivial single-file Q&A only? -> skip this tool
2) Read/search only? -> explore
3) Planning only? -> plan
4) Any edits/commands/tests OR uncertain? -> general

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
  return DESCRIPTION_TEMPLATE.replace('{agents}', agentList);
}

function buildToolSchemas(allowed: string[]): ToolSchema[] {
  const available = new Map(
    ToolRegistry.getSchemas()
      .filter((schema) => schema.function.name !== 'task')
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
    throw new Error(`Unknown tools for subagent: ${missing.join(', ')}`);
  }

  return schemas;
}

function buildSubagentPrompt(config: SubAgentConfig): string {
  if (config.systemPrompt) return config.systemPrompt;
  return [
    `You are the "${config.name}" sub-agent: ${config.description}`,
    `Allowed tools: ${config.tools.join(', ')}`,
  ].join('\n\n');
}

function generateSessionId(subagent: string): string {
  return `task_${subagent}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

function summarizeTools(messages: SessionManager['messageList']): string[] {
  return Array.from(
    new Set(
      messages
        .filter((msg) => msg.role === 'assistant' && Array.isArray(msg.tool_calls))
        .flatMap((msg) => msg.tool_calls?.map((tc) => tc.function.name) ?? []),
    ),
  );
}

export class TaskTool extends BaseTool<typeof parameters> {
  name = 'task';

  description = buildDescription();

  schema = parameters;

  async execute(args: z.infer<typeof parameters>): Promise<string> {
    const { description, prompt, subagent_type, session_id, command } = args;
   
    const subagent = SUBAGENTS.find((agent) => agent.name === subagent_type);
    if (!subagent) {
      const available = SUBAGENTS.map((a) => a.name).join(', ');
      throw new Error(`Unknown subagent_type: ${subagent_type}. Available: ${available}`);
    }

    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('Missing API key: set DEEPSEEK_API_KEY or OPENAI_API_KEY for the Task tool.');
    }

    const provider = new OpenAIProvider({
      apiKey,
      baseURL: process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL,
    });

    const sessionId = session_id || generateSessionId(subagent.name);
    const sessionManager = new SessionManager({
      sessionId,
      llmProvider: provider,
    });
    await sessionManager.init();

    const toolSchemas = buildToolSchemas(subagent.tools);
    const systemPrompt = [buildSubagentPrompt(subagent)].join('\n\n');

    const agent = new Agent({
      llmProvider: provider,
      sessionManager,
      systemPrompt,
      defaultTools: toolSchemas,
      maxLoop: 1024,
      toolConcurrency: 3,
    });

    const taskPrompt = [
      `Task: ${description}`,
      command ? `Command trigger: ${command}` : null,
      'Work autonomously using the allowed tools. Do not ask the user follow-up questions.',
      'Return a concise final summary with key findings, file:line references, and any remaining gaps.',
      prompt,
    ]
      .filter(Boolean)
      .join('\n\n');

    const previousContext = ToolRegistry.getContext();
    ToolRegistry.setContext({
      ...previousContext,
      sessionId: sessionManager.id,
      sessionPath: sessionManager.sessionPath,
      allowedTools: subagent.tools,
    });

    const response = await agent.run(taskPrompt, { silent: true, tools: toolSchemas }).finally(() => {
      // 清理子代理的工具白名单，恢复主 Agent 上下文
      ToolRegistry.setContext({ ...previousContext, allowedTools: undefined });
    });

    if (!response?.content) {
      throw new Error(`Subagent "${subagent.name}" did not return a final response`);
    }

    const outputText = response.content.trim();
    const toolsUsed = summarizeTools(sessionManager.messageList);

    const result = {
      title: description,
      output: outputText,
      metadata: {
        sessionId,
        subagent: subagent.name,
        toolsUsed,
      },
    };

    return JSON.stringify(result, null, 2);
  }
}

export default TaskTool;
