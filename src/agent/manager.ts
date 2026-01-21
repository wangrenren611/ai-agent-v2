import fs from 'node:fs';
import path from 'node:path';
import Agent from './index-eventbus';
import { SYSTEM_PROMPT } from '../prompts/system';
import { SessionManager } from '../session-v2';
import { ToolRegistry } from '../tool/registry';
import type { LLMProvider, ToolSchema } from '../providers/base';

export type AgentType = 'orchestrator' | 'worker' | 'reviewer' | 'hidden' | 'subagent';
export type AgentMode = 'manual' | 'auto' | 'hybrid';

export type AgentFilters = {
  ids?: string[];
  type?: AgentType;
  mode?: AgentMode;
  name?: string;
};

export type AgentDefinition = {
  id: string;
  name: string;
  description?: string;
  version?: string;
  type: AgentType;
  mode: AgentMode;
  model?: string;
  systemPrompt?: string;
  instructions?: string;
  tools?: string[];
  maxSteps?: number;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
};

export type AgentInstance = {
  id: string;
  agentId: string;
  createdAt: number;
  sessionId: string;
  sessionManager: SessionManager;
  agent: Agent;
  input?: Record<string, unknown>;
};

export type GenerationContext = {
  type?: AgentType;
  mode?: AgentMode;
  model?: string;
  tools?: string[];
  version?: string;
  instructions?: string;
  existingAgents?: AgentDefinition[];
};

export interface AgentStorage {
  getAgent(id: string): Promise<AgentDefinition | undefined>;
  saveAgent(config: AgentDefinition): Promise<void>;
  deleteAgent(id: string): Promise<void>;
  listAgents(filters?: AgentFilters): Promise<AgentDefinition[]>;
}

export interface AgentManagerOptions {
  llmProvider: LLMProvider;
  storage?: AgentStorage;
  defaultTools?: ToolSchema[];
  defaultSystemPrompt?: string;
  createSessionId?: (agentId: string) => string;
  generationPrompt?: string;
  generationModel?: string;
  eventBus?: any;
  enableEventLogging?: boolean;
}

type GeneratedAgentSpec = {
  identifier: string;
  whenToUse: string;
  systemPrompt: string;
};

