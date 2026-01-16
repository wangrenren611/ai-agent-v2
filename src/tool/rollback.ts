/**
 * ============================================================================
 * Rollback Tool
 * ============================================================================
 *
 * 提供文件回滚功能，用于恢复到之前的备份版本
 */
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { BaseTool } from './base';
import { getBackupManager, type BackupInfo } from '../util/backup-manager';
import chalk from 'chalk';

/**
 * 恢复文件到指定的备份版本
 */
export class RollbackTool extends BaseTool<any> {
    name = 'rollback_file';

    description =
        '恢复文件到之前的备份版本。' +
        '当文件编辑导致问题时，可以使用此工具恢复到之前的某个备份状态。';

    schema = z.object({
        filePath: z.string().describe('要恢复的文件路径（绝对路径或相对路径）'),
        backupId: z.string().describe('要恢复到的备份 ID（使用 list_backups 查看可用备份）'),
    });

    async execute({ filePath, backupId }: z.infer<typeof this.schema>): Promise<string> {
        const fullPath = path.resolve(process.cwd(), filePath);

        // 检查文件是否存在
        if (!fs.existsSync(fullPath)) {
            return `错误: 文件不存在: ${filePath}`;
        }

        try {
            const backupManager = getBackupManager();
            await backupManager.initialize();

            // 尝试恢复
            const success = await backupManager.restore(fullPath, backupId);

            if (success) {
                console.log(chalk.green(`\n[Rollback] 已恢复文件: ${filePath}`));
                console.log(chalk.gray(`备份 ID: ${backupId}`));
                return `文件已成功恢复到备份版本: ${backupId}`;
            } else {
                return `恢复失败: 找不到备份 ${backupId} 或恢复过程出错`;
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            return `恢复失败: ${errorMsg}`;
        }
    }
}

/**
 * 列出文件的可用备份
 */
export class ListBackupsTool extends BaseTool<any> {
    name = 'list_backups';

    description =
        '列出文件的所有可用备份。' +
        '返回每个备份的 ID、创建时间和文件大小，帮助选择要恢复的版本。';

    schema = z.object({
        filePath: z.string().describe('要查看备份的文件路径（绝对路径或相对路径）'),
    });

    async execute({ filePath }: z.infer<typeof this.schema>): Promise<string> {
        const fullPath = path.resolve(process.cwd(), filePath);

        try {
            const backupManager = getBackupManager();
            await backupManager.initialize();

            const backups = backupManager.getBackups(fullPath);

            if (backups.length === 0) {
                return `没有找到文件 ${filePath} 的备份`;
            }

            // 格式化输出
            const lines: string[] = [];
            lines.push(chalk.bold(`\n文件 ${filePath} 的备份列表:`));
            lines.push('');

            backups.forEach((backup, index) => {
                const date = new Date(backup.createdAt).toLocaleString('zh-CN');
                const size = backup.size > 1024 ? `${(backup.size / 1024).toFixed(2)} KB` : `${backup.size} B`;

                lines.push(
                    chalk.yellow(`${index + 1}. 备份 ID: ${backup.id}`) +
                        chalk.gray(` (${date}, ${size})`)
                );
            });

            lines.push('');
            lines.push(chalk.gray('使用 rollback_file 工具恢复到指定备份'));

            const result = backups
                .map(
                    (b, i) =>
                        `${i + 1}. ID: ${b.id}\n` +
                        `   创建时间: ${new Date(b.createdAt).toLocaleString('zh-CN')}\n` +
                        `   文件大小: ${b.size} bytes\n`
                )
                .join('\n');

            return `找到 ${backups.length} 个备份:\n\n${result}\n使用 rollback_file 恢复到指定备份`;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            return `查询备份失败: ${errorMsg}`;
        }
    }
}

/**
 * 清理文件的所有备份
 */
export class CleanBackupsTool extends BaseTool<any> {
    name = 'clean_backups';

    description = '删除文件的所有备份。注意：此操作不可逆，请谨慎使用。';

    schema = z.object({
        filePath: z.string().describe('要清理备份的文件路径（绝对路径或相对路径）'),
        confirm: z.boolean()
            .describe('确认删除，设置为 true 才会执行删除操作')
            .default(false),
    });

    async execute({ filePath, confirm }: z.infer<typeof this.schema>): Promise<string> {
        if (!confirm) {
            return '操作未执行：请设置 confirm=true 来确认删除操作';
        }

        const fullPath = path.resolve(process.cwd(), filePath);

        try {
            const backupManager = getBackupManager();
            await backupManager.initialize();

            await backupManager.clean(fullPath);

            console.log(chalk.yellow(`\n[Clean] 已清理文件 ${filePath} 的所有备份`));

            return `已删除文件 ${filePath} 的所有备份`;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            return `清理备份失败: ${errorMsg}`;
        }
    }
}
