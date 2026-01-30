/**
 * Agent Context Provider
 *
 * 管理 Agent 状态和消息
 */

import React, { createContext, useContext, ReactNode } from 'react';
import useAgent from '../../hooks/use-agent';
import type { Message } from '../../../agent/message';
import type { Agent } from '../../../agent';

// ============================================================================
// Agent Context Type
// ============================================================================

export interface AgentContextType {
  /** Agent 实例 */
  agent: Agent | null | undefined;

  /** 消息列表 */
  messages: Message[];

  /** 设置消息列表 */
  setMessages: (messages: Message[]) => void;

  /** 是否正在加载 */
  isLoading: boolean;

  /** 当前消息 ID */
  currentMessageId: string | null;

  /** 已使用的 token */
  usedTokens: {
    usedTokens: number;
    totalTokens: number;
  };

  /** 错误信息 */
  error: {
    message: string;
    phase: string;
  } | null;

  /** 提交消息 */
  submitMessage: (message: string) => void;
}

// ============================================================================
// Default Context
// ============================================================================

const AgentContext = createContext<AgentContextType | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export interface AgentContextProviderProps {
  children: ReactNode;
  model: string;
}

export const AgentContextProvider = ({ children, model }: AgentContextProviderProps) => {
  const agentHook = useAgent({ model });

  const value: AgentContextType = {
    agent: agentHook.agent,
    messages: agentHook.messages,
    setMessages: agentHook.setMessages,
    isLoading: agentHook.isLoading,
    currentMessageId: agentHook.currentMessageId,
    usedTokens: agentHook.usedTokens,
    error: agentHook.error,
    submitMessage: agentHook.submitMessage,
  };

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
};

// ============================================================================
// Hook
// ============================================================================

export const useAgentContext = (): AgentContextType => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgentContext must be used within an AgentContextProvider');
  }
  return context;
};
