import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { BaseTool, ToolResult } from './base.js';
import chalk from 'chalk';
import { getBackupManager } from '../util/backup-manager.js';

export class SurgicalEditTool extends BaseTool<any> {

  name = "precise_replace";

  description = `Precise code replacement using line numbers and exact text matching.

IMPORTANT: Supports multi-line replacement. The 'line' parameter specifies the STARTING line number of 'oldText'.

How it works:
1. Find the text segment starting at 'line' that exactly matches 'oldText'
2. Replace that entire segment with 'newText'
3. Both 'oldText' and 'newText' can span multiple lines

Example: If lines 5-10 contain 'old_func', and you want to replace with 'new_func':
- line: 5 (starting line)
- oldText: (exact text from lines 5-10)
- newText: (replacement text)

Use this tool when:
- You need precise control over what gets replaced
- Read/Write tool failed or is too slow
- Working with large files`;

  schema = z.object({
    filePath: z.string().describe("The absolute or relative path to the file"),
    line: z.number().describe("Starting line number (1-based) where oldText begins"),
    oldText: z.string().describe("The exact text to replace - can span multiple lines"),
    newText: z.string().describe("The replacement text - can span multiple lines")
  }).strict();

  async execute({ filePath, line, oldText, newText }: z.infer<typeof this.schema>): Promise<ToolResult> {
    const context = this.getContext();
    const fullPath = path.resolve(context.environment, filePath);

    // === 业务错误：文件不存在 ===
    if (!fs.existsSync(fullPath)) {
      return this.fail('FILE_NOT_FOUND', { filePath });
    }

    // === 备份 ===
    const backupManager = getBackupManager();
    await backupManager.initialize();
    const backupId = await backupManager.backup(fullPath);

    // === 读取文件 ===
    let content: string;
    try {
      content = fs.readFileSync(fullPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file: ${error}`);
    }

    const lines = content.split('\n');

    // === 业务错误：行号越界 ===
    if (line < 1 || line > lines.length) {
      return this.fail(
        'LINE_OUT_OF_RANGE',
        { line, fileLength: lines.length }
      );
    }

    const targetLineIdx = line - 1;

    // 将 oldText 按行分割，用于多行匹配
    const oldTextLines = oldText.split('\n');

    // 检查从指定行开始是否有足够的行数
    if (targetLineIdx + oldTextLines.length > lines.length) {
      return this.fail(
        'TEXT_NOT_FOUND',
        {
          reason: 'Not enough lines from specified position',
          expectedLines: oldTextLines.length,
          availableLines: lines.length - targetLineIdx
        }
      );
    }

    // 提取从指定行开始的实际文本
    const actualText = lines.slice(targetLineIdx, targetLineIdx + oldTextLines.length).join('\n');

    // === 业务错误：oldText 不匹配 ===
    if (actualText !== oldText) {
      return this.fail(
        'TEXT_NOT_FOUND',
        {
          line,
          expectedLines: oldTextLines.length,
          reason: 'Text at specified position does not match oldText',
          expectedPreview: oldTextLines.slice(0, 2).join('\n'),
          actualPreview: lines.slice(targetLineIdx, targetLineIdx + 2).join('\n')
        }
      );
    }

    // === 执行修改（支持多行替换）===
    // 计算替换后的行数
    const newTextLines = newText.split('\n');

    // 替换：删除旧行数，插入新行数
    lines.splice(targetLineIdx, oldTextLines.length, ...newTextLines);

    // === 写入文件 ===
    try {
      fs.writeFileSync(fullPath, lines.join('\n'));
    } catch (error) {
      throw new Error(`Failed to write file: ${error}`);
    }

    console.log(chalk.yellow(`\n[Edit] Modified ${filePath}:${line} (${oldTextLines.length} lines → ${newTextLines.length} lines)`));
    console.log(chalk.red(`- ${oldTextLines.slice(0, 2).join('\n')}${oldTextLines.length > 2 ? '\n...' : ''}`));
    console.log(chalk.green(`+ ${newTextLines.slice(0, 2).join('\n')}${newTextLines.length > 2 ? '\n...' : ''}`));

    // 返回格式化的字符串结果
    let resultMessage = `Modification successful`;
    if (backupId) {
      resultMessage += ` (backup: ${backupId})`;
    }

    return this.success({ 
      filePath, 
      line, 
      backupId,
      message: resultMessage
    });
  }
}
