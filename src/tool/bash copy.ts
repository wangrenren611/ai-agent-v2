/**
 * Bash Tool
 *
 * 执行 bash 命令的工具，提供：
 * - 语法验证和解析
 * - 安全分析
 * - 沙箱隔离执行（可选 Docker 容器）
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
import { getPlatform, execCommandAsync } from '../util/platform-cmd';
import { createSandboxFactory } from '../sandbox/base';
import type { SandboxConfig, SandboxExecutionResult } from '../sandbox/types';

// =============================================================================
// 模式定义
// =============================================================================

const schema = z.object({
    command: z.string().describe('The bash command to run'),
});


// =============================================================================
// BashTool 类
// =============================================================================

/**
 * Bash 命令执行工具
 *
 * 在执行前对命令进行解析和安全分析
 * 支持可选的 Docker 沙箱隔离
 */
export default class BashTool extends BaseTool<typeof schema> {
    name = 'bash';
    private cwd = process.cwd();
    
    /** 沙箱执行器工厂 */
    private sandboxFactory: ReturnType<typeof createSandboxFactory>;
    private sandboxMode: 'none' | 'docker' | 'auto';

    get description(): string {
        const mode = this.sandboxMode === 'docker' ? ' (Docker sandboxed)' : '';
        return `Run bash commands${mode}`;
    }

    schema = schema;

    /** 命令执行超时时间（毫秒），默认 60 秒 */
    timeout: number = 60000;

    constructor() {
        super();
        // 读取环境变量配置
        this.sandboxMode = (process.env.SANDBOX_MODE as 'none' | 'docker' | 'auto') || 'auto';
        
        // 初始化沙箱执行器工厂
        this.sandboxFactory = createSandboxFactory({
            defaultMode: this.sandboxMode,
            docker: {
                image: process.env.DOCKER_IMAGE,
                network: process.env.SANDBOX_NETWORK as 'none' | 'bridge' | 'host',
                readonlyMounts: process.env.SANDBOX_READONLY_MOUNTS?.split(','),
            },
        });
        
    }

    /**
     * 执行 bash 命令
     *
     * @param args - 包含命令的参数
     * @returns 执行结果
     */
    async execute(args: z.infer<typeof this.schema>): Promise<string> {
        const { command } = args;
        const platform = getPlatform();
        
        // 1. 安全检查（语法验证 + 危险命令检测）
        const securityCheck = await this.performSecurityCheck(command, platform);
        if (!securityCheck.safe) {
            return securityCheck.message;
        }

        // 2. 决定执行方式（沙箱 vs 直接）
        const sandboxConfig: SandboxConfig = {
            workdir: this.cwd,
            timeout: this.timeout,
        };

        // 3. 执行命令
        const executor = await this.sandboxFactory.create();
        const result = await executor.execute(command, sandboxConfig);

        // 4. 格式化并返回结果
        return this.formatResult(result, sandboxConfig);
    }

    /**
     * 执行安全检查
     *
     * @param command - 要执行的命令
     * @param platform - 当前平台
     * @returns 安全检查结果
     */
    private async performSecurityCheck(
        command: string,
        platform: 'windows' | 'mac' | 'linux'
    ): Promise<{ safe: boolean; message: string }> {
        // 非平台使用 Tree-sitter AST 解析
        if (platform !== 'windows') {
            const parser = await getBashParser();
            const result = parser.parse(command);
            
            if (!result.valid) {
                return {
                    safe: false,
                    message: `Syntax error: ${result.error}`,
                };
            }

            // 检查安全问题
            if (result.security && result.security.length > 0) {
                const critical = result.security.filter(s => s.level === 'critical');
                if (critical.length > 0) {
                    return {
                        safe: false,
                        message: `Command blocked: ${critical.map(s => s.message).join('; ')}`,
                    };
                }
            }
        } else {
            // Windows 平台使用正则检测危险命令
            const maybeDangerous = /(^|\s)(format|shutdown|reg\s+delete|rmdir\s+\/s|rd\s+\/s|del\s+\/f|rm\s+-rf|rm\s+-fr|rm\s+\/s|systemctl\s+stop|systemctl\s+reboot|systemctl\s+poweroff|reboot|shutdown|poweroff|format\s+\w:|fdisk|mkfs|dd\s+if=)(\s|$)/i;
            if (maybeDangerous.test(command)) {
                return {
                    safe: false,
                    message: 'Command not executed due to safety policy',
                };
            }
        }

        return { safe: true, message: '' };
    }

    /**
     * 格式化执行结果
     *
     * @param result - 沙箱执行结果
     * @param config - 使用的沙箱配置
     * @returns 格式化后的结果
     */
    private formatResult(
        result: SandboxExecutionResult,
        config: SandboxConfig
    ): string {
        // 基本结果
        let output = '';

        if (result.exitCode === 0) {
            const stdout = result.stdout || 'Command completed successfully';
            output = this.truncateOutput(stdout);
        } else {
            const stderr = result.stderr || `Command failed with exit code ${result.exitCode}`;
            output = this.truncateOutput(stderr);
        }

        // 添加沙箱信息（如果是 Docker）
        if (result.sandbox?.containerId) {
            const sandboxInfo = `\n[Sandbox: Docker container ${result.sandbox.containerId.substring(0, 12)}]`;
            output += sandboxInfo;
        }

        // 添加执行时间
        const durationInfo = `\nDuration: ${result.duration}ms`;
        output += durationInfo;

        return output;
    }

    /**
     * 执行命令（直接在宿主机）
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
        if (cdOutput !== null) return this.truncateOutput(`ERROR: Command failed: ${cdOutput}`);

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
        // 检测复杂命令（包含管道、重定向、命令连接符等），不做 cd 特殊处理
        if (/[|;&<>]|\|\||&&/.test(command)) {
            return null;
        }

        const cdMatch = command.match(/^\s*cd(?:\s+\/d)?\s+(.+)\s*$/i);
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

        const mkdirMatch = command.match(/^\s*mkdir\s+(-p|--parents)\s+(.+)\s*$/i);
        if (mkdirMatch) {
            return `mkdir ${mkdirMatch[2]}`;
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
