/**
 * /session 命令 - 会话管理
 */
import type { CommandHandler } from './types';

export const handler: CommandHandler = {
    name: 'session',
    description: 'Manage sessions (new|switch|current|list|delete)',
    usage: '/session [new|switch <id>|current|list|delete <id>]',
    aliases: ['/sess'],

    async execute(context, args) {
        const action = args[0]?.toLowerCase();

        switch (action) {
            case 'new': {
                const newSessionId = `session_${Date.now()}`;
                context.sessionId.value = newSessionId;
                console.log(`✅ Created new session: ${newSessionId}\n`);
                break;
            }

            case 'switch': {
                const targetSessionId = args[1];
                if (!targetSessionId) {
                    console.log('❌ Usage: /session switch <session_id>\n');
                    break;
                }
                context.sessionId.value = targetSessionId;
                console.log(`✅ Switched to session: ${targetSessionId}\n`);
                break;
            }

            case 'current': {
                console.log(`📌 Current session: ${context.sessionId.value}\n`);
                break;
            }

            case 'list': {
                console.log('📋 Available sessions:\n');
                console.log('  (Session list feature coming soon)\n');
                break;
            }

            case 'delete': {
                const targetSessionId = args[1] || context.sessionId.value;
                await context.sessionManager.clearAll();
                if (targetSessionId === context.sessionId.value) {
                    const newSessionId = `session_${Date.now()}`;
                    context.sessionId.value = newSessionId;
                    console.log(`✅ Deleted session and created new one: ${newSessionId}\n`);
                } else {
                    console.log(`✅ Deleted session: ${targetSessionId}\n`);
                }
                break;
            }

            default:
                console.log('❌ Usage: /session [new|switch <id>|current|list|delete <id>]\n');
        }
    },
};
