/**
 * ============================================================================
 * 文件名：skill-tool.ts
 * 所属包：src/skills
 * ============================================================================
 *
 * 文件作用：
 * Skill 工具模块。允许 AI 加载技能（预定义的任务指导）。
 *
 * 主要功能：
 * - SkillTool：加载技能的工具
 * - 动态生成工具描述，包含所有可用技能列表
 * - 解析技能文件内容
 *
 * 依赖关系：
 * - zod：类型验证
 * - ../tool/base：工具基类
 * - ./loader：技能加载
 * - ./parser：Markdown 解析
 *
 * 导出内容：
 * - SkillTool：技能工具定义
 * - createSkillTool：创建技能工具的工厂函数
 *
 * 参数：
 * - name：技能标识符（如 "code-review" 或 "category/helper"）
 *
 * 返回：
 * - title：技能名称标题
 * - output：格式化的技能内容
 * - metadata：技能元数据（名称、目录）
 *
 * 工具描述：
 * - 动态生成，包含所有可用技能列表
 * - 使用 XML 格式展示技能信息
 *
 * 使用场景：
 * - AI 需要特定任务的详细指导时
 * - 遵循预定义的工作流程
 * - 获取专业知识
 *
 * @module skills/skill-tool
 */

import { z } from 'zod';
import * as path from 'path';
import { BaseTool } from '../tool/base';
import { getSkillLoader } from './loader';
import { parseSkillMarkdown } from './parser';

/**
 * 技能工具执行结果
 */
export interface SkillToolResult {
    /** 结果标题 */
    title: string;
    /** 格式化的技能内容 */
    output: string;
    /** 技能元数据 */
    metadata: {
        name: string;
        dir: string;
    };
}

/**
 * 参数 Schema
 *
 * 定义加载技能所需的参数。
 */
const parameters = z.object({
    name: z.string().describe("The skill identifier from available_skills (e.g., 'code-review' or 'category/helper')"),
});

/**
 * 技能工具类
 *
 * 允许 AI 加载技能以获取特定任务的详细指导。
 */
export class SkillTool extends BaseTool<typeof parameters> {
    name = 'skill';
    description = '';
    schema = parameters;

    /**
     * 构造函数
     *
     * @param includeDescription - 是否包含详细描述（包含可用技能列表）
     */
    constructor(private includeDescription: boolean = true) {
        super();
        this.description = this.generateDescription();
    }

    /**
     * 生成工具描述
     *
     * 动态生成包含所有可用技能的描述。
     */
    private generateDescription(): string {
        if (!this.includeDescription) {
            return 'Load a skill to get detailed instructions for a specific task.';
        }

        const loader = getSkillLoader();
        const skills = loader.getAllMetadata();

        if (skills.length === 0) {
            return 'Load a skill to get detailed instructions for a specific task. No skills are currently available.';
        }

        const skillsList = skills.flatMap((skill) => [
            '  <skill>',
            `    <name>${skill.name}</name>`,
            `    <description>${skill.description}</description>`,
            '  </skill>',
        ]);

        return [
            'Load a skill to get detailed instructions for a specific task.',
            'Skills provide specialized knowledge and step-by-step guidance.',
            'Use this when a task matches an available skill\'s description.',
            '<available_skills>',
            ...skillsList,
            '</available_skills>',
        ].join(' ');
    }

    /**
     * 执行技能加载
     *
     * @param args - 技能参数
     * @returns 技能内容结果
     */
    async execute(args: z.infer<typeof parameters>): Promise<string> {
        const loader = getSkillLoader();
        const skill = loader.getSkill(args.name);

        // 技能不存在
        if (!skill) {
            const available = loader.getAllMetadata().map((s) => s.name).join(', ');
            throw new Error(`Skill "${args.name}" not found. Available skills: ${available || 'none'}`);
        }

        // 读取技能文件
        try {
            const content = await loader.readSkillFile(args.name, 'SKILL.md');
            const parsed = parseSkillMarkdown(content, skill.metadata.path);
            const dir = skill.metadata.path;

            // 格式化输出
            const output = [`## Skill: ${skill.metadata.name}`, '', `**Base directory**: ${dir}`, '', parsed.trim()].join('\n');

            const result: SkillToolResult = {
                title: `Loaded skill: ${skill.metadata.name}`,
                output,
                metadata: {
                    name: skill.metadata.name,
                    dir,
                },
            };

            return JSON.stringify(result, null, 2);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to load skill "${args.name}": ${errorMsg}`);
        }
    }
}

/**
 * 创建技能工具的工厂函数
 *
 * 这是一个更灵活的替代方案，类似于参考实现中的 `Tool.define()` 模式。
 *
 * @param options - 工具配置选项
 * @returns 技能工具实例
 */
export function createSkillTool(options: { includeDescription?: boolean } = {}): SkillTool {
    return new SkillTool(options.includeDescription ?? true);
}

/**
 * 默认技能工具实例
 *
 * 包含完整描述的预配置实例。
 */
export const defaultSkillTool = createSkillTool();

/**
 * 简化版技能工具
 *
 * 不包含技能列表，适合技能数量较多时使用。
 */
export const simpleSkillTool = createSkillTool({ includeDescription: false });

/**
 * ============================================================================
 * 向后兼容：保留原有的类定义
 * ============================================================================
 *
 * 以下类保持向后兼容，但建议使用新的 SkillTool 替代。
 */




