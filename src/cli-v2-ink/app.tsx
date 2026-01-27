/**
 * Main Application Component (Ink-based)
 *
 * Root component that sets up all providers and renders the appropriate route.
 */

import React, { useMemo } from 'react';
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

  const renderRoute = useMemo(() => {
    switch (routeState.current) {
      case 'home':
        return React.createElement(Home, { navigate: routeContext.navigate });
      case 'session':
        return React.createElement(Session, { navigate: routeContext.navigate });
      case 'settings':
        return React.createElement(Settings, { navigate: routeContext.navigate });
      default:
        return React.createElement(Home, { navigate: routeContext.navigate });
    }
  }, [routeState.current, routeContext.navigate]);

  return React.createElement(
    Box,
    { flexDirection: 'column', paddingX: 2 },
    renderRoute
  );
};

const App: React.FC = () => {
  return React.createElement(
    ThemeProvider,
    null,
    React.createElement(
      RouteProvider,
      null,
      React.createElement(AppContent)
    )
  );
};

export default App;
