import { spawn } from 'child_process';
import fs from 'fs';
import { rgPath } from 'vscode-ripgrep';
import readline from 'readline';
import { z } from 'zod';
import { BaseTool } from './base';

const  schema= z.object({
    pattern: z.string().describe('he regex pattern to search for in file contents'),
    filePattern: z.string().nullable().describe("Glob pattern, e.g. *.ts")
 });

export  default class GrepTool extends BaseTool<typeof schema> {

  name = "search_code";

  description = `Fast content search tool for finding code patterns.

BEST PRACTICES:
1. Use this tool FIRST to locate relevant files fast
2. Use specific search patterns: "class_name", "function_name", or "import.*module"
3. Prefer narrowing with filePattern like "*.ts" when possible
4. Avoid broad patterns like "http|request|fetch" unless needed
5. After you find the right file, read it fully instead of searching again

WHEN TO USE:
- Finding specific function/class definitions
- Locating import statements or usage patterns
- Searching for specific error messages or constants

WHEN NOT TO USE:
- After already reading a file (don't search for patterns you've already seen)
- For listing files/directories (use Bash only when necessary)

Returns JSON with file paths, line numbers, and matched content.`;
  schema = schema;

  async execute({ pattern, filePattern }: any): Promise<string> {
    return new Promise((resolve) => {
      // 基础排除规则（始终生效）
      const excludePatterns = [
        '!**/node_modules/**',
        '!**/dist/**',
        '!**/.git/**',
        '!**/*.min.js',
        '!**/*.min.css',
        '!**/coverage/**',
        '!**/.next/**',
        '!**/.nuxt/**',
        '!**/build/**',
      ];

      const args = [
        '--json',
        '--smart-case',
        '--max-columns', '500',
        // 自动排除无关目录，提升搜索效率和结果精准度
        ...excludePatterns.map(p => ['--glob', p]).flat(),
        pattern
      ];

      // 如果指定了文件模式，添加包含模式后再次添加排除规则确保排除生效
      if (filePattern) {
        args.push('-g', filePattern);
        // 在用户的 filePattern 之后重新应用排除规则
        args.push(...excludePatterns.map(p => ['--glob', p]).flat());
      }

      args.push('.');

      let exe = rgPath;
      try {
        if (!fs.existsSync(exe)) {
          exe = 'rg';
        }
      } catch {
        exe = 'rg';
      }

      const child = spawn(exe, args);
      const results: any[] = [];

      const rl = readline.createInterface({ input: child.stdout, terminal: false });

      rl.on('line', (line) => {
        try {
          const json = JSON.parse(line);
          if (json.type === 'match') {
            results.push({
              file: json.data.path.text,
              line: json.data.line_number,
              content: json.data.lines.text.trim(),
              submatches: json.data.submatches
            });
          }
        } catch(e) {}
      });

      child.on('error', (err) => {
        resolve(`Ripgrep Error: ${err.message}\nHint: 请安装 ripgrep (rg) 或在依赖中添加 vscode-ripgrep。macOS 可使用: brew install ripgrep`);
      });

      child.on('close', () => {
        if (results.length === 0) resolve("No matches found.");
        // 限制返回数量，防止 Token 爆炸
        const preview = results.slice(0, 20);
        const summary = JSON.stringify(preview, null, 2);
        resolve(results.length > 20 ? `${summary}\n... (${results.length - 20} more matches)` : summary);
      });
    });
  }
}
