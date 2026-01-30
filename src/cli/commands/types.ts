/**
 * Command System Types
 *
 * 定义指令系统的核心类型接口
 */

// ============================================================================
// Command Context
// ============================================================================

import type { Agent } from '../../agent';

// ============================================================================
// Command Context
// ============================================================================

export interface CommandContext {
  input: string;
  sessionId?: string;
  userId?: string;
  model?: string;
  agent?: Agent;
  [key: string]: unknown;
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
