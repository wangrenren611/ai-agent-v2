/**
 * ============================================================================
 * Docker Sandbox Executor
 * ============================================================================
 *
 * 使用 Docker 容器实现安全的命令执行环境
 *
 * 优化特性：
 * - 容器池复用（减少启动开销）
 * - 镜像预拉取和缓存
 * - 指数退避重试
 * - 资源使用监控
 */

import Docker from 'dockerode';
import { randomUUID } from 'node:crypto';
import { PassThrough } from 'node:stream';
import type {
    ISandboxExecutor,
    SandboxConfig,
    SandboxExecutionResult,
    SandboxResources,
} from './types.js';
import { ScopedLogger } from '../util/log.js';

/**
 * 默认 Docker 镜像（轻量级、包含 bash）
 */
const DEFAULT_DOCKER_IMAGE = 'alpine:3.18';

/**
 * 默认资源限制
 */
const DEFAULT_RESOURCES: SandboxResources = {
    cpus: 2,                          // 最多 2 CPU 核
    memory: '512m',                  // 512MB 内存
    disk: '1g',                      // 1GB 磁盘
};

/**
 * 容器池配置
 */
interface PoolConfig {
    maxContainers: number;         // 最大容器数量
    idleTimeout: number;          // 空闲超时（毫秒）
    maxReuseAge: number;          // 最大复用年龄（毫秒）
}

/**
 * 容器池中的容器项
 */
interface PooledContainer {
    container: any;
    createdAt: number;
    lastUsedAt: number;
    usedCount: number;
    currentImage: string;
}

/**
 * 重试配置
 */
interface RetryConfig {
    maxRetries: number;            // 最大重试次数
    initialDelay: number;          // 初始延迟（毫秒）
    maxDelay: number;              // 最大延迟（毫秒）
    backoffFactor: number;          // 退避因子
}

/**
 * 资源监控数据
 */
interface ResourceUsage {
    cpuUsage: number;
    memoryUsage: number;
    timestamp: number;
}

/**
 * Docker 沙箱执行器（优化版）
 */
export class DockerSandboxExecutor implements ISandboxExecutor {
    private docker: any;
    private logger: ScopedLogger;
    private containerId: string | null = null;
    
    // ========== 优化：容器池 ==========
    private pool: Map<string, PooledContainer> = new Map();
    private poolConfig: PoolConfig = {
        maxContainers: 5,
        idleTimeout: 30000,      // 30 秒
        maxReuseAge: 120000,     // 2 分钟
    };
    
    // ========== 优化：镜像管理 ==========
    private pulledImages = new Set<string>();
    private pullInProgress = new Map<string, Promise<void>>();
    
    // ========== 优化：重试机制 ==========
    private retryConfig: RetryConfig = {
        maxRetries: 3,
        initialDelay: 1000,    // 1 秒
        maxDelay: 10000,        // 10 秒
        backoffFactor: 2,
    };
    
    // ========== 优化：资源监控 ==========
    private resourceUsage: ResourceUsage[] = [];
    private maxResourceUsageRecords = 100;  // 最多保留 100 条记录

    constructor() {
        this.docker = new Docker({ socketPath: process.env.DOCKER_SOCKET_PATH });
        this.logger = new ScopedLogger('DockerSandbox');
        
        // 定期清理空闲容器
        this.startPoolCleanup();
    }

    /**
     * 检查 Docker 是否可用
     */
    async isAvailable(): Promise<boolean> {
        try {
            await this.docker.ping();
            this.logger.debug('Docker is available');
            return true;
        } catch (error) {
            this.logger.warn(`Docker is not available: ${error}`);
            return false;
        }
    }

