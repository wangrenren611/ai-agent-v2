/**
 * 命令处理器类型定义
 */
import type Agent from '../../agent';

export interface CommandContext {
    agent: Agent;
    sessionId: { value: string };
    running: { value: boolean };
}

export interface CommandHandler {
    name: string;
    description: string;
    usage: string;
    aliases?: string[];
    execute(context: CommandContext, args: string[]): Promise<void> | void;
}

export type CommandRegistry = Record<string, CommandHandler>;
