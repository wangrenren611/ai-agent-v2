/**
 * Command Executor
 *
 * 指令执行器，负责执行命令并处理结果
 */

import type {
  Command,
  CommandContext,
  CommandResult,
  CommandExecutionOptions,
  ICommandExecutor,
} from './types.js';
import { commandParser } from './parser.js';
import { commandRegistry } from './registry.js';
import { ScopedLogger } from '../../util/log.js';

// ============================================================================
// Logger
// ============================================================================

const logger = new ScopedLogger('CommandExecutor');

// ============================================================================
// Default Execution Options
// ============================================================================

const DEFAULT_OPTIONS: Required<CommandExecutionOptions> = {
  silent: false,
  exitOnMatch: false,
};

// ============================================================================
// CommandExecutor Implementation
// ============================================================================

export class CommandExecutor implements ICommandExecutor {
  private options: CommandExecutionOptions;

  constructor(options?: CommandExecutionOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 执行输入（自动识别是否为命令）
   */
  async execute(input: string, context?: CommandContext): Promise<CommandResult | null> {
    const trimmedInput = input.trim();

    // 空输入
    if (!trimmedInput) {
      return null;
    }

    // 检查是否为命令（只检查是否以 / 开头）
    if (!commandParser.isCommand(trimmedInput)) {
      return null;
    }

    // 解析命令
    const parsed = commandParser.parse(trimmedInput);

    // 如果解析失败（无效命令），当作普通输入处理
    if (!parsed) {
      return null;
    }

    // 执行命令
    return this.executeCommand(parsed.command, parsed.args, context);
  }

  /**
   * 执行指定命令
   */
  async executeCommand(command: Command, args: string[], context?: CommandContext): Promise<CommandResult> {
    try {
      const result = await command.handler(context, args);
      return result;
    } catch (error) {
      // console.error('[CommandExecutor] Command handler error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error executing command "${command.name}": ${errorMessage}`);

      return {
        success: false,
        message: `Error: ${errorMessage}`,
      };
    }
  }

  /**
   * 更新执行选项
   */
  setOptions(options: Partial<CommandExecutionOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * 获取当前执行选项
   */
  getOptions(): CommandExecutionOptions {
    return { ...this.options };
  }
}

// ============================================================================
// Global Executor Instance
// ============================================================================

export const commandExecutor = new CommandExecutor();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 创建成功结果
 */
export function successResult(message?: string, data?: unknown): CommandResult {
  return {
    success: true,
    message,
    data,
  };
}

/**
 * 创建失败结果
 */
export function errorResult(message: string, data?: unknown): CommandResult {
  return {
    success: false,
    message,
    data,
  };
}

/**
 * 创建退出结果
 */
export function exitResult(message?: string): CommandResult {
  return {
    success: true,
    message,
    exit: true,
  };
}
