/**
 * ============================================================================
 * Skills Module
 * ============================================================================
 *
 * 技能系统模块 - 提供领域知识扩展和专门工作流程
 *
 * @example
 * ```ts
 * import { initializeSkills, getSkillLoader, createSkillTool } from './skills';
 *
 * // 初始化技能系统
 * await initializeSkills({ hotReload: true });
 *
 * // 获取技能加载器
 * const loader = getSkillLoader();
 * const skills = loader.getAllMetadata();
 *
 * // 创建技能工具
 * const skillTool = createSkillTool({ includeDescription: true });
 * ```
 *
 * @module skills
 */

// 类型
export type {
    Skill,
    SkillFile,
    SkillMetadata,
    SkillLoaderOptions,
    SkillFrontmatter
} from './types';

// 加载器
export {
    SkillLoader,
    getSkillLoader,
    initializeSkills
} from './loader';

// 解析器
export {
    parseSkillMarkdown,
    parseSkillMarkdownFull,
    extractFileReferences,
    extractShellCommands,
    formatSkillContent
} from './parser';

// 工具 - 新的 API
export {
    SkillTool,
    createSkillTool,
    defaultSkillTool,
    simpleSkillTool,
    type SkillToolResult
} from './skill-tool';


