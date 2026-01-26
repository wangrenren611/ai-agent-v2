/**
 * ============================================================================
 * Permission CLI - 危险操作确认界面
 * ============================================================================
 *
 * 提供交互式的危险操作确认界面
 */

import readline from 'readline';
import { ScopedLogger } from '../util/log';
import { AgentContext, ConfirmationRequest } from './index';

const logger = new ScopedLogger('PermissionCLI');

/**
 * 危险操作确认 CLI
 */
export class PermissionCLI {
    private context: AgentContext;
    private rl: readline.Interface;
    private active: boolean = false;

    constructor(context: AgentContext) {
        this.context = context;
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
    }

    /**
     * 启动确认监听
     */
    start(): void {
        this.active = true;

        // 监听安全警告事件
        this.context.on('security:warning' as any, async (request: ConfirmationRequest) => {
            if (this.active) {
                await this.handleConfirmation(request);
            }
        });
    }

    /**
     * 停止监听
     */
    stop(): void {
        this.active = false;
    }

    /**
     * 处理确认请求
     */
    private async handleConfirmation(request: ConfirmationRequest): Promise<void> {
        console.log('\n' + '='.repeat(60));
        console.log('⚠️  危险操作警告');
        console.log('='.repeat(60));
        console.log(`操作类型: ${request.operation}`);
        console.log(`风险等级: ${this.formatRiskLevel(request.riskLevel)}`);
        console.log(`命令: ${request.command}`);
        if (request.affectedPath) {
            console.log(`影响路径: ${request.affectedPath}`);
        }
        console.log(`时间: ${request.timestamp.toLocaleString()}`);
        console.log('-'.repeat(60));
        console.log('此操作需要用户确认才能执行');
        console.log('='.repeat(60));

        const answer = await this.askQuestion(
            '是否允许执行此操作? (y/n/a - yes/no/always): '
        );

        let confirmed: boolean;
        switch (answer.toLowerCase()) {
            case 'y':
            case 'yes':
                confirmed = true;
                break;
            case 'a':
            case 'always':
                confirmed = true;
                this.context.setSecurityMode('allow');
                console.log('已切换到"允许所有操作"模式');
                break;
            default:
                confirmed = false;
        }

        // 通知 context 处理结果
        this.context.handleConfirmation(request.id, confirmed);

        if (confirmed) {
            console.log('✅ 操作已允许');
        } else {
            console.log('❌ 操作已拒绝');
        }
    }

    /**
     * 询问用户
     */
    private askQuestion(question: string): Promise<string> {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer);
            });
        });
    }

    /**
     * 格式化风险等级
     */
    private formatRiskLevel(level: string): string {
        const colors: Record<string, string> = {
            low: '🟢 低风险',
            medium: '🟡 中风险',
            high: '🟠 高风险',
            critical: '🔴 极高风险',
        };
        return colors[level] || level;
    }

    /**
     * 关闭 CLI
     */
    close(): void {
        this.stop();
        this.rl.close();
    }
}

/**
 * 确认请求处理结果
 */
export interface ConfirmationResult {
    confirmed: boolean;
    always: boolean;
}

/**
 * 简单确认函数（非交互式）
 */
export async function confirmDangerousOperation(
    context: AgentContext,
    request: Omit<ConfirmationRequest, 'id' | 'timestamp'>
): Promise<ConfirmationResult> {
    const fullRequest: ConfirmationRequest = {
        ...request,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
    };

    const confirmed = await context.requestConfirmation(
        request.operation,
        request.description,
        request.command,
        request.affectedPath
    );

    return {
        confirmed,
        always: false,
    };
}
