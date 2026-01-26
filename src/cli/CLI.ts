/**
 * CLI - 交互式命令行界面
 * 使用 prompts 库实现稳定的交互
 */
import { execSync } from 'node:child_process';
import readline from 'readline';
import { ScopedLogger } from '../util/log';
import { Ora } from 'ora';
import Agent from '../agent';
import { executeCommand } from './commands';
import { InputHistory } from './utils';
import { readWithHistory } from './utils/reader';
import type { CommandContext } from './commands/types';

export interface CLIConfig {
    agent: Agent;
    sessionId?: string;
    prompt?: string;
}

export class CLI {
    private agent: Agent;
    private sessionId: { value: string };
    private promptText: string;
    private running: boolean;
    private logger: ScopedLogger;
    private inputHistory: InputHistory;
    private reconnectAttempts: number = 0;
    private readonly maxReconnectAttempts = 3;
    private stdinClosed: boolean = false;
    private abortController: AbortController | null = null;
    private isProcessingTask: boolean = false;
    private escKeyHandler: ((key: string) => void) | null = null;

    constructor(config: CLIConfig) {
        this.agent = config.agent;
        // 使用 AgentContext 中的 sessionId
        this.sessionId = { value: config.sessionId || this.agent.context.sessionId };
        this.promptText = config.prompt || 'You';
        this.running = false;
        this.logger = new ScopedLogger('CLI');
        this.inputHistory = new InputHistory();

        // 设置全局未捕获异常处理
        this.setupGlobalErrorHandlers();
    }

