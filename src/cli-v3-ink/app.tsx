/**
 * Main Application Component
 *
 * Root component that sets up all providers and renders appropriate view
 */

import React from 'react';
import { Box } from 'ink';
import { AgentProvider, MessageProvider, UIProvider } from './context';
import WelcomeView from './views/welcome-view';

// ============================================================================
// Main App Component
// ============================================================================

const App: React.FC = () => {
  return (
    <AgentProvider>
      <MessageProvider>
        <UIProvider>
          <Box flexDirection="column" flexGrow={1}>
            <WelcomeView />
          </Box>
        </UIProvider>
      </MessageProvider>
    </AgentProvider>
  );
};

export default App;
