/**
 * Exit Command
 *
 * 退出应用程序
 */

import type { Command, CommandHandler, CommandContext } from '../types.js';
import { CommandCategory } from '../types.js';
import { exitResult } from '../executor.js';

// ============================================================================
// Exit Command Handler
// ============================================================================

const handler: CommandHandler = async (context: CommandContext) => {
  return exitResult('Goodbye!');
};

// ============================================================================
// Command Definition
// ============================================================================

export const exitCommand: Command = {
  id: 'exit',
  name: '/exit',
  aliases: ['/quit', '/q'],
  description: 'Exit the application',
  category: CommandCategory.CORE,
  handler,
};

export default exitCommand;
