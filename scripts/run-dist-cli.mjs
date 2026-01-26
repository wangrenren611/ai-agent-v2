#!/usr/bin/env node
/**
 * 独立 CLI - 使用编译后的 dist 代码
 */
import { createInterface } from 'readline';
import { stdin, stdout } from 'process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
const dotenv = await import('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env.development'), override: true });

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logWelcome() {
    console.log('');
    log('green', '╔════════════════════════════════════════════════╗');
    log('green', '║       AI Agent - Interactive Mode              ║');
    log('green', '╚════════════════════════════════════════════════╝');
    console.log('');
    log('gray', 'Type /help for available commands');
    console.log('');
}

// 历史记录
const history = [];
let historyIndex = -1;

// 命令列表
const commands = {
    '/help': { description: 'Show help', execute: showHelp },
    '/exit': { description: 'Exit', execute: () => process.exit(0) },
    '/quit': { description: 'Exit', execute: () => process.exit(0) },
    '/clear': { description: 'Clear screen', execute: () => console.clear() },
    '/history': { description: 'Show history', execute: showHistory },
};

function showHelp() {
    console.log('');
    log('cyan', '📖 Available Commands:\n');
    Object.entries(commands).forEach(([name, cmd]) => {
        console.log(`  ${name.padEnd(10)} ${cmd.description}`);
    });
    console.log('');
}

function showHistory() {
    console.log('');
    log('cyan', '📜 Command History:\n');
    history.forEach((cmd, i) => {
        console.log(`  ${i + 1}. ${cmd}`);
    });
    console.log('');
}

function parseCommand(input) {
    if (!input.startsWith('/')) return null;
    const parts = input.trim().split(/\s+/);
    return { command: parts[0].toLowerCase(), args: parts.slice(1) };
}

async function main() {
    logWelcome();

    // 加载依赖
    log('gray', 'Loading...');
    
    try {
        // 使用 require 导入 CommonJS 模块
        const toolIndex = path.join(__dirname, '..', 'dist', 'tool', 'index.js');
        const providerIndex = path.join(__dirname, '..', 'dist', 'providers', 'openai.js');
        const agentIndex = path.join(__dirname, '..', 'dist', 'agent', 'index.js');
        const promptIndex = path.join(__dirname, '..', 'dist', 'prompts', 'operator.js');

        const toolModule = require(toolIndex);
        const providerModule = require(providerIndex);
        const agentModule = require(agentIndex);
        const promptModule = require(promptIndex);

        const { registerDefaultToolsAsync, ToolRegistry } = toolModule;
        const { OpenAIProvider } = providerModule;
        const Agent = agentModule.default;
        const { operatorPrompt } = promptModule;

        await registerDefaultToolsAsync();

        const apiKey = process.env.DEEPSEEK_API_KEY;
        const baseUrl = process.env.DEEPSEEK_BASE_URL;

        if (!apiKey || !baseUrl) {
            throw new Error('DEEPSEEK_API_KEY or DEEPSEEK_BASE_URL not set');
        }

        log('gray', `Available tools: ${ToolRegistry.getNames().join(', ')}`);
        console.log('');

        const llmProvider = new OpenAIProvider({ apiKey, baseURL: baseUrl });
        const customPrompt = operatorPrompt({ directory: __dirname, vcs: 'git', language: 'Chinese' });
        const sessionId = new Date().getTime().toString();

        const agent = new Agent({
            llmProvider,
            systemPrompt: customPrompt,
            defaultTools: ToolRegistry.getSchemas(),
            sessionId,
        });
        agent.start();

        // 创建 readline 接口
        const rl = createInterface({
            input: stdin,
            output: stdout,
            prompt: `${colors.green}> ${colors.reset}`,
        });

        log('green', 'CLI ready! Enter your message:');
        console.log('');

        rl.on('line', async (input) => {
            const trimmed = input.trim();
            
            if (!trimmed) {
                rl.prompt();
                return;
            }

            // 添加到历史
            history.push(trimmed);
            historyIndex = -1;

            // 检查是否是命令
            const parsed = parseCommand(trimmed);
            if (parsed) {
                const cmd = commands[parsed.command];
                if (cmd) {
                    cmd.execute();
                } else {
                    log('red', `❌ Unknown command: ${parsed.command}`);
                    console.log('Type /help for available commands.\n');
                }
            } else {
                // 发送消息到 agent
                log('blue', '👤 You:');
                console.log(trimmed);
                console.log('');
                log('yellow', '🤖 Agent: Thinking...');
                console.log('');

                try {
                    const response = await agent.run(trimmed, {
                        silent: true,
                        stream: true,
                        streamCallback: (chunk) => {
                            if (chunk.content) process.stdout.write(chunk.content);
                            if (chunk.finish_reason) process.stdout.write('\n\n');
                        },
                    });

                    if (response) {
                        log('green', '✅ Done');
                    }
                } catch (error) {
                    log('red', `❌ Error: ${error.message}`);
                }
            }

            console.log('');
            rl.prompt();
        });

        rl.on('close', () => {
            process.exit(0);
        });

        rl.input.on('SIGINT', () => {
            log('gray', '\n(Type /exit to quit)');
            rl.prompt();
        });

        rl.prompt();

    } catch (error) {
        log('red', `❌ Failed to initialize: ${error.message}`);
        process.exit(1);
    }
}

main();
