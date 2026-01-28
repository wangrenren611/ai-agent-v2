/**
 * Route Provider (Ink-based)
 *
 * Manages navigation state and routing for the application.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Route, RouteState } from '../types';

// ============================================================================
// Route Context Interface
// ============================================================================

export interface RouteContextValue {
  state: RouteState;
  navigate: (route: Route, params?: Record<string, string>) => void;
  back: () => void;
  setRoute: (route: Route) => void;
  setParams: (params: Record<string, string>) => void;
}

const RouteContext = createContext<RouteContextValue | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

export const RouteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<RouteState>({
    current: 'home',
    params: {},
    history: [],
  });

  const navigate = useCallback((route: Route, params: Record<string, string> = {}) => {
    setState((prev: RouteState) => ({
      ...prev,
      current: route,
      params,
      history: [...prev.history, prev.current],
    }));
  }, []);

  const back = useCallback(() => {
    setState((prev: RouteState) => {
      const history = [...prev.history];
      const previous = history.pop();
      return {
        ...prev,
        current: previous || 'home',
        history,
      };
    });
  }, []);

  const setRoute = useCallback((route: Route) => {
    setState((prev: RouteState) => ({ ...prev, current: route }));
  }, []);

  const setParams = useCallback((params: Record<string, string>) => {
    setState((prev: RouteState) => ({ ...prev, params }));
  }, []);

  const value: RouteContextValue = {
    state,
    navigate,
    back,
    setRoute,
    setParams,
  };

  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
};

// ============================================================================
// Hook
// ============================================================================

export const useRoute = (): [RouteState, Omit<RouteContextValue, 'state'>] => {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error('useRoute must be used within RouteProvider');
  }
  return [context.state, context];
};
