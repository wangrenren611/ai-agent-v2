// Agent manager for the web application
import Agent from '@agent/agent/index-eventbus';
import { LLMProvider } from '@agent/providers/base';
import { getSessionManager } from './session-manager';
import { sseEventManager } from './event-bus';
import { connectDB } from '@agent/storage/mongoose';
import { registerDefaultToolsAsync } from '@agent/tool';
import type { ChatRequest, ChatResponse } from './types';

// Global agent instance
let globalAgent: Agent | null = null;
let globalLLMProvider: LLMProvider | null = null;
let initializationPromise: Promise<void> | null = null;

export interface AgentManagerConfig {
  llmProvider: LLMProvider;
  systemPrompt?: string;
  maxLoop?: number;
  maxTokens?: number;
}

/**
 * Initialize the application (database, tools, agent)
 */
async function initializeApplication(config: AgentManagerConfig): Promise<void> {
  // 1. Connect to database
  await connectDB();

  // 2. Register default tools (including MCP tools)
  await registerDefaultToolsAsync();

  // 3. Store the LLM provider
  globalLLMProvider = config.llmProvider;

  // 4. Create a default session manager for the agent
  const defaultSessionId = `session_${Date.now()}`;
  const sessionManager = getSessionManager(defaultSessionId, config.llmProvider);
  await sessionManager.init();

  // 5. Create the agent
  globalAgent = new Agent({
    llmProvider: config.llmProvider,
    sessionManager,
    systemPrompt: config.systemPrompt,
    maxLoop: config.maxLoop || 10,
    maxTokens: config.maxTokens || 8000,
    eventBus: sseEventManager.getEventBus(),
    enableEventLogging: true,
  });

  // 6. Subscribe to agent events and broadcast to SSE clients
  const eventBus = globalAgent.getEventBus();
  const eventNames = eventBus.eventNames();

  eventNames.forEach((eventName: string | symbol) => {
    eventBus.onAsync(eventName, async (data: unknown) => {
      const name = typeof eventName === 'symbol' ? eventName.toString() : eventName;
      sseEventManager.broadcast(name, data);
    }, `web_sse_${String(eventName)}`);
  });

  console.log('Application initialized successfully');
}

/**
 * Initialize the global agent instance (idempotent)
 */
export async function initializeAgent(config: AgentManagerConfig): Promise<void> {
  if (globalAgent) {
    console.warn('Agent already initialized');
    return;
  }

  // Use a promise to prevent concurrent initializations
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = initializeApplication(config);
  await initializationPromise;
}

/**
 * Get the global agent instance
 */
export function getAgent(): Agent {
  if (!globalAgent) {
    throw new Error('Agent not initialized. Call initializeAgent() first.');
  }
  return globalAgent;
}

/**
 * Process a chat request
 */
export async function processChatRequest(request: ChatRequest): Promise<ChatResponse> {
  const agent = getAgent();
  const llmProvider = globalLLMProvider!;

  // Get or create session manager for this session
  const sessionManager = getSessionManager(request.sessionId, llmProvider);
  await sessionManager.init();

  // Swap the session manager in the agent
  (agent as any).sessionManager = sessionManager;

  const startTime = Date.now();

  // Run the agent
  const response = await agent.run(request.query);

  const duration = Date.now() - startTime;

  if (!response) {
    throw new Error('Agent returned null response');
  }

  return {
    content: response.content,
    role: response.role,
    sessionId: request.sessionId,
    duration,
  };
}

/**
 * Check if agent is initialized
 */
export function isAgentInitialized(): boolean {
  return globalAgent !== null;
}

/**
 * Get the LLM provider
 */
export function getLLMProvider(): LLMProvider {
  if (!globalLLMProvider) {
    throw new Error('LLM provider not initialized. Call initializeAgent() first.');
  }
  return globalLLMProvider;
}

/**
 * Ensure agent is initialized (for use in API routes)
 */
export async function ensureAgentInitialized(): Promise<void> {
  if (!isAgentInitialized()) {
    const apiKey = process.env.DEEPSEEK_API_KEY || '';
    const baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';

    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable is not set');
    }

    const { OpenAIProvider } = await import('@agent/providers/openai');
    const llmProvider = new OpenAIProvider({ apiKey, baseURL, model: 'deepseek-chat' });
    await initializeAgent({ llmProvider });
  }
}
