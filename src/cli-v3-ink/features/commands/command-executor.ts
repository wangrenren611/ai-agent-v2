/**
 * Command Executor
 *
 * Executes commands and triggers side effects
 */

import { PROVIDER_METADATA, ProviderType } from '../../../providers/provider-registry';
import type { Command } from '../../types/commands';

export interface CommandExecutorContext {
  // Navigation
  navigateToRoute?: (route: string) => void;

  // Message operations
  clearMessages?: () => void;
  addSystemMessage?: (message: string) => void;

  // Model selection
  openModelSelector?: () => void;
  selectModel?: (model: string) => void;

  // Application
  exitApp?: () => void;
}

/**
 * Execute a command with context
 */
export function executeCommand(
  command: Command,
  context: CommandExecutorContext
): void {
  switch (command.id) {
    case 'model':
      context.openModelSelector?.();
      break;

    case 'settings':
    case 'config':
      context.navigateToRoute?.('settings');
      break;

    case 'clear':
      context.clearMessages?.();
      context.addSystemMessage?.('Messages cleared');
      break;

    case 'help':
      showHelp(context);
      break;

    case 'exit':
      context.exitApp?.();
      break;

    default:
      context.addSystemMessage?.(`Unknown command: ${command.name}`);
  }
}

/**
 * Show help message
 */
function showHelp(context: CommandExecutorContext): void {
  const helpText = `
Available Commands:
  /model      - Select AI model
  /settings   - Open settings page
  /config     - Open configuration
  /clear      - Clear message history
  /help       - Show this help
  /exit       - Exit application

Keyboard Shortcuts:
  Ctrl+C      - Exit application
  Esc         - Go back / Cancel
  ↑↓          - Navigate lists
`;

  context.addSystemMessage?.(helpText.trim());
}

/**
 * Get available models for selection
 */
export function getAvailableModels(): Array<{
  type: string;
  name: string;
  defaultModel: string;
}> {
  return Object.values(PROVIDER_METADATA);
}

/**
 * Format model display string
 */
export function formatModelDisplay(type: string): string {
  const metadata = PROVIDER_METADATA[type as ProviderType];
  if (!metadata) return type;
  return `${metadata.name} (${metadata.defaultModel})`;
}
