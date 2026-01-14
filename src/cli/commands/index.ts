/**
 * 命令注册表和路由器
 */
import type { CommandContext, CommandRegistry, CommandHandler } from './types';
import { handler as exitHandler } from './exit';
import { handler as clearHandler } from './clear';
import { handler as historyHandler } from './history';
import { handler as sessionHandler } from './session';
import { handler as helpHandler } from './help';

/**
 * 命令注册表
 */
const commands: CommandRegistry = {
    '/exit': exitHandler,
    '/quit': exitHandler,
    '/q': exitHandler,
    '/clear': clearHandler,
    '/history': historyHandler,
    '/session': sessionHandler,
    '/sess': sessionHandler,
    '/help': helpHandler,
    '/?': helpHandler,
    '/h': helpHandler,
};

/**
 * 解析命令输入
 */
export function parseCommand(input: string): { command: string; args: string[] } | null {
    if (!input.startsWith('/')) {
        return null;
    }

    const parts = input.trim().split(/\s+/);
    const command = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    if (!command) {
        return null;
    }

    return { command, args };
}

/**
 * 执行命令
 */
export async function executeCommand(
    input: string,
    context: CommandContext
): Promise<boolean> {
    const parsed = parseCommand(input);

    if (!parsed) {
        return false;
    }

    const { command, args } = parsed;
    const handler = commands[command];

    if (!handler) {
        console.log(`❌ Unknown command: ${command}`);
        console.log('Type /help for available commands.\n');
        return true;
    }

    await handler.execute(context, args);
    return true;
}

/**
 * 获取所有命令（用于自动补全等）
 */
export function getAllCommands(): CommandHandler[] {
    const uniqueHandlers = new Map<string, CommandHandler>();

    for (const handler of Object.values(commands)) {
        uniqueHandlers.set(handler.name, handler);
    }

    return Array.from(uniqueHandlers.values());
}

/**
 * 获取所有命令名称（包括别名）
 */
export function getAllCommandNames(): string[] {
    return Object.keys(commands);
}

/**
 * 获取命令补全建议
 */
export function getCommandCompletions(input: string): string[] {
    const allCommands = getAllCommandNames();

    if (!input) {
        return allCommands;
    }

    return allCommands.filter(cmd => cmd.startsWith(input));
}
