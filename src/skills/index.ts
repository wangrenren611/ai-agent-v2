/**
 * Skills Module
 *
 * 技能系统模块 - 提供领域知识扩展和专门工作流程
 *
 * @example
 * ```ts
 * import { initializeSkills, getSkillLoader } from './skills';
 *
 * // 初始化技能系统
 * await initializeSkills({ hotReload: true });
 *
 * // 获取技能加载器
 * const loader = getSkillLoader();
 * const skills = loader.getAllMetadata();
 * ```
 */

// Types
export type {
    Skill,
    SkillFile,
    SkillMetadata,
    SkillLoaderOptions,
    SkillFrontmatter
} from './types';

// Loader
export {
    SkillLoader,
    getSkillLoader,
    initializeSkills
} from './loader';

// Tools
export {
    ReadSkillTool,
    ListSkillsTool
} from './skill-tool';
