/**
 * CLI v2 (Ink-based) Type Definitions
 */

export type Route = 'home' | 'session' | 'settings';

export interface RouteState {
  current: Route;
  params: Record<string, string>;
  history: Route[];
}

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface SyntaxStyle {
  keyword?: string;
  string?: string;
  comment?: string;
  function?: string;
  number?: string;
  operator?: string;
  type?: string;
  variable?: string;
}

export interface Theme {
  name: string;
  author?: string;
  description?: string;
  mode: 'dark' | 'light';
  colors: {
    bg: RGBA;
    fg: RGBA;
    primary: RGBA;
    secondary: RGBA;
    accent: RGBA;
    muted: RGBA;
    error: RGBA;
    warning: RGBA;
    success: RGBA;
    info: RGBA;
    border: RGBA;
    highlight: RGBA;
  };
  syntax: SyntaxStyle;
}

export interface ThemeState {
  current: Theme;
  mode: 'dark' | 'light';
  themes: Record<string, Theme>;
}

export type AgentStatus = 'idle' | 'processing' | 'streaming' | 'error';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  input?: unknown;
  output?: unknown;
  error?: string;
}

export interface AgentState {
  status: AgentStatus;
  messages: Message[];
  currentMessage?: string;
  sessionId: string;
  userId?: string;
}
