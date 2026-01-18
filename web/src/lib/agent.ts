// Agent manager for the web application
import Agent from '@agent/agent/index-eventbus';
import { LLMProvider } from '@agent/providers/base';
import { getSessionManager } from './session-manager';
import { sseEventManager } from './event-bus';
import type { ChatRequest, ChatResponse } from './types';

// Global agent instance
let globalAgent: Agent | null = null;
let globalLLMProvider: LLMProvider | null = null;

export interface AgentManagerConfig {
  llmProvider: LLMProvider;
  systemPrompt?: string;
  maxLoop?: number;
  maxTokens?: number;
}

/**
 * Initialize the global agent instance
 */
export function initializeAgent(config: AgentManagerConfig): void {
  if (globalAgent) {
    console.warn('Agent already initialized');
    return;
  }

  globalLLMProvider = config.llmProvider;

  // Create a new session manager for the agent
  const defaultSessionId = `session_${Date.now()}`;
  const sessionManager = getSessionManager(defaultSessionId, config.llmProvider);

  globalAgent = new Agent({
    llmProvider: config.llmProvider,
    sessionManager,
    systemPrompt: config.systemPrompt,
    maxLoop: config.maxLoop || 10,
    maxTokens: config.maxTokens || 8000,
    eventBus: sseEventManager.getEventBus(),
    enableEventLogging: true,
  });

  // Subscribe to agent events and broadcast to SSE clients
  const eventBus = globalAgent.getEventBus();
  const eventNames = eventBus.eventNames();

  eventNames.forEach((eventName: string | symbol) => {
    eventBus.onAsync(eventName, async (data: unknown) => {
      const name = typeof eventName === 'symbol' ? eventName.toString() : eventName;
      sseEventManager.broadcast(name, data);
    }, `web_sse_${String(eventName)}`);
  });

  console.log('Agent initialized successfully');
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
