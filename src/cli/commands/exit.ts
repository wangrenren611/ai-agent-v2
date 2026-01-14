/**
 * /exit 命令 - 退出 CLI
 */
import type { CommandHandler } from './types';

export const handler: CommandHandler = {
    name: 'exit',
    description: 'Exit the CLI',
    usage: '/exit',
    aliases: ['/quit', '/q'],

    execute(context) {
        context.running.value = false;
    },
};
