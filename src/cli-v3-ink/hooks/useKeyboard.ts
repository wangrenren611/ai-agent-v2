/**
 * useKeyboard Hook
 *
 * Handles keyboard input and navigation
 */

import { useCallback } from 'react';
import { useInput } from 'ink';

interface UseKeyboardProps {
  disabled?: boolean;
  showCommandList?: boolean;
  showModelSelector?: boolean;
  commandListIndex?: number;
  commandListLength?: number;
  modelListLength?: number;
  onCommandNavigate?: (direction: 'up' | 'down') => void;
  onModelNavigate?: (direction: 'up' | 'down') => void;
  onSelectCommand?: () => void;
  onSelectModel?: () => void;
  onEscape?: () => void;
  onExit?: () => void;
}

export const useKeyboard = ({
  disabled = false,
  showCommandList = false,
  showModelSelector = false,
  commandListIndex = 0,
  commandListLength = 0,
  modelListLength = 0,
  onCommandNavigate,
  onModelNavigate,
  onSelectCommand,
  onSelectModel,
  onEscape,
  onExit,
}: UseKeyboardProps) => {
  // Handle keyboard input
  useInput((inputChar, key) => {
    if (disabled) return;

    // Handle command list navigation
    if (showCommandList) {
      if (key.upArrow && onCommandNavigate) {
        onCommandNavigate('up');
      }
      if (key.downArrow && onCommandNavigate) {
        onCommandNavigate('down');
      }
      if (key.escape && onEscape) {
        onEscape();
      }
      return;
    }

    // Handle model selector navigation
    if (showModelSelector) {
      if (key.upArrow && onModelNavigate) {
        onModelNavigate('up');
      }
      if (key.downArrow && onModelNavigate) {
        onModelNavigate('down');
      }
      if (key.escape && onEscape) {
        onEscape();
      }
      return;
    }

    // Handle global escape
    if (key.escape && onEscape) {
      onEscape();
    }

    // Handle Ctrl+C for exit
    if (key.ctrl && inputChar === 'c' && onExit) {
      onExit();
    }
  });

  // Navigate command list
  const navigateCommandList = useCallback((direction: 'up' | 'down') => {
    if (!onCommandNavigate) return;

    let newIndex = commandListIndex;
    if (direction === 'up') {
      newIndex = commandListIndex > 0 ? commandListIndex - 1 : commandListLength - 1;
    } else {
      newIndex = commandListIndex < commandListLength - 1 ? commandListIndex + 1 : 0;
    }
    onCommandNavigate(direction);
  }, [commandListIndex, commandListLength, onCommandNavigate]);

  // Navigate model selector
  const navigateModelSelector = useCallback((direction: 'up' | 'down') => {
    if (!onModelNavigate) return;

    let newIndex = commandListIndex; // Use different state in practice
    if (direction === 'up') {
      newIndex = newIndex > 0 ? newIndex - 1 : modelListLength - 1;
    } else {
      newIndex = newIndex < modelListLength - 1 ? newIndex + 1 : 0;
    }
    onModelNavigate(direction);
  }, [commandListIndex, modelListLength, onModelNavigate]);

  return {
    navigateCommandList,
    navigateModelSelector,
  };
};
