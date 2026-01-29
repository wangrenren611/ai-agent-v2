/**
 * Main View Component
 *
 * Primary chat interface
 */

import React from 'react';
import { Box } from 'ink';
import { ChatContainer } from '../features/chat';

const MainView: React.FC = () => {
  return (
    <Box flexDirection="column" flexGrow={1}>
      <ChatContainer />
    </Box>
  );
};

export default MainView;
