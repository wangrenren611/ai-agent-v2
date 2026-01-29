/**
 * Main Application Component
 *
 * Root component that sets up all providers and renders appropriate view
 */

import React from 'react';
import { Box } from 'ink';
import Welcome from '../components/welcome';

// ============================================================================
// Main App Component
// ============================================================================

const App: React.FC = () => {
  return (
    <Box flexDirection="column" flexGrow={1}>
      <Welcome />
    </Box>
  );
};

export default App;
