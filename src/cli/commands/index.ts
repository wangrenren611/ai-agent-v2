/**
 * Command System Entry Point
 *
 * 导出所有命令相关模块，并初始化命令注册表
 */

// ============================================================================
// Type Exports
// ============================================================================

export * from './types.js';

// ============================================================================
// Registry Exports
// ============================================================================

export { commandRegistry, CommandRegistry } from './registry.js';

// ============================================================================
// Parser Exports
// ============================================================================

export { commandParser, CommandParser } from './parser.js';

// ============================================================================
// Executor Exports
// ============================================================================

export { commandExecutor, CommandExecutor } from './executor.js';
export { successResult, errorResult, exitResult } from './executor.js';

// ============================================================================
// Core Commands
// ============================================================================

export { helpCommand } from './core/help.js';
export { clearCommand } from './core/clear.js';
export { exitCommand } from './core/exit.js';
export { versionCommand } from './core/version.js';

// ============================================================================
// Session Commands
// ============================================================================

export { sessionCommand } from './session/index.js';

// ============================================================================
// Model Commands
// ============================================================================

export { modelCommand } from './model/index.js';

// ============================================================================
// File Commands
// ============================================================================

export { fileCommand } from './file/index.js';

// ============================================================================
// Memory Commands
// ============================================================================

export { memoryCommand } from './memory/index.js';

// ============================================================================
// Command Registration
// ============================================================================

import { commandRegistry } from './registry.js';
import { helpCommand } from './core/help.js';
import { clearCommand } from './core/clear.js';
import { exitCommand } from './core/exit.js';
import { versionCommand } from './core/version.js';
import { sessionCommand } from './session/index.js';
import { modelCommand } from './model/index.js';
import { fileCommand } from './file/index.js';
import { memoryCommand } from './memory/index.js';

/**
 * 初始化并注册所有默认命令
 */
export function registerDefaultCommands(): void {
  // Core commands
  commandRegistry.register(helpCommand);
  commandRegistry.register(clearCommand);
  commandRegistry.register(exitCommand);
  commandRegistry.register(versionCommand);

  // Session commands
  commandRegistry.register(sessionCommand);

  // Model commands
  commandRegistry.register(modelCommand);

  // File commands
  commandRegistry.register(fileCommand);

  // Memory commands
  commandRegistry.register(memoryCommand);
}
