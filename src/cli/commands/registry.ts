/**
 * Command Registry
 *
 * 指令注册表，管理所有可用指令的注册和查询
 */

import type {
  Command,
  CommandCategory,
  ICommandRegistry,
} from './types.js';
import { ScopedLogger } from '../../util/log.js';

// ============================================================================
// Logger
// ============================================================================

const logger = new ScopedLogger('CommandRegistry');

// ============================================================================
// CommandRegistry Implementation
// ============================================================================

export class CommandRegistry implements ICommandRegistry {
  private commands: Map<string, Command> = new Map();
  private aliasMap: Map<string, string> = new Map();

  // -------------------------------------------------------------------------
  // Public Methods
  // -------------------------------------------------------------------------

  /**
   * 注册一个命令
   */
  register(command: Command): void {
    if (this.commands.has(command.name)) {
      logger.warn(`Command "${command.name}" already registered, overwriting`);
    }

    this.commands.set(command.name, command);

    // 注册别名
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliasMap.set(alias, command.name);
        logger.debug(`Registered alias "${alias}" for "${command.name}"`);
      }
    }

    logger.debug(`Registered command: ${command.name}`);
  }

  /**
   * 注销一个命令
   */
  unregister(name: string): void {
    const command = this.get(name);
    if (!command) {
      logger.warn(`Command "${name}" not found for unregistration`);
      return;
    }

    // 删除主命令
    this.commands.delete(command.name);

    // 删除别名
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliasMap.delete(alias);
      }
    }

    logger.debug(`Unregistered command: ${command.name}`);
  }

  /**
   * 根据名称获取命令（支持别名）
   */
  get(name: string): Command | undefined {
    // 先检查别名
    const canonicalName = this.aliasMap.get(name);
    if (canonicalName) {
      return this.commands.get(canonicalName);
    }

    // 直接查找
    return this.commands.get(name);
  }

  /**
   * 获取所有命令
   */
  getAll(): Command[] {
    return Array.from(this.commands.values()).filter(cmd => !cmd.private);
  }

  /**
   * 按分类获取命令
   */
  getByCategory(category: CommandCategory): Command[] {
    return this.getAll().filter(cmd => cmd.category === category);
  }

  /**
   * 检查命令是否存在
   */
  exists(name: string): boolean {
    return this.commands.has(name) || this.aliasMap.has(name);
  }

  /**
   * 清空所有命令
   */
  clear(): void {
    this.commands.clear();
    this.aliasMap.clear();
    logger.debug('Cleared all commands');
  }
}

// ============================================================================
// Global Registry Instance
// ============================================================================

export const commandRegistry = new CommandRegistry();