    /**
     * 执行命令
     */
    async execute(command: string, options?: SandboxConfig): Promise<SandboxExecutionResult> {
        const startTime = Date.now();

        try {
            // 预拉取镜像（后台进行）
            this.ensureImagePulled(options?.dockerImage || DEFAULT_DOCKER_IMAGE);
            
            // 尝试从容器池获取可用容器
            const pooledContainer = await this.acquireFromPool(options?.dockerImage || DEFAULT_DOCKER_IMAGE);
            
            if (pooledContainer) {
                return await this.executeInPooledContainer(pooledContainer, command, options);
            } else {
                return await this.executeInNewContainer(command, options);
            }
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`Docker execution failed: ${error}`);

            return {
                exitCode: -1,
                stdout: '',
                stderr: error instanceof Error ? error.message : String(error),
                duration,
            };
        }
    }

    /**
     * 确保镜像已拉取（后台缓存）
     */
    private ensureImagePulled(image: string): void {
        // 已在拉取中
        if (this.pullInProgress.has(image)) {
            return;
        }
        
        // 已拉取过
        if (this.pulledImages.has(image)) {
            return;
        }
        
        // 后台拉取镜像
        const pullPromise = this.docker.pull(image)
            .then(() => {
                this.pulledImages.add(image);
                this.pullInProgress.delete(image);
                this.logger.debug(`Image ${image} pulled successfully`);
            })
            .catch((error: unknown) => {
                this.logger.error(`Failed to pull image ${image}: ${error}`);
                this.pullInProgress.delete(image);
            });
        
        this.pullInProgress.set(image, pullPromise);
    }

    /**
     * 从容器池获取可用容器
     */
    private async acquireFromPool(image: string): Promise<PooledContainer | null> {
        // 查找匹配镜像且可复用的容器
        for (const [key, pooled] of this.pool.entries()) {
            if (pooled.currentImage !== image) {
                continue;
            }
            
            const age = Date.now() - pooled.lastUsedAt;
            
            // 检查容器是否仍在运行
            const container = await this.docker.getContainer(key);
            const isRunning = container && await this.isContainerRunning(container);
            
            if (!isRunning) {
                // 容器已停止，从池中移除
                this.pool.delete(key);
                continue;
            }
            
            // 检查复用条件
            if (age > this.poolConfig.maxReuseAge || pooled.usedCount > 10) {
                // 超过最大复用年龄或使用次数过多，不复用
                continue;
            }
            
            // 找到可复用的容器
            this.logger.debug(`Reusing container ${key} (age: ${age}ms, used: ${pooled.usedCount})`);
            pooled.lastUsedAt = Date.now();
            pooled.usedCount++;
            return pooled;
        }
        
        return null;  // 没有可用容器
    }

    /**
     * 在已存在的容器中执行命令
     */
    private async executeInPooledContainer(
        pooled: PooledContainer,
        command: string,
        options?: SandboxConfig
    ): Promise<SandboxExecutionResult> {
        const startTime = Date.now();
        
        try {
            this.logger.debug(`Executing in pooled container ${pooled.container.id}`);
            
            // 执行命令
            const result = await this.executeWithRetry(
                async () => {
                    // 重新启动容器（如果需要）
                    await this.ensureContainerRunning(pooled.container);
                    return this.execInContainer(pooled.container, command, options);
                },
                options
            );
            
            const duration = Date.now() - startTime;
            
            return {
                exitCode: result.exitCode || 0,
                stdout: result.stdout || '',
                stderr: result.stderr || '',
                duration,
                sandbox: {
                    containerId: pooled.container.id,
                    imageName: pooled.currentImage,
                    resourcesUsed: options?.resources,
                    reused: true,
                },
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`Pooled container execution failed: ${error}`);
            
            // 标记容器为不可用
            await this.markContainerAsUnavailable(pooled.container.id);
            
            return {
                exitCode: -1,
                stdout: '',
                stderr: error instanceof Error ? error.message : String(error),
                duration,
            };
        }
    }

    private async execInContainer(
        container: any,
        command: string,
        _options?: SandboxConfig
    ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
        const execInstance = await container.exec({
            Cmd: ['/bin/sh', '-c', command],
            AttachStdout: true,
            AttachStderr: true,
        });

        const stream = await execInstance.start({ hijack: true, stdin: false });
        const stdoutChunks: Buffer[] = [];
        const stderrChunks: Buffer[] = [];
        const stdoutStream = new PassThrough();
        const stderrStream = new PassThrough();

        if (container.modem?.demuxStream) {
            container.modem.demuxStream(stream, stdoutStream, stderrStream);
            stdoutStream.on('data', (chunk: Buffer) => stdoutChunks.push(Buffer.from(chunk)));
            stderrStream.on('data', (chunk: Buffer) => stderrChunks.push(Buffer.from(chunk)));
        } else {
            stream.on('data', (chunk: Buffer) => stdoutChunks.push(Buffer.from(chunk)));
        }

        await new Promise<void>((resolve, reject) => {
            stream.on('end', resolve);
            stream.on('close', resolve);
            stream.on('error', reject);
        });

        const inspect = await execInstance.inspect();
        const exitCode = typeof inspect.ExitCode === 'number' ? inspect.ExitCode : 0;

        return {
            exitCode,
            stdout: Buffer.concat(stdoutChunks).toString('utf8').trimEnd(),
            stderr: Buffer.concat(stderrChunks).toString('utf8').trimEnd(),
        };
    }

    /**
     * 在新容器中执行命令
     */
    private async executeInNewContainer(
        command: string,
        options?: SandboxConfig
    ): Promise<SandboxExecutionResult> {
        const startTime = Date.now();
        
        try {
            // 准备工作目录
            const workdir = options?.workdir || process.cwd();
            
            // 构建挂载点
            const binds = this.buildBinds(workdir, options?.readonlyMounts);
            
            // 构建环境变量
            const env = this.buildEnv(options?.env);
            
            // 选择镜像
            const image = options?.dockerImage || DEFAULT_DOCKER_IMAGE;
            
            this.logger.info(`Executing in new Docker container`);
            this.logger.debug(`Image: ${image}, Workdir: ${workdir}`);
            
            // 创建并启动容器
            const container = await this.createContainerWithRetry(
                image,
                command,
                workdir,
                binds,
                env,
                options
            );
            
            this.containerId = container.id;
            
            // 添加到容器池
            this.pool.set(container.id, {
                container,
                createdAt: Date.now(),
                lastUsedAt: Date.now(),
                usedCount: 1,
                currentImage: image,
            });
            
            // 等待容器完成
            const result = await this.waitForContainer(container, options);
            
            const duration = Date.now() - startTime;
            
            // 记录资源使用
            this.recordResourceUsage(container, duration);
            
            this.logger.info(`Container execution completed in ${duration}ms`);
            
            return {
                exitCode: result.exitCode || 0,
                stdout: result.stdout || '',
                stderr: result.stderr || '',
                duration,
                sandbox: {
                    containerId: container.id,
                    imageName: image,
                    resourcesUsed: options?.resources,
                    reused: false,
                },
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`New container execution failed: ${error}`);
            
            return {
                exitCode: -1,
                stdout: '',
                stderr: error instanceof Error ? error.message : String(error),
                duration,
            };
        }
    }

    /**
     * 创建容器（带重试）
     */
    private async createContainerWithRetry(
        image: string,
        command: string,
        workdir: string,
        binds: string[],
        env: string[],
        options?: SandboxConfig
    ): Promise<any> {
        return await this.executeWithRetry(
            async () => {
                return await this.docker.createContainer({
                    name: `ai-agent-sandbox-${randomUUID()}`,
                    Image: image,
                    Cmd: ['/bin/sh', '-c', command],
                    WorkingDir: '/workspace',
                    HostConfig: {
                        Binds: binds,
                        NetworkMode: options?.network || 'none',
                        PortBindings: {},
                        Privileged: false,
                        ReadonlyRootfs: false,
                        AutoRemove: true,
                        Memory: options?.resources?.memory || DEFAULT_RESOURCES.memory,
                        CpuShares: options?.resources?.cpus ? options?.resources.cpus * 1024 : undefined,
                        DiskQuota: options?.resources?.disk,
                    },
                    Env: env,
                    Tty: false,
                    AttachStdin: false,
                    AttachStdout: false,
                    AttachStderr: false,
                });
            },
            options
        );
    }

    /**
     * 等待容器完成
     */
    private async waitForContainer(container: any, options?: SandboxConfig): Promise<{ exitCode: number; stdout: string; stderr: string }> {
        try {
            const data = await container.wait({
                condition: 'removed',
                timeout: options?.timeout || 60000,
            });
            
            // 获取日志
            const logs = await container.logs({
                stdout: true,
                stderr: true,
                tail: 1000,
                timestamps: false,
            });
            
            const { stdout, stderr } = this.parseLogs(logs);
            
            return {
                exitCode: data.StatusCode.StatusCode || 0,
                stdout,
                stderr,
            };
        } catch (error) {
            this.logger.error(`Container wait failed: ${error}`);
            throw error;
        }
    }

    /**
     * 执行命令（带重试）
     */
    private async executeWithRetry<T>(
        fn: () => Promise<T>,
        options?: SandboxConfig
    ): Promise<T> {
        let lastError: Error | null = null;
        const retryConfig = options?.retryConfig || this.retryConfig;
        
        for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
            try {
                // 成功则返回
                return await fn();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                
                // 最后一次尝试不重试
                if (attempt === retryConfig.maxRetries) {
                    throw lastError;
                }
                
                // 计算退避延迟
                const delay = Math.min(
                    retryConfig.initialDelay * Math.pow(retryConfig.backoffFactor, attempt - 1),
                    retryConfig.maxDelay
                );
                
                this.logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
                
                // 等待后重试
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw lastError!;
    }

    /**
     * 确保容器在运行
     */
    private async ensureContainerRunning(container: any): Promise<void> {
        const containerInfo = await container.inspect();
        
        if (containerInfo.State.Running) {
            // 容器已在运行
            return;
        }
        
        // 启动容器
        this.logger.debug(`Starting container ${container.id}`);
        await container.start();
    }

    /**
     * 检查容器是否在运行
     */
    private async isContainerRunning(container: any): Promise<boolean> {
        try {
            const info = await container.inspect();
            return info.State.Running === true;
        } catch {
            return false;
        }
    }

    /**
     * 标记容器为不可用
     */
    private async markContainerAsUnavailable(containerId: string): Promise<void> {
        const container = await this.docker.getContainer(containerId);
        if (container) {
            this.pool.delete(containerId);
            await container.stop({ t: 5 });  // 优雅停止
        }
    }

    /**
     * 定期清理空闲容器
     */
    private startPoolCleanup(): void {
        setInterval(async () => {
            const now = Date.now();
            
            for (const [key, pooled] of this.pool.entries()) {
                const idleTime = now - pooled.lastUsedAt;
                
                // 超过空闲超时
                if (idleTime > this.poolConfig.idleTimeout) {
                    this.logger.debug(`Removing idle container ${key} (idle: ${idleTime}ms)`);
                    
                    const container = await this.docker.getContainer(key);
                    if (container) {
                        await container.remove({ force: true });
                    }
                    
                    this.pool.delete(key);
                }
                
                // 检查容器数量限制
                if (this.pool.size > this.poolConfig.maxContainers) {
                    // 移除最旧的容器
                    const oldestKey = [...this.pool.keys()].sort((a, b) => {
                        const pooledA = this.pool.get(a)!;
                        const pooledB = this.pool.get(b)!;
                        return pooledA.createdAt - pooledB.createdAt;
                    })[0];
                    
                    this.logger.debug(`Removing oldest container ${oldestKey} (pool size: ${this.pool.size})`);
                    
                    const container = await this.docker.getContainer(oldestKey);
                    if (container) {
                        await container.remove({ force: true });
                    }
                    
                    this.pool.delete(oldestKey);
                }
            }
        }, 30000);  // 每 30 秒检查一次
    }

    /**
     * 清理资源
     */
    async cleanup(): Promise<void> {
        // 清理所有容器池中的容器
        for (const [key] of this.pool.keys()) {
            const container = await this.docker.getContainer(key);
            if (container) {
                await container.remove({ force: true });
            }
            this.pool.delete(key);
        }
        
        // 清理当前容器
        if (this.containerId) {
            const container = await this.docker.getContainer(this.containerId);
            if (container) {
                await container.remove({ force: true });
            }
            this.containerId = null;
        }
        
        this.logger.info('All sandbox resources cleaned up');
    }

    /**
     * 记录资源使用
     */
    private async recordResourceUsage(container: any, duration: number): Promise<void> {
        try {
            const stats = await container.stats({ stream: false });
            const usage: ResourceUsage = {
                cpuUsage: stats.cpu_stats?.cpu_usage?.total_usage || 0,
                memoryUsage: stats.memory_stats?.usage || 0,
                timestamp: Date.now(),
            };

            this.resourceUsage.push(usage);

            // 限制记录数量
            if (this.resourceUsage.length > this.maxResourceUsageRecords) {
                this.resourceUsage.shift();
            }
        } catch (error) {
            this.logger.debug(`Failed to record resource usage: ${error}`);
        }
    }

    /**
     * 获取资源使用统计
     */
    getResourceStats(): { averageCpuUsage: number; averageMemoryUsage: number } | null {
        if (this.resourceUsage.length === 0) {
            return null;
        }
        
        const totalCpu = this.resourceUsage.reduce((sum, r) => sum + r.cpuUsage, 0);
        const totalMemory = this.resourceUsage.reduce((sum, r) => sum + r.memoryUsage, 0);
        
        return {
            averageCpuUsage: totalCpu / this.resourceUsage.length,
            averageMemoryUsage: totalMemory / this.resourceUsage.length,
        };
    }

    /**
     * 清空资源使用统计
     */
    clearResourceStats(): void {
        this.resourceUsage = [];
    }

    /**
     * 构建挂载点
     */
    private buildBinds(workdir: string, readonlyMounts?: string[]): string[] {
        const binds: string[] = [];
        
        // 工作目录：读写
        binds.push(`${workdir}:/workspace`);
        
        // 只读挂载（如项目根目录、依赖目录）
        if (readonlyMounts) {
            for (const mountPath of readonlyMounts) {
                binds.push(`${mountPath}:/workspace/${mountPath.split('/').pop() || 'readonly'}:ro`);
            }
        }

        return binds;
    }

    /**
     * 构建环境变量
     */
    private buildEnv(customEnv?: Record<string, string>): string[] {
        const env: string[] = [];
        
        // 继承当前环境变量（选择性）
        const allowedVars = ['PATH', 'HOME', 'TERM', 'LANG', 'LC_ALL', 'NODE_ENV'];
        for (const varName of allowedVars) {
            if (process.env[varName]) {
                env.push(`${varName}=${process.env[varName]}`);
            }
        }
        
        // 添加自定义环境变量
        if (customEnv) {
            for (const [key, value] of Object.entries(customEnv)) {
                env.push(`${key}=${value}`);
            }
        }
        
        return env;
    }

    /**
     * 解析 Docker 日志
     */
    private parseLogs(logs: Buffer[]): { stdout: string; stderr: string } {
        const stdout: string[] = [];
        const stderr: string[] = [];

        for (const log of logs) {
            const text = log.toString('utf-8').trim();

            // Docker 日志格式：stderr 流会带前缀
            if (text.startsWith('STDERR: ')) {
                stderr.push(text.substring(7));
            } else if (text.startsWith('STDOUT: ')) {
                stdout.push(text.substring(7));
            } else if (text) {
                // 没有前缀，默认为 stdout
                stdout.push(text);
            }
        }

        return {
            stdout: stdout.join('\n'),
            stderr: stderr.join('\n'),
        };
    }
}

/**
 * 创建 Docker 沙箱执行器实例
 */
export function createDockerSandbox(): DockerSandboxExecutor {
    return new DockerSandboxExecutor();
}
