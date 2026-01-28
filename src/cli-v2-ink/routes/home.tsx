/**
 * Home Route (Ink-based)
 *
 * Landing screen - type any message to start chatting
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import type { RouteContextValue } from '../context/route';
import { ICONS, COLORS } from '../utils/constants';

interface HomeProps {
  navigate: RouteContextValue['navigate'];
}

const Home: React.FC<HomeProps> = ({ navigate }) => {
  const [input, setInput] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const getCurrentModel = () =>
    (global as any).__selectedModel ||
    process.env.AI_MODEL ||
    'gpt-4o';

  const [currentModel, setCurrentModel] = useState<string>(getCurrentModel());

  const handleSubmit = (text: string) => {
    const trimmedInput = text.trim();

    if (!trimmedInput) {
      setInput('');
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
      </Box>
      <Box marginTop={2} flexDirection="column">
        <Box>
          <Text color={COLORS.PRIMARY} bold>{ICONS.USER} </Text>
          <TextInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            placeholder="Type your message..."
            showCursor={true}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default Home;
