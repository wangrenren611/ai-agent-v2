/**
 * Command System
 *
 * Defines all available commands and provides fuzzy matching
 */

export interface Command {
  id: string;
  name: string;
  description: string;
  action: 'navigate' | 'execute';
  route?: string;
  handler?: () => void;
}

export const COMMANDS: Command[] = [
  {
    id: 'model',
    name: '/model',
    description: 'Select AI model',
    action: 'execute',
    handler: () => {
      // Show model selector in current page
    },
  },
  {
    id: 'settings',
    name: '/settings',
    description: 'Open settings',
    action: 'navigate',
    route: 'settings',
  },
  {
    id: 'config',
    name: '/config',
    description: 'Open configuration',
    action: 'navigate',
    route: 'settings',
  },
  {
    id: 'clear',
    name: '/clear',
    description: 'Clear message history',
    action: 'execute',
    handler: () => {
      // Clear messages
    },
  },
  {
    id: 'help',
    name: '/help',
    description: 'Show help',
    action: 'execute',
    handler: () => {
      // Show help
    },
  },
  {
    id: 'exit',
    name: '/exit',
    description: 'Exit application',
    action: 'execute',
    handler: () => {
      process.exit(0);
    },
  },
];

/**
 * Fuzzy match commands by keyword
 */
export function matchCommands(keyword: string): Command[] {
  
  if (!keyword || keyword === '/') {
    return COMMANDS;
  }

  const lowerKeyword = keyword.toLowerCase();
  const filtered = COMMANDS.filter(cmd => {
    const lowerName = cmd.name.toLowerCase();
    
    // Exact match
    if (lowerName === lowerKeyword) {
      return true;
    }

    // Prefix match
    if (lowerName.startsWith(lowerKeyword)) {
      return true;
    }

    // Fuzzy match (contains)
    if (lowerName.includes(lowerKeyword.replace('/', ''))) {
      return true;
    }

    return false;
  });

  return filtered;
}

/**
 * Find command by name (exact match)
 */
export function findCommand(name: string): Command | undefined {
  const found = COMMANDS.find(cmd => cmd.name.toLowerCase() === name.toLowerCase());
  return found;
}
