/**
 * Main Application Component
 *
 * Root component that sets up all providers and renders appropriate view
 */

import React from 'react';
import { Box } from 'ink';
import Welcome from './components/welcome';
import { ChatInput } from './components/chat-input';
import MessageList from './components/message-list';
import { useAppContext } from './context/app';

// ============================================================================
// Main App Component
// ============================================================================

const App: React.FC = () => {
 const { messages, isLoading } = useAppContext();

  return (
    <Box flexDirection="column" >
      <Welcome />
      {messages.length > 0 && <MessageList messages={messages} isLoading={isLoading} />}
      <Box marginBottom={messages?.length > 0 ? 2 : 0}>
       <ChatInput />
     </Box>
  </Box>
  );
};

export default App;
