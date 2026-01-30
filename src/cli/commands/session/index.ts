/**
 * Session Commands
 *
 * 会话管理相关命令
 */

import type { Command, CommandHandler, CommandContext } from '../types.js';
import { CommandCategory } from '../types.js';
import { successResult, errorResult } from '../executor.js';

// ============================================================================
// Session Command Handler
// ============================================================================

const handler: CommandHandler = async (context: CommandContext, args?: string[]) => {
  const action = args?.[0];
  const sessionId = args?.[1];

  if (!action) {
    // 显示当前会话信息
    const currentSessionId = context.sessionId || 'default';
    return successResult(`Current session: ${currentSessionId}`);
  }

  switch (action) {
    case 'list':
    case 'ls':
      return successResult('Session list not implemented yet');

    case 'switch':
    case 'use':
      if (!sessionId) {
        return errorResult('Please provide a session ID. Usage: /session switch <id>');
      }
      // 这里需要通过 context 设置 session
      const switchSession = context.setSessionId as ((id: string) => void) | undefined;
      if (switchSession) {
        switchSession(sessionId);
        return successResult(`Switched to session: ${sessionId}`);
      }
      return errorResult('Session switching not available');

    case 'new':
    case 'create':
      const newSessionId = sessionId || `session_${Date.now()}`;
      const createSession = context.setSessionId as ((id: string) => void) | undefined;
      if (createSession) {
        createSession(newSessionId);
        return successResult(`Created new session: ${newSessionId}`);
      }
      return errorResult('Session creation not available');

    default:
      return errorResult(`Unknown session action: ${action}. Available: list, switch, new`);
  }
};

// ============================================================================
// Command Definition
// ============================================================================

export const sessionCommand: Command = {
  id: 'session',
  name: '/session',
  aliases: ['/s'],
  description: 'Manage sessions (list, switch, create new)',
  usage: '/session [list|switch|new] [id]',
  category: CommandCategory.SESSION,
  handler,
};

export default sessionCommand;
