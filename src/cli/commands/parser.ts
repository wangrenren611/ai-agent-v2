/**
 * Command Parser
 *
 * 指令解析器，识别和解析用户输入中的命令
 */

import type {
  Command,
  ICommandParser,
  ParsedCommand,
} from './types.js';
import { commandRegistry } from './registry.js';
import { ScopedLogger } from '../../util/log.js';

// ============================================================================
// Logger
// ============================================================================

const logger = new ScopedLogger('CommandParser');

// ============================================================================
// CommandParser Implementation
// ============================================================================

export class CommandParser implements ICommandParser {
  private commandPrefix: string;

  constructor(prefix: string = '/') {
    this.commandPrefix = prefix;
  }

  /**
   * 解析输入字符串，如果是命令则返回解析结果
   */
  parse(input: string): ParsedCommand | null {
    const trimmedInput = input.trim();

    // 检查是否以命令前缀开头
    if (!trimmedInput.startsWith(this.commandPrefix)) {
      return null;
    }

    // 提取命令名称和参数
    const parts = trimmedInput.slice(this.commandPrefix.length).trim().split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    // 查找命令（先尝试带前缀的完整命令名）
    let command = commandRegistry.get(this.commandPrefix + commandName);

    // 如果没找到，尝试不带前缀的命令名（兼容别名）
    if (!command) {
      command = commandRegistry.get(commandName);
    }

    if (!command) {
      logger.debug(`Command "${commandName}" not found (tried with and without prefix)`);
      return null;
    }

    logger.debug(`Parsed command: ${command.name} with args: ${JSON.stringify(args)}`);

    return {
      command,
      args,
      raw: trimmedInput,
    };
  }

  /**
   * 检查输入是否为命令
   */
  isCommand(input: string): boolean {
    return input.trim().startsWith(this.commandPrefix);
  }

  /**
   * 设置命令前缀
   */
  setPrefix(prefix: string): void {
    this.commandPrefix = prefix;
  }

  /**
   * 获取命令前缀
   */
  getPrefix(): string {
    return this.commandPrefix;
  }
}

// ============================================================================
// Global Parser Instance
// ============================================================================

export const commandParser = new CommandParser('/');
