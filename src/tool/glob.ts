import { z } from 'zod';
import fg from 'fast-glob';
import { resolve } from 'path';
import { BaseTool, ToolResult } from './base.js';

const schema = z.object({
    pattern: z.string().describe('Glob pattern like **/*.ts or src/**/*.test.ts'),
    path: z.string().optional().describe('Base directory (default: current working directory)'),
    limit: z.number().optional().describe('Maximum results to return (default: 100)')
});

export default class GlobTool extends BaseTool<typeof schema> {
    name = 'glob';

    description = `- Fast file pattern matching tool
- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns matching file paths sorted by modification time
`;

    schema = schema;

    async execute({ pattern, path = '.', limit = 100 }: z.infer<typeof schema>): Promise<ToolResult> {
        const searchPath = resolve(process.cwd(), path);

        // === 底层异常：glob 匹配失败 ===
        let files: string[];
        try {
            files = await fg(pattern, {
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
        } catch (error) {
            throw new Error(`Glob matching failed: ${error}`);
        }

        const totalCount = files.length;
        const limitedFiles = files.slice(0, limit);
        const truncated = totalCount > limit;

        if (limitedFiles.length === 0) {
            return this.success({ pattern, path, files: [], totalCount });
        }

        return this.success(
            { pattern, path, files: limitedFiles, totalCount },
            { truncated, limit }
        );
    }
}
