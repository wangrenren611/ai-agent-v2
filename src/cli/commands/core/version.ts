/**
 * Version Command
 *
 * 显示版本信息
 */

import type { Command, CommandHandler, CommandContext } from '../types.js';
import { CommandCategory } from '../types.js';
import { successResult } from '../executor.js';

// ============================================================================
// Version Command Handler
// ============================================================================

const handler: CommandHandler = async (context: CommandContext) => {
  const version = process.env.npm_package_version || '1.0.1';
  const name = process.env.npm_package_name || 'Qpscode';

  const message = `
${name} v${version}

Built with ❤️ using:
- TypeScript
- React + Ink
- Node.js
  `.trim();

  return successResult(message);
};

// ============================================================================
// Command Definition
// ============================================================================

export const versionCommand: Command = {
  id: 'version',
  name: '/version',
  aliases: ['/v'],
  description: 'Show version information',
  category: CommandCategory.CORE,
  handler,
};

export default versionCommand;
