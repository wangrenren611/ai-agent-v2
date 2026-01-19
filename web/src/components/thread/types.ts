// Message types for thread
export interface UnifiedMessage {
  message_id?: string;
  type: 'user' | 'assistant' | 'tool' | 'browser_state' | 'status';
  content: string;
  metadata?: string;
  created_at?: string;
  updated_at?: string;
  thread_id?: string;
  agent_id?: string;
  sequence?: number;
  is_llm_message?: boolean;
  agents?: {
    name?: string;
    avatar?: string;
  };
}

export interface ParsedMetadata {
  tool_calls?: ToolCall[];
  stream_status?: 'streaming' | 'complete' | 'error';
  model?: string;
  [key: string]: any;
}

export interface ToolCall {
  function_name?: string;
  tool_name?: string;
  tool_call_id?: string;
  arguments?: any;
  arguments_delta?: any;
  completed?: boolean;
  tool_result?: any;
}

export interface StreamingToolCall {
  message_id?: string | null;
  metadata?: string;
  content?: string;
  tool_calls?: ToolCall[];
  completed?: boolean;
}

export interface ThreadContentProps {
  messages: UnifiedMessage[];
  streamingTextContent?: string;
  streamingToolCall?: StreamingToolCall;
  agentStatus: 'idle' | 'running' | 'connecting' | 'error';
  streamHookStatus?: 'streaming' | 'connecting' | 'idle';
  onToolClick?: (messageId: string | null, toolName: string, toolCallId?: string) => void;
  readOnly?: boolean;
}

export interface AgentInfo {
  name: string;
  avatar?: React.ReactNode;
}
