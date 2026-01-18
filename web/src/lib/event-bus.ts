// Event bus manager for SSE
import { TypedEventBus } from '@agent/util/event-bus';

// Agent 事件类型定义 - 与 src/util/event-bus-agent.ts 保持一致
export interface AgentLifecycleEvents {
  'agent.run.start': { query: string; sessionId?: string; userId?: string };
  'agent.run.complete': { query: string; response: string | null; duration: number };
  'agent.run.error': { query: string; error: Error; sessionId?: string };
  'agent.loop.start': { iteration: number; maxLoop: number };
  'agent.loop.complete': { iteration: number; hasToolCalls: boolean };
  'agent.loop.max.reached': { maxLoop: number; query: string };
}

export interface AgentLLMEvents {
  'agent.llm.call.start': {
    prompt: string;
    model: string;
    tools?: any[];
    iteration: number;
  };
  'agent.llm.call.complete': {
    response: string;
    hasToolCalls: boolean;
    duration: number;
    tokenUsage?: any;
    iteration: number;
  };
  'agent.llm.call.error': {
    error: Error;
    prompt: string;
    iteration: number;
  };
  'agent.llm.response.received': {
    content: string;
    toolCalls?: any[];
    iteration: number;
  };
  'agent.llm.response.processed': {
    content: string;
    hasToolCalls: boolean;
    iteration: number;
  };
}

export interface AgentToolEvents {
  'agent.tool.call.start': {
    toolName: string;
    params: any;
    toolCallId: string;
    iteration: number;
  };
  'agent.tool.call.complete': {
    toolName: string;
    result: any;
    duration: number;
    toolCallId: string;
    iteration: number;
  };
  'agent.tool.call.error': {
    toolName: string;
    error: Error;
    params: any;
    toolCallId: string;
    iteration: number;
  };
  'agent.tool.params.parse.start': {
    toolName: string;
    rawArguments: string;
    toolCallId: string;
  };
  'agent.tool.params.parse.complete': {
    toolName: string;
    parsedParams: any;
    toolCallId: string;
  };
  'agent.tool.params.parse.error': {
    toolName: string;
    rawArguments: string;
    error: Error;
    toolCallId: string;
  };
  'agent.tools.batch.start': {
    toolCalls: any[];
    iteration: number;
  };
  'agent.tools.batch.complete': {
    results: Array<{ toolName: string; result: any; error?: Error }>;
    duration: number;
    iteration: number;
  };
}

export interface AgentSessionEvents {
  'agent.message.added': {
    role: 'user' | 'assistant' | 'tool' | 'system';
    content: string;
    type: 'text' | 'tool_call' | 'tool';
    sessionId?: string;
  };
  'agent.messages.retrieved': {
    count: number;
    sessionId?: string;
    iteration: number;
  };
  'agent.session.initialized': {
    sessionId?: string;
    userId?: string;
    systemPrompt: string;
  };
  'agent.session.updated': {
    sessionId?: string;
    messageCount: number;
    iteration: number;
  };
}

export interface AgentPerformanceEvents {
  'agent.performance.metrics': {
    totalDuration: number;
    llmCalls: number;
    toolCalls: number;
    avgToolDuration: number;
    avgLLMDuration: number;
    tokenUsage?: any;
    iteration: number;
  };
  'agent.performance.slow.tool': {
    toolName: string;
    duration: number;
    threshold: number;
    iteration: number;
  };
  'agent.performance.slow.llm': {
    duration: number;
    threshold: number;
    iteration: number;
  };
}

export interface AgentHookEvents {
  'agent.hook.registered': {
    hookName: string;
    handlerId: string;
    priority: number;
  };
  'agent.hook.triggered': {
    hookName: string;
    data: any;
    handlerCount: number;
  };
  'agent.hook.completed': {
    hookName: string;
    data: any;
    handlerCount: number;
    duration: number;
  };
  'agent.hook.error': {
    hookName: string;
    error: Error;
    handlerId: string;
  };
}

// Session 事件类型
export interface SessionEvents {
  'session.created': { sessionId: string; userId: string };
  'session.message.added': { sessionId: string; message: any; timestamp?: number; messageCount?: number };
  'session.messages.retrieved': { sessionId: string; count: number; timestamp?: number };
  'session.compaction.triggered': { sessionId: string; tokenCount: number; threshold: number; timestamp?: number };
  'session.compaction.completed': { sessionId: string; summary: any; compressedCount: number; originalTokenCount?: number; compressedTokenCount?: number; timestamp?: number };
  'session.compaction.failed': { sessionId: string; error: Error; tokenCount?: number; timestamp?: number };
  'session.error': { sessionId: string; error: Error; operation?: string; timestamp?: number };
  'session.cleared': { sessionId: string; clearedCount: number; timestamp?: number };
}

// 所有 Agent 事件的联合类型
export type AllAgentEvents =
  & AgentLifecycleEvents
  & AgentLLMEvents
  & AgentToolEvents
  & AgentSessionEvents
  & AgentPerformanceEvents
  & AgentHookEvents;

// Global event bus instance for SSE streaming
class SSEEventManager {
  private clients: Set<ReadableStreamDefaultController> = new Set();
  private eventBus: TypedEventBus<SessionEvents & AllAgentEvents>;

  constructor() {
    this.eventBus = new TypedEventBus<SessionEvents & AllAgentEvents>();
  }

  /**
   * Subscribe to event stream
   */
  subscribe(controller: ReadableStreamDefaultController): () => void {
    this.clients.add(controller);
    return () => this.clients.delete(controller);
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast(event: string, data: unknown): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

    this.clients.forEach((controller) => {
      try {
        controller.enqueue(new TextEncoder().encode(message));
      } catch (error) {
        console.error('Error sending SSE message:', error);
        this.clients.delete(controller);
      }
    });
  }

  /**
   * Get the event bus instance
   */
  getEventBus(): TypedEventBus<SessionEvents & AllAgentEvents> {
    return this.eventBus;
  }

  /**
   * Get client count
   */
  getClientCount(): number {
    return this.clients.size;
  }
}

// Singleton instance
export const sseEventManager = new SSEEventManager();
