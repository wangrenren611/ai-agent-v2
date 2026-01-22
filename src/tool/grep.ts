import { search, type SearchMatch,validatePattern } from '@mcpc-tech/ripgrep-napi';
import { z } from 'zod';
import { BaseTool } from './base';

const schema = z.object({
  pattern: z.string().describe('The regex pattern to search for in file contents'),
  filePattern: z.string().nullable().describe('Glob pattern, e.g. *.ts'),
});

export default class GrepTool extends BaseTool<typeof schema> {
  name = 'grep';

  description = `- Fast content search tool that works with any codebase size
- Searches file contents using regular expressions
- Supports full regex syntax (eg. "log.*Error", "function\\s+\\w+", etc.)
- Filter files by pattern with the include parameter (eg. "*.js", "*.{ts,tsx}")
- Returns file paths and line numbers with at least one match sorted by modification time
- Use this tool when you need to find files containing specific patterns
- If you need to identify/count the number of matches within files, use the Bash tool with 'rg' (ripgrep) directly. Do NOT use 'grep'.
- When you are doing an open-ended search that may require multiple rounds of globbing and grepping, use the Task tool instead
`;
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
      if (!validatePattern(pattern)) {
        return 'Invalid pattern format';
      }
      
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
      const preview = matches.slice(0, 200);
      const formatted = preview.map((m: SearchMatch) => ({
        file: m.path,
        line: m.lineNumber,
        content: m.line.trim(),
      }));

      const summary = JSON.stringify(formatted, null, 2);
      return summary
    } catch (error: any) {
      return `Ripgrep Error: ${error?.message || String(error)}`;
    }
  }
}
