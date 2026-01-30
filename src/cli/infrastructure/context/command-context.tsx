/**
 * Command Context Provider
 *
 * 管理命令执行状态和结果
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { CommandResult } from '../../commands';

// ============================================================================
// Command Context Type
// ============================================================================

export interface CommandContextType {
  /** 当前命令执行结果 */
  result: CommandResult | null;

  /** 设置命令结果 */
  setResult: (result: CommandResult | null) => void;

  /** 清除命令结果 */
  clearResult: () => void;

  /** 显示命令结果（用于命令系统） */
  showResult: (result: CommandResult) => void;
}

// ============================================================================
// Default Context
// ============================================================================

const CommandContext = createContext<CommandContextType | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export const CommandContextProvider = ({ children }: { children: ReactNode }) => {
  const [result, setResult] = useState<CommandResult | null>(null);

  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  const showResult = useCallback((newResult: CommandResult) => {
    setResult(newResult);
  }, []);

  const value: CommandContextType = {
    result,
    setResult,
    clearResult,
    showResult,
  };

  return <CommandContext.Provider value={value}>{children}</CommandContext.Provider>;
};

// ============================================================================
// Hook
// ============================================================================

export const useCommandContext = (): CommandContextType => {
  const context = useContext(CommandContext);
  if (!context) {
    throw new Error('useCommandContext must be used within a CommandContextProvider');
  }
  return context;
};
