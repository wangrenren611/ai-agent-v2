/**
 * Glob Tool - 快速文件模式匹配工具
 *
 * 用于通过通配符模式查找文件，替代 bash find/dir 命令
 */
import { z } from 'zod';
import fg from 'fast-glob';
import { resolve } from 'path';
import { BaseTool } from './base';

const schema = z.object({
    pattern: z.string().describe('Glob pattern like **/*.ts or src/**/*.test.ts'),
    path: z.string().optional().describe('Base directory (default: current working directory)'),
    limit: z.number().optional().describe('Maximum results to return (default: 100)')
});

export default class GlobTool extends BaseTool<typeof schema> {
    name = 'glob';

    description = `- Fast file pattern matching tool that works with any codebase size
- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns matching file paths sorted by modification time
- Use this tool when you need to find files by name patterns
- When you are doing an open-ended search that may require multiple rounds of globbing and grepping, use the Task tool instead
- You have the capability to call multiple tools in a single response. It is always better to speculatively perform multiple searches as a batch that are potentially useful.
`;

    schema = schema;

    async execute({ pattern, path = '.', limit = 100 }: z.infer<typeof schema>): Promise<string> {
        try {
            // 解析为绝对路径
            const searchPath = resolve(process.cwd(), path);

            const files = await fg(pattern, {
                cwd: searchPath,
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
                return `No files found matching pattern: ${pattern} in ${path}`;
            }

            const result = limitedFiles.join('\n');

            // 如果有更多结果被截断，添加提示
            if (files.length > limit) {
                return `${result}\n... (${files.length - limit} more files, showing first ${limit})`;
            }

            return result;
        } catch (_error) {
            const errorMsg = _error instanceof Error ? _error.message : String(_error);
            return `Error: ${errorMsg}`;
        }
    }
}
