import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { BaseTool } from './base';
import chalk from 'chalk';

export  class SurgicalEditTool extends BaseTool<any> {

  name = "precise_replace";


  description = "Precise code replacement. Use line number and exact text matches from search_code to make safe modifications.";
  schema = z.object({
    filePath: z.string(),
    line: z.number().describe("Line number (1-based)"),
    oldText: z.string().describe("The exact text segment to replace on that line"),
    newText: z.string().describe("The new text")
  });

  async execute({ filePath, line, oldText, newText }: z.infer<typeof this.schema>): Promise<string> {

    const fullPath = path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) return "Error: File not found.";

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

    return "Modification successful.";
  }
}