    /**
     * 设置全局错误处理，防止进程意外退出
     */
    private setupGlobalErrorHandlers(): void {
        // 处理未捕获的 Promise rejection
        process.on('unhandledRejection', (reason, promise) => {
            this.logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
            this.logger.warn('Attempting to recover...');
        });

        // 处理未捕获的异常
        process.on('uncaughtException', (error) => {
            this.logger.error(`Uncaught Exception: ${error.message}`);
            this.logger.error(error.stack || '');
            this.logger.warn('CLI encountered a fatal error, attempting to recover...');

            // 尝试恢复，如果多次失败则退出
            this.reconnectAttempts++;
            if (this.reconnectAttempts <= this.maxReconnectAttempts) {
                this.logger.info(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                setTimeout(() => {
                    this.running = true;
                    this.mainLoop().catch(console.error);
                }, 1000);
            } else {
                this.logger.error('Max reconnection attempts reached. Exiting...');
                this.shutdown(1);
            }
        });

        // 处理 SIGHUP/SIGTERM
        const cleanup = () => {
            this.logger.info('Received termination signal, shutting down gracefully...');
            this.shutdown(0);
        };
        process.on('SIGHUP', cleanup);
        process.on('SIGTERM', cleanup);

        // 处理 stdin 关闭
        process.stdin.on('close', () => {
            if (!this.stdinClosed) {
                this.stdinClosed = true;
                this.logger.info('Stdin closed');
                this.shutdown(0);
            }
        });
    }

    /**
     * 启动 ESC 键监听器
     */
    private startEscListener(): void {
        if (this.escKeyHandler) {
            return;
        }

        readline.emitKeypressEvents(process.stdin);
        if (process.stdin.isRaw !== true) {
            process.stdin.setRawMode(true);
        }

        this.escKeyHandler = (key: string) => {
            // ESC 键的转义序列是 \x1B 或 \u001b
            if (key === '\x1B' || key === '\u001b') {
                this.cancelCurrentTask();
            }
            // 同时支持 Ctrl+C 作为取消
            else if (key === '\x03') {
                this.cancelCurrentTask();
            }
        };

        process.stdin.on('keypress', this.escKeyHandler);
    }

    /**
     * 停止 ESC 键监听器
     */
    private stopEscListener(): void {
        if (this.escKeyHandler) {
            process.stdin.off('keypress', this.escKeyHandler);
            this.escKeyHandler = null;
        }
    }

    /**
     * 取消当前正在执行的任务
     */
    private cancelCurrentTask(): void {
        if (this.isProcessingTask && this.abortController) {
            this.logger.info('Cancelling current task...');
            this.abortController.abort();
            this.isProcessingTask = false;
            this.stopEscListener();
            console.log('\n\n⏹️  Task cancelled. Press Enter to continue.\n');
        }
    }

    /**
     * 启动 CLI
     */
    async start(): Promise<void> {
        this.running = true;

        if (process.platform === 'win32') {
            try {
                execSync('chcp 65001>nul');
            } catch (_error) {
                // 忽略失败并保持默认代码页。
            }
        }
        this.printWelcome();

        await this.mainLoop();
    }

    /**
     * 主循环 - 处理用户输入
     */
    private async mainLoop(): Promise<void> {
        while (this.running) {
            try {
                const input = await this.getInput();

                const trimmed = input.trim();
                if (!trimmed) continue;

                await this.handleInput(trimmed);

                // 成功处理后重置重连计数
                this.reconnectAttempts = 0;

            } catch (error) {
                if (error instanceof Error) {
                    // 检查是否是用户取消（Ctrl+C）
                    if ((error as any).cancelled || error.message === 'user cancelled') {
                        this.logger.info('Received interrupt signal, exiting...');
                        this.shutdown(0);
                        return;
                    }

                    this.logger.error(`Error in main loop: ${error.message}`);
                } else {
                    this.logger.error(`Unknown error: ${error}`);
                }
            }
        }
    }

    /**
     * 获取用户输入（支持历史记录）
     */
    private async getInput(): Promise<string> {
        try {
            const result = await readWithHistory(this.promptText, this.inputHistory);
            // 更新历史记录引用
            this.inputHistory = result.history;
            return result.value;
        } catch (error) {
            // 如果是用户取消，直接抛出
            if (error instanceof Error && (error as any).cancelled) {
                throw error;
            }
            throw error;
        }
    }

    /**
     * 处理用户输入
     */
    private async handleInput(input: string): Promise<void> {
        const context: CommandContext = {
            agent: this.agent,
            sessionManager: this.agent.sessionManager,
            running: { value: this.running },
            sessionId: this.sessionId,
        };

        const isCommand = await executeCommand(input, context);

        // 更新运行状态
        this.running = context.running.value;

        // 同步 sessionId 从 AgentContext
        this.sessionId.value = this.agent.context.sessionId;

        if (!isCommand) {
            await this.handleChat(input);
        }
    }

    /**
     * 处理对话输入（带流式输出）
     */
    private async handleChat(input: string): Promise<void> {
        // 创建新的 AbortController 用于此任务
        this.abortController = new AbortController();
        this.isProcessingTask = true;

        // 启动 ESC 监听
        this.startEscListener();

        let spinner: Ora | null = this.logger.spinner('Thinking...');

        try {
            // 输出标题
            console.log('\n🤖 Agent:');

            // 禁用自动换行，确保长文本可正确复制
            // \x1B[?7l 禁用自动换行，\x1B[?7h 启用自动换行
            process.stdout.write('\x1B[?7l');

            // 流式响应
            const response = await this.agent.run(input, {
                silent: true,
                stream: true,
                streamCallback: (chunk) => {
                    // 先停止 spinner
                    if (spinner) {
                        spinner.stop();
                        spinner = null;
                    }
                    // 打印内容增量（直接输出到 stdout 以避免缓冲）
                    if (chunk.content) {
                        process.stdout.write(chunk.content);
                    }
                    // 处理结束
                    if (chunk.finish_reason) {
                        process.stdout.write('\n\n');
                    }
                },
                abortSignal: this.abortController.signal,
            });

            if (!response) {
                this.logger.error('❌ Agent failed to respond');
            }
        } catch (error) {
            // 确保 spinner 被停止
            if (spinner) {
                spinner.stop();
                spinner = null;
            }

            // 检查是否是取消错误
            if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('abort'))) {
                // 任务被取消，不打印错误
                console.log('\n⏹️  Task cancelled');
            } else {
                const errorMsg = error instanceof Error ? error.message : String(error);
                this.logger.error(`Error: ${errorMsg}`);
            }
        } finally {
            // 恢复自动换行
            process.stdout.write('\x1B[?7h');

            // 清理状态
            this.isProcessingTask = false;
            this.abortController = null;
            this.stopEscListener();
            spinner?.stop();
       
        }
    }

    /**
     * 打印欢迎信息
     */
    private printWelcome(): void {
        console.log('\n╔════════════════════════════════════════════════╗');
        console.log('║       AI Agent - Interactive Mode              ║');
        console.log('╚════════════════════════════════════════════════╝');
        console.log(`Session: ${this.agent.context.sessionId}`);
        console.log(`Cache: ${this.agent.context.cacheRoot}`);
        console.log('Type /help for available commands');
        console.log('Press ESC or Ctrl+C to cancel current task');
        console.log('Press Ctrl+C twice to exit');
        console.log('');
    }

    /**
     * 优雅退出
     */
    private shutdown(exitCode: number = 0): void {
        this.running = false;
        this.stdinClosed = true;
        this.stopEscListener();
        console.log('\n👋 Goodbye!');
        process.exit(exitCode);
    }

    /**
     * 停止 CLI
     */
    stop(): void {
        this.running = false;
        this.stopEscListener();
    }
}
