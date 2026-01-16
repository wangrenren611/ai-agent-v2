import fs from 'fs';
import path from 'path';
import { isBinaryFile } from 'isbinaryfile';
import { z } from 'zod';
import { BaseTool } from './base';
import { getBackupManager } from '../util/backup-manager';


const readFileSchema = z.object({
    filePath: z.string(),
    startLine: z.number().optional().describe("The line number to start reading from (0-based)"),
    endLine: z.number().optional().describe("The number of lines to read (defaults to 2000)")
})

export class ReadFileTool extends BaseTool<typeof readFileSchema> {
  name = "read_file";
  description = `Read file content with line numbers.
IMPORTANT USAGE GUIDELINES:
- DEFAULT: Read the ENTIRE file by omitting startLine/endLine parameters
- ONLY use range reading for files larger than 500 lines
- If you need to read a file, ALWAYS try reading it completely first
- The tool will return line numbers to help you navigate
Most files are small enough to read entirely. Avoid premature optimization.`;
  schema = readFileSchema;

  async execute(args: { filePath: string; startLine?: number; endLine?: number; }): Promise<string> {
    const { filePath, startLine, endLine } = args;
    const fullPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) return "Error: File not found.";
    if (await isBinaryFile(fullPath)) return "Error: Cannot read binary file.";

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    
    const start = (startLine || 1) - 1;
    const end = endLine || lines.length;
    
    const numbered = lines.slice(start, end).map((l, i) => `${start + i + 1} | ${l}`).join('\n');
    
    return `--- FILE: ${filePath} ---\nRange: ${start+1} - ${end}\n\n${numbered}`;
  }
}

const writeFileSchema = z.object({
    filePath: z.string().describe("The absolute or relative path to the file"),
    content: z.string().describe(
        "The complete file content as a plain string. " +
        "IMPORTANT: Provide the raw content directly, NOT wrapped in markdown code blocks or backticks. " +
        "All newlines, quotes, and special characters will be properly handled automatically."
    ),
})

export class WriteFileTool extends BaseTool<typeof writeFileSchema> {

  name = "write_file";

  description =
    "Write the entire file content. " +
    "IMPORTANT: For the content parameter, provide the raw file content directly as a plain string. " +
    "Do NOT wrap it in markdown code blocks (```), backticks, or any other formatting. " +
    "Just pass the actual file content as-is.";

  schema = writeFileSchema;

  async execute({ filePath, content }: any) {
    const fullPath = path.resolve(process.cwd(), filePath);

    // 在写入前备份现有文件（如果存在）
    const backupManager = getBackupManager();
    await backupManager.initialize();
    const backupId = await backupManager.backup(fullPath);

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);

    const backupInfo = backupId ? ` (backup: ${backupId})` : '';
    return `File ${filePath} written successfully.${backupInfo}`;
  }
}
