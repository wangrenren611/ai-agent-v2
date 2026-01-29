/**
 * Message Context
 *
 * Manages chat messages and streaming responses
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ChatMessage } from '../types';

export interface MessageContextValue {
  messages: ChatMessage[];
  currentResponse: string;
  isStreaming: boolean;
  addMessage: (message: ChatMessage) => void;
  updateStreamingResponse: (chunk: string) => void;
  clearMessages: () => void;
  clearStreamingResponse: () => void;
}

const MessageContext = createContext<MessageContextValue | undefined>(undefined);

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => {
      // Update existing tool-call message if status changes
      if (message.role === 'tool-call' &&
          (message.toolStatus === 'success' || message.toolStatus === 'error')) {
        const lastIndex = prev.findLastIndex(m =>
          m.role === 'tool-call' &&
          m.toolName === message.toolName &&
          m.toolStatus === 'calling'
        );

        if (lastIndex !== -1) {
          const updated = [...prev];
          updated[lastIndex] = message;
          return updated;
        }
      }
      return [...prev, message];
    });
  }, []);

  const updateStreamingResponse = useCallback((chunk: string) => {
    setCurrentResponse(prev => prev + chunk);
    setIsStreaming(true);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const clearStreamingResponse = useCallback(() => {
    setCurrentResponse('');
    setIsStreaming(false);
  }, []);

  const value: MessageContextValue = {
    messages,
    currentResponse,
    isStreaming,
    addMessage,
    updateStreamingResponse,
    clearMessages,
    clearStreamingResponse,
  };

  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>;
};

export const useMessageContext = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessageContext must be used within MessageProvider');
  }
  return context;
};
