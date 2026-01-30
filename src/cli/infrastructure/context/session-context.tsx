/**
 * Session Context Provider
 *
 * 管理会话状态（sessionId, model, memoryEnabled）
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { IReadOnlySession, ISessionManager, SessionState } from '../../core/session/types';
import type { Message } from '../../../agent/message';
import { ProviderType } from '../../../providers/provider-registry';

// ============================================================================
// Session Context Type
// ============================================================================

export interface SessionContextType {
  /** 当前会话状态 */
  state: SessionState;

  /** 当前会话的只读视图 */
  current: IReadOnlySession;

  /** 当前消息列表 */
  messages: Message[];

  /** 设置消息列表 */
  setMessages: (messages: Message[]) => void;

  /** 更新模型 */
  setModel: (model: string) => void;

  /** 更新内存开关 */
  setMemoryEnabled: (enabled: boolean) => void;

  /** 切换会话 */
  setSessionId: (sessionId: string) => void;
}

// ============================================================================
// Default Context
// ============================================================================

const defaultSession: IReadOnlySession = {
  sessionId: '',
  userId: 'default',
  model: ProviderType.GLM,
  memoryEnabled: false,
  messages: [],
};

// Helper function to create default session
const createDefaultSession = (): IReadOnlySession => defaultSession;

const SessionContext = createContext<SessionContextType | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export const SessionContextProvider = ({ children }: { children: ReactNode }) => {
  const [sessionId, setSessionId] = useState<string>(`session_${Date.now()}`);
  const [model, setModel] = useState<string>(ProviderType.GLM);
  const [memoryEnabled, setMemoryEnabled] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);

  // 当前会话只读视图
  const current: IReadOnlySession = {
    sessionId,
    userId: 'default',
    model,
    memoryEnabled,
    messages,
  };

  const state: SessionState = {
    sessionId,
    userId: 'default',
    model,
    memoryEnabled,
  };

  const value: SessionContextType = {
    state,
    current,
    messages,
    setMessages,
    setModel,
    setMemoryEnabled,
    setSessionId,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

// ============================================================================
// Hook
// ============================================================================

export const useSessionContext = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within a SessionContextProvider');
  }
  return context;
};

// ============================================================================
// Session Manager Implementation
// ============================================================================

/**
 * SessionManager 实现 - 用于命令系统
 * 将 React Context 桥接到领域接口
 */
export const createSessionManager = (
  context: SessionContextType
): ISessionManager => {
  return {
    get current() {
      return context.current;
    },

    async switchSession(sessionId: string) {
      context.setSessionId(sessionId);
    },

    async createSession(sessionId?: string) {
      const newSessionId = sessionId || `session_${Date.now()}`;
      context.setSessionId(newSessionId);
      context.setMessages([]);
    },

    updateModel(model: string) {
      context.setModel(model);
    },

    updateMemory(enabled: boolean) {
      context.setMemoryEnabled(enabled);
    },

    clearMessages() {
      context.setMessages([]);
    },
  };
};
