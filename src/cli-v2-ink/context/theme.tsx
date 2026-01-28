/**
 * Theme Provider (Ink-based)
 *
 * Manages theme selection and mode (dark/light).
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Theme, ThemeState } from '../types';

// ============================================================================
// Default Theme
// ============================================================================

const defaultTheme: Theme = {
  name: 'default-dark',
  mode: 'dark',
  colors: {
    bg: { r: 28, g: 30, b: 40, a: 1 },
    fg: { r: 220, g: 220, b: 230, a: 1 },
    primary: { r: 97, g: 175, b: 239, a: 1 },
    secondary: { r: 140, g: 140, b: 150, a: 1 },
    accent: { r: 241, g: 250, b: 140, a: 1 },
    muted: { r: 80, g: 80, b: 90, a: 1 },
    error: { r: 241, g: 76, b: 76, a: 1 },
    warning: { r: 229, g: 192, b: 123, a: 1 },
    success: { r: 80, g: 200, b: 120, a: 1 },
    info: { r: 97, g: 175, b: 239, a: 1 },
    border: { r: 50, g: 50, b: 60, a: 1 },
    highlight: { r: 40, g: 45, b: 60, a: 1 },
  },
  syntax: {
    keyword: '#c792ea',
    string: '#c3e88d',
    comment: '#546e7a',
    function: '#82aaff',
    number: '#f78c6c',
  },
};

// ============================================================================
// Theme Context Interface
// ============================================================================

interface ThemeContextValue {
  state: ThemeState;
  setTheme: (themeName: string) => void;
  setMode: (mode: 'dark' | 'light') => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ThemeState>({
    current: defaultTheme,
    mode: 'dark',
    themes: {
      'default-dark': defaultTheme,
    },
  });

  const setTheme = useCallback((themeName: string) => {
    const theme = state.themes[themeName];
    if (theme) {
      setState((prev: ThemeState) => ({ ...prev, current: theme, mode: theme.mode }));
    }
  }, [state.themes]);

  const setMode = useCallback((mode: 'dark' | 'light') => {
    setState((prev: ThemeState) => ({ ...prev, mode }));
  }, []);

  const toggleMode = useCallback(() => {
    setState((prev: ThemeState) => ({ ...prev, mode: prev.mode === 'dark' ? 'light' : 'dark' }));
  }, []);

  const value: ThemeContextValue = {
    state,
    setTheme,
    setMode,
    toggleMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
