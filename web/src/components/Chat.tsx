'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Message } from '@agent/providers/base';
import { ChatRequest } from '../lib/types';
import MessageList from './MessageList';
import InputBox from './InputBox';
import SessionInfo from './SessionInfo';

interface AgentEvent {
  type: string;
  data: { content?: string; error?: string; [key: string]: unknown };
  timestamp: number;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userId] = useState(() => `user_${Date.now()}`);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch messages for current session
  const fetchMessages = useCallback(async () => {
    if (!currentSessionId) return;
    try {
      const res = await fetch(`/api/messages/${currentSessionId}`);
      if (res.ok) {
        const data = (await res.json()) as { messages: Message[] };
        setMessages(data.messages);
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
      }
    } catch (error) {
      console.error('Failed to clear messages:', error);
    }
  }, [currentSessionId]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!currentSessionId || isLoading) return;

    setIsLoading(true);

    // Optimistically add user message
    const userMessage: Message = {
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
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content,
        type: 'text',
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
        type: 'text',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [currentSessionId, isLoading, userId]);

  // Setup SSE event listener
  useEffect(() => {
    if (!currentSessionId) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Create new EventSource
    const eventSource = new EventSource(`/api/events?sessionId=${currentSessionId}`);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('message', (e) => {
      try {
        const event = JSON.parse(e.data) as AgentEvent;
        console.log('Agent event:', event);
        // Handle real-time events if needed
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
      <MessageList messages={messages} isLoading={isLoading} />
      <InputBox onSend={sendMessage} disabled={isLoading || !currentSessionId} />
    </div>
  );
}
