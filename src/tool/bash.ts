/**
 * Bash Tool
 *
 * 执行 bash 命令的工具，提供：
 * - 语法验证和解析
 * - 安全分析
 * - 命令执行
 *
 * @example
 * ```ts
 * const tool = new BashTool();
 * const result = await tool.execute({ command: 'ls -la' });
 * ```
 */

import { BaseTool } from './base';
import { z } from 'zod';
import { getBashParser } from './bash-parser';
import { getPlatform,  execCommandAsync } from '../util/platform-cmd';

// =============================================================================
// Schema
// =============================================================================

const schema = z.object({
    command: z.string().describe('The bash command to run'),
});


// =============================================================================
// BashTool Class
// =============================================================================

/**
 * Bash 命令执行工具
 *
 * 在执行前对命令进行解析和安全分析
 */
export default class BashTool extends BaseTool<typeof schema> {
    name = 'bash';

    get description(): string {
        const platform = getPlatform();
        const baseDesc = 'Execute shell commands with persistent state (cd, env vars persist).';

        const platformInfo = {
            windows: 'Platform: Windows (cmd.exe). Use: dir, type, cd. AVOID Unix commands (head, tail, grep).',
            mac: 'Platform: macOS (zsh). Use: ls, cat, find. Full Unix support.',
            linux: 'Platform: Linux (bash). Use: ls, cat, find. Full Unix support.'
        };

        const examples = {
            windows: `Examples: dir /a, type file.txt, dir /s /b src\\*.ts`,
            mac: `Examples: ls -la, cat file.txt, find . -name "*.ts"`,
            linux: `Examples: ls -la, cat file.txt, find . -name "*.ts"`
        };

        return `${baseDesc}\n\n${platformInfo[platform]}\n\n${examples[platform]}\n\nUse for: testing, building, git, file operations.`;
    }

    schema = schema;

    /** 命令执行超时时间（毫秒），默认 60 秒 */
    timeout: number = 60000;

    /**
     * 执行 bash 命令
     *
     * @param args - 包含命令的参数
     * @returns 执行结果
     */
    async execute(args: z.infer<typeof this.schema>): Promise<string> {
        const { command } = args;

        // 获取解析器并解析命令
        const parser = await getBashParser();
        const result = parser.parse(command);

        // 显示解析结果
        // this.displayParseResult(result);

        // 语法无效时拒绝执行
        if (!result.valid) {
            return 'Command not executed due to syntax error';
        }

        // 执行命令
        return await this.runCommand(command);
    }

   

   


    /**
     * 执行 bash 命令
     *
     * 使用 platform-cmd 模块的跨平台执行函数
     * 自动处理编码差异（Windows GBK / Unix UTF-8）
     * 超时保护通过 timeout 参数传递
     *
     * @param command - 要执行的命令
     * @returns Promise<string> - 执行结果
     */
    private async runCommand(command: string): Promise<string> {
        // 使用封装好的跨平台执行函数，传递超时配置
        const result = await execCommandAsync(command, {
            timeout: this.timeout,
        });

        if (result.exitCode === 0) {
            return result.stdout || `Command exited successfully`;
        } else {
            // 命令失败时返回 stderr
            return result.stderr || `Command failed with exit code ${result.exitCode}`;
        }
    }

 
}
