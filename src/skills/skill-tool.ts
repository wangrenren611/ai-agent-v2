/**
 * Skill Tool
 *
 * 提供工具让 AI 按需读取技能文件内容
 */

import { z } from 'zod';
import { BaseTool } from '../tool/base';
import { getSkillLoader } from './loader';

/**
 * 读取技能工具
 *
 * 允许 AI 按需读取技能的完整内容
 */
export class ReadSkillTool extends BaseTool<
    z.ZodObject<{
        skillName: z.ZodString;
        file: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }>
> {
    name = 'read_skill';
    description = 'Read the content of a skill file. Use this when you need detailed information about a specific skill or workflow. The skill content provides domain knowledge and step-by-step guidance for specialized tasks.';

    schema = z.object({
        skillName: z.string().describe('The name of the skill to read (e.g., "git-commit", "frontend-design")'),
        file: z.string().nullable().optional().describe('Optional: specific file name within the skill directory (e.g., "reference.md", "examples.md"). Defaults to "SKILL.md" if not specified.'),
    });

    async execute(args: { skillName: string; file?: string | null }): Promise<string> {
        const { skillName, file } = args;
        const fileName = file || 'SKILL.md';

        try {
            const loader = getSkillLoader();
            const content = await loader.readSkillFile(skillName, fileName);
            return content;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            return `Error reading skill "${skillName}": ${errorMsg}`;
        }
    }
}

/**
 * 列出可用技能工具
 *
 * 允许 AI 查看所有可用技能及其描述
 */
export class ListSkillsTool extends BaseTool<z.ZodObject<{}>> {
    name = 'list_skills';
    description = 'List all available skills with their names and descriptions. Use this to discover what specialized knowledge and workflows are available.';

    schema = z.object({});

    async execute(): Promise<string> {
        try {
            const loader = getSkillLoader();
            const metadata = loader.getAllMetadata();

            if (metadata.length === 0) {
                return 'No skills available.';
            }

            const lines = [
                'Available Skills:',
                ...metadata.map((skill) => `- \`${skill.name}\`: ${skill.description}`),
                '',
                `Use \`read_skill\` to read the full content of any skill.`,
            ];

            return lines.join('\n');
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            return `Error listing skills: ${errorMsg}`;
        }
    }
}
