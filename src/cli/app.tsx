/**
 * Main Application Component
 *
 * Root component that sets up all providers and renders appropriate view
 */

import React from 'react';
import { Box ,Text} from 'ink';
import Welcome from './components/welcome';
import { ChatInput } from './components/chat-input';
import MessageList from './components/message-list';
import { useAppContext } from './context/app';

// ============================================================================
// Main App Component
// ============================================================================

const App: React.FC = () => {
 const { messages, isLoading ,model,usedTokens} = useAppContext();

  return (
    <Box flexDirection="column" >
      <Welcome  model={model} currentPath={process.cwd()} />
      {messages.length > 0 && <MessageList messages={messages} isLoading={isLoading} />}
      <Box marginBottom={messages?.length > 0 ? 2 : 0}>
       <ChatInput />
     </Box>
      <Box marginTop={1}>
        <Text color="gray">Context left: {Math.ceil(((1-usedTokens?.usedTokens/usedTokens?.totalTokens) || 0) * 100)}%</Text>
      </Box>
  </Box>
  );
};

export default App;
