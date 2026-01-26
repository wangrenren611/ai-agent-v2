/**
 * 命令处理器
 * 解析和执行 / 命令
 */
import { useCLIContext } from './context';

interface CommandHandler {
    name: string;
    aliases?: string[];
    description: string;
    execute: (args: string[]) => Promise<boolean> | boolean;
}

// 命令注册表
const commands: Record<string, CommandHandler> = {};

export function registerCommand(handler: CommandHandler) {
    commands[handler.name] = handler;
    if (handler.aliases) {
        for (const alias of handler.aliases) {
            commands[alias] = handler;
        }
    }
}

// 解析命令
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

// 执行命令
export async function executeCommand(input: string): Promise<{ executed: boolean; output?: string }> {
    const parsed = parseCommand(input);
    if (!parsed) {
        return { executed: false };
    }

    const { command, args } = parsed;
    const handler = commands[command];

    if (!handler) {
        return { executed: true, output: `❌ Unknown command: ${command}\nType /help for available commands.` };
    }

    try {
        const result = await handler.execute(args);
        return { executed: true, output: result ? undefined : '' };
    } catch (error) {
        return { executed: true, output: `❌ Command error: ${error instanceof Error ? error.message : String(error)}` };
    }
}

// 获取所有命令
export function getAllCommands(): CommandHandler[] {
    const seen = new Set<string>();
    const result: CommandHandler[] = [];

    for (const [name, handler] of Object.entries(commands)) {
        if (!seen.has(handler.name)) {
            seen.add(handler.name);
            result.push(handler);
        }
    }

    return result;
}

// 默认命令处理器
function createDefaultHandlers() {
    // /help 命令
    registerCommand({
        name: '/help',
        aliases: ['/?', '/h'],
        description: 'Show help message',
        execute: async () => {
            const cmds = getAllCommands();
            console.log('\n📖 Available Commands:\n');
            cmds.forEach(cmd => {
                const aliases = cmd.aliases ? `(${cmd.aliases.join(', ')})` : '';
                console.log(`  ${cmd.name}${aliases.padEnd(15)} ${cmd.description}`);
            });
            console.log('\n💡 Type command or press ESC to cancel\n');
            return true;
        },
    });

    // /exit 命令
    registerCommand({
        name: '/exit',
        aliases: ['/quit', '/q'],
        description: 'Exit the CLI',
        execute: async () => {
            const { setShouldExit } = useCLIContext();
            setShouldExit(true);
            return true;
        },
    });

    // /clear 命令
    registerCommand({
        name: '/clear',
        aliases: [],
        description: 'Clear the screen and messages',
        execute: async () => {
            const { clearMessages } = useCLIContext();
            clearMessages();
            // 清屏
            console.clear?.();
            return true;
        },
    });

    // /history 命令
    registerCommand({
        name: '/history',
        aliases: [],
        description: 'Show command history',
        execute: async () => {
            const { commandHistory } = useCLIContext();
            console.log('\n📜 Command History:\n');
            commandHistory.forEach((cmd, i) => {
                console.log(`  ${i + 1}. ${cmd}`);
            });
            console.log('');
            return true;
        },
    });
}

// 初始化默认命令
createDefaultHandlers();
