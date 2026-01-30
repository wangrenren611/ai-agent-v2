/**
 * Help Command
 *
 * 显示帮助信息和可用命令
 */

import type { Command, CommandHandler, CommandContext } from '../types.js';
import { CommandCategory } from '../types.js';
import { successResult } from '../executor.js';

// ============================================================================
// Help Command Handler
// ============================================================================

const handler: CommandHandler = async (context: CommandContext, args?: string[]) => {
  const argsString = args?.join(' ') || '';

  // 导航到 help 页面
  const navigateToPage = context.navigateToPage as ((pageId: string) => void) | undefined;

  if (navigateToPage) {
    navigateToPage('help');
    return successResult('Opening help page...');
  }

  return successResult('Help navigation not available');
};

// ============================================================================
// Command Definition
// ============================================================================

export const helpCommand: Command = {
  id: 'help',
  name: '/help',
  aliases: ['/?', '/h'],
  description: 'Show help information and available commands',
  usage: '/help [command]',
  category: CommandCategory.CORE,
  handler,
};

export default helpCommand;
