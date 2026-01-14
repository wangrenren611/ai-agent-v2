/**
 * /clear 命令 - 清除当前会话
 */
import type { CommandHandler } from './types';

export const handler: CommandHandler = {
    name: 'clear',
    description: 'Clear current session messages',
    usage: '/clear',

    async execute(context) {
        await context.agent.clearSession(context.sessionId.value);
        console.log('✅ Session cleared.\n');
    },
};
