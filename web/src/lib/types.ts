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
