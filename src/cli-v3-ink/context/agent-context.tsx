/**
 * Agent Context
 *
 * Manages Agent instance and state
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Agent } from '../../agent';
import { ProviderType } from '../../providers/provider-registry';

export interface AgentContextValue {
  agent: Agent | null;
  model: ProviderType;
  setModel: (model: ProviderType) => void;
  ready: boolean;
  status: string;
  error: string | null;
}

const AgentContext = createContext<AgentContextValue | undefined>(undefined);

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [model, setModel] = useState<ProviderType>(ProviderType.MINIMAX);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSetModel = useCallback((newModel: ProviderType) => {
    setModel(newModel);
    // Agent will be recreated by useAgent hook when model changes
  }, []);

  const value: AgentContextValue = {
    agent,
    model,
    setModel: handleSetModel,
    ready,
    status,
    error,
  };

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
};

export const useAgentContext = () => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgentContext must be used within AgentProvider');
  }
  return context;
};
