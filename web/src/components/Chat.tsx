'use client';

import { useEffect, useCallback, useRef } from 'react';
import { Message } from '@agent/providers/base';
import { ChatRequest } from '../lib/types';
import { ThreadContent } from './thread/ThreadContent';
import { UnifiedMessage } from './thread/types';
import InputBox from './InputBox';
import SessionInfo from './SessionInfo';
import { useChatStore } from '../lib/stores/chat-store';
import { useStreamStore } from '../lib/stores/stream-store';
import { chatApi, sessionsApi } from '../lib/api/endpoints';
import { toast } from 'sonner';

/**
 * Helper to generate unique IDs
 */
const generateId = () => `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

/**
 * Convert Message to UnifiedMessage
 */
function toUnifiedMessage(msg: Message, idx: number): UnifiedMessage {
  return {
    message_id: `msg-${idx}`,
    type: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content,
    metadata: JSON.stringify({
      type: msg.type,
    }),
    created_at: new Date().toISOString(),
  };
}

export default function Chat() {
  // Zustand stores
  const {
    messages,
    currentSessionId,
    isLoading,
    agentStatus,
    userId,
    setMessages,
    addMessage,
    updateMessage,
    setCurrentSessionId,
    setIsLoading,
    setAgentStatus,
    setUserId,
    setProcessingMessage,
    clearMessages,
  } = useChatStore();

  const {
    streamingTextContent,
    streamingToolCall,
    streamStatus,
    currentMessageId,
    appendToStreamingContent,
    setStreamingToolCall,
    setStreamStatus,
    setCurrentMessageId,
    resetStream,
  } = useStreamStore();

  const eventSourceRef = useRef<EventSource | null>(null);
  const userIdInitializedRef = useRef(false);

  // Initialize userId once on mount (avoids hydration mismatch)
  useEffect(() => {
    if (!userIdInitializedRef.current) {
      setUserId(`user_${Date.now()}`);
      userIdInitializedRef.current = true;
    }
  }, [setUserId]);

  // Fetch messages for current session
  const fetchMessages = useCallback(async () => {
    if (!currentSessionId) return;
    try {
      const data = await chatApi.getMessages(currentSessionId);
      const unifiedMessages = data.messages.map(toUnifiedMessage);
      setMessages(unifiedMessages);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast.error('Failed to load messages');
    }
  }, [currentSessionId, setMessages]);

  // Create new session
  const createNewSession = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await sessionsApi.createSession({ userId });
      setCurrentSessionId(data.sessionId);
      setMessages([]);
      clearMessages();
      resetStream();
    } catch (error) {
      console.error('Failed to create session:', error);
      toast.error('Failed to create new session');
    }
  }, [userId, setCurrentSessionId, setMessages, clearMessages, resetStream]);

  // Clear messages in current session
  const clearMessagesHandler = useCallback(async () => {
    if (!currentSessionId) return;
    try {
      await chatApi.clearMessages(currentSessionId);
      setMessages([]);
      toast.success('Messages cleared');
    } catch (error) {
      console.error('Failed to clear messages:', error);
      toast.error('Failed to clear messages');
    }
  }, [currentSessionId, setMessages]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!currentSessionId || isLoading) return;

    setIsLoading(true);
    setProcessingMessage(true);
    setAgentStatus('running');
    setStreamStatus('connecting');
    resetStream();

    // Generate unique ID for the assistant message
    const assistantMessageId = `msg_${generateId()}`;
    setCurrentMessageId(assistantMessageId);

    // Optimistically add user message
    addMessage({
      message_id: `user-${generateId()}`,
      type: 'user',
      content,
      created_at: new Date().toISOString(),
    });

    // Immediately add a placeholder assistant message for streaming display
    addMessage({
      message_id: assistantMessageId,
      type: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    });

    try {
      const req: ChatRequest = {
        sessionId: currentSessionId,
        query: content,
        userId,
      };

      const data = await chatApi.sendMessage(req);
      // Update the assistant message with final content
      updateMessage(assistantMessageId, { content: data.content });
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      updateMessage(assistantMessageId, { content: `Error: ${errorMessage}` });
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
      setProcessingMessage(false);
      setAgentStatus('idle');
      setStreamStatus('idle');
      setCurrentMessageId(null);
    }
  }, [currentSessionId, isLoading, userId, setIsLoading, setProcessingMessage, setAgentStatus, setStreamStatus, resetStream, setCurrentMessageId, addMessage, updateMessage]);

  // Setup SSE event listener
  useEffect(() => {
    if (!currentSessionId) return;

    console.log('[Chat] Setting up SSE for session:', currentSessionId);

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Create new EventSource
    const eventSource = new EventSource('/api/events');
    eventSourceRef.current = eventSource;

    // Connection opened
    eventSource.addEventListener('open', () => {
      console.log('[Chat] SSE connection opened');
    });

    // Connection message
    eventSource.addEventListener('connected', (e) => {
      console.log('[Chat] SSE connected event received:', e.data);
    });

    // Generic message handler for debugging
    eventSource.addEventListener('message', (e) => {
      console.log('[Chat] SSE message received (no event type):', e.data);
    });

    // Helper to generate step ID
    const generateStepId = () => `step_${generateId()}`;

    // Agent run start
    eventSource.addEventListener('agent.run.start', (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log('[Chat] Agent run start:', data);
        setAgentStatus('running');
        setStreamStatus('streaming');
      } catch (error) {
        console.error('[Chat] Failed to parse event:', error);
      }
    });

    // LLM call start
    eventSource.addEventListener('agent.llm.call.start', (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log('[Chat] LLM call start:', data);
        setStreamStatus('streaming');
      } catch (error) {
        console.error('[Chat] Failed to parse event:', error);
      }
    });

    // LLM call complete
    eventSource.addEventListener('agent.llm.call.complete', (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log('[Chat] LLM call complete, response length:', data.response?.length || 0);
        appendToStreamingContent(data.response || '');
      } catch (error) {
        console.error('[Chat] Failed to parse event:', error);
      }
    });

    // Tool call start
    eventSource.addEventListener('agent.tool.call.start', (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log('[Chat] Tool call start:', data.toolName);
        setStreamingToolCall({
          message_id: currentMessageId,
          metadata: JSON.stringify({
            tool_calls: [{
              function_name: data.toolName,
              arguments: data.params,
              tool_call_id: `tool-${generateStepId()}`,
            }],
          }),
        });
      } catch (error) {
        console.error('[Chat] Failed to parse event:', error);
      }
    });

    // Tool call complete
    eventSource.addEventListener('agent.tool.call.complete', (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log('[Chat] Tool call complete:', data.toolName);
        setStreamingToolCall({
          message_id: currentMessageId,
          metadata: JSON.stringify({
            tool_calls: [{
              function_name: data.toolName,
              tool_call_id: `tool-${generateStepId()}`,
              completed: true,
              tool_result: data.result,
            }],
          }),
        });
      } catch (error) {
        console.error('[Chat] Failed to parse event:', error);
      }
    });

    // Agent run complete
    eventSource.addEventListener('agent.run.complete', (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log('[Chat] Agent run complete:', data);
        setAgentStatus('idle');
        setStreamStatus('idle');

        // Update the placeholder message with the accumulated streaming content
        if (currentMessageId) {
          updateMessage(currentMessageId, { content: data.response || '' });
        }

        resetStream();
      } catch (error) {
        console.error('[Chat] Failed to parse event:', error);
      }
    });

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [currentSessionId, currentMessageId, setAgentStatus, setStreamStatus, appendToStreamingContent, setStreamingToolCall, updateMessage, resetStream]);

  // Initialize session on mount
  useEffect(() => {
    if (userId && !currentSessionId) {
      createNewSession();
    }
  }, [userId, currentSessionId, createNewSession]);

  // Fetch messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      fetchMessages();
    }
  }, [currentSessionId, fetchMessages]);

  // Tool click handler
  const handleToolClick = useCallback((
    messageId: string | null,
    toolName: string,
    toolCallId?: string
  ) => {
    console.log('Tool clicked:', { messageId, toolName, toolCallId });
    // TODO: Show tool details modal
  }, []);

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-zinc-950">
      <SessionInfo
        currentSessionId={currentSessionId}
        messageCount={messages.length}
        onClearMessages={clearMessagesHandler}
        onNewSession={createNewSession}
      />
      <ThreadContent
        messages={messages}
        streamingTextContent={streamingTextContent}
        streamingToolCall={streamingToolCall}
        agentStatus={agentStatus}
        streamHookStatus={streamStatus}
        onToolClick={handleToolClick}
        agentName="AI Agent"
      />
      <InputBox onSend={sendMessage} disabled={isLoading || !currentSessionId} />
    </div>
  );
}
