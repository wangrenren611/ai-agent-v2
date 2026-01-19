/**
 * ============================================================================
 * 文件名：parser.ts
 * 所属包：src/skills
 * ============================================================================
 *
 * 文件作用：
 * Markdown 解析器。用于解析技能文件中的 Markdown 内容和 frontmatter。
 *
 * 主要功能：
 * - 解析 YAML frontmatter
 * - 提取文件引用模式 (@file.ts)
 * - 提取 shell 命令模式 (!`command`)
 * - 格式化技能内容输出
 *
 * 依赖关系：
 * - gray-matter：frontmatter 解析
 *
 * 导出内容：
 * - parseSkillMarkdown：解析技能 Markdown 内容
 * - extractFileReferences：提取文件引用
 * - extractShellCommands：提取 shell 命令
 *
 * @module skills/parser
 */

import matter from 'gray-matter';

/**
 * 解析结果
 */
export interface ParsedSkillMarkdown {
    /** 解析后的纯内容（移除 frontmatter） */
    content: string;
    /** Frontmatter 数据 */
    data: Record<string, unknown>;
    /** 提取的文件引用 */
    files: string[];
    /** 提取的 shell 命令 */
    shells: string[];
}

/**
 * 文件引用正则表达式
 * 匹配 @file.ts 或 @path/to/file.ts 格式
 */
const FILE_REGEX = /(?<![\w`])@(\.?[^\s`,.]*(?:\.[^\s`,.]+)*)/g;

/**
 * Shell 命令正则表达式
 * 匹配 !`command` 格式
 */
const SHELL_REGEX = /!`([^`]+)`/g;

/**
 * 解析技能 Markdown 内容
 *
 * @param content - Markdown 文件内容
 * @param basePath - 技能文件所在目录（用于解析相对路径）
 * @returns 解析后的技能内容
 *
 * @example
 * ```ts
 * const result = parseSkillMarkdown(markdownContent, '/path/to/skill');
 * console.log(result.content);  // 纯内容
 * console.log(result.files);    // ['src/file.ts', 'lib/utils.ts']
 * ```
 */
export function parseSkillMarkdown(content: string, basePath?: string): string {
    try {
        const parsed = matter(content);
        return parsed.content.trim();
    } catch (error) {
        // 如果解析失败，返回原始内容
        console.warn(`[SkillParser] Failed to parse frontmatter: ${error}`);
        return content;
    }
}

/**
 * 完整解析技能 Markdown
 *
 * 返回包含所有解析信息的完整结果。
 *
 * @param content - Markdown 文件内容
 * @returns 完整解析结果
 */
export function parseSkillMarkdownFull(content: string): ParsedSkillMarkdown {
    try {
        const parsed = matter(content);
        const text = parsed.content;

        return {
            content: text.trim(),
            data: parsed.data,
            files: extractFileReferences(text),
            shells: extractShellCommands(text),
        };
    } catch (error) {
        console.warn(`[SkillParser] Failed to parse frontmatter: ${error}`);
        return {
            content: content,
            data: {},
            files: extractFileReferences(content),
            shells: extractShellCommands(content),
        };
    }
}

/**
 * 提取文件引用
 *
 * 从 Markdown 内容中提取所有 @file.ts 格式的文件引用。
 *
 * @param content - Markdown 内容
 * @returns 文件引用数组
 *
 * @example
 * ```ts
 * const files = extractFileReferences('See @src/app.ts and @lib/utils.ts');
 * // => ['src/app.ts', 'lib/utils.ts']
 * ```
 */
export function extractFileReferences(content: string): string[] {
    const matches = Array.from(content.matchAll(FILE_REGEX));
    return matches.map((match) => match[1]);
}

/**
 * 提取 shell 命令
 *
 * 从 Markdown 内容中提取所有 !`command` 格式的 shell 命令。
 *
 * @param content - Markdown 内容
 * @returns shell 命令数组
 *
 * @example
 * ```ts
 * const shells = extractShellCommands('Run !`npm install` to install');
 * // => ['npm install']
 * ```
 */
export function extractShellCommands(content: string): string[] {
    const matches = Array.from(content.matchAll(SHELL_REGEX));
    return matches.map((match) => match[1]);
}

/**
 * 格式化技能内容用于显示
 *
 * 将技能内容格式化为适合显示的格式，包含元数据信息。
 *
 * @param content - 原始 Markdown 内容
 * @param skillName - 技能名称
 * @param basePath - 技能目录
 * @returns 格式化后的内容
 */
export function formatSkillContent(content: string, skillName: string, basePath: string): string {
    const parsed = parseSkillMarkdownFull(content);

    const lines = [
        `## Skill: ${skillName}`,
        '',
        `**Base directory**: ${basePath}`,
        '',
    ];

    // 添加文件引用（如果有）
    if (parsed.files.length > 0) {
        lines.push('**Referenced files**:', ...parsed.files.map((f) => `  - ${f}`), '');
    }

    // 添加 shell 命令（如果有）
    if (parsed.shells.length > 0) {
        lines.push('**Shell commands**:', ...parsed.shells.map((s) => `  - ${s}`), '');
    }

    // 添加内容
    lines.push(parsed.content);

    return lines.join('\n');
}
