/**
 * Model Commands
 *
 * 模型管理相关命令
 */

import type { Command, CommandHandler, CommandContext } from '../types.js';
import { CommandCategory } from '../types.js';
import { successResult, errorResult } from '../executor.js';

// ============================================================================
// Model Command Handler
// ============================================================================

const handler: CommandHandler = async (context: CommandContext) => {
  // 导航到模型选择页面
  context.navigation.navigateTo('model-select');
  return successResult('Opening model selection...');
};

// ============================================================================
// Command Definition
// ============================================================================

export const modelCommand: Command = {
  id: 'model',
  name: '/model',
  aliases: ['/m'],
  description: 'Manage AI models (list, switch)',
  usage: '/model [list|switch] [name]',
  category: CommandCategory.MODEL,
  handler,
};

export default modelCommand;
