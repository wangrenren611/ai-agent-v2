/**
 * 使用 Node.js 原生 readline 实现的输入处理器
 * 支持上/下箭头浏览历史记录
 * 输入 "/" 后显示可选择命令菜单
 */
import readline from 'readline';
import { InputHistory } from './input';
import { getAllCommands } from '../commands';

export interface ReaderOptions {
    prompt: string;
    history: InputHistory;
}

export interface ReaderResult {
    value: string;
    history: InputHistory;
}

/**
 * 显示可选择命令菜单（Claude Code 风格）
 */
async function showSelectableCommandMenu(): Promise<string> {
    const commands = getAllCommands();

    // 清空当前行
    readline.cursorTo(process.stdout, 0);
    readline.clearLine(process.stdout, 0);

    // 添加 "直接输入" 选项
    const menuItems = [
        { name: '/', description: 'Use slash command...' },
        ...commands.map(c => ({ name: c.name, description: c.description }))
    ];

    let selectedIndex = 0;

    // 获取终端宽度
    const terminalWidth = process.stdout.columns || 100;
    const separator = '─'.repeat(terminalWidth);

    // 显示初始菜单
    console.log('');
    console.log(separator);

    menuItems.forEach((item, index) => {
        const isSelected = index === selectedIndex;
        const prefix = isSelected ? '❯ ' : '  ';

        // 格式化：命令名（左对齐）+ 描述
        const nameWidth = 25;
        const paddedName = item.name.padEnd(nameWidth, ' ');
        const line = `${prefix}${paddedName}${item.description}`;

        console.log(line);
    });

    console.log(separator);

    const menuHeight = menuItems.length + 2; // 顶部线 + 选项 + 底部线

    return new Promise((resolve) => {
        const stdin = process.stdin;
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf-8');

        // 移动光标到第一个菜单项
        readline.moveCursor(process.stdout, 0, -menuHeight);

        const redrawMenu = () => {
            // 重新绘制整个菜单
            readline.moveCursor(process.stdout, 0, -menuHeight);

            console.log(separator);

            menuItems.forEach((item, index) => {
                const isSelected = index === selectedIndex;
                const prefix = isSelected ? '❯ ' : '  ';

                const nameWidth = 25;
                const paddedName = item.name.padEnd(nameWidth, ' ');
                const line = `${prefix}${paddedName}${item.description}`;

                console.log(line);
            });

            console.log(separator);
        };

        const onData = (key: string) => {
            // 处理特殊键
            if (key === '\x1B[A') { // 上箭头
                selectedIndex = Math.max(0, selectedIndex - 1);
                redrawMenu();
            } else if (key === '\x1B[B') { // 下箭头
                selectedIndex = Math.min(menuItems.length - 1, selectedIndex + 1);
                redrawMenu();
            } else if (key === '\r' || key === '\n') { // 回车
                cleanup();
                resolve(selectedIndex === 0 ? '' : menuItems[selectedIndex].name);
            } else if (key === '\x1B' || key === '\x03') { // ESC 或 Ctrl+C
                cleanup();
                resolve('');
            }
        };

        const cleanup = () => {
            stdin.off('data', onData);
            stdin.setRawMode(false);
            stdin.pause();

            // 清除整个菜单区域
            readline.moveCursor(process.stdout, 0, 1);
            readline.clearScreenDown(process.stdout);

            // 恢复提示符
            process.stdout.write('\r');
        };

        stdin.on('data', onData);
    });
}

/**
 * 创建支持历史导航的 readline
 */
export function createReader(options: ReaderOptions): Promise<ReaderResult> {
    return new Promise((resolve, reject) => {
        const historyArray = [...options.history.getAll()].reverse();

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: options.prompt,
            history: historyArray,
            tabSize: 2,
        });

        rl.prompt();

        rl.on('line', (line: string) => {
            const trimmed = line.trim();

            // 输入 "/" 时显示可选择命令菜单
            if (trimmed === '/') {
                rl.pause();
                showSelectableCommandMenu().then((selected) => {
                    if (selected) {
                        rl.close();
                        resolve({
                            value: selected,
                            history: options.history,
                        });
                    } else {
                        // 用户取消，继续等待输入
                        rl.prompt();
                    }
                });
                return;
            }

            if (trimmed) {
                options.history.add(trimmed);
            }

            rl.close();
            resolve({
                value: trimmed,
                history: options.history,
            });
        });

        rl.on('SIGINT', () => {
            rl.close();
            process.exit(0);
        });

        rl.on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * 读取用户输入（支持历史导航）
 */
export async function readWithHistory(
    prompt: string,
    history: InputHistory
): Promise<{ value: string; history: InputHistory }> {
    return createReader({ prompt, history });
}

/**
 * 创建 readline 接口（供外部使用）
 */
export function createReadlineInterface(prompt: string): readline.ReadLine {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt,
    });
    return rl;
}
