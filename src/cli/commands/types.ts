/**
 * 命令处理器类型定义
 */
import type Agent from '../../agent';
import type { SessionManager } from '../../session-v2';

export interface CommandContext {
    agent: Agent;
    sessionManager: SessionManager;
    running: { value: boolean };
    sessionId: { value: string };
}

export interface CommandHandler {
    name: string;
    description: string;
    usage: string;
    aliases?: string[];
    execute(context: CommandContext, args: string[]): Promise<void> | void;
}

export type CommandRegistry = Record<string, CommandHandler>;
