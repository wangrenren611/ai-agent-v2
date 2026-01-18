'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Message } from '@agent/providers/base';
import { ChatRequest, ExtendedMessage, ThinkingStep, TodoItem } from '../lib/types';
import MessageList from './MessageList';
import InputBox from './InputBox';
import SessionInfo from './SessionInfo';

export default function Chat() {
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentThinkingSteps, setCurrentThinkingSteps] = useState<ThinkingStep[]>([]);
  const [currentTodos, setCurrentTodos] = useState<TodoItem[]>([]);
  const [userId] = useState(() => `user_${Date.now()}`);
  const eventSourceRef = useRef<EventSource | null>(null);
  const processingRef = useRef(false);

  // Fetch messages for current session
  const fetchMessages = useCallback(async () => {
    if (!currentSessionId) return;
    try {
      const res = await fetch(`/api/messages/${currentSessionId}`);
      if (res.ok) {
        const data = (await res.json()) as { messages: Message[] };
        setMessages(data.messages as ExtendedMessage[]);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, [currentSessionId]);

  // Create new session
  const createNewSession = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { sessionId: string };
        setCurrentSessionId(data.sessionId);
        setMessages([]);
        setCurrentThinkingSteps([]);
        setCurrentTodos([]);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  }, [userId]);

  // Clear messages in current session
  const clearMessages = useCallback(async () => {
    if (!currentSessionId) return;
    try {
      const res = await fetch(`/api/messages/${currentSessionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMessages([]);
        setCurrentThinkingSteps([]);
        setCurrentTodos([]);
      }
    } catch (error) {
      console.error('Failed to clear messages:', error);
    }
  }, [currentSessionId]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!currentSessionId || isLoading || processingRef.current) return;

    setIsLoading(true);
    processingRef.current = true;

    // Reset current thinking steps and todos
    setCurrentThinkingSteps([]);
    setCurrentTodos([]);

    // Optimistically add user message
    const userMessage: ExtendedMessage = {
      role: 'user',
      content,
      type: 'text',
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const req: ChatRequest = {
        sessionId: currentSessionId,
        query: content,
        userId,
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = (await res.json()) as { content: string };
      const assistantMessage: ExtendedMessage = {
        role: 'assistant',
        content: data.content,
        type: 'text',
        thinkingSteps: currentThinkingSteps.length > 0 ? [...currentThinkingSteps] : undefined,
        todos: currentTodos.length > 0 ? [...currentTodos] : undefined,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: ExtendedMessage = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
        type: 'text',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      processingRef.current = false;
    }
  }, [currentSessionId, isLoading, userId, currentThinkingSteps, currentTodos]);

  // Setup SSE event listener
  useEffect(() => {
    if (!currentSessionId) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Create new EventSource
    const eventSource = new EventSource('/api/events');
    eventSourceRef.current = eventSource;

    // Helper to generate step ID
    const generateStepId = () => `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Agent run start
    eventSource.addEventListener('agent.run.start', (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log('Agent run start:', data);
        setCurrentThinkingSteps([]);
        setCurrentTodos([]);
      } catch (error) {
        console.error('Failed to parse event:', error);
      }
    });

    // Loop start (thinking start)
    eventSource.addEventListener('agent.loop.start', (e) => {
      try {
        const data = JSON.parse(e.data);
        const step: ThinkingStep = {
          id: generateStepId(),
          type: 'thinking',
          content: `Thinking iteration ${data.iteration}/${data.maxLoop}...`,
          iteration: data.iteration,
          timestamp: Date.now(),
        };
        setCurrentThinkingSteps((prev) => [...prev, step]);
      } catch (error) {
        console.error('Failed to parse event:', error);
      }
    });

    // LLM call start
    eventSource.addEventListener('agent.llm.call.start', (e) => {
      try {
        const data = JSON.parse(e.data);
        const step: ThinkingStep = {
          id: generateStepId(),
          type: 'thinking',
          content: `Calling LLM model: ${data.model}`,
          iteration: data.iteration,
          timestamp: Date.now(),
        };
        setCurrentThinkingSteps((prev) => [...prev, step]);
      } catch (error) {
        console.error('Failed to parse event:', error);
      }
    });

    // LLM call complete
    eventSource.addEventListener('agent.llm.call.complete', (e) => {
      try {
        const data = JSON.parse(e.data);
        const step: ThinkingStep = {
          id: generateStepId(),
          type: 'thinking',
          content: `LLM response received (${data.duration}ms)`,
          iteration: data.iteration,
          timestamp: Date.now(),
          duration: data.duration,
        };
        setCurrentThinkingSteps((prev) => [...prev, step]);
      } catch (error) {
        console.error('Failed to parse event:', error);
      }
    });

    // Tool call start
    eventSource.addEventListener('agent.tool.call.start', (e) => {
      try {
        const data = JSON.parse(e.data);
        const step: ThinkingStep = {
          id: generateStepId(),
          type: 'tool_call',
          content: `Calling tool: ${data.toolName}`,
          toolName: data.toolName,
          toolParams: data.params,
          iteration: data.iteration,
          timestamp: Date.now(),
        };
        setCurrentThinkingSteps((prev) => [...prev, step]);
      } catch (error) {
        console.error('Failed to parse event:', error);
      }
    });

    // Tool call complete
    eventSource.addEventListener('agent.tool.call.complete', (e) => {
      try {
        const data = JSON.parse(e.data);
        const step: ThinkingStep = {
          id: generateStepId(),
          type: 'tool_result',
          content: `Tool ${data.toolName} completed (${data.duration}ms)`,
          toolName: data.toolName,
          toolResult: data.result,
          iteration: data.iteration,
          timestamp: Date.now(),
          duration: data.duration,
        };
        setCurrentThinkingSteps((prev) => [...prev, step]);
      } catch (error) {
        console.error('Failed to parse event:', error);
      }
    });

    // Tool call error
    eventSource.addEventListener('agent.tool.call.error', (e) => {
      try {
        const data = JSON.parse(e.data);
        const step: ThinkingStep = {
          id: generateStepId(),
          type: 'tool_result',
          content: `Tool ${data.toolName} error: ${data.error.message || String(data.error)}`,
          toolName: data.toolName,
          iteration: data.iteration,
          timestamp: Date.now(),
        };
        setCurrentThinkingSteps((prev) => [...prev, step]);
      } catch (error) {
        console.error('Failed to parse event:', error);
      }
    });

    // Message added
    eventSource.addEventListener('agent.message.added', (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log('Message added:', data);
      } catch (error) {
        console.error('Failed to parse event:', error);
      }
    });

    // Agent run complete
    eventSource.addEventListener('agent.run.complete', (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log('Agent run complete:', data);
      } catch (error) {
        console.error('Failed to parse event:', error);
      }
    });

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [currentSessionId]);

  // Initialize session on mount
  useEffect(() => {
    createNewSession();
  }, [createNewSession]);

  // Fetch messages when session changes
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-zinc-950">
      <SessionInfo
        currentSessionId={currentSessionId}
        messageCount={messages.length}
        onClearMessages={clearMessages}
        onNewSession={createNewSession}
      />
      <MessageList
        messages={messages}
        isLoading={isLoading}
        thinkingSteps={currentThinkingSteps}
        todos={currentTodos}
      />
      <InputBox onSend={sendMessage} disabled={isLoading || !currentSessionId} />
    </div>
  );
}