const FALLBACK_GENERATION_PROMPT = `
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

function loadGenerationPrompt(): string {
  try {
    return fs.readFileSync(path.join(__dirname, 'generate.txt'), 'utf-8');
  } catch (_error) {
    return FALLBACK_GENERATION_PROMPT;
  }
}

function toTitleCase(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch (_error) {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('No JSON object found in response');
    }
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

function parseGeneratedSpec(text: string): GeneratedAgentSpec {
  const parsed = extractJsonObject(text);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid agent generation output');
  }
  const result = parsed as Partial<GeneratedAgentSpec>;
  if (!result.identifier || !result.whenToUse || !result.systemPrompt) {
    throw new Error('Agent generation output missing required fields');
  }
  return {
    identifier: result.identifier,
    whenToUse: result.whenToUse,
    systemPrompt: result.systemPrompt,
  };
}

function isIdentifierValid(identifier: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(identifier);
}

export class AgentManager {
  private agents = new Map<string, AgentDefinition>();
  private instances = new Map<string, AgentInstance>();
  private storage?: AgentStorage;
  private llmProvider: LLMProvider;
  private defaultTools?: ToolSchema[];
  private defaultSystemPrompt: string;
  private initialized = false;
  private sessionIdFactory: (agentId: string) => string;
  private generationPrompt: string;
  private generationModel?: string;
  private eventBus?: any;
  private enableEventLogging?: boolean;

  constructor(options: AgentManagerOptions) {
    this.llmProvider = options.llmProvider;
    this.storage = options.storage;
    this.defaultTools = options.defaultTools;
    this.defaultSystemPrompt = options.defaultSystemPrompt ?? SYSTEM_PROMPT;
    this.sessionIdFactory =
      options.createSessionId ??
      ((agentId: string) => `agent_${agentId}_${Date.now().toString(36)}`);
    this.generationPrompt = options.generationPrompt ?? loadGenerationPrompt();
    this.generationModel = options.generationModel;
    this.eventBus = options.eventBus;
    this.enableEventLogging = options.enableEventLogging;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.initialized || !this.storage) return;
    const stored = await this.storage.listAgents();
    for (const config of stored) {
      this.agents.set(config.id, config);
    }
    this.initialized = true;
  }

  private normalizeDefinition(config: AgentDefinition): AgentDefinition {
    return {
      version: config.version ?? '1.0.0',
      maxSteps: config.maxSteps ?? 10,
      timeoutMs: config.timeoutMs ?? 120000,
      ...config,
    };
  }

  private matchesFilters(config: AgentDefinition, filters?: AgentFilters): boolean {
    if (!filters) return true;
    if (filters.ids && !filters.ids.includes(config.id)) return false;
    if (filters.type && config.type !== filters.type) return false;
    if (filters.mode && config.mode !== filters.mode) return false;
    if (filters.name) {
      const needle = filters.name.toLowerCase();
      const haystack = `${config.name} ${config.description ?? ''}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  }

  private buildSystemPrompt(config: AgentDefinition): string {
    return [this.defaultSystemPrompt, config.systemPrompt, config.instructions]
      .filter(Boolean)
      .join('\n\n');
  }

  private resolveToolSchemas(toolNames?: string[]): ToolSchema[] | undefined {
    if (!toolNames || toolNames.length === 0) {
      return this.defaultTools ?? ToolRegistry.getSchemas();
    }

    const available = new Map(
      ToolRegistry.getSchemas().map((schema) => [schema.function.name, schema]),
    );
    const schemas: ToolSchema[] = [];
    const missing: string[] = [];

    for (const name of toolNames) {
      const schema = available.get(name);
      if (!schema) {
        missing.push(name);
        continue;
      }
      schemas.push(schema);
    }

    if (missing.length > 0) {
      throw new Error(`Unknown tools for agent: ${missing.join(', ')}`);
    }

    return schemas;
  }

  private buildInstanceId(agentId: string): string {
    return `instance_${agentId}_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 6)}`;
  }

  async register(config: AgentDefinition): Promise<void> {
    await this.ensureLoaded();
    if (this.agents.has(config.id)) {
      throw new Error(`Agent "${config.id}" is already registered`);
    }
    const normalized = this.normalizeDefinition(config);
    this.agents.set(normalized.id, normalized);
    if (this.storage) {
      await this.storage.saveAgent(normalized);
    }
  }

  async get(id: string): Promise<AgentDefinition | undefined> {
    await this.ensureLoaded();
    return this.agents.get(id) ?? (this.storage ? await this.storage.getAgent(id) : undefined);
  }

  async list(filters?: AgentFilters): Promise<AgentDefinition[]> {
    await this.ensureLoaded();
    return Array.from(this.agents.values()).filter((config) => this.matchesFilters(config, filters));
  }

  async update(id: string, updates: Partial<AgentDefinition>): Promise<void> {
    await this.ensureLoaded();
    const existing = this.agents.get(id);
    if (!existing) {
      throw new Error(`Agent "${id}" not found`);
    }
    const normalized = this.normalizeDefinition({
      ...existing,
      ...updates,
      id: existing.id,
    });
    this.agents.set(id, normalized);
    if (this.storage) {
      await this.storage.saveAgent(normalized);
    }
  }

  async delete(id: string): Promise<void> {
    await this.ensureLoaded();
    this.agents.delete(id);
    if (this.storage) {
      await this.storage.deleteAgent(id);
    }
  }

  async createInstance(agentId: string, input?: Record<string, unknown>): Promise<AgentInstance> {
    await this.ensureLoaded();
    const config = await this.get(agentId);
    if (!config) {
      throw new Error(`Agent "${agentId}" not found`);
    }

    const sessionId = this.sessionIdFactory(agentId);
    const sessionManager = new SessionManager({
      sessionId,
      llmProvider: this.llmProvider,
    });
    await sessionManager.init();

    const toolSchemas = this.resolveToolSchemas(config.tools);
    const systemPrompt = this.buildSystemPrompt(config);

    const agent = new Agent({
      llmProvider: this.llmProvider,
      sessionManager,
      systemPrompt,
      defaultTools: toolSchemas,
      maxLoop: config.maxSteps,
      toolTimeoutMs: config.timeoutMs,
      model: config.model,
      eventBus: this.eventBus,
      enableEventLogging: this.enableEventLogging,
    });

    const instance: AgentInstance = {
      id: this.buildInstanceId(agentId),
      agentId,
      createdAt: Date.now(),
      sessionId,
      sessionManager,
      agent,
      input,
    };

    this.instances.set(instance.id, instance);
    return instance;
  }

  async generate(description: string, context: GenerationContext = {}): Promise<AgentDefinition> {
    const catalog = context.existingAgents ?? (await this.list());
    const catalogText = catalog.length
      ? `Existing agents:\n${catalog.map((agent) => `- ${agent.id}: ${agent.description ?? agent.name}`).join('\n')}`
      : 'Existing agents: none';

    const userPrompt = [
      `User request: ${description}`,
      catalogText,
      context.instructions ? `Additional constraints:\n${context.instructions}` : null,
    ]
      .filter(Boolean)
      .join('\n\n');

    const response = await this.llmProvider.generate(
      [
        { role: 'system', content: this.generationPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: context.model ?? this.generationModel ?? process.env.AI_MODEL,
        temperature: 0.2,
        max_tokens: 1500,
      },
    );

    if (!response?.content) {
      throw new Error('Agent generation returned empty response');
    }

    const spec = parseGeneratedSpec(response.content);
    if (!isIdentifierValid(spec.identifier)) {
      throw new Error(`Generated identifier "${spec.identifier}" is invalid`);
    }

    return this.normalizeDefinition({
      id: spec.identifier,
      name: toTitleCase(spec.identifier),
      description: spec.whenToUse,
      type: context.type ?? 'worker',
      mode: context.mode ?? 'auto',
      model: context.model,
      tools: context.tools,
      systemPrompt: spec.systemPrompt,
      version: context.version ?? '1.0.0',
    });
  }
}
