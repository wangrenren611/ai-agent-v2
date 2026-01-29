/**
 * Message Handler
 *
 * Processes messages from the agent
 */

import type { ChatMessage } from '../../types';
import type { Agent } from '../../../agent';
import { formatToolArgs, formatToolOutput } from '../../utils/formatters';

export type MessageCallback = (message: ChatMessage) => void;
export type StreamCallback = (chunk: string) => void;
export type ProcessingCallback = (processing: boolean) => void;
export type StatusCallback = (status: string) => void;

export interface MessageHandlerCallbacks {
  onMessage: MessageCallback;
  onStreamUpdate: StreamCallback;
  onProcessingChange: ProcessingCallback;
  onStatusChange: StatusCallback;
}

/**
 * Create message handler for agent events
 */
export function createMessageHandler(
  agent: Agent,
  callbacks: MessageHandlerCallbacks
): () => void {
  const { onMessage, onStreamUpdate, onProcessingChange, onStatusChange } = callbacks;

  // Stream chunk handler
  const handleStreamChunk = (data: any) => {
    if (data?.content) {
      onStreamUpdate(data.content);
    }
  };

  // Complete handler
  const handleComplete = (data: any) => {
    const content = data?.response?.content || '';
    if (content.trim()) {
      onMessage({
        role: 'assistant',
        content,
        timestamp: new Date(),
      });
    }
    onProcessingChange(false);
    onStatusChange('Ready');
  };

  // Error handler
  const handleError = (data: any) => {
    const errorMsg = data?.error?.message || 'Unknown error occurred';
    onMessage({
      role: 'system',
      content: `Error: ${errorMsg}`,
      timestamp: new Date(),
    });
    onProcessingChange(false);
    onStatusChange('Ready');
  };

  // Thinking handler
  const handleThinking = (data: any) => {
    if (data?.step !== undefined) {
      onStatusChange(`Thinking (step ${data.step})...`);
    }
  };

  // Tool call handler
  const handleToolCall = (data: any) => {
    if (data?.toolName) {
      onMessage({
        role: 'tool-call',
        content: '',
        toolName: data.toolName,
        toolArgs: formatToolArgs(data.args),
        toolStatus: 'calling',
        timestamp: new Date(),
      });
    }
  };

  // Tool result handler
  const handleToolResult = (data: any) => {
    if (data?.toolName) {
      const success = data.result?.success !== false;
      const output = data.result?.data
        ? formatToolOutput(data.result.data)
        : '';

      onMessage({
        role: 'tool-call',
        content: '',
        toolName: data.toolName,
        toolArgs: formatToolArgs(data.args),
        toolStatus: success ? 'success' : 'error',
        toolOutput: success ? output : `Error: ${data.result?.error || 'Failed'}`,
        timestamp: new Date(),
      });
    }
  };

  // Register listeners
  agent.on('stream-chunk', handleStreamChunk);
  agent.on('complete', handleComplete);
  agent.on('error', handleError);
  agent.on('thinking', handleThinking);
  agent.on('tool-call', handleToolCall);
  agent.on('tool-result', handleToolResult);

  // Return cleanup function (no-op if Agent doesn't support removal)
  return () => {
    // Agent listeners persist for component lifetime
  };
}

/**
 * Submit user message to agent
 */
export async function submitMessage(
  agent: Agent,
  content: string,
  callbacks: MessageHandlerCallbacks
): Promise<void> {
  const { onMessage, onProcessingChange, onStatusChange } = callbacks;

  // Add user message
  onMessage({
    role: 'user',
    content,
    timestamp: new Date(),
  });

  // Update state
  onProcessingChange(true);
  onStatusChange('Thinking...');

  // Run agent
  try {
    await agent.run(content, { stream: true });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    onMessage({
      role: 'system',
      content: `Error: ${errorMsg}`,
      timestamp: new Date(),
    });
    onProcessingChange(false);
    onStatusChange('Ready');
  }
}
