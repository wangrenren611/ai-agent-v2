/**
 * CLI v2 (Ink-based) Type Definitions
 */

import type { Agent, AgentEvents } from '../../agent';
import type { RouteContextValue } from '../context/route';

// ============================================================================
// Route Types
// ============================================================================

export type Route = 'home' | 'session' | 'settings';

export interface RouteState {
  current: Route;
  params: Record<string, string>;
  history: Route[];
}

// ============================================================================
// Theme Types
// ============================================================================

export type ThemeMode = 'dark' | 'light';

export interface ThemeColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Theme {
  name: string;
  mode: ThemeMode;
  colors: Record<string, ThemeColor>;
  syntax?: Record<string, string>;
}

export interface ThemeState {
  current: Theme;
  mode: ThemeMode;
  themes: Record<string, Theme>;
}

// ============================================================================
// Message Types
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool' | 'tool-call';
export type ToolCallStatus = 'calling' | 'success' | 'error';

export interface ChatMessage {
  role: MessageRole;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  toolName?: string;
  toolArgs?: string;
  toolStatus?: ToolCallStatus;
  toolOutput?: string;
}

export interface ToolCallInfo {
  name: string;
  index: number;
  args: string;
}

// ============================================================================
// Session Props
// ============================================================================

export interface SessionProps {
  navigate: RouteContextValue['navigate'];
}

// ============================================================================
// Session State
// ============================================================================

export interface SessionState {
  input: string;
  messages: ChatMessage[];
  isProcessing: boolean;
  currentResponse: string;
  status: string;
  agent: Agent | null;
  ready: boolean;
}

// ============================================================================
// Agent Event Types
// ============================================================================

export interface AgentEventHandlers {
  onStreamChunk?: (chunk: { content?: string }) => void;
  onComplete?: (data: { response: { content?: string } }) => void;
  onError?: (data: { error: { message: string } }) => void;
  onThinking?: (data: { step: number }) => void;
  onToolCall?: (data: { toolName: string; args: unknown }) => void;
  onToolResult?: (data: { toolName: string; result: { success: boolean; data?: unknown; error?: string }; duration: number }) => void;
}

// ============================================================================
// Header Props
// ============================================================================

export interface HeaderProps {
  model: string;
}

// ============================================================================
// Helper Types
// ============================================================================

export type ModelName = string;
export type StatusText = string;
export type InputText = string;
