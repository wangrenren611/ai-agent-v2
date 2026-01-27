/**
 * Skill Loader
 *
 * 负责发现、加载和管理技能
 * 兼容 Claude Code Skills 格式
 */

import * as fs from 'fs/promises';
import { watch } from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import type {
    Skill,
    SkillFile,
    SkillLoaderOptions,
    SkillMetadata,
    SkillFrontmatter
} from './types.js';

/**
 * 默认技能目录
 */
const DEFAULT_SKILLS_DIR = path.join(process.cwd(), 'skills');

/**
 * 技能加载器类
 */
export class SkillLoader {
    /** 已加载的技能映射 */
    private skills: Map<string, Skill> = new Map();

    /** 技能目录 */
    private skillsDir: string;

    /** 是否启用热重载 */
    private hotReload: boolean;

    /** 文件监听器（用于热重载） */
    private watcher: ReturnType<typeof watch> | null = null;

    constructor(options: SkillLoaderOptions = {}) {
        this.skillsDir = options.skillsDir || DEFAULT_SKILLS_DIR;
        this.hotReload = options.hotReload || false;
    }

    /**
     * 发现并加载所有技能
     */
    async load(): Promise<void> {
        try {
            // 查找所有 SKILL.md 文件
            const skillFiles = await fg('**/SKILL.md', {
                cwd: this.skillsDir,
                absolute: true,
                onlyFiles: true,
            });

            // 加载每个技能
            for (const skillPath of skillFiles) {
                await this.loadSkill(skillPath);
            }

            // 启用热重载（如果配置）
            if (this.hotReload) {
                this.enableHotReload();
            }
        } catch (error) {
            // 技能目录不存在是可接受的
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                console.warn(`[Skills] Failed to load skills: ${(error as Error).message}`);
            }
        }
    }

    /**
     * 加载单个技能文件
     */
    async loadSkill(skillPath: string): Promise<void> {
        try {
            const content = await fs.readFile(skillPath, 'utf-8');
            const skillDir = path.dirname(skillPath);
            const relativePath = path.relative(this.skillsDir, skillDir);

            const parsed = this.parseSkillMd(content, skillDir);

            // 验证技能名称
            if (!this.isValidSkillName(parsed.metadata.name)) {
                console.warn(`[Skills] Invalid skill name: ${parsed.metadata.name}`);
                return;
            }

            // 验证描述长度
            if (parsed.metadata.description.length > 1024) {
                console.warn(`[Skills] Description too long for skill: ${parsed.metadata.name}`);
                return;
            }

            const skill: Skill = {
                metadata: parsed.metadata,
                // 不在加载时存储完整内容，使用按需加载
            };

            this.skills.set(parsed.metadata.name, skill);
        } catch (error) {
            console.warn(`[Skills] Failed to load skill ${skillPath}: ${(error as Error).message}`);
        }
    }

    /**
     * 解析 SKILL.md 文件内容
     */
    parseSkillMd(content: string, skillDir: string): SkillFile {
        const parsed = matter(content);
        const frontmatter = parsed.data as SkillFrontmatter;

        if (!frontmatter.name || !frontmatter.description) {
            throw new Error('Missing required fields in frontmatter (name, description)');
        }

        return {
            metadata: {
                name: frontmatter.name,
                description: frontmatter.description,
                path: skillDir,
            },
            content: parsed.content,
        };
    }

    /**
     * 验证技能名称格式
     */
    private isValidSkillName(name: string): boolean {
        if (name.length > 64) return false;
        return /^[a-z0-9-]+$/.test(name);
    }

    /**
     * 获取指定技能
     */
    getSkill(name: string): Skill | undefined {
        return this.skills.get(name);
    }

    /**
     * 获取所有技能
     */
    getAllSkills(): Skill[] {
        return Array.from(this.skills.values());
    }

    /**
     * 获取所有技能元数据（不包含内容）
     */
    getAllMetadata(): SkillMetadata[] {
        return this.getAllSkills().map((skill) => skill.metadata);
    }

    /**
     * 获取技能数量
     */
    get size(): number {
        return this.skills.size;
    }

    /**
     * 启用热重载（开发模式）
     */
    enableHotReload(): void {
        if (this.watcher) {
            return; // 已经启用
        }

        // 使用简单的轮询实现热重载（避免额外依赖）
        let previousFiles = new Set<string>();

        const check = async () => {
            try {
                const skillFiles = await fg('**/SKILL.md', {
                    cwd: this.skillsDir,
                    absolute: true,
                    onlyFiles: true,
                });

                const currentFiles = new Set(skillFiles);

                // 检测新增或修改的文件
                for (const file of skillFiles) {
                    if (!previousFiles.has(file)) {
                        await this.loadSkill(file);
                    }
                }

                // 检测删除的文件
                for (const file of previousFiles) {
                    if (!currentFiles.has(file)) {
                        const skillDir = path.dirname(file);
                        const relativePath = path.relative(this.skillsDir, skillDir);
                        const skillName = path.basename(relativePath);

                        // 尝试通过路径推断技能名称并删除
                        for (const [name, skill] of this.skills.entries()) {
                            if (skill.metadata.path === skillDir) {
                                this.skills.delete(name);
                                break;
                            }
                        }
                    }
                }

                previousFiles = currentFiles;
            } catch (error) {
                // 静默处理错误
            }
        };

        // 每秒检查一次
        setInterval(check, 1000);
    }

    /**
     * 读取技能文件内容（按需加载）
     */
    async readSkillFile(skillName: string, fileName: string = 'SKILL.md'): Promise<string> {
        const skill = this.getSkill(skillName);
        if (!skill) {
            throw new Error(`Skill "${skillName}" not found`);
        }

        const filePath = path.join(skill.metadata.path, fileName);
        return await fs.readFile(filePath, 'utf-8');
    }

    /**
     * 清空所有技能
     */
    clear(): void {
        this.skills.clear();
    }
}

/**
 * 全局技能加载器实例
 */
let fgalSkillLoader: SkillLoader | null = null;

/**
 * 获取全局技能加载器实例
 */
export function getSkillLoader(options?: SkillLoaderOptions): SkillLoader {
    if (!fgalSkillLoader) {
        fgalSkillLoader = new SkillLoader(options);
    }
    return fgalSkillLoader;
}

/**
 * 初始化技能加载器
 */
export async function initializeSkills(options?: SkillLoaderOptions): Promise<SkillLoader> {
    const loader = getSkillLoader(options);
    await loader.load();
    return loader;
}
