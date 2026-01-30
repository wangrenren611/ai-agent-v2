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
    const memoryEnabled = context.memoryEnabled as boolean | undefined;
    const status = memoryEnabled ? 'enabled' : 'disabled';
    return successResult(`Memory is ${status}`);
  }

  switch (action) {
    case 'on':
    case 'enable':
      const enableMemory = context.setMemory as ((enabled: boolean) => void) | undefined;
      if (enableMemory) {
        enableMemory(true);
        return successResult('Memory enabled');
      }
      return errorResult('Memory control not available');

    case 'off':
    case 'disable':
      const disableMemory = context.setMemory as ((enabled: boolean) => void) | undefined;
      if (disableMemory) {
        disableMemory(false);
        return successResult('Memory disabled');
      }
      return errorResult('Memory control not available');

    case 'clear':
      const clearMemory = context.clearMemory as (() => void) | undefined;
      if (clearMemory) {
        clearMemory();
        return successResult('Memory cleared');
      }
      return errorResult('Memory clearing not available');

    case 'show':
    case 'status':
      const memoryEnabled = context.memoryEnabled as boolean | undefined;
      const status = memoryEnabled ? 'enabled' : 'disabled';
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
