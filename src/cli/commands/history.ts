/**
 * /history 命令 - 显示会话历史
 */
import type { CommandHandler } from './types';

export const handler: CommandHandler = {
    name: 'history',
    description: 'Show session message history',
    usage: '/history',

    async execute(context) {
        const history = await context.sessionManager.getMessages();

        if (history.length === 0) {
            console.log('📭 No messages in current session.\n');
            return;
        }

        console.log(`\n📜 Session History (${history.length} messages):\n`);
        history.forEach((msg: any, i: number) => {
            const icon = msg.role === 'user' ? '👤' : '🤖';
            const preview = msg.content.length > 100
                ? msg.content.substring(0, 100) + '...'
                : msg.content;
            console.log(`  ${i + 1}. ${icon} [${msg.role}]: ${preview}`);
        });
        console.log('');
    },
};
