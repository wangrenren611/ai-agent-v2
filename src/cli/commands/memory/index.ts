/**
 * Memory Commands
 *
 * 记忆管理相关命令
 */

import type { Command, CommandHandler, CommandContext } from '../types.js';
import { CommandCategory } from '../types.js';
import { successResult, errorResult } from '../executor.js';

// ============================================================================
// Memory Command Handler
// ============================================================================

const handler: CommandHandler = async (context: CommandContext, args?: string[]) => {
  const action = args?.[0];

  if (!action) {
    // 显示当前记忆状态
    const status = context.session.memoryEnabled ? 'enabled' : 'disabled';
    return successResult(`Memory is ${status}`);
  }

  switch (action) {
    case 'on':
    case 'enable':
      context.sessionManager.updateMemory(true);
      return successResult('Memory enabled');

    case 'off':
    case 'disable':
      context.sessionManager.updateMemory(false);
      return successResult('Memory disabled');

    case 'clear':
      // Memory clearing not implemented yet
      return errorResult('Memory clearing not implemented');

    case 'show':
    case 'status':
      const status = context.session.memoryEnabled ? 'enabled' : 'disabled';
      return successResult(`Memory is ${status}`);

    default:
      return errorResult(`Unknown memory action: ${action}. Available: on, off, clear, show`);
  }
};

// ============================================================================
// Command Definition
// ============================================================================

export const memoryCommand: Command = {
  id: 'memory',
  name: '/memory',
  aliases: ['/mem'],
  description: 'Manage memory (enable, disable, clear, show status)',
  usage: '/memory [on|off|clear|show]',
  category: CommandCategory.MEMORY,
  handler,
};

export default memoryCommand;
