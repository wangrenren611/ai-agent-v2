// Shared types for the web application
import { Message } from '@agent/providers/base';

export interface ChatRequest {
  sessionId: string;
  query: string;
  userId?: string;
}

export interface ChatResponse {
  content: string;
  role: 'assistant';
  sessionId: string;
  duration: number;
}

export interface Session {
  id: string;
  messageCount: number;
  createdAt: string;
}

export interface SessionsResponse {
  sessions: Session[];
}

export interface MessagesResponse {
  messages: Message[];
}

export interface AgentEvent {
  type: string;
  data: unknown;
  timestamp: number;
}

export interface SSEEvent {
  event: string;
  data: unknown;
}

// 思考步骤类型
export interface ThinkingStep {
  id: string;
  type: 'thinking' | 'tool_call' | 'tool_result' | 'response';
  content: string;
  toolName?: string;
  toolParams?: unknown;
  toolResult?: unknown;
  iteration?: number;
  timestamp: number;
  duration?: number;
}

// Todo 列表项类型
export interface TodoItem {
  id: string;
  content: string;
  activeForm: string;
  status: 'pending' | 'in_progress' | 'completed';
}

// 扩展的消息类型，包含思考过程和 todo list
export interface ExtendedMessage extends Message {
  _id?: string;  // 用于跟踪正在生成的消息
  thinkingSteps?: ThinkingStep[];
  todos?: TodoItem[];
}

// Agent 事件类型
export interface AgentRunStartEvent {
  query: string;
  sessionId?: string;
}

export interface AgentLoopStartEvent {
  iteration: number;
  maxLoop: number;
}

export interface AgentLLMCallStartEvent {
  iteration: number;
  model: string;
}

export interface AgentLLMCallCompleteEvent {
  iteration: number;
  response: string;
  hasToolCalls: boolean;
  duration: number;
}

export interface AgentToolCallStartEvent {
  toolName: string;
  params: unknown;
  toolCallId: string;
  iteration: number;
}

export interface AgentToolCallCompleteEvent {
  toolName: string;
  result: unknown;
  duration: number;
  toolCallId: string;
  iteration: number;
}

export interface AgentMessageAddedEvent {
  role: string;
  content: string;
  type: string;
  sessionId?: string;
}

export interface AgentRunCompleteEvent {
  query: string;
  response: string | null;
  duration: number;
}
