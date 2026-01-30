/**
 * Navigation Context Provider
 *
 * 管理页面导航状态
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import type { INavigationService, NavigationState, PageId } from '../../core/navigation/types';

// ============================================================================
// Navigation Context Type
// ============================================================================

export interface NavigationContextType extends NavigationState {
  /** 导航到指定页面 */
  navigateTo: (pageId: PageId) => void;

  /** 返回上一页 */
  goBack: () => void;

  /** 替换当前页面 */
  replace: (pageId: PageId) => void;

  /** 重置导航历史 */
  reset: (pageId: PageId) => void;
}

// ============================================================================
// Default Context
// ============================================================================

const NavigationContext = createContext<NavigationContextType | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export const NavigationContextProvider = ({ children }: { children: ReactNode }) => {
  const [history, setHistory] = useState<PageId[]>(['home']);
  const [currentPage, setCurrentPage] = useState<PageId>('home');

  const canGoBack = history.length > 1;

  const navigateTo = useCallback((pageId: PageId) => {
    setHistory((prev) => [...prev, pageId]);
    setCurrentPage(pageId);
  }, []);

  const goBack = useCallback(() => {
    setHistory((prev) => {
      if (prev.length <= 1) return prev;
      const newHistory = prev.slice(0, -1);
      setCurrentPage(newHistory[newHistory.length - 1]);
      return newHistory;
    });
  }, []);

  const replace = useCallback((pageId: PageId) => {
    setHistory((prev) => {
      const newHistory = [...prev.slice(0, -1), pageId];
      setCurrentPage(pageId);
      return newHistory;
    });
  }, []);

  const reset = useCallback((pageId: PageId) => {
    setHistory([pageId]);
    setCurrentPage(pageId);
  }, []);

  const value: NavigationContextType = useMemo(
    () => ({
      currentPage,
      canGoBack,
      history,
      navigateTo,
      goBack,
      replace,
      reset,
    }),
    [currentPage, canGoBack, history, navigateTo, goBack, replace, reset]
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
};

// ============================================================================
// Hook
// ============================================================================

export const useNavigationContext = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationContext must be used within a NavigationContextProvider');
  }
  return context;
};

// ============================================================================
// Navigation Service Implementation
// ============================================================================

/**
 * NavigationService 实现 - 用于命令系统
 * 将 React Context 桥接到领域接口
 */
export const createNavigationService = (
  context: NavigationContextType
): INavigationService => {
  return {
    get currentPage() {
      return context.currentPage;
    },

    get canGoBack() {
      return context.canGoBack;
    },

    get history() {
      return context.history;
    },

    navigateTo(pageId: PageId) {
      context.navigateTo(pageId);
    },

    goBack() {
      context.goBack();
    },

    replace(pageId: PageId) {
      context.replace(pageId);
    },

    reset(pageId: PageId) {
      context.reset(pageId);
    },
  };
};
