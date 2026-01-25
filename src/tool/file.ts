import fs from 'fs';
import path from 'path';
import { isBinaryFile } from 'isbinaryfile';
import { z } from 'zod';
import { BaseTool, ToolOutput } from './base';
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
- Most files are small enough to read entirely. Avoid premature optimization

Path formats supported:
- Relative paths: "src/file.ts", "./src/file.ts"
- Absolute paths: "/home/user/file.ts" (Unix), "C:\\Users\\user\\file.ts" (Windows)
- The tool automatically normalizes paths for cross-platform compatibility`;

  schema = readFileSchema;

  async execute(args: { filePath: string; startLine?: number; endLine?: number; }): Promise<ToolOutput> {
    const { filePath, startLine, endLine } = args;

    // 规范化路径以支持跨平台
    // Windows: D:\work\file.ts -> D:\work\file.ts
    // Unix: /home/user/file.ts -> /home/user/file.ts
    // Relative: src/file.ts -> /current/dir/src/file.ts
    const normalizedPath = filePath.replace(/\\/g, '/');
    const fullPath = path.resolve(process.cwd(), normalizedPath);

    // 检查路径是否存在
    if (!fs.existsSync(fullPath)) {
      return {
        metadata: { ok: false, message: 'FILE_NOT_FOUND', filePath },
        output: `Error: File not found at path: ${filePath}\nResolved path: ${fullPath}`,
      };
    }

    // 检查路径是否是文件（不是目录）
    const stats = fs.statSync(fullPath);
    if (!stats.isFile()) {
      return {
        metadata: { ok: false, message: 'NOT_A_FILE', pathType: 'directory', filePath },
        output: `Error: Path provided is not a file. It is a directory.\nPath: ${filePath}\nHint: To read a file, specify the full file path including the filename.`,
      };
    }

    // 检查是否是二进制文件
    if (await isBinaryFile(fullPath)) {
      return {
        metadata: { ok: false, message: 'BINARY_FILE', filePath },
        output: `Error: Cannot read binary file. Path: ${filePath}`,
      };
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    const start = (startLine || 1) - 1;
    const end = endLine || lines.length;

    const numbered = lines.slice(start, end).map((l, i) => `${start + i + 1} | ${l}`).join('\n');
    return{
       metadata: {
        ok: true,
        filePath,
        startLine:start+1,
        endLine:end,
        content:numbered,
        message: 'File content read successfully',
       },
       output: `--- FILE: ${filePath} ---\nRange: ${start+1} - ${end}\n\n${numbered}`,
    }
  }
}

const writeFileSchema = z.object({
    filePath: z.string().describe("Required. The absolute or relative path to the file"),
    content: z.string().describe(
        "Required. The complete file content as a plain string. " +
        "IMPORTANT: Provide the raw content directly, NOT wrapped in markdown code blocks or backticks. " +
        "All newlines, quotes, and special characters will be properly handled automatically."
    ),
}).strict();

export class WriteFileTool extends BaseTool<typeof writeFileSchema> {

  name = "write_file";

  description =
    "Write the entire file content to a specified path. " +
    "CRITICAL: You MUST provide BOTH filePath AND content parameters.\n\n" +
    "Parameters:\n" +
    "- filePath: The file path (required). Supports relative and absolute paths.\n" +
    "- content: The file content as raw string (required)\n\n" +
    "Example:\n" +
    '{\n' +
    '  "filePath": "src/example.ts",\n' +
    '  "content": "console.log(\\"Hello\\");"\n' +
    '}\n\n' +
    "IMPORTANT: For the content parameter, provide the raw file content directly as a plain string. " +
    "Do NOT wrap it in markdown code blocks (```), backticks, or any other formatting. " +
    "Just pass the actual file content as-is.\n\n" +
    "Path formats supported:\n" +
    "- Relative: \"src/file.ts\"\n" +
    "- Absolute Unix: \"/home/user/file.ts\"\n" +
    "- Absolute Windows: \"C:\\Users\\user\\file.ts\"";

  schema = writeFileSchema;

  async execute({ filePath, content }: z.infer<typeof writeFileSchema>): Promise<ToolOutput> {
    // 规范化路径以支持跨平台
    const normalizedPath = filePath.replace(/\\/g, '/');
    const fullPath = path.resolve(process.cwd(), normalizedPath);

    // 检查路径是否已存在
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);

      // 检查是否是目录
      if (stats.isDirectory()) {
        return {
          metadata: { ok: false, message: 'IS_DIRECTORY', filePath },
          output: `Error: Cannot write to a directory. Path: ${filePath}\nHint: Specify a file name, e.g., ${path.join(filePath, 'example.txt')}`,
        };
      }

      // 检查是否是二进制文件
      if (await isBinaryFile(fullPath)) {
        return {
          metadata: { ok: false, message: 'BINARY_FILE', filePath },
          output: `Error: Cannot write to binary file. Path: ${filePath}`,
        };
      }
    }

    // 在写入前备份现有文件（如果存在）
    const backupManager = getBackupManager();
    await backupManager.initialize();
    const backupId = await backupManager.backup(fullPath);

    // 确保目录存在
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);

    const backupInfo = backupId ? ` (backup: ${backupId})` : '';
    return{
       metadata: {
        ok: true,
        filePath,
        message: `File written successfully`,
       },
       output: `File ${filePath} written successfully.${backupInfo}`,
    }
  }
}
