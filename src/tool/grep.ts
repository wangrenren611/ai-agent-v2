import { search, type SearchMatch } from '@mcpc-tech/ripgrep-napi';
import { z } from 'zod';
import { BaseTool } from './base';

const schema = z.object({
  pattern: z.string().describe('The regex pattern to search for in file contents'),
  filePattern: z.string().nullable().describe("Glob pattern, e.g. *.ts")
});

export default class GrepTool extends BaseTool<typeof schema> {

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
    // 基础排除规则（始终生效）
    const ignorePatterns = [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
      '**/*.min.js',
      '**/*.min.css',
      '**/coverage/**',
      '**/.next/**',
      '**/.nuxt/**',
      '**/build/**',
    ];

    // 构建搜索选项
    const options = {
      caseSensitive: false,  // 智能大小写匹配
      ignorePatterns,
      // 如果指定了文件模式，添加 glob 过滤
      // 注意：ripgrep-napi 没有直接的 glob 支持，需要通过 ignorePatterns 实现
    };

    try {
      // 使用 ripgrep-napi 进行搜索
      const result = search(pattern, ['.'], options);

      // 如果搜索失败
      if (!result.success) {
        return `Search Error: ${result.error || 'Unknown error'}`;
      }

      // 过滤结果（如果指定了 filePattern）
      let matches = result.matches;
      if (filePattern) {
        // 将 glob 模式转换为正则表达式进行过滤
        const globRegex = new RegExp(
          filePattern
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.')
            .replace(/\./g, '\\.')
        );
        matches = matches.filter(m => globRegex.test(m.path));
      }

      // 限制返回数量，防止 Token 爆炸
      const preview = matches.slice(0, 20);
      const formatted = preview.map((m: SearchMatch) => ({
        file: m.path,
        line: m.lineNumber,
        content: m.line.trim(),
      }));

      const summary = JSON.stringify(formatted, null, 2);
      return matches.length > 20
        ? `${summary}\n... (${matches.length - 20} more matches)`
        : summary;
    } catch (error: any) {
      return `Ripgrep Error: ${error?.message || String(error)}`;
    }
  }
}
