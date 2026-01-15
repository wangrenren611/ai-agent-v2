/**
 * Bash Command Parser
 *
 * 使用 tree-sitter 解析 bash 命令，提供：
 * - 语法验证：检测 ERROR 节点
 * - 结构解析：提取 program、arguments、pipes、redirections 等
 * - 安全分析：检测危险命令、sudo 使用、变量展开等
 * - 语法高亮：ANSI 颜色输出
 *
 * @example
 * ```ts
 * const parser = await getBashParser();
 * const result = parser.parse('echo "hello" | grep test');
 * console.log(result.info?.program);  // 'echo'
 * console.log(result.info?.pipes);    // true
 * console.log(result.security);       // 安全问题列表
 * console.log(result.highlighted);    // 带颜色的命令
 * ```
 */

// =============================================================================
// Dependencies (CommonJS - tree-sitter 原生模块)
// =============================================================================

// @ts-ignore - tree-sitter 是 CommonJS 模块，需要使用 require
const Parser = require('tree-sitter');
// @ts-ignore - tree-sitter-bash 是 CommonJS 模块
const Bash = require('tree-sitter-bash');

// =============================================================================
// Security Pattern Constants
// =============================================================================

/**
 * 危险命令集合
 * 这些命令可能对系统造成破坏性影响
 */
const DANGEROUS_COMMANDS = new Set([
    'rm',      // 删除文件/目录
    'rmdir',   // 删除空目录
    'mkfs',    // 创建文件系统
    'dd',      // 磁盘复制/转换
    'format',  // 格式化磁盘
    'fdisk',   // 磁盘分区
    'mkswap',  // 创建交换空间
    'swapoff', // 关闭交换空间
    'blockdev',// 块设备操作
]);

/**
 * 危险标志集合
 * 用于检测 rm 等命令的危险组合
 */
const DANGEROUS_FLAGS = new Set(['rf', 'fr', 'f']);

/**
 * 系统权限提升命令
 * 这些命令需要额外权限，需要警告用户
 */
const SYSTEM_MODIFIERS = new Set(['sudo', 'su', 'doas', 'run0']);

// =============================================================================
// ANSI Color Codes for Syntax Highlighting
// =============================================================================

/**
 * ANSI 颜色代码
 * 用于终端语法高亮
 */
const COLORS = {
    reset: '\x1b[0m',      // 重置颜色
    command: '\x1b[1;36m', // 命令名 - 青色加粗
    string: '\x1b[0;33m',  // 字符串 - 黄色
    variable: '\x1b[1;35m',// 变量 - 紫色加粗
    flag: '\x1b[0;32m',    // 标志 - 绿色
    operator: '\x1b[1;31m',// 操作符 - 红色加粗
};

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * 命令信息
 */
export interface CommandInfo {
    /** 原始命令字符串 */
    raw: string;
    /** 命令名称（如 echo, ls） */
    program?: string;
    /** 命令参数列表 */
    arguments: string[];
    /** 是否包含管道操作 */
    pipes: boolean;
    /** 是否后台执行 */
    background: boolean;
    /** 重定向列表（如 > file, 2>&1） */
    redirections: string[];
}

/**
 * 安全问题
 */
export interface SecurityIssue {
    /** 严重级别 */
    level: 'warning' | 'danger' | 'critical';
    /** 问题描述 */
    message: string;
    /** 问题位置（可选） */
    position?: { row: number; column: number };
}

/**
 * 解析结果
 */
export interface ParseResult {
    /** 语法是否有效 */
    valid: boolean;
    /** 错误信息（如果语法无效） */
    error?: string;
    /** 命令结构信息 */
    info?: CommandInfo;
    /** 安全问题列表 */
    security?: SecurityIssue[];
    /** 带语法高亮的命令 */
    highlighted?: string;
}

// =============================================================================
// BashParser Class
// =============================================================================

/**
 * Bash 命令解析器
 *
 * 使用 tree-sitter 进行单次 AST 遍历，同时收集：
 * - 命令结构信息
 * - 安全问题
 * - 语法高亮片段
 *
 * @class BashParser
 * @example
 * ```ts
 * const parser = new BashParser();
 * await parser.init();
 * const result = parser.parse('ls -la');
 * ```
 */
