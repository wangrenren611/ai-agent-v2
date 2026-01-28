/**
 * Session Component
 *
 * Main chat interface with Agent integration.
 * Orchestrates all sub-components and manages user input.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import type { SessionProps, ChatMessage } from '../types';
import type { Agent } from '../../agent';
import Header from './Header';
import MessageList from './MessageList';
import CustomInput from './CustomInput';
import { useAgent } from '../hooks/useAgent';
import { getSelectedModel, getSeparatorLength } from '../utils/helpers';
import { MESSAGES, COLORS, ICONS } from '../utils/constants';

const Session: React.FC<SessionProps> = ({ navigate }) => {
  const { exit } = useApp();
  const agentRef = useRef<Agent | null>(null);


  const [input, setInput] = useState('');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [status, setStatus] = useState('');
  const [ready, setReady] = useState(false);

  const selectedModel = getSelectedModel();

  // Handle agent state changes
  const handleStateChange = useCallback((state: { status: string; ready: boolean }) => {
    setStatus(state.status);
    setReady(state.ready);
  }, []);

  // Handle new messages from agent
  const handleMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      // For tool-call messages with 'success' or 'error' status,
      // update the existing 'calling' message instead of adding a new one
      if (message.role === 'tool-call' &&
          (message.toolStatus === 'success' || message.toolStatus === 'error')) {
        const lastIndex = prev.findLastIndex(m =>
          m.role === 'tool-call' &&
          m.toolName === message.toolName &&
          m.toolStatus === 'calling'
        );

        if (lastIndex !== -1) {
          // Update the existing message
          const updated = [...prev];
          updated[lastIndex] = message;
          return updated;
        }
      }

      // Add new message
      return [...prev, message];
    });
  }, []);

  // Handle streaming response updates
  const handleResponseUpdate = useCallback((chunk: string) => {
    setCurrentResponse((prev) => prev + chunk);
  }, []);

  // Handle streaming response complete - add final message to history
  const handleResponseComplete = useCallback((content: string) => {
    if (content.trim()) {
      handleMessage({
        role: 'assistant',
        content: content,
        timestamp: new Date(),
      });
    }
    // Clear current response after adding to history
    setCurrentResponse('');
  }, [handleMessage]);

  // Handle processing state changes
  const handleProcessingChange = useCallback((processing: boolean) => {
    setIsProcessing(processing);
  }, []);

  // Handle agent ready
  const handleAgentReady = useCallback((agent: Agent) => {
    agentRef.current = agent;
  }, []);

  // Initialize agent
  useAgent({
    selectedModel,
    onStateChange: handleStateChange,
    onMessage: handleMessage,
    onResponseUpdate: handleResponseUpdate,
    onResponseComplete: handleResponseComplete,
    onProcessingChange: handleProcessingChange,
    onAgentReady: handleAgentReady,
  });

  // Submit message to agent
  const submitMessage = useCallback((text: string) => {
    if (!agentRef.current || !ready || isProcessing) {
      return;
    }

    setInput('');
    setCurrentResponse('');

    handleMessage({
      role: 'user',
      content: text,
      timestamp: new Date(),
    });

    setIsProcessing(true);
    setStatus(MESSAGES.THINKING);

    agentRef.current
      .run(text, { stream: true })
      .catch((error: Error) => {
        handleMessage({
          role: 'system',
          content: `Error: ${error.message}`,
          timestamp: new Date(),
        });
        setIsProcessing(false);
        setStatus(MESSAGES.READY);
      });
  }, [ready, isProcessing, handleMessage]);


 // Handle Escape key to return to home
 // This doesn't interfere with TextInput because we only handle Escape
 useInput((inputChar: string, key: any) => {
 if (key.escape) {
 navigate('home');
 return;
 }
 });

  // Loading state
  if (!ready) {
    return (
      <Box flexDirection="column" paddingX={2}>
        <Text bold color={COLORS.PRIMARY}>AI Agent CLI</Text>
        <Text dimColor>{status || MESSAGES.LOADING}</Text>
      </Box>
    );
  }

  const separatorLength = getSeparatorLength();

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Header isProcessing={isProcessing} status={status} model={selectedModel} />

      {/* Messages area */}
      <MessageList messages={messages} currentResponse={currentResponse} />

      {/* Separator */}
      <Box>
        <Text dimColor color={COLORS.DIM}>{'─'.repeat(separatorLength)}</Text>
      </Box>

      {/* Input area */}
      <Box>
        <Text bold color={COLORS.PRIMARY}>{ICONS.USER} </Text>
        <Box flexGrow={1}>
          <CustomInput
            value={input}
            onChange={setInput}
            onSubmit={submitMessage}
            placeholder="Type your message..."
            disabled={isProcessing}
            onExit={exit}
          />
        </Box>
      </Box>

      {/* Help text */}
      <Box>
        <Text dimColor color={COLORS.DIM}>←→: Move cursor | Backspace/Delete: Delete | Esc: Back | Ctrl+C: Exit</Text>
      </Box>
    </Box>
  );
};

export default Session;
