/**
 * 智能输入处理器
 * 支持 "/" 触发命令列表显示
 */
import readline from 'readline';
import { InputHistory } from './input';
import { getAllCommands } from '../commands';

export interface SmartInputOptions {
    prompt: string;
    history: InputHistory;
}

export interface SmartInputResult {
    value: string;
    history: InputHistory;
}

/**
 * 显示命令列表
 */
function showCommands(): void {
    const commands = getAllCommands();
    console.log('\n📖 Available Commands:\n');

    commands.forEach(cmd => {
        const aliases = cmd.aliases ? ` (${cmd.aliases.join(', ')})` : '';
        console.log(`  ${cmd.name}${aliases.padEnd(15)} ${cmd.description}`);
    });

    console.log('\n💡 Type command or press ESC to cancel\n');
}

/**
 * 智能输入 - 支持 "/" 自动显示命令
 */
export async function smartInput(options: SmartInputOptions): Promise<SmartInputResult> {
    return new Promise((resolve, reject) => {
        const historyArray = [...options.history.getAll()].reverse();

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: options.prompt,
            history: historyArray,
            tabSize: 2,
        });

        const _currentLine = '';

        rl.prompt();

        // 监听每一行输入
        rl.on('line', (line: string) => {
            const trimmed = line.trim();

            if (trimmed) {
                options.history.add(trimmed);
            }

            rl.close();
            resolve({
                value: trimmed,
                history: options.history,
            });
        });

        // 监听 SIGINT (Ctrl+C)
        rl.on('SIGINT', () => {
            rl.close();
            process.exit(0);
        });

        rl.on('error', (err) => {
            reject(err);
        });

        // 监听输入变化，检测 "/" 命令触发
        rl.on('pause', () => {
            // 输入暂停时的处理
        });
    });
}

/**
 * 带命令补全的智能输入
 */
export async function readWithCommandCompletion(
    prompt: string,
    history: InputHistory
): Promise<{ value: string; history: InputHistory }> {
    const historyArray = [...history.getAll()].reverse();

    return new Promise((resolve, reject) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt,
            history: historyArray,
            tabSize: 2,
            completer: (line: string) => {
                // 输入 "/" 时自动显示所有命令
                if (line === '/') {
                    const commands = getAllCommands();
                    const names = commands.map(c => c.name);
                    return [names, line];
                }
                // 部分匹配
                if (line.startsWith('/')) {
                    const commands = getAllCommands();
                    const names = commands
                        .map(c => c.name)
                        .filter(name => name.startsWith(line));
                    return [names, line];
                }
                return [[], line];
            },
        });

        rl.prompt();

        rl.on('line', (line: string) => {
            const trimmed = line.trim();

            // 检测单独的 "/" 命令
            if (trimmed === '/') {
                showCommands();
                rl.prompt();
                return;
            }

            if (trimmed) {
                history.add(trimmed);
            }

            rl.close();
            resolve({ value: trimmed, history });
        });

        rl.on('SIGINT', () => {
            rl.close();
            process.exit(0);
        });

        rl.on('error', reject);
    });
}
