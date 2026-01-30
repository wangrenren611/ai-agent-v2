/**
 * Clear Command
 *
 * 清除消息历史
 */

import type { Command, CommandHandler, CommandContext } from '../types.js';
import { CommandCategory } from '../types.js';
import { successResult } from '../executor.js';

// ============================================================================
// Clear Command Handler
// ============================================================================

const handler: CommandHandler = async (context: CommandContext) => {
  // 优先调用 agent.clear() 来清除会话历史
  const agent = context.agent;

  if (agent && typeof agent.clear === 'function') {
    agent.clear();
    return successResult('Message history cleared');
  }

  // 降级：如果 agent 不可用，尝试使用 clearMessages 回调
  const clearMessages = context.clearMessages as (() => void) | undefined;
  if (clearMessages && typeof clearMessages === 'function') {
    clearMessages();
    return successResult('Message history cleared (UI only)');
  }

  return successResult('Clear requested (no clear function provided)');
};

// ============================================================================
// Command Definition
// ============================================================================

export const clearCommand: Command = {
  id: 'clear',
  name: '/clear',
  aliases: ['/cls', '/reset'],
  description: 'Clear the conversation history',
  category: CommandCategory.CORE,
  handler,
};

export default clearCommand;
