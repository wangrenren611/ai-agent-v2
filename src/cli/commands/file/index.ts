/**
 * File Commands
 *
 * 文件操作相关命令（保存、加载、导出）
 */

import type { Command, CommandHandler, CommandContext } from '../types.js';
import { CommandCategory } from '../types.js';
import { successResult, errorResult } from '../executor.js';
import { promises as fs } from 'fs';
import { join } from 'path';

// ============================================================================
// File Command Handler
// ============================================================================

const handler: CommandHandler = async (context: CommandContext, args?: string[]) => {
  const action = args?.[0];
  const filePath = args?.[1];

  if (!action) {
    return errorResult('Please specify an action. Usage: /file [save|load|export] [path]');
  }

  switch (action) {
    case 'save':
      return handleSave(context, filePath);

    case 'load':
      return handleLoad(filePath);

    case 'export':
      return handleExport(context, filePath);

    default:
      return errorResult(`Unknown file action: ${action}. Available: save, load, export`);
  }
};

// ============================================================================
// Handler Functions
// ============================================================================

async function handleSave(context: CommandContext, filePath?: string) {
  const messages = context.messages as any[] | undefined;

  if (!messages || messages.length === 0) {
    return errorResult('No messages to save');
  }

  const targetPath = filePath || join(process.cwd(), `conversation_${Date.now()}.json`);

  try {
    const data = JSON.stringify(messages, null, 2);
    await fs.writeFile(targetPath, data, 'utf-8');
    return successResult(`Conversation saved to: ${targetPath}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorResult(`Failed to save file: ${errorMessage}`);
  }
}

async function handleLoad(filePath?: string) {
  if (!filePath) {
    return errorResult('Please provide a file path. Usage: /file load <path>');
  }

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const messages = JSON.parse(data);
    return successResult('Conversation loaded (implement loading logic)', messages);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorResult(`Failed to load file: ${errorMessage}`);
  }
}

async function handleExport(context: CommandContext, filePath?: string) {
  const messages = context.messages as any[] | undefined;

  if (!messages || messages.length === 0) {
    return errorResult('No messages to export');
  }

  const targetPath = filePath || join(process.cwd(), `conversation_${Date.now()}.md`);

  try {
    // 格式化为 Markdown
    const markdown = formatAsMarkdown(messages);
    await fs.writeFile(targetPath, markdown, 'utf-8');
    return successResult(`Conversation exported to: ${targetPath}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorResult(`Failed to export file: ${errorMessage}`);
  }
}

function formatAsMarkdown(messages: any[]): string {
  const lines: string[] = [];

  lines.push('# Conversation Export');
  lines.push(`\nDate: ${new Date().toISOString()}\n`);
  lines.push('---\n');

  for (const msg of messages) {
    const role = msg.role || 'unknown';
    const roleHeader = role.charAt(0).toUpperCase() + role.slice(1);

    lines.push(`## ${roleHeader}`);
    lines.push('');
    lines.push(msg.content || '(empty)');
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================================================
// Command Definition
// ============================================================================

export const fileCommand: Command = {
  id: 'file',
  name: '/file',
  description: 'File operations (save, load, export conversation)',
  usage: '/file [save|load|export] [path]',
  category: CommandCategory.FILE,
  handler,
};

export default fileCommand;
