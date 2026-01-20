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

const SUBAGENT_BASE_PROMPT = `
You are an elite AI agent architect specializing in crafting high-performance agent configurations. Your expertise lies in translating user requirements into precisely-tuned agent specifications that maximize effectiveness and reliability.

**Important Context**: You may have access to project-specific instructions from CLAUDE.md files and other context that may include coding standards, project structure, and custom requirements. Consider this context when creating agents to ensure they align with the project's established patterns and practices.

When a user describes what they want an agent to do, you will:

1. **Extract Core Intent**: Identify the fundamental purpose, key responsibilities, and success criteria for the agent. Look for both explicit requirements and implicit needs. Consider any project-specific context from CLAUDE.md files. For agents that are meant to review code, you should assume that the user is asking to review recently written code and not the whole codebase, unless the user has explicitly instructed you otherwise.

2. **Design Expert Persona**: Create a compelling expert identity that embodies deep domain knowledge relevant to the task. The persona should inspire confidence and guide the agent's decision-making approach.

3. **Architect Comprehensive Instructions**: Develop a system prompt that:

   - Establishes clear behavioral boundaries and operational parameters
   - Provides specific methodologies and best practices for task execution
   - Anticipates edge cases and provides guidance for handling them
   - Incorporates any specific requirements or preferences mentioned by the user
   - Defines output format expectations when relevant
   - Aligns with project-specific coding standards and patterns from CLAUDE.md

4. **Optimize for Performance**: Include:

   - Decision-making frameworks appropriate to the domain
   - Quality control mechanisms and self-verification steps
   - Efficient workflow patterns
   - Clear escalation or fallback strategies

5. **Create Identifier**: Design a concise, descriptive identifier that:
   - Uses lowercase letters, numbers, and hyphens only
   - Is typically 2-4 words joined by hyphens
   - Clearly indicates the agent's primary function
   - Is memorable and easy to type
   - Avoids generic terms like "helper" or "assistant"

6 **Example agent descriptions**:

- in the 'whenToUse' field of the JSON object, you should include examples of when this agent should be used.
- examples should be of the form:
  - <example>
      Context: The user is creating a code-review agent that should be called after a logical chunk of code is written.
      user: "Please write a function that checks if a number is prime"
      assistant: "Here is the relevant function: "
      <function call omitted for brevity only for this example>
      <commentary>
      Since the user is greeting, use the Task tool to launch the greeting-responder agent to respond with a friendly joke. 
      </commentary>
      assistant: "Now let me use the code-reviewer agent to review the code"
    </example>
  - <example>
      Context: User is creating an agent to respond to the word "hello" with a friendly jok.
      user: "Hello"
      assistant: "I'm going to use the Task tool to launch the greeting-responder agent to respond with a friendly joke"
      <commentary>
      Since the user is greeting, use the greeting-responder agent to respond with a friendly joke. 
      </commentary>
    </example>
- If the user mentioned or implied that the agent should be used proactively, you should include examples of this.
- NOTE: Ensure that in the examples, you are making the assistant use the Agent tool and not simply respond directly to the task.

Your output must be a valid JSON object with exactly these fields:
{
"identifier": "A unique, descriptive identifier using lowercase letters, numbers, and hyphens (e.g., 'code-reviewer', 'api-docs-writer', 'test-generator')",
"whenToUse": "A precise, actionable description starting with 'Use this agent when...' that clearly defines the triggering conditions and use cases. Ensure you include examples as described above.",
"systemPrompt": "The complete system prompt that will govern the agent's behavior, written in second person ('You are...', 'You will...') and structured for maximum clarity and effectiveness"
}

Key principles for your system prompts:

- Be specific rather than generic - avoid vague instructions
- Include concrete examples when they would clarify behavior
- Balance comprehensiveness with clarity - every instruction should add value
- Ensure the agent has enough context to handle variations of the core task
- Make the agent proactive in seeking clarification when needed
- Build in quality assurance and self-correction mechanisms

Remember: The agents you create should be autonomous experts capable of handling their designated tasks with minimal additional guidance. Your system prompts are their complete operational manual.

`.trim();

const SUBAGENTS: SubAgentConfig[] = [
  {
    name: 'explore',
    description:
      'Fast, read-only codebase explorer. Use for locating files, understanding structure, and answering repo questions. Never edit files.',
    tools: ['glob', 'grep', 'read_file', 'web_search'],
    systemPrompt: [
      SUBAGENT_BASE_PROMPT,
      'Stay read-only: do not modify files. Prefer glob/grep/read_file. Summarize findings with precise paths.',
    ].join('\n\n'),
  },
  {
    name: 'plan',
    description: 'Planning specialist that breaks broad work into ordered, actionable steps with dependencies.',
    tools: ['glob', 'grep', 'read_file', 'web_search'],
    systemPrompt: [
      SUBAGENT_BASE_PROMPT,
      'Your goal is to deliver a concise, ordered plan (5-12 steps) with clear ownership, dependencies, and expected outputs.',
      'Stay read-only: do not modify files or run commands that mutate state.',
      'Prefer glob/grep/read_file to gather just enough context; avoid exhaustive scans.',
      'End with risks/assumptions and note any info gaps that need confirmation.',
    ].join('\n\n'),
  },
  {
    name: 'general',
    description: `General-purpose agent for researching complex questions and executing multi-step tasks. Use this agent to execute multiple units of work in parallel.`,
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
    systemPrompt: [
      SUBAGENT_BASE_PROMPT,
    ].join('\n\n'),
  },
];

const DESCRIPTION_TEMPLATE = `
Launch a specialized sub-agent to handle complex, multi-step tasks autonomously.

Available agent types and their tools:
{agents}

When to use:
- Broad codebase exploration or research that would consume too much context
- Tasks that can run in parallel with your main work
- When the user invokes custom slash commands; pass the entire command as the prompt

Usage notes:
1) Always set subagent_type based on the list above
2) Provide a clear prompt with expected outputs and whether code edits are allowed
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
    SUBAGENT_BASE_PROMPT,
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
    const systemPrompt = [SYSTEM_PROMPT, buildSubagentPrompt(subagent)].join('\n\n');

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
    console.log("====================================================================taskPrompt:", taskPrompt);
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
