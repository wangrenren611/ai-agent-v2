import { z } from 'zod';
import * as path from 'path';
import { BaseTool, ToolResult } from '../tool/base.js';
import { getSkillLoader } from './loader.js';
import { parseSkillMarkdown } from './parser.js';

export interface SkillToolResult {
    title: string;
    output: string;
    metadata: {
        name: string;
        dir: string;
    };
}

const parameters = z.object({
    name: z.string().describe("The skill identifier from available_skills"),
});

export class SkillTool extends BaseTool<typeof parameters> {
    name = 'skill';
    description = '';
    schema = parameters;

    constructor(private includeDescription: boolean = true) {
        super();
        this.description = this.generateDescription();
    }

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

    async execute(args: z.infer<typeof parameters>): Promise<ToolResult> {
        const loader = getSkillLoader();
        const skill = loader.getSkill(args.name);

        // === 业务错误：技能不存在 ===
        if (!skill) {
            const available = loader.getAllMetadata().map((s) => s.name).join(', ');
            return this.fail(
                `Skill "${args.name}" not found`,
                { code: 'SKILL_NOT_FOUND', name: args.name, availableSkills: available || 'none' }
            );
        }

        // === 底层异常：读取技能文件失败 ===
        let content: string;
        try {
            content = await loader.readSkillFile(args.name, 'SKILL.md');
        } catch (error) {
            throw new Error(`Failed to read skill file: ${error}`);
        }

        // === 底层异常：解析 Markdown 失败 ===
        let parsed: string;
        try {
            parsed = parseSkillMarkdown(content, skill.metadata.path);
        } catch (error) {
            throw new Error(`Failed to parse skill markdown: ${error}`);
        }

        const result: SkillToolResult = {
            title: `Loaded skill: ${skill.metadata.name}`,
            output: [
                `## Skill: ${skill.metadata.name}`,
                '',
                `**Base directory**: ${skill.metadata.path}`,
                '',
                parsed.trim()
            ].join('\n'),
            metadata: {
                name: skill.metadata.name,
                dir: skill.metadata.path,
            },
        };

        return this.success(result);
    }
}

export function createSkillTool(options: { includeDescription?: boolean } = {}): SkillTool {
    return new SkillTool(options.includeDescription ?? true);
}

export const defaultSkillTool = createSkillTool();
export const simpleSkillTool = createSkillTool({ includeDescription: false });
