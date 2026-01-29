/**
 * UI Context
 *
 * Manages UI state (modals, selectors, etc.)
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ModalState, ModalType, ViewState } from '../types/ui';

export interface UIContextValue {
  view: ViewState;
  setView: (view: ViewState) => void;
  modal: ModalState;
  openModal: (type: ModalType) => void;
  closeModal: () => void;
  setModalIndex: (index: number) => void;
  inputDisabled: boolean;
  setInputDisabled: (disabled: boolean) => void;
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [view, setView] = useState<ViewState>('welcome');
  const [modal, setModal] = useState<ModalState>({
    open: false,
    type: 'none',
    selectedIndex: 0,
  });
  const [inputDisabled, setInputDisabled] = useState(false);

  const openModal = useCallback((type: ModalType) => {
    setModal({
      open: true,
      type,
      selectedIndex: 0,
    });
    setInputDisabled(true);
  }, []);

  const closeModal = useCallback(() => {
    setModal({
      open: false,
      type: 'none',
      selectedIndex: 0,
    });
    setInputDisabled(false);
  }, []);

  const setModalIndex = useCallback((index: number) => {
    setModal(prev => ({ ...prev, selectedIndex: index }));
  }, []);

  const value: UIContextValue = {
    view,
    setView,
    modal,
    openModal,
    closeModal,
    setModalIndex,
    inputDisabled,
    setInputDisabled,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUIContext = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUIContext must be used within UIProvider');
  }
  return context;
};
