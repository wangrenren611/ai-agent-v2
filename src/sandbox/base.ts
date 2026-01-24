/**
 * ============================================================================
 * Sandbox Base Executor
 * ============================================================================
 *
 * 沙箱执行器抽象基类
 */

import { execCommandAsync } from '../util/platform-cmd';
import type { ISandboxExecutor, SandboxConfig, SandboxExecutionResult } from './types';
import { ScopedLogger } from '../util/log';

/**
 * 直接执行沙箱（无隔离）
 */
export class DirectExecutor implements ISandboxExecutor {
    protected logger: ScopedLogger;

    constructor() {
        this.logger = new ScopedLogger('DirectExecutor');
    }

    /**
     * 检查是否可用
     */
    async isAvailable(): Promise<boolean> {
        return true;  // 直接执行总是可用
    }

    /**
     * 执行命令（直接在宿主机）
     */
    async execute(command: string, options?: SandboxConfig): Promise<SandboxExecutionResult> {
        const startTime = Date.now();

        this.logger.debug(`Executing directly: ${command}`);

        try {
            const result = await execCommandAsync(command, {
                timeout: options?.timeout || 60000,
                cwd: options?.workdir || process.cwd(),
            });

            const duration = Date.now() - startTime;

            return {
                exitCode: result.exitCode,
                stdout: result.stdout,
                stderr: result.stderr,
                duration,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMsg = error instanceof Error ? error.message : String(error);

            this.logger.error(`Execution failed: ${errorMsg}`);

            return {
                exitCode: -1,
                stdout: '',
                stderr: errorMsg,
                duration,
            };
        }
    }

    /**
     * 清理资源（无操作）
     */
    async cleanup(): Promise<void> {
        // 直接执行无需清理
    }
}

/**
 * 沙箱执行器工厂
 */
export interface SandboxFactoryConfig {
    /** 默认沙箱模式 */
    defaultMode?: 'none' | 'docker' | 'auto';
    
    /** Docker 执行器配置 */
    docker?: {
        image?: string;
        resources?: {
            cpus?: number;
            memory?: string;
            disk?: string;
        };
        network?: 'none' | 'bridge' | 'host';
        readonlyMounts?: string[];
    };
}

/**
 * 沙箱执行器工厂
 */
export class SandboxExecutorFactory {
    private config: SandboxFactoryConfig;
    private dockerInstance: ISandboxExecutor | null = null;
    private directInstance: ISandboxExecutor | null = null;

    constructor(config: SandboxFactoryConfig = {}) {
        this.config = config;
    }

    /**
     * 创建执行器实例
     */
    async create(mode?: 'none' | 'docker' | 'auto'): Promise<ISandboxExecutor> {
        const targetMode = mode || this.config.defaultMode || 'auto';

        // 显式指定模式
        if (targetMode === 'none') {
            return this.getDirectExecutor();
        }

        if (targetMode === 'docker') {
            return this.getDockerExecutor();
        }

        // 自动模式：优先 Docker，降级到直接执行
        const { createDockerSandbox } = await import('./docker-executor');
        const dockerExecutor = createDockerSandbox();

        if (await dockerExecutor.isAvailable()) {
            return dockerExecutor;
        }

        // Docker 不可用，使用直接执行
        return this.getDirectExecutor();
    }

    /**
     * 获取直接执行器（单例）
     */
    private getDirectExecutor(): ISandboxExecutor {
        if (!this.directInstance) {
            this.directInstance = new DirectExecutor();
        }
        return this.directInstance;
    }

    /**
     * 获取 Docker 执行器（单例）
     */
    private async getDockerExecutor(): Promise<ISandboxExecutor> {
        if (!this.dockerInstance) {
            const { createDockerSandbox } = await import('./docker-executor');
            this.dockerInstance = createDockerSandbox();
        }
        return this.dockerInstance;
    }

    /**
     * 清理所有执行器
     */
    async cleanupAll(): Promise<void> {
        if (this.dockerInstance) {
            await this.dockerInstance.cleanup();
        }
        if (this.directInstance) {
            await this.directInstance.cleanup();
        }
    }
}

/**
 * 创建沙箱执行器工厂实例
 */
export function createSandboxFactory(config?: SandboxFactoryConfig): SandboxExecutorFactory {
    return new SandboxExecutorFactory(config);
}
