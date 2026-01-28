/**
 * Main Application Component (Ink-based)
 *
 * Root component that sets up all providers and renders appropriate route.
 * Ensures only one TextInput is rendered at a time to avoid conflicts.
 */

import React from 'react';
import { Box } from 'ink';
import { RouteProvider, useRoute } from './context/route';
import { ThemeProvider } from './context/theme';
import Home from './routes/home';
import Session from './routes/session';
import Settings from './routes/settings';

// ============================================================================
// Main App Component
// ============================================================================

const AppContent: React.FC = () => {
  const [routeState, routeContext] = useRoute();

  // Direct switch - no useMemo to ensure unmount/remount
  switch (routeState.current) {
    case 'home':
      return <Home navigate={routeContext.navigate} />;
    case 'session':
      return <Session navigate={routeContext.navigate} />;
    case 'settings':
      return <Settings navigate={routeContext.navigate} />;
    default:
      return <Home navigate={routeContext.navigate} />;
  }
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <RouteProvider>
        <Box flexDirection="column" paddingX={2}>
          <AppContent />
        </Box>
      </RouteProvider>
    </ThemeProvider>
  );
};

export default App;
