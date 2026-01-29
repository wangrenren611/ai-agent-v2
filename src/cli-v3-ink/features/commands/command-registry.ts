/**
 * Command Registry
 *
 * Central command registry with metadata
 */

import type { Command } from '../../types/commands';

export const COMMANDS: Command[] = [
  {
    id: 'model',
    name: '/model',
    description: 'Select AI model',
    action: 'execute',
    keywords: ['model', 'ai', 'llm'],
  },
  {
    id: 'settings',
    name: '/settings',
    description: 'Open settings',
    action: 'navigate',
    route: 'settings',
    keywords: ['settings', 'config', 'preferences'],
  },
  {
    id: 'config',
    name: '/config',
    description: 'Open configuration',
    action: 'navigate',
    route: 'settings',
    keywords: ['config', 'settings'],
  },
  {
    id: 'clear',
    name: '/clear',
    description: 'Clear message history',
    action: 'execute',
    keywords: ['clear', 'reset', 'clean'],
  },
  {
    id: 'help',
    name: '/help',
    description: 'Show help information',
    action: 'execute',
    keywords: ['help', 'commands', 'assist'],
  },
  {
    id: 'exit',
    name: '/exit',
    description: 'Exit application',
    action: 'execute',
    keywords: ['exit', 'quit', 'bye'],
  },
];

/**
 * Get command by ID
 */
export function getCommand(id: string): Command | undefined {
  return COMMANDS.find(cmd => cmd.id === id);
}

/**
 * Get all commands
 */
export function getAllCommands(): Command[] {
  return [...COMMANDS];
}

/**
 * Get commands by action type
 */
export function getCommandsByAction(action: Command['action']): Command[] {
  return COMMANDS.filter(cmd => cmd.action === action);
}
