/**
 * Navigation Hook
 *
 * 管理页面导航和层级
 */

import { useState, useCallback } from 'react';
import type { Page, PageId, NavigationAction } from './types';

export interface NavigationState {
  currentPage: PageId;
  canGoBack: boolean;
  history: PageId[];
  pushPage: (page: PageId) => void;
  goBack: () => void;
  navigateTo: (pageId: PageId) => void;
}

export const useNavigation = (): NavigationState => {
  const [history, setHistory] = useState<PageId[]>(['home']);
  const [currentPage, setCurrentPage] = useState<PageId>('home');

  const canGoBack = history.length > 1;

  const pushPage = useCallback((pageId: PageId) => {
    setHistory(prev => [...prev, pageId]);
    setCurrentPage(pageId);
  }, []);

  const goBack = useCallback(() => {
    if (!canGoBack) return;

    setHistory(prev => {
      const newHistory = prev.slice(0, -1);
      setCurrentPage(newHistory[newHistory.length - 1]);
      return newHistory;
    });
  }, [canGoBack]);

  const navigateTo = useCallback((pageId: PageId) => {
    setCurrentPage(pageId);
    setHistory([pageId]);
  }, []);

  return {
    currentPage,
    canGoBack,
    history,
    pushPage,
    goBack,
    navigateTo,
  };
};
