/**
 * CLI - 交互式命令行界面
 * 使用 prompts 库实现稳定的交互
 */
import { ScopedLogger } from '../util/log';
import Agent from '../agent';
import { SessionManager } from '../session-v2';
import { executeCommand } from './commands';
import {  InputHistory } from './utils';
import { readWithHistory } from './utils/reader';
import type { CommandContext } from './commands/types';

export interface CLIConfig {
    agent: Agent;
    sessionManager: SessionManager;
    sessionId?: string;
    prompt?: string;
}

export class CLI {
    private agent: Agent;
    private sessionManager: SessionManager;
    private sessionId: { value: string };
    private promptText: string;
    private running: boolean;
    private logger: ScopedLogger;
    private inputHistory: InputHistory;

    constructor(config: CLIConfig) {
        this.agent = config.agent;
        this.sessionManager = config.sessionManager;
        this.sessionId = { value: config.sessionId || 'session_10001' };
        this.promptText = config.prompt || 'You';
        this.running = false;
        this.logger = new ScopedLogger('CLI');
        this.inputHistory = new InputHistory();
    }

    /**
     * 启动 CLI
     */
    async start(): Promise<void> {
        this.running = true;
        this.printWelcome();

        while (this.running) {
            try {
                const input = await this.getInput();

                const trimmed = input.trim();
                if (!trimmed) continue;

                await this.handleInput(trimmed);

            } catch (error) {
                if (error instanceof Error && error.message === 'user cancelled') {
                    this.shutdown();
                    break;
                }
                console.error('\n❌ Error:', error);
            }
        }
    }

    /**
     * 获取用户输入（支持历史记录）
     */
    private async getInput(): Promise<string> {
        const result = await readWithHistory(this.promptText, this.inputHistory);
        // 更新历史记录引用
        this.inputHistory = result.history;
        return result.value;
    }

    /**
     * 处理用户输入
     */
    private async handleInput(input: string): Promise<void> {
        const context: CommandContext = {
            agent: this.agent,
            running: { value: this.running },
            sessionId: this.sessionId,
            sessionManager: this.sessionManager,
        };

        const isCommand = await executeCommand(input, context);

        // 更新运行状态
        this.running = context.running.value;

        if (!isCommand) {
            await this.handleChat(input);
        }
    }

    /**
     * 处理对话输入（带加载动画）
     */
    private async handleChat(input: string): Promise<void> {
        try {
            const response = await this.agent.run(input, { silent: true });
            if (response) {
                this.logger.info(`\n🤖 Agent:\n${response.content}\n`);
            } else {
                this.logger.error('❌ Agent failed to respond');
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error: ${errorMsg}\n`);
        }
    }

    /**
     * 打印欢迎信息
     */
    private printWelcome(): void {
        console.log('\n╔════════════════════════════════════════════════╗');
        console.log('║       AI Agent - Interactive Mode              ║');
        console.log('╚════════════════════════════════════════════════╝');
        console.log('Type /help for available commands\n');
    }

    /**
     * 优雅退出
     */
    private shutdown(): void {
        this.running = false;
        console.log('\n👋 Goodbye!');
        process.exit(0);
    }

    /**
     * 停止 CLI
     */
    stop(): void {
        this.running = false;
    }
}
