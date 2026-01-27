import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { BaseTool, ToolResult } from './base.js';
import { getBackupManager } from '../util/backup-manager.js';
import chalk from 'chalk';

export class RollbackTool extends BaseTool<any> {
    name = 'rollback_file';

    description = 'Restore file to a previous backup version.';

    schema = z.object({
        filePath: z.string().describe('File path to restore'),
        backupId: z.string().describe('Backup ID to restore to'),
    });

    async execute({ filePath, backupId }: z.infer<typeof this.schema>): Promise<ToolResult> {
        const fullPath = path.resolve(process.cwd(), filePath);

        // === 业务错误：文件不存在 ===
        if (!fs.existsSync(fullPath)) {
            return this.fail('FILE_NOT_FOUND', { filePath });
        }

        // === 初始化备份管理器 ===
        const backupManager = getBackupManager();
        await backupManager.initialize();

        // === 业务错误：恢复失败 ===
        let success: boolean;
        try {
            success = await backupManager.restore(fullPath, backupId);
        } catch (error) {
            return this.fail(
                `Restore operation failed: ${error}`,
                { code: 'RESTORE_FAILED', backupId }
            );
        }

        if (success) {
            console.log(chalk.green(`\n[Rollback] 已恢复文件: ${filePath}`));
            console.log(chalk.gray(`备份 ID: ${backupId}`));
            return this.success({ filePath, backupId, restored: true });
        } else {
            return this.fail(
                `Backup not found: ${backupId}`,
                { code: 'BACKUP_NOT_FOUND', backupId }
            );
        }
    }
}

export class ListBackupsTool extends BaseTool<any> {
    name = 'list_backups';

    description = 'List all available backups for a file.';

    schema = z.object({
        filePath: z.string().describe('File path to list backups for'),
    });

    async execute({ filePath }: z.infer<typeof this.schema>): Promise<ToolResult> {
        const fullPath = path.resolve(process.cwd(), filePath);

        const backupManager = getBackupManager();
        await backupManager.initialize();

        const backups = backupManager.getBackups(fullPath);

        // === 业务错误：无备份 ===
        if (backups.length === 0) {
            return this.success({ filePath, backups: [] });
        }

        const formattedBackups = backups.map((backup) => ({
            id: backup.id,
            createdAt: new Date(backup.createdAt).toLocaleString('zh-CN'),
            size: backup.size,
            sizeFormatted: backup.size > 1024 ? `${(backup.size / 1024).toFixed(2)} KB` : `${backup.size} B`,
        }));

        console.log(chalk.bold(`\n文件 ${filePath} 的备份列表:`));

        formattedBackups.forEach((backup, index) => {
            console.log(
                chalk.yellow(`${index + 1}. 备份 ID: ${backup.id}`) +
                chalk.gray(` (${backup.createdAt}, ${backup.sizeFormatted})`)
            );
        });

        console.log(chalk.gray('使用 rollback_file 工具恢复到指定备份'));

        return this.success({ filePath, backups: formattedBackups });
    }
}

export class CleanBackupsTool extends BaseTool<any> {
    name = 'clean_backups';

    description = 'Delete all backups for a file. This action is irreversible.';

    schema = z.object({
        filePath: z.string().describe('File path to clean backups for'),
        confirm: z.boolean().describe('Set to true to confirm deletion').default(false),
    });

    async execute({ filePath, confirm }: z.infer<typeof this.schema>): Promise<ToolResult> {
        // === 业务错误：未确认 ===
        if (!confirm) {
            return this.fail(
                'CONFIRMATION_REQUIRED',
                { message: 'Set confirm=true to proceed with deletion' }
            );
        }

        const fullPath = path.resolve(process.cwd(), filePath);

        const backupManager = getBackupManager();
        await backupManager.initialize();

        // === 清理备份 ===
        try {
            await backupManager.clean(fullPath);
        } catch (error) {
            return this.fail(`Clean operation failed: ${error}`, { code: 'CLEAN_FAILED' });
        }

        console.log(chalk.yellow(`\n[Clean] 已清理文件 ${filePath} 的所有备份`));

        return this.success({ filePath, cleaned: true });
    }
}
