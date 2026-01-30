/**
 * Command System Types
 *
 * 定义指令系统的核心类型接口
 */

// ============================================================================
// Imports
// ============================================================================

import type { Agent } from '../../agent';
import type { IReadOnlySession, ISessionManager } from '../core/session/types';
import type { INavigationService } from '../core/navigation/types';

// ============================================================================
// Command Context - Type Safe
// ============================================================================

/**
 * 命令上下文 - 类型安全的接口
 * 移除 [key: string]: unknown 以确保完全类型安全
 */
export interface CommandContext {
  /** 输入的原始命令字符串 */
  readonly input: string;

  /** 会话只读视图 */
  readonly session: IReadOnlySession;

  /** Agent 实例（如果已初始化） */
  readonly agent: Agent | undefined;

  /** 会话管理器 - 提供会话操作 */
  readonly sessionManager: ISessionManager;

  /** 导航服务 - 提供页面导航 */
  readonly navigation: INavigationService;

  /** 显示命令结果 */
  readonly showResult: (result: CommandResult) => void;
}

// ============================================================================
// Command Handler
// ============================================================================

export type CommandHandler = (
  context: CommandContext,
  args?: string[]
) => Promise<CommandResult> | CommandResult;

// ============================================================================
// Command Result
// ============================================================================

export interface CommandResult {
  success: boolean;
  message?: string;
  data?: unknown;
  exit?: boolean;
}

// ============================================================================
// Command Definition
// ============================================================================

export interface Command {
  id: string;
  name: string;
  aliases?: string[];
  description: string;
  usage?: string;
  category: CommandCategory;
  handler: CommandHandler;
  private?: boolean;
}

// ============================================================================
// Command Categories
// ============================================================================

export enum CommandCategory {
  CORE = 'core',
  SESSION = 'session',
  FILE = 'file',
  MEMORY = 'memory',
  MODEL = 'model',
}

// ============================================================================
// Command Registry Interface
// ============================================================================

export interface ICommandRegistry {
  register(command: Command): void;
  unregister(name: string): void;
  get(name: string): Command | undefined;
  getAll(): Command[];
  getByCategory(category: CommandCategory): Command[];
  exists(name: string): boolean;
}

// ============================================================================
// Command Parser Interface
// ============================================================================

export interface ICommandParser {
  parse(input: string): ParsedCommand | null;
  isCommand(input: string): boolean;
}

// ============================================================================
// Parsed Command
// ============================================================================

export interface ParsedCommand {
  command: Command;
  args: string[];
  raw: string;
}

// ============================================================================
// Command Execution Options
// ============================================================================

export interface CommandExecutionOptions {
  silent?: boolean;
  exitOnMatch?: boolean;
}

// ============================================================================
// Command Executor
// ============================================================================

export interface ICommandExecutor {
  execute(input: string, context?: CommandContext): Promise<CommandResult | null>;
  executeCommand(command: Command, args: string[], context?: CommandContext): Promise<CommandResult>;
}
