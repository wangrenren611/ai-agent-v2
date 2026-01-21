/**
 * Skills 类型定义
 *
 * 兼容 Claude Code Skills 格式
 */

/**
 * Skill 元数据
 * 从 SKILL.md 文件的 YAML 前言中解析
 */
export interface SkillMetadata {
    /** 技能标识符（最大64字符，小写/数字/连字符） */
    name: string;
    /** 描述用途（最大1024字符） */
    description: string;
    /** 技能目录绝对路径 */
    path: string;
}

/**
 * 完整技能信息
 */
export interface Skill {
    metadata: SkillMetadata;
    /** SKILL.md 完整内容（按需加载） */
    content?: string;
}

/**
 * 解析后的技能文件结构
 */
export interface SkillFile {
    metadata: SkillMetadata;
    /** YAML 前言后的 Markdown 内容 */
    content: string;
}

/**
 * 技能加载选项
 */
export interface SkillLoaderOptions {
    /** 开发时启用热重载 */
    hotReload?: boolean;
    /** 自定义技能目录 */
    skillsDir?: string;
}

/**
 * YAML 前言格式
 */
export interface SkillFrontmatter {
    name: string;
    description: string;
    license?: string;
}
