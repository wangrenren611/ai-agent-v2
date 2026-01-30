/**
 * Main Application Component
 *
 * Root component that sets up all providers and renders appropriate view
 */

import React from 'react';
import { Box ,Text} from 'ink';
import Welcome from '../components/welcome';
import { useAppContext } from '../context/app';

// ============================================================================
// Main App Component
// ============================================================================

const App: React.FC = () => {
  const {usedTokens} = useAppContext();
  return (
    <Box flexDirection="column" flexGrow={1}>
      <Welcome />
      <Box marginTop={1}>
        <Text color="gray">Used Tokens: {Math.ceil((usedTokens?.usedTokens/usedTokens?.totalTokens || 0) * 100)}%</Text>
      </Box>
    </Box>
  );
};

export default App;
