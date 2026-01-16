import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { BaseTool } from './base';
import chalk from 'chalk';
import { getBackupManager } from '../util/backup-manager';

export  class SurgicalEditTool extends BaseTool<any> {

  name = "precise_replace";

  description = "Precise code replacement using line numbers and exact text matching. " +
    "IMPORTANT: All text parameters (oldText, newText) should be provided as plain strings, " +
    "NOT wrapped in markdown code blocks or backticks.";

  schema = z.object({
    filePath: z.string().describe("The absolute or relative path to the file"),
    line: z.number().describe("Line number (1-based, starting from 1)"),
    oldText: z.string().describe(
      "The exact text segment to replace on that line. " +
      "Provide as plain text without markdown formatting."
    ),
    newText: z.string().describe(
      "The new replacement text. " +
      "Provide as plain text without markdown formatting."
    )
  });

  async execute({ filePath, line, oldText, newText }: z.infer<typeof this.schema>): Promise<string> {

    const fullPath = path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) return "Error: File not found.";

    // 在修改前备份文件
    const backupManager = getBackupManager();
    await backupManager.initialize();
    const backupId = await backupManager.backup(fullPath);

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    if (line < 1 || line > lines.length) return "Error: Line number out of range.";

    const targetLineIdx = line - 1;
    const originalLine = lines[targetLineIdx];

    if (!originalLine.includes(oldText)) {
      return `Error: text "${oldText}" not found on line ${line}. content is: "${originalLine.trim()}"`;
    }

    const newLine = originalLine.replace(oldText, newText);
    lines[targetLineIdx] = newLine;

    fs.writeFileSync(fullPath, lines.join('\n'));

    console.log(chalk.yellow(`\n[Edit] Modified ${filePath}:${line}`));
    console.log(chalk.red(`- ${originalLine.trim()}`));
    console.log(chalk.green(`+ ${newLine.trim()}`));

    const backupInfo = backupId ? ` (backup: ${backupId})` : '';
    return `Modification successful.${backupInfo}`;
  }
}