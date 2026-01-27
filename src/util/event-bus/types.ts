/**
 * EventBus 类型定义
 * 统一管理所有事件总线相关的类型
 */


export type EventHandler<T = any> = (data: T) => void | Promise<void>;
export type AsyncEventHandler<T = any> = (data: T) => Promise<void>;

export interface EventMetadata {
  timestamp: number;
  source?: string;
  correlationId?: string;
  [key: string]: any;
}

export interface EventContext<T = any> {
  event: string;
  data: T;
  metadata: EventMetadata;
  abort: () => void;
  isAborted: boolean;
  /** 错误回调，用于将处理器错误传递给中间件 */
  onError?: (error: Error) => void;
}

export interface Middleware<T = any> {
  (context: EventContext<T>, next: () => Promise<void>): Promise<void>;
}

export interface EventBusOptions {
  maxListeners?: number;
  enableAsync?: boolean;
  defaultTimeout?: number;
  enableMetrics?: boolean;
}

export interface EventMetrics {
  totalEvents: number;
  totalHandlers: number;
  avgExecutionTime: number;
  errors: number;
  lastEventTime: number;
}

export interface Subscription {
  unsubscribe: () => void;
  event: string;
  handlerId: string;
}

/**
 * 预定义事件类型
 */
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

export interface AgentEvents {
  'agent.tool.called': { toolName: string; params: any };
  'agent.tool.result': { toolName: string; result: any; duration: number };
  'agent.llm.called': { prompt: string; model: string };
  'agent.llm.response': { response: string; duration: number; tokenUsage: any };
}
