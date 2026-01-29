/**
 * Welcome View Component
 *
 * Initial landing screen that transitions to chat on first message
 */

import React, { useState } from 'react';
import { Box } from 'ink';
import { WelcomeBanner } from '../components/widgets';
import { ChatInput } from '../components/input';
import { useAgentContext, useUIContext } from '../context';
import ChatView from './chat-view';

const WelcomeView: React.FC = () => {
  const { model } = useAgentContext();
  const { setView } = useUIContext();
  const [input, setInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const handleSubmit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    // Handle commands
    if (trimmed.startsWith('/')) {
      if (trimmed === '/exit') {
        process.exit(0);
      }
      // For other commands, show in chat
    }

    // Store pending message and switch to chat view
    setPendingMessage(trimmed);
    setShowChat(true);
    setView('chat');
  };

  if (showChat) {
    return <ChatView initialMessage={pendingMessage} />;
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      <WelcomeBanner
        model={model}
        currentPath={process.cwd()}
      />

      <Box  marginTop={1}>
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder="Type a message to start..."
        />
      </Box>
    </Box>
  );
};

export default WelcomeView;
