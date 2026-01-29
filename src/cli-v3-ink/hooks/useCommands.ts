/**
 * useCommands Hook
 *
 * Handles command matching and execution
 */

import { useCallback, useMemo } from 'react';
import { matchCommands, findCommand } from '../utils/commands';
import type { Command } from '../types/commands';

interface UseCommandsProps {
  input: string;
  onExecuteCommand: (command: Command) => void;
  onNavigate?: (route: string) => void;
  onClearMessages?: () => void;
  onShowHelp?: () => void;
  onExit?: () => void;
}

export const useCommands = ({
  input,
  onExecuteCommand,
  onNavigate,
  onClearMessages,
  onShowHelp,
  onExit,
}: UseCommandsProps) => {
  // Match commands based on current input
  const matchedCommands = useMemo(() => {
    return matchCommands(input);
  }, [input]);

  // Execute a command
  const executeCommand = useCallback((command: Command) => {
    switch (command.id) {
      case 'model':
        onExecuteCommand(command);
        break;

      case 'settings':
      case 'config':
        onNavigate?.('settings');
        break;

      case 'clear':
        onClearMessages?.();
        onExecuteCommand(command);
        break;

      case 'help':
        onShowHelp?.();
        onExecuteCommand(command);
        break;

      case 'exit':
        onExit?.();
        break;

      default:
        onExecuteCommand(command);
    }
  }, [onExecuteCommand, onNavigate, onClearMessages, onShowHelp, onExit]);

  // Handle command input
  const handleCommand = useCallback((inputValue: string) => {
    const command = findCommand(inputValue);
    if (command) {
      executeCommand(command);
      return true;
    }
    return false;
  }, [executeCommand]);

  // Check if input is a command
  const isCommand = useMemo(() => {
    return input.startsWith('/');
  }, [input]);

  return {
    matchedCommands,
    executeCommand,
    handleCommand,
    isCommand,
  };
};
