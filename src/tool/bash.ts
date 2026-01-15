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
import { spawn } from 'child_process';
import { z } from 'zod';
import { getBashParser, type ParseResult, type CommandInfo } from './bash-parser';

// =============================================================================
// Schema
// =============================================================================

const schema = z.object({
    command: z.string().describe('The bash command to run'),
});

// =============================================================================
// ANSI Color Codes
// =============================================================================

const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
};

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
    description = 'Run bash commands';
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
        this.displayParseResult(result);

        // 语法无效时拒绝执行
        if (!result.valid) {
            return 'Command not executed due to syntax error';
        }

        // 执行命令
        return await this.runCommand(command);
    }

    /**
     * 显示解析结果
     *
     * @param result - 解析结果
     */
    private displayParseResult(result: ParseResult): void {
        const lines: string[] = [];

        // 高亮的命令
        if (result.highlighted) {
            lines.push(`\n  ${result.highlighted}`);
        }

        // 语法验证状态
        lines.push(this.formatValidationStatus(result.valid, result.error));

        // 命令结构信息
        if (result.info) {
            lines.push(...this.formatCommandInfo(result.info));
        }

        // 安全问题
        if (result.security?.length) {
            lines.push(...this.formatSecurityIssues(result.security));
        }

        console.log(lines.join('\n'));
    }

    /**
     * 格式化验证状态
     *
     * @param valid - 是否有效
     * @param error - 错误信息
     * @returns 格式化的状态字符串
     */
    private formatValidationStatus(valid: boolean, error?: string): string {
        if (valid) {
            return `  ${COLORS.green}✓ Syntax valid${COLORS.reset}`;
        }
        return `  ${COLORS.red}✗ ${error}${COLORS.reset}`;
    }

    /**
     * 格式化命令信息
     *
     * @param info - 命令信息
     * @returns 格式化的信息行数组
     */
    private formatCommandInfo(info: CommandInfo): string[] {
        const lines: string[] = [];

        lines.push(`  Program: ${COLORS.cyan}${info.program || '(none)'}${COLORS.reset}`);

        if (info.arguments.length > 0) {
            lines.push(`  Arguments: ${info.arguments.join(' ')}`);
        }

        if (info.pipes) {
            lines.push(`  ${COLORS.yellow}⚠ Contains pipes${COLORS.reset}`);
        }

        if (info.background) {
            lines.push(`  ${COLORS.yellow}⚠ Background execution${COLORS.reset}`);
        }

        return lines;
    }

    /**
     * 格式化安全问题
     *
     * @param issues - 安全问题列表
     * @returns 格式化的问题行数组
     */
    private formatSecurityIssues(issues: NonNullable<ParseResult['security']>): string[] {
        const lines: string[] = [`  ${COLORS.magenta}Security:${COLORS.reset}`];

        for (const issue of issues) {
            const { icon, color } = this.getIssueStyle(issue.level);
            lines.push(`    ${icon} ${color}${issue.message}${COLORS.reset}`);
        }

        return lines;
    }

    /**
     * 获取安全问题样式
     *
     * @param level - 安全级别
     * @returns 图标和颜色
     */
    private getIssueStyle(level: 'warning' | 'danger' | 'critical'): { icon: string; color: string } {
        switch (level) {
            case 'critical':
                return { icon: '🔴', color: COLORS.red };
            case 'danger':
                return { icon: '⚠️', color: COLORS.yellow };
            case 'warning':
            default:
                return { icon: '⚡', color: COLORS.cyan };
        }
    }

    /**
     * 执行 bash 命令
     *
     * 使用 spawn 启动子进程执行命令
     * shell: true 确保 shell 正确解析命令
     * 超时保护（默认 60 秒，可通过 timeout 属性配置）
     *
     * @param command - 要执行的命令
     * @returns Promise<string> - 执行结果
     */
    private runCommand(command: string): Promise<string> {
        return new Promise((resolve, reject) => {
            // 使用 shell: true 让 shell 正确解析命令
            const proc = spawn(command, { shell: true });

            let stdout = '';
            let stderr = '';
            let completed = false;

            proc.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            proc.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            proc.on('close', (code) => {
                completed = true;
                if (code === 0) {
                    resolve(stdout || `Command exited with code ${code}`);
                } else {
                    reject(stderr || `Command failed with code ${code}`);
                }
            });

            proc.on('error', (err) => {
                completed = true;
                reject(err.message);
            });

            // 超时保护
            const timer = setTimeout(() => {
                if (!completed && proc.pid) {
                    proc.kill('SIGKILL');
                    const output = stdout || stderr || 'No output';
                    resolve(`Error: Command timed out after ${this.timeout}ms.\nOutput:\n${output}`);
                }
            }, this.timeout);

            // 清理定时器
            proc.on('exit', () => clearTimeout(timer));
        });
    }
}
