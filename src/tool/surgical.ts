import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { BaseTool, ToolResult } from './base';
import chalk from 'chalk';
import { getBackupManager } from '../util/backup-manager';

export class SurgicalEditTool extends BaseTool<any> {

  name = "precise_replace";

  description = "Precise code replacement using line numbers and exact text matching.";

  schema = z.object({
    filePath: z.string().describe("The absolute or relative path to the file"),
    line: z.number().describe("Line number (1-based)"),
    oldText: z.string().describe("The exact text segment to replace"),
    newText: z.string().describe("The new replacement text")
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
    const originalLine = lines[targetLineIdx];

    // === 业务错误：oldText 不匹配 ===
    if (!originalLine.includes(oldText)) {
      return this.fail(
        'TEXT_NOT_FOUND',
        { line, expectedText: oldText, actualText: originalLine.trim() }
      );
    }

    // === 执行修改 ===
    const newLine = originalLine.replace(oldText, newText);
    lines[targetLineIdx] = newLine;

    // === 写入文件 ===
    try {
      fs.writeFileSync(fullPath, lines.join('\n'));
    } catch (error) {
      throw new Error(`Failed to write file: ${error}`);
    }

    console.log(chalk.yellow(`\n[Edit] Modified ${filePath}:${line}`));
    console.log(chalk.red(`- ${originalLine.trim()}`));
    console.log(chalk.green(`+ ${newLine.trim()}`));

    return this.success(
      { filePath, line, backupId },
      { modified: true }
    );
  }
}
