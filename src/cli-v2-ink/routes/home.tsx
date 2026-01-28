/**
 * Home Route (Ink-based)
 *
 * Landing screen - type any message to start chatting
 */

import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import type { RouteContextValue } from '../context/route';
import { ICONS, COLORS } from '../utils/constants';
import { CustomInput } from '../components';
import { CommandList } from '../components/CommandList';
import { Command, matchCommands, findCommand } from '../utils/commands';

interface HomeProps {
  navigate: RouteContextValue['navigate'];
}

const Home: React.FC<HomeProps> = ({ navigate }) => {
  const [input, setInput] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [showCommandList, setShowCommandList] = useState(false);
  const [commandListIndex, setCommandListIndex] = useState(0);

  const getCurrentModel = () =>
    (global as any).__selectedModel ||
    process.env.AI_MODEL ||
    'gpt-4o';

  const [currentModel, setCurrentModel] = useState<string>(getCurrentModel());

  // Match commands based on input
  const matchedCommands = matchCommands(input);

  // Execute a command
  const executeCommand = useCallback((command: Command) => {
    console.log('[Home] Executing command:', command.name);
    setInput('');
    setShowCommandList(false);

    switch (command.id) {
      case 'model':
        setNotice('请使用 "model <name>" 格式切换模型，例如: model gpt-4o-mini');
        setTimeout(() => setNotice(null), 3000);
        break;

      case 'settings':
      case 'config':
        navigate('settings');
        break;

      case 'clear':
        setNotice('消息历史已在会话页面清空');
        setTimeout(() => setNotice(null), 2000);
        break;

      case 'help':
        setNotice('可用命令: /model, /settings, /clear, /help, /exit');
        setTimeout(() => setNotice(null), 3000);
        break;

      case 'exit':
        process.exit(0);
        break;

      default:
        setNotice(`未知命令: ${command.name}`);
        setTimeout(() => setNotice(null), 2000);
    }
  }, [navigate]);

  // Handle input change
  const handleInputChange = useCallback((value: string) => {
    console.log('[Home] Input changed:', value);
    setInput(value);

    // Show/hide command list
    if (value.startsWith('/')) {
      console.log('[Home] Showing command list');
      setShowCommandList(true);
      setCommandListIndex(0);
    } else {
      console.log('[Home] Hiding command list');
      setShowCommandList(false);
    }
  }, []);

  // Handle command list navigation
  const navigateCommandList = useCallback((direction: 'up' | 'down') => {
    if (direction === 'up') {
      setCommandListIndex(prev => (prev > 0 ? prev - 1 : matchedCommands.length - 1));
    } else {
      setCommandListIndex(prev => (prev < matchedCommands.length - 1 ? prev + 1 : 0));
    }
  }, [matchedCommands.length]);

  // Handle escape
  const handleEscape = useCallback(() => {
    if (showCommandList) {
      setShowCommandList(false);
    }
  }, [showCommandList]);

  const handleSubmit = (text: string) => {
    const trimmedInput = text.trim();

    if (!trimmedInput) {
      setInput('');
      return;
    }

    // If command list is shown, execute selected command
    if (showCommandList && matchedCommands[commandListIndex]) {
      executeCommand(matchedCommands[commandListIndex]);
      return;
    }

    // Quick command: set model
    if (trimmedInput.toLowerCase().startsWith('model ')) {
      const model = trimmedInput.slice(6).trim();
      if (model) {
        (global as any).__selectedModel = model;
        setCurrentModel(model);
        setNotice(`已切换模型为: ${model}`);
      } else {
        setNotice('请输入模型名称，例如: model gpt-4o-mini');
      }
      setInput('');
      return;
    }

    // Check for quit command
    if (trimmedInput.toLowerCase() === 'q' || trimmedInput.toLowerCase() === 'quit') {
      process.exit(0);
      return;
    }

    // Navigate to session with the message
    // Store the message in sessionStorage equivalent (using a global for simplicity)
    (global as any).__pendingMessage = trimmedInput;
    navigate('session');
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color={COLORS.PRIMARY}>Welcome to AI Agent v2</Text>
      </Box>
      <Box marginBottom={2}>
        <Text dimColor>Type a message to start chatting</Text>
      </Box>
      <Box marginBottom={1}>
        <Text dimColor>当前模型: </Text>
        <Text bold>{currentModel}</Text>
        <Text dimColor>  (输入 "model &lt;name&gt;" 切换)</Text>
      </Box>
      {notice && (
        <Box marginBottom={1}>
          <Text color={COLORS.WARNING}>{notice}</Text>
        </Box>
      )}
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text dimColor>Press </Text>
          <Text bold>q</Text>
          <Text dimColor> to quit</Text>
        </Box>
        <Box>
          <Text dimColor>Type </Text>
          <Text bold>/</Text>
          <Text dimColor> to see commands</Text>
        </Box>
      </Box>

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

      <Box marginTop={2} flexDirection="column">
        <Box>
          <Text color={COLORS.PRIMARY} bold>{ICONS.INPUT}</Text>
          <CustomInput
            value={input}
            onChange={handleInputChange}
            onSubmit={handleSubmit}
            placeholder="Type your message..."
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
            onExit={() => process.exit(0)}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default Home;