export class BashParser {
    /** tree-sitter 解析器实例 */
    private parser: any = null;
    /** 是否已完成初始化 */
    private ready = false;

    /**
     * 初始化解析器
     * 创建 tree-sitter 实例并设置 bash 语言
     */
    async init(): Promise<void> {
        if (this.ready) return;
        this.parser = new Parser();
        this.parser.setLanguage(Bash);
        this.ready = true;
    }

    /**
     * 解析 bash 命令
     *
     * 执行以下操作：
     * 1. 检查语法错误（ERROR 节点）
     * 2. 单次遍历 AST 收集所有信息
     * 3. 生成语法高亮输出
     *
     * @param command - 要解析的 bash 命令
     * @returns 解析结果
     */
    parse(command: string): ParseResult {
        // 空命令直接返回
        if (!command || !command.trim()) return { valid: true, highlighted: '' };

        // 生成 AST
        const tree = this.parser.parse(command);
        const root = tree.rootNode;

        // 检查语法错误：查找 ERROR 类型节点
        const errorNode = this.findError(root);
        if (errorNode) {
            return {
                valid: false,
                error: `Syntax error at position ${errorNode.startIndex}`,
                highlighted: command,
            };
        }

        // 单次遍历收集所有数据（结构、安全、高亮）
        const data = this.traverse(root, command);

        return {
            valid: true,
            info: data.info,
            security: data.security.length > 0 ? data.security : undefined,
            highlighted: this.highlightFromSegments(command, data.segments),
        };
    }

    /**
     * 在 AST 中查找错误节点
     *
     * 深度优先搜索，返回第一个 ERROR 类型节点
     *
     * @param node - 当前 AST 节点
     * @returns 错误节点或 null
     */
    private findError(node: any): any {
        if (node.type === 'ERROR') return node;
        for (const child of node.children) {
            const found = this.findError(child);
            if (found) return found;
        }
        return null;
    }

