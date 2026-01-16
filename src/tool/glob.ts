/**
 * Glob Tool - 快速文件模式匹配工具
 *
 * 用于通过通配符模式查找文件，替代 bash find/dir 命令
 */
import { z } from 'zod';
import { glob as fg } from 'fast-glob';
import { BaseTool } from './base';

const schema = z.object({
    pattern: z.string().describe('Glob pattern like **/*.ts or src/**/*.test.ts'),
    path: z.string().optional().describe('Base directory (default: current working directory)'),
    limit: z.number().optional().describe('Maximum results to return (default: 100)')
});

export default class GlobTool extends BaseTool<typeof schema> {
    name = 'glob';

    description = `Fast file pattern matching tool.

BEST PRACTICES:
- Use for finding files by extension or naming pattern
- Prefer over bash find/dir commands for speed
- Supports patterns: *.ts, **/*.test.ts, src/**/*.tsx
- Automatically excludes node_modules, dist, .git, coverage
- Returns files sorted by path

WHEN TO USE:
- Finding all TypeScript files: *.ts
- Finding test files: **/*.test.ts
- Finding files in specific directory: src/**/*.ts
- Avoid excessive wildcards: **/*.* is too broad

Returns array of relative file paths.`;

    schema = schema;

    async execute({ pattern, path = '.', limit = 100 }: z.infer<typeof schema>): Promise<string> {
        try {
            const files = await fg(pattern, {
                cwd: process.cwd(),
                absolute: false,
                ignore: [
                    '**/node_modules/**',
                    '**/dist/**',
                    '**/.git/**',
                    '**/coverage/**',
                    '**/.next/**',
                    '**/.nuxt/**',
                    '**/build/**',
                    '**/*.min.js',
                    '**/*.min.css'
                ]
            });

            // 手动限制结果数量
            const limitedFiles = files.slice(0, limit);

            if (limitedFiles.length === 0) {
                return `No files found matching pattern: ${pattern}`;
            }

            const result = limitedFiles.join('\n');

            // 如果有更多结果被截断，添加提示
            if (files.length > limit) {
                return `${result}\n... (${files.length - limit} more files, showing first ${limit})`;
            }

            return result;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            return `Error: ${errorMsg}`;
        }
    }
}
