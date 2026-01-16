import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { BaseTool } from './base';
import chalk from 'chalk';
import { getBackupManager } from '../util/backup-manager';

/**
 * BatchReplaceTool - 批量替换工具
 *
 * 允许在单个调用中替换同一文件的多个位置，提高效率
 */
export class BatchReplaceTool extends BaseTool<any> {

  name = "batch_replace";

  description = "Replace multiple text segments in a file in a single call. Use for batch modifications like translating multiple comments or updating related JSDoc.";

  schema = z.object({
    filePath: z.string().describe("Path to the file to modify"),
    replacements: z.array(z.object({
      line: z.number().describe("Line number (1-based)"),
      oldText: z.string().describe("The exact text segment to replace"),
      newText: z.string().describe("The new text")
    })).describe("Array of replacements to apply in order")
  });

  async execute({ filePath, replacements }: z.infer<typeof this.schema>): Promise<string> {

    const fullPath = path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
      return `Error: File not found: ${filePath}`;
    }

    // 在修改前备份文件
    const backupManager = getBackupManager();
    await backupManager.initialize();
    const backupId = await backupManager.backup(fullPath);

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    const results: string[] = [];
    let modifiedCount = 0;

    // Sort replacements by line number (descending) to avoid line number shifting issues
    // Actually, for line-based replacement without shifting, we can process in any order
    // since we're replacing text within lines, not adding/removing lines

    for (const repl of replacements) {
      const { line, oldText, newText } = repl;

      if (line < 1 || line > lines.length) {
        results.push(`❌ Line ${line}: out of range (file has ${lines.length} lines)`);
        continue;
      }

      const targetLineIdx = line - 1;
      const originalLine = lines[targetLineIdx];

      if (!originalLine.includes(oldText)) {
        results.push(`❌ Line ${line}: "${oldText}" not found. Content: "${originalLine.trim()}"`);
        continue;
      }

      const newLine = originalLine.replace(oldText, newText);
      lines[targetLineIdx] = newLine;
      modifiedCount++;

      console.log(chalk.yellow(`[Batch Edit] ${filePath}:${line}`));
      console.log(chalk.red(`- ${originalLine.trim()}`));
      console.log(chalk.green(`+ ${newLine.trim()}`));
    }

    // Write all changes at once
    if (modifiedCount > 0) {
      fs.writeFileSync(fullPath, lines.join('\n'));
    }

    const backupInfo = backupId ? ` (backup: ${backupId})` : '';
    const summary = `\n✅ Modified ${modifiedCount}/${replacements.length} replacements in ${filePath}${backupInfo}`;
    console.log(chalk.green(summary));

    if (results.length > 0) {
      return `${summary}\n\nDetails:\n${results.join('\n')}`;
    }

    return summary;
  }
}
