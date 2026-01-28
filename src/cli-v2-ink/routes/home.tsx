/**
 * Home Route (Ink-based)
 *
 * Landing screen - type any message to start chatting
 */

import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import { useAgentContext, type RouteContextValue } from '../context/route';
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
  const { aiModel,setAIMModel } = useAgentContext();






  // Execute a command
  const executeCommand = useCallback((command: Command) => {
    setInput('');
;

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
    setInput(value);


  }, []);


  // Handle escape
  const handleEscape = useCallback(() => {

  }, []);

  const handleSubmit = (text: string) => {
    const trimmedInput = text.trim();
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
        <Text bold>{aiModel}</Text>
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

      {/* {showCommandList && (
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
      )} */}

      <Box marginTop={2} flexDirection="column">
        <Box>
          <Text color={COLORS.PRIMARY} bold>{ICONS.INPUT}</Text>
          <CustomInput
            value={input}
            onChange={handleInputChange}
            onSubmit={handleSubmit}
            placeholder="Type your message..."
            onEscape={handleEscape}
            onExit={() => process.exit(0)}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default Home;
