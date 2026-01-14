/**
 * /help 命令 - 显示帮助信息
 */
import type { CommandHandler } from './types';

export const handler: CommandHandler = {
    name: 'help',
    description: 'Show available commands',
    usage: '/help',
    aliases: ['/?', '/h'],

    execute() {
        console.log('\n📖 Available Commands:\n');
        console.log('  Chat Commands:');
        console.log('    /help, /?, /h      Show this help message');
        console.log('    /exit, /quit, /q   Exit the CLI');
        console.log('');
        console.log('  Session Commands:');
        console.log('    /clear             Clear current session messages');
        console.log('    /history           Show session message history');
        console.log('    /session new       Create a new session');
        console.log('    /session switch <id>  Switch to a session');
        console.log('    /session current   Show current session ID');
        console.log('    /session list      List all sessions');
        console.log('    /session delete <id>  Delete a session');
        console.log('');
        console.log('💡 Just type your message to chat with the agent!\n');
    },
};
