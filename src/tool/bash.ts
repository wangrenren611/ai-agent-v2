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
    private cwd = process.cwd();

    get description(): string {
        return 'Run bash commands';
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
        const platform = getPlatform();
        if (platform !== 'windows') {
            const parser = await getBashParser();
            const result = parser.parse(command);
            if (!result.valid) {
                return 'Command not executed due to syntax error';
            }
        } else {
            const maybeDangerous = /(^|\s)(format|shutdown|reg\s+delete|rmdir\s+\/s|rd\s+\/s|del\s+\/f)(\s|$)/i;
            if (maybeDangerous.test(command)) {
                return 'Command not executed due to safety policy';
            }
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
        const normalizedCommand = this.normalizeCommand(command);
        const cdOutput = this.tryHandleCd(normalizedCommand);
        if (cdOutput !== null) return cdOutput;

        const result = await execCommandAsync(normalizedCommand, {
            timeout: this.timeout,
            cwd: this.cwd,
        });

        if (result.exitCode === 0) {
            return this.truncateOutput(result.stdout || `Command exited successfully`);
        } else {
            // 命令失败时返回 stderr
            return this.truncateOutput(result.stderr || `Command failed with exit code ${result.exitCode}`);
        }
    }

    private tryHandleCd(command: string): string | null {
        const platform = getPlatform();
        const cdMatch = command.match(/^\s*cd(?:\s+\/d)?\s+(.+?)\s*$/i);
        if (!cdMatch) return null;

        const rawTarget = cdMatch[1]?.trim();
        if (!rawTarget) return null;

        const target = rawTarget.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
        const resolved = platform === 'windows'
            ? require('path').resolve(this.cwd, target.replace(/\//g, '\\'))
            : require('path').resolve(this.cwd, target);

        this.cwd = resolved;
        return this.cwd;
    }

    private normalizeCommand(command: string): string {
        if (getPlatform() !== 'windows') return command;

        const timeoutMatch = command.match(/^\s*timeout\s+\/t\s+(\d+)\s*$/i);
        if (timeoutMatch) {
            const seconds = Number(timeoutMatch[1]);
            const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
            return `powershell -NoProfile -Command "Start-Sleep -Seconds ${safeSeconds}"`;
        }

        const { tokens, quoteTypes } = this.tokenize(command);
        const normalizedTokens = tokens.map((token, i) => {
            const quote = quoteTypes[i];
            const original = quote ? `${quote}${token}${quote}` : token;
            if (!token.includes('/')) return original;
            if (token.startsWith('/')) return original;
            if (token.includes('://')) return original;

            const looksLikeProjectPath =
                token.startsWith('./') ||
                token.startsWith('../') ||
                token.startsWith('src/') ||
                token.startsWith('test/') ||
                token.startsWith('__tests__/') ||
                /\.(ts|tsx|js|jsx|json|md|txt|log|env)$/i.test(token) ||
                token.includes('/src/') ||
                token.includes('/test/') ||
                token.includes('/__tests__/');

            if (!looksLikeProjectPath) return original;

            const replaced = token.replace(/\//g, '\\');
            return quote ? `${quote}${replaced}${quote}` : replaced;
        });

        return normalizedTokens.join(' ');
    }

    private tokenize(command: string): { tokens: string[]; quoteTypes: Array<'"' | "'" | null> } {
        const tokens: string[] = [];
        const quoteTypes: Array<'"' | "'" | null> = [];
        let current = '';
        let quote: '"' | "'" | null = null;

        for (let i = 0; i < command.length; i++) {
            const ch = command[i];
            if ((ch === '"' || ch === "'") && quote === null) {
                quote = ch as '"' | "'";
                continue;
            }
            if (quote !== null && ch === quote) {
                tokens.push(current);
                quoteTypes.push(quote);
                current = '';
                quote = null;
                continue;
            }
            if (quote === null && /\s/.test(ch)) {
                if (current.length > 0) {
                    tokens.push(current);
                    quoteTypes.push(null);
                    current = '';
                }
                continue;
            }
            current += ch;
        }

        if (current.length > 0) {
            tokens.push(current);
            quoteTypes.push(quote);
        }

        return { tokens, quoteTypes };
    }

    private truncateOutput(output: string): string {
        const maxChars = 12000;
        if (output.length <= maxChars) return output;
        return `${output.slice(0, maxChars)}\n... (truncated, ${output.length - maxChars} more chars)`;
    }
 
}
