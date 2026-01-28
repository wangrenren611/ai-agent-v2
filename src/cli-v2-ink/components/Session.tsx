/**
 * Session Component
 *
 * Main chat interface with Agent integration.
 * Orchestrates all sub-components and manages user input.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import type { SessionProps, ChatMessage } from '../types';
import type { Agent } from '../../agent';
import Header from './Header';
import MessageList from './MessageList';
import StatusIndicator from './StatusIndicator';
import CustomInput from './CustomInput';
import { CommandList } from './CommandList';
import { useAgent } from '../hooks/useAgent';
import { getSelectedModel } from '../utils/helpers';
import { MESSAGES, COLORS, ICONS } from '../utils/constants';
import { PROVIDER_METADATA } from '../../providers/config';
import { Command, matchCommands, findCommand } from '../utils/commands';

const Session: React.FC<SessionProps> = ({ navigate }) => {
  const { exit } = useApp();
  const agentRef = useRef<Agent | null>(null);
  const hasProcessedPendingMessage = useRef(false);
  
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [status, setStatus] = useState('');
  const [ready, setReady] = useState(false);

  // Model selector state
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [modelSelectorIndex, setModelSelectorIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Command list state
  const [showCommandList, setShowCommandList] = useState(false);
  const [commandListIndex, setCommandListIndex] = useState(0);
  
  const selectedModel = getSelectedModel();

  // Match commands based on input
  const matchedCommands = matchCommands(input);

  // Debug logging
  console.log('[Session] Render state:', {
    input,
    showCommandList,
    matchedCommandsCount: matchedCommands.length,
    ready
  });

  // Handle agent state changes
  const handleStateChange = useCallback((state: { status: string; ready: boolean }) => {
    console.log('[Session] State changed:', state);
    setStatus(state.status);
    setReady(state.ready);
  }, []);

  // Handle new messages from agent
  const handleMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
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

  // Handle streaming response updates
  const handleResponseUpdate = useCallback((chunk: string) => {
    setCurrentResponse((prev) => prev + chunk);
  }, []);

  // Handle streaming response complete
  const handleResponseComplete = useCallback((content: string) => {
    if (content.trim()) {
      handleMessage({
        role: 'assistant',
        content: content,
        timestamp: new Date(),
      });
    }
    setCurrentResponse('');
  }, [handleMessage]);

  // Handle processing state changes
  const handleProcessingChange = useCallback((processing: boolean) => {
    setIsProcessing(processing);
  }, []);

  // Handle agent ready
  const handleAgentReady = useCallback((agent: Agent) => {
    console.log('[Session] Agent ready');
    agentRef.current = agent;
    
    // Process pending message from Home page
    if (!hasProcessedPendingMessage.current) {
      hasProcessedPendingMessage.current = true;
      const pendingMessage = (global as any).__pendingMessage;
      if (pendingMessage) {
        console.log('[Session] Processing pending message:', pendingMessage);
        (global as any).__pendingMessage = null;
        
        // Handle commands
        if (pendingMessage.startsWith('/')) {
          const command = findCommand(pendingMessage);
          if (command) {
            executeCommand(command);
            return;
          }
        }
        
        // Send to agent
        setInput('');
        setCurrentResponse('');

        handleMessage({
          role: 'user',
          content: pendingMessage,
          timestamp: new Date(),
        });

        setIsProcessing(true);
        setStatus(MESSAGES.THINKING);

        agent.run(pendingMessage, { stream: true })
          .catch((error: Error) => {
            handleMessage({
              role: 'system',
              content: `Error: ${error.message}`,
              timestamp: new Date(),
            });
            setIsProcessing(false);
            setStatus(MESSAGES.READY);
          });
      }
    }
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

  // Handle model selection
  const handleModelSelect = useCallback(() => {
    const models = Object.values(PROVIDER_METADATA);
    const selectedModelData = models[modelSelectorIndex];

    process.env.AI_MODEL = selectedModelData.defaultModel;

    handleMessage({
      role: 'system',
      content: `Model changed to: ${selectedModelData.name} (${selectedModelData.defaultModel})`,
      timestamp: new Date()
    });

    setShowModelSelector(false);
  }, [modelSelectorIndex, handleMessage]);

  // Handle input change
  const handleInputChange = useCallback((value: string) => {
    console.log('[Session] Input changed:', value);
    setInput(value);

    // Show/hide command list
    if (value.startsWith('/')) {
      console.log('[Session] Showing command list');
      setShowCommandList(true);
      setCommandListIndex(0);
    } else {
      console.log('[Session] Hiding command list');
      setShowCommandList(false);
    }
  }, []);

  // Execute a command
  const executeCommand = useCallback((command: Command) => {
    console.log('[Session] Executing command:', command.name);
    setInput('');
    setShowCommandList(false);

    switch (command.id) {
      case 'model':
        setShowModelSelector(true);
        setModelSelectorIndex(0);
        break;

      case 'settings':
      case 'config':
        navigate('settings');
        break;

      case 'clear':
        setMessages([]);
        handleMessage({
          role: 'system',
          content: 'Messages cleared',
          timestamp: new Date()
        });
        break;

      case 'help':
        handleMessage({
          role: 'system',
          content: 'Available commands:\n/model - Select AI model\n/settings - Open settings page\n/clear - Clear message history\n/help - Show this help\n/exit - Exit application',
          timestamp: new Date()
        });
        break;

      case 'exit':
        exit();
        break;

      default:
        setError(`Unknown command: ${command.name}`);
        setTimeout(() => setError(null), 2000);
    }
  }, [handleMessage, navigate, exit]);

  // Submit message to agent
  const submitMessage = useCallback(() => {
    const trimmedInput = input.trim();

    if (!trimmedInput || !agentRef.current || !ready || isProcessing) {
      return;
    }

    // Handle commands
    if (trimmedInput.startsWith('/')) {
      const command = findCommand(trimmedInput);
      if (command) {
        executeCommand(command);
        return;
      }

      setError(`Unknown command: ${trimmedInput}`);
      setTimeout(() => setError(null), 2000);
      setInput('');
      return;
    }

    // Send to agent
    setInput('');
    setCurrentResponse('');

    handleMessage({
      role: 'user',
      content: trimmedInput,
      timestamp: new Date(),
    });

    setIsProcessing(true);
    setStatus(MESSAGES.THINKING);

    agentRef.current
      .run(trimmedInput, { stream: true })
      .catch((error: Error) => {
        handleMessage({
          role: 'system',
          content: `Error: ${error.message}`,
          timestamp: new Date(),
        });
        setIsProcessing(false);
        setStatus(MESSAGES.READY);
      });
  }, [input, ready, isProcessing, handleMessage, executeCommand]);

  // Handle command list navigation
  const navigateCommandList = useCallback((direction: 'up' | 'down') => {
    if (direction === 'up') {
      setCommandListIndex(prev => (prev > 0 ? prev - 1 : matchedCommands.length - 1));
    } else {
      setCommandListIndex(prev => (prev < matchedCommands.length - 1 ? prev + 1 : 0));
    }
  }, [matchedCommands.length]);

  // Handle model selector navigation
  const navigateModelSelector = useCallback((direction: 'up' | 'down') => {
    const models = Object.values(PROVIDER_METADATA);
    if (direction === 'up') {
      setModelSelectorIndex(prev => (prev > 0 ? prev - 1 : models.length - 1));
    } else {
      setModelSelectorIndex(prev => (prev < models.length - 1 ? prev + 1 : 0));
    }
  }, []);

  // Handle escape
  const handleEscape = useCallback(() => {
    if (showCommandList) {
      setShowCommandList(false);
    } else if (showModelSelector) {
      setShowModelSelector(false);
    } else if (ready) {
      navigate('home');
    }
  }, [showCommandList, showModelSelector, ready, navigate]);
  
  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Header */}
      {ready && <Header model={selectedModel} />}

      {/* Loading indicator */}
      {!ready && (
        <Box flexDirection="column" paddingX={2} marginBottom={1}>
          <Text bold color={COLORS.PRIMARY}>AI Agent CLI</Text>
          <Text dimColor>{status || MESSAGES.LOADING}</Text>
        </Box>
      )}

      {/* Messages */}
      {ready && <MessageList messages={messages} currentResponse={currentResponse} />}
  
      {/* Status Indicator */}
      {ready && <StatusIndicator
        isProcessing={isProcessing}
        status={status}
        currentResponse={currentResponse}
      />}

      {/* Model Selector */}
      {showModelSelector && (
        <Box flexDirection="column" paddingX={2} marginBottom={1}>
          <Box marginBottom={1}>
            <Text color="yellow" bold>Select Model:</Text>
            <Text color="gray"> (↑↓ navigate, Enter select, Esc cancel)</Text>
          </Box>
          <Box flexDirection="column">
            {Object.values(PROVIDER_METADATA).map((metadata, index) => (
              <Box key={metadata.type}>
                {index === modelSelectorIndex ? (
                  <Text color="green">{'>'} </Text>
                ) : (
                  <Text>  </Text>
                )}
                <Text color={index === modelSelectorIndex ? 'green' : 'white'}>
                  {metadata.name}
                </Text>
                <Text color="gray"> - </Text>
                <Text color="cyan">{metadata.defaultModel}</Text>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Command List */}
      {showCommandList && (
        <Box flexDirection="column" paddingX={2} marginBottom={1}>
          <Box marginBottom={1}>
            <Text color="cyan" bold>Commands:</Text>
            <Text color="gray"> (↑↓ navigate, Enter execute, Esc cancel)</Text>
          </Box>
          <CommandList
            keyword={input}
            selectedIndex={commandListIndex}
            onSelect={executeCommand}
          />
        </Box>
      )}

      {/* Error message */}
      {error && (
        <Box paddingX={2} marginBottom={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      {/* Separator */}
      <Box marginBottom={1}>
        <Text dimColor color={COLORS.DIM}>───────────────</Text>
      </Box>

      {/* Input - Always render */}
      <Box paddingX={2}>
        <Text bold color={COLORS.PRIMARY}>{ICONS.INPUT} </Text>
        <Box flexGrow={1}>
          <CustomInput
            value={input}
            onChange={handleInputChange}
            onSubmit={submitMessage}
            placeholder="Type a message or / to see commands..."
            disabled={isProcessing || showModelSelector}
            showCommandList={showCommandList}
            commandListIndex={commandListIndex}
            matchedCommandsLength={matchedCommands.length}
            executeCommand={() => {
              if (matchedCommands[commandListIndex]) {
                executeCommand(matchedCommands[commandListIndex]);
              }
            }}
            navigateCommandList={navigateCommandList}
            onEscape={handleEscape}
            onExit={() => exit()}
          />
        </Box>
      </Box>

      {/* Help text */}
      <Box marginBottom={4}>
        <Text dimColor color={COLORS.DIM}>
          Type / to see commands | /help for more | Ctrl+C: Exit
        </Text>
      </Box>
    </Box>
  );
};

export default Session;
