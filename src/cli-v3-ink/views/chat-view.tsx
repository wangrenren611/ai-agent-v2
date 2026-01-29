/**
 * Chat View Component
 *
 * Main chat interface with agent integration
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Text } from 'ink';
import type { Agent } from '../../agent';
import { useAgentContext, useMessageContext } from '../context';
import { useAgent } from '../hooks/useAgent';
import { getSelectedModel } from '../utils/helpers';
import { MESSAGES } from '../utils/constants';
import { submitMessage } from '../features/chat/message-handler';
import { findCommand } from '../utils/commands';
import type { Command } from '../types/commands';

// Components
import { Header } from '../components/layout';
import { MessageList } from '../components/message';
import { ChatInput } from '../components/input';
import { Separator } from '../components/layout';

interface ChatViewProps {
  initialMessage?: string | null;
}

const ChatView: React.FC<ChatViewProps> = ({ initialMessage }) => {
  const { model } = useAgentContext();
  const { messages, addMessage, clearMessages, clearStreamingResponse } = useMessageContext();

  // Input state
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>(MESSAGES.LOADING);
  const [ready, setReady] = useState(false);
  const agentRef = useRef<Agent | null>(null);

  // Get current model
  const currentModel = getSelectedModel();

  // Initialize agent
  useAgent({
    selectedModel: model,
    onStateChange: useCallback((state) => {
      setStatus(state.status);
      setReady(state.ready);
    }, []),
    onMessage: addMessage,
    onResponseUpdate: useCallback(() => {
      // Streaming handled by context
    }, []),
    onResponseComplete: useCallback((content: string) => {
      if (content.trim()) {
        addMessage({
          role: 'assistant',
          content,
          timestamp: new Date(),
        });
      }
      clearStreamingResponse();
    }, [addMessage, clearStreamingResponse]),
    onProcessingChange: useCallback((processing) => {
      setIsProcessing(processing);
    }, []),
    onAgentReady: useCallback((newAgent) => {
      agentRef.current = newAgent;
      console.log('[ChatView] Agent ready');
    }, []),
  });

  // Execute command
  const handleCommand = useCallback((command: Command) => {
    setInput('');

    switch (command.id) {
      case 'clear':
        clearMessages();
        addMessage({
          role: 'system',
          content: 'Messages cleared',
          timestamp: new Date(),
        });
        break;
      case 'help':
        addMessage({
          role: 'system',
          content: 'Available commands:\n/model - Select AI model\n/clear - Clear message history\n/help - Show this help\n/exit - Exit application',
          timestamp: new Date(),
        });
        break;
      case 'exit':
        process.exit(0);
      default:
        addMessage({
          role: 'system',
          content: `Command: ${command.name}`,
          timestamp: new Date(),
        });
    }
  }, [clearMessages, addMessage]);

  // Process initial message when agent is ready
  useEffect(() => {
    if (ready && initialMessage && agentRef.current) {
      console.log('[ChatView] Processing initial message:', initialMessage);

      // Handle command
      if (initialMessage.startsWith('/')) {
        const command = findCommand(initialMessage);
        if (command) {
          handleCommand(command);
        } else {
          addMessage({
            role: 'system',
            content: `Unknown command: ${initialMessage}`,
            timestamp: new Date(),
          });
        }
      } else {
        // Submit to agent
        submitMessageAsync(initialMessage);
      }
    }
  }, [ready, initialMessage, handleCommand, addMessage]);

  // Callbacks for submitMessage
  const onStreamUpdate = useCallback(() => {}, []);
  const onProcessingChange = useCallback((processing: boolean) => {
    setIsProcessing(processing);
  }, []);
  const onStatusChange = useCallback((newStatus: string) => {
    setStatus(newStatus);
  }, []);

  // Submit message to agent
  const submitMessageAsync = useCallback(async (content: string) => {
    if (!agentRef.current || !ready) return;

    setInput('');
    setIsProcessing(true);
    setStatus(MESSAGES.THINKING);

    await submitMessage(agentRef.current, content, {
      onMessage: addMessage,
      onStreamUpdate,
      onProcessingChange,
      onStatusChange,
    });
  }, [ready, addMessage, onStreamUpdate, onProcessingChange, onStatusChange]);

  // Handle submit
  const handleSubmit = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || !ready || isProcessing) return;

    // Handle commands
    if (trimmed.startsWith('/')) {
      const command = findCommand(trimmed);
      if (command) {
        handleCommand(command);
      } else {
        addMessage({
          role: 'system',
          content: `Unknown command: ${trimmed}`,
          timestamp: new Date(),
        });
        setInput('');
      }
      return;
    }

    // Submit to agent
    await submitMessageAsync(trimmed);
  }, [ready, isProcessing, handleCommand, submitMessageAsync, addMessage]);

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Header */}
      {ready && <Header model={currentModel} />}

      {/* Loading indicator */}
      {!ready && (
        <Box flexDirection="column"  marginBottom={1}>
          <Text bold color="cyan">AI Agent CLI</Text>
          <Text dimColor>{status || MESSAGES.LOADING}</Text>
        </Box>
      )}

      {/* Messages */}
      {ready && <MessageList messages={messages} currentResponse="" />}

      {/* Status */}
      {ready && isProcessing && (
        <Box  marginBottom={1}>
          <Text dimColor color="yellow">{status}</Text>
        </Box>
      )}

      {/* Separator */}
      <Separator />

      {/* Input */}
      <Box >
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder="Type a message..."
          disabled={!ready || isProcessing}
        />
      </Box>

      {/* Help text */}
      <Box marginBottom={2} >
        <Text dimColor>
          Type / for commands | /help for more | Ctrl+C: Exit
        </Text>
      </Box>
    </Box>
  );
};

export default ChatView;