    /**
     * 单次 AST 遍历收集所有数据
     *
     * 这是核心方法，一次遍历同时收集：
     * - 命令结构信息（program、arguments、pipes 等）
     * - 安全问题（危险命令、sudo 等）
     * - 语法高亮片段（带颜色信息的位置）
     *
     * Tree-sitter AST 节点类型：
     * - command_name: 命令名称
     * - word: 普通词
     * - string: 双引号字符串
     * - raw_string: 单引号字符串
     * - simple_expansion: $VAR 变量展开
     * - expansion: ${VAR} 变量展开
     * - command_substitution: $(cmd) 命令替换
     * - pipeline: 管道操作
     * - file_redirect: 文件重定向
     * - &: 后台操作符
     *
     * @param root - AST 根节点
     * @param source - 原始命令字符串
     * @returns 包含 info、security、segments 的数据对象
     */
    private traverse(root: any, source: string) {
        // 初始化结果收集器
        const info: CommandInfo = {
            raw: source,
            arguments: [],
            pipes: false,
            background: false,
            redirections: [],
        };
        const security: SecurityIssue[] = [];
        const segments: Array<{ start: number; end: number; color: string }> = [];

        /**
         * 递归访问 AST 节点
         *
         * @param node - 当前节点
         * @param parent - 父节点（用于判断上下文）
         */
        const visit = (node: any, parent: any = null) => {
            const type = node.type;
            const text = node.text;

            // 根据节点类型收集信息
            let color: string | null = null;

            switch (type) {
                case 'command_name':
                    // 命令名称（如 echo, ls）
                    color = COLORS.command;
                    if (!info.program) info.program = text;
                    break;

                case 'string':
                case 'raw_string':
                    // 字符串字面量
                    color = COLORS.string;
                    info.arguments.push(text);
                    break;

                case 'simple_expansion':
                case 'expansion':
                case 'command_substitution':
                    // 变量展开或命令替换
                    color = COLORS.variable;
                    info.arguments.push(text);
                    // 记录安全问题
                    security.push({
                        level: 'warning',
                        message: type === 'command_substitution' ? 'Command contains command substitution' : 'Command contains variable expansion',
                        position: { row: node.startPosition.row, column: node.startPosition.column },
                    });
                    break;

                case 'word':
                    // 普通词（参数等）
                    // 注意：排除 command_name 的子节点（避免重复）
                    if (parent?.type !== 'command_name') {
                        info.arguments.push(text);
                    }
                    break;

                case 'pipeline':
                    // 管道操作
                    info.pipes = true;
                    break;

                case '&':
                    // 后台操作符
                    info.background = true;
                    color = COLORS.operator;
                    break;

                case '|':
                    // 管道操作符
                    color = COLORS.operator;
                    break;

                case 'file_redirect':
                case 'heredoc_redirect':
                    // 文件重定向
                    info.redirections.push(text);
                    break;
            }

            // 对命令名称进行安全分析
            if (type === 'command_name') {
                // 提取基础命令名（去除 - 前缀和 = 赋值）
                const baseCmd = text.replace(/^-+/, '').split('=')[0];

                // 检查权限提升命令
                if (SYSTEM_MODIFIERS.has(text)) {
                    security.push({
                        level: 'warning',
                        message: `Command uses '${text}' - elevated privileges`,
                        position: { row: node.startPosition.row, column: node.startPosition.column },
                    });
                }

                // 检查危险命令
                if (DANGEROUS_COMMANDS.has(baseCmd)) {
                    security.push({
                        level: 'danger',
                        message: `Dangerous command detected: ${baseCmd}`,
                        position: { row: node.startPosition.row, column: node.startPosition.column },
                    });
                }

                // 特殊检查：rm 命令的危险标志
                if (baseCmd === 'rm') {
                    const parent = node.parent;
                    if (parent) {
                        // 遍历同级节点查找标志
                        for (const sibling of parent.children) {
                            if (sibling.type === 'word' && sibling.text.startsWith('-')) {
                                const flags = sibling.text.slice(1);
                                if ([...DANGEROUS_FLAGS].some((df) => flags.includes(df))) {
                                    security.push({
                                        level: 'critical',
                                        message: `Command uses rm with dangerous flag: ${sibling.text}`,
                                        position: { row: sibling.startPosition.row, column: sibling.startPosition.column },
                                    });
                                }
                            }
                        }
                    }
                }
            }

            // 收集语法高亮片段
            if (color) {
                segments.push({ start: node.startIndex, end: node.endIndex, color });
            }

            // 递归访问子节点
            for (const child of node.children) {
                visit(child, node);
            }
        };

        // 从根节点开始遍历
        visit(root, null);
        return { info, security, segments };
    }

    /**
     * 根据片段生成语法高亮字符串
     *
     * 将带颜色信息的片段合并为完整的 ANSI 彩色字符串
     *
     * @param source - 原始命令字符串
     * @param segments - 高亮片段列表
     * @returns 带 ANSI 颜色码的字符串
     */
    private highlightFromSegments(source: string, segments: Array<{ start: number; end: number; color: string }>): string {
        if (!segments.length) return source;

        // 按位置排序
        segments.sort((a, b) => a.start - b.start);

        let result = '';
        let pos = 0;

        // 构建结果字符串
        for (const seg of segments) {
            // 添加高亮前的普通文本
            if (seg.start > pos) result += source.slice(pos, seg.start);
            // 添加带颜色的文本
            result += seg.color + source.slice(seg.start, seg.end) + COLORS.reset;
            pos = Math.max(pos, seg.end);
        }

        // 添加剩余的普通文本
        if (pos < source.length) result += source.slice(pos);
        return result;
    }
}

// =============================================================================
// Singleton Instance
// =============================================================================

/**
 * 单例解析器实例
 * 避免重复初始化 tree-sitter（开销较大）
 */
let instance: BashParser | null = null;

/**
 * 获取 BashParser 单例实例
 *
 * @returns 初始化后的解析器实例
 */
export async function getBashParser(): Promise<BashParser> {
    if (!instance) {
        instance = new BashParser();
        await instance.init();
    }
    return instance;
}
