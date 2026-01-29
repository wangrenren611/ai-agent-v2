/**
 * Chat Container Component
 *
 * Main chat interface with agent integration
 */

import React, { useState, useCallback, useRef } from 'react';
import { Box, Text } from 'ink';
import type { Agent } from '../../../agent';
import { useAgentContext, useMessageContext, useUIContext } from '../../context';
import { useAgent, useCommands } from '../../hooks';
import { getSelectedModel } from '../../utils/helpers';
import { submitMessage } from './message-handler';
import { matchCommands } from '../../utils/commands';
import type { Command } from '../../types/commands';

// Components
import { Header } from '../../components/layout';
import { MessageList } from '../../components/message';
import { ChatInput, CommandPalette } from '../../components/input';
import { Separator } from '../../components/layout';

const ChatContainer: React.FC = () => {
  const { model, setModel, ready } = useAgentContext();
  const { messages, addMessage, clearMessages, clearStreamingResponse } = useMessageContext();
  const { modal, openModal, closeModal, setModalIndex } = useUIContext();

  // Input state
  const [input, setInput] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const agentRef = useRef<Agent | null>(null);

  // Get current model
  const currentModel = getSelectedModel();

  // Initialize agent
  const agent = useAgent({
    selectedModel: model,
    onStateChange: useCallback((state) => {
      console.log('[ChatContainer] State changed:', state);
    }, []),
    onMessage: addMessage,
    onResponseUpdate: useCallback((chunk: string) => {
      // Handled by MessageContext
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
    onProcessingChange: useCallback((processing: boolean) => {
      // Update UI state
    }, []),
    onAgentReady: useCallback((newAgent) => {
      agentRef.current = newAgent;
    }, []),
  });

  // Command handling
  const { matchedCommands, handleCommand, isCommand } = useCommands({
    input,
    onExecuteCommand: useCallback((command: Command) => {
      executeCommand(command);
    }, []),
    onClearMessages: useCallback(() => {
      clearMessages();
    }, [clearMessages]),
    onExit: useCallback(() => {
      process.exit(0);
    }, []),
  });

  // Execute command
  const executeCommand = useCallback((command: Command) => {
    setInput('');
    closeModal();

    switch (command.id) {
      case 'model':
        openModal('model-selector');
        break;
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
        break;
    }
  }, [clearMessages, addMessage, openModal, closeModal]);

  // Submit message
  const handleSubmit = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || !agentRef.current) return;

    // Handle commands
    if (trimmed.startsWith('/')) {
      const handled = handleCommand(trimmed);
      if (!handled) {
        addMessage({
          role: 'system',
          content: `Unknown command: ${trimmed}`,
          timestamp: new Date(),
        });
      }
      setInput('');
      return;
    }

    // Submit to agent
    setInput('');
    await submitMessage(agentRef.current, trimmed, {
      onMessage: addMessage,
      onStreamUpdate: useCallback(() => {}, []),
      onProcessingChange: useCallback(() => {}, []),
      onStatusChange: useCallback(() => {}, []),
    });
  }, [agentRef, handleCommand, addMessage]);

  // Handle input change
  const handleChange = useCallback((value: string) => {
    setInput(value);
    if (value.startsWith('/') && !modal.open) {
      setSelectedIndex(0);
    }
  }, [modal.open]);

  // Navigate lists
  const handleNavigate = useCallback((direction: 'up' | 'down') => {
    const length = modal.type === 'command-palette'
      ? matchCommands(input).length
      : Object.keys(require('../../../providers/provider-registry').PROVIDER_METADATA).length;

    if (direction === 'up') {
      setModalIndex(selectedIndex > 0 ? selectedIndex - 1 : length - 1);
    } else {
      setModalIndex(selectedIndex < length - 1 ? selectedIndex + 1 : 0);
    }
  }, [input, selectedIndex, modal.type, setModalIndex]);

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Header */}
      {ready && <Header model={currentModel} />}

      {/* Messages */}
      {ready && <MessageList messages={messages} currentResponse="" />}

      {/* Modals */}
      <CommandPalette
        open={modal.type === 'command-palette' && modal.open}
        input={input}
        selectedIndex={selectedIndex}
        onSelect={executeCommand}
      />

      {/* Separator */}
      <Separator />

      {/* Input */}
      <Box>
        <ChatInput
          value={input}
          onChange={handleChange}
          onSubmit={handleSubmit}
          placeholder="Type a message or / to see commands..."
          disabled={!ready}
        />
      </Box>

      {/* Help text */}
      <Box marginBottom={2} >
        <Text dimColor>
          Type / to see commands | /help for more | Ctrl+C: Exit
        </Text>
      </Box>
    </Box>
  );
};

export default ChatContainer;
