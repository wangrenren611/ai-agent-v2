/**
 * ============================================================================
 * Agent Context - 统一的上下文容器
 * ============================================================================
 *
 * 职责：
 * - 集中管理所有运行时上下文
 * - 提供缓存目录、会话 ID、危险操作确认等核心功能
 * - 支持上下文隔离和继承
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { EventEmitter } from 'events';

// =============================================================================
// 类型定义
// =============================================================================

/**
 * 缓存配置
 */
export interface CacheConfig {
    /** 缓存根目录 */
    rootDir: string;
    /** 工具缓存子目录 */
    toolsDir: string;
    /** LLM 响应缓存 */
    llmCacheDir: string;
    /** 临时文件目录 */
    tempDir: string;
    /** 最大缓存大小 (bytes)，默认 1GB */
    maxCacheSize?: number;
    /** 缓存过期时间 (ms)，默认 24 小时 */
    cacheTtl?: number;
}

/**
 * 会话配置
 */
export interface SessionConfig {
    /** 会话 ID */
    sessionId: string;
    /** 用户 ID */
    userId: string;
    /** 会话根目录 */
    sessionDir: string;
    /** 消息历史文件 */
    messagesFile: string;
    /** 状态文件 */
    stateFile: string;
    /** 最大历史消息数 */
    maxHistorySize?: number;
    /** 是否启用自动压缩 */
    enableCompaction?: boolean;
}

/**
 * 安全配置
 */
export interface SecurityConfig {
    /** 是否启用危险操作确认 */
    enableConfirmation: boolean;
    /** 危险操作模式: 'prompt' | 'block' | 'allow' */
    dangerousMode: 'prompt' | 'block' | 'allow';
    /** 需要确认的操作类型 */
    dangerousOperations: DangerousOperationDef[];
    /** 白名单路径（不需确认） */
    safePaths?: string[];
    /** 黑名单路径（始终阻止） */
    blockedPaths?: string[];
}

/**
 * 危险操作类型
 */
export type DangerousOperation =
    | 'delete_file'
    | 'delete_directory'
    | 'format_disk'
    | 'modify_system_config'
    | 'execute_sudo'
    | 'network_modification'
    | 'modify_critical_file'
    | 'bulk_operation';

/**
 * 危险操作定义
 */
export interface DangerousOperationDef {
    type: DangerousOperation;
    patterns: RegExp[];
    description: string;
    confirmationMessage: string;
}

/**
 * 操作确认请求
 */
export interface ConfirmationRequest {
    id: string;
    operation: DangerousOperation;
    description: string;
    command: string;
    affectedPath?: string;
    timestamp: Date;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// =============================================================================
// 默认配置
// =============================================================================

const DEFAULT_CACHE_CONFIG: Required<CacheConfig> = {
    rootDir: '.agent-cache',
    toolsDir: 'tools',
    llmCacheDir: 'llm',
    tempDir: 'temp',
    maxCacheSize: 1024 * 1024 * 1024, // 1GB
    cacheTtl: 24 * 60 * 60 * 1000,    // 24小时
};

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
    enableConfirmation: true,
    dangerousMode: 'prompt',
    dangerousOperations: [
        {
            type: 'delete_file',
            patterns: [/rm\s+-rf/i, /del\s+\/f/i, /unlink\s*\(/i],
            description: '删除文件操作',
            confirmationMessage: '你正在执行删除文件操作，这可能是不可逆的',
        },
        {
            type: 'delete_directory',
            patterns: [/rmdir\s+\/s/i, /rd\s+\/s/i, /rm\s+-r/i],
            description: '删除目录操作',
            confirmationMessage: '你正在执行删除目录操作，这可能是不可逆的',
        },
        {
            type: 'format_disk',
            patterns: [/format\s+/i, /mkfs/i],
            description: '磁盘格式化操作',
            confirmationMessage: '警告：这是磁盘格式化操作，会清除所有数据！',
        },
        {
            type: 'execute_sudo',
            patterns: [/sudo\s+/i, /runas/i],
            description: '提权执行操作',
            confirmationMessage: '你正在请求管理员权限，这可能会影响系统安全',
        },
        {
            type: 'modify_system_config',
            patterns: [/etc\/passwd/i, /etc\/shadow/i, /\/etc\/hosts/i, /reg\s+add/i],
            description: '修改系统配置',
            confirmationMessage: '你正在修改系统配置文件，可能会影响系统稳定性',
        },
    ],
    safePaths: ['.agent-cache', 'node_modules'],
    blockedPaths: ['/etc', '/boot', '/proc', '/sys'],
};

// =============================================================================
// AgentContext 主类
// =============================================================================

export class AgentContext extends EventEmitter {
    // 配置
    private cacheConfig: CacheConfig;
    private sessionConfig: SessionConfig;
    private securityConfig: SecurityConfig;

    // 状态
    private initialized: boolean = false;
    private confirmationCallbacks: Map<string, (confirmed: boolean) => void> = new Map();

    /**
     * 创建 AgentContext
     */
    constructor(options: {
        cache?: Partial<CacheConfig>;
        session?: Partial<SessionConfig>;
        security?: Partial<SecurityConfig>;
    } = {}) {
        super();
        // 设置更高的监听器限制，避免内存泄漏警告
        this.setMaxListeners(50);
        this.cacheConfig = { ...DEFAULT_CACHE_CONFIG, ...options.cache };
        this.sessionConfig = this.createSessionConfig(options.session);
        this.securityConfig = { ...DEFAULT_SECURITY_CONFIG, ...options.security };
    }

    /**
     * 初始化上下文
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        // 创建缓存目录结构
        await this.createCacheStructure();

        // 创建会话目录
        await fs.mkdir(this.sessionConfig.sessionDir, { recursive: true });

        this.initialized = true;
        // console.log(`[Context] Initialized with session: ${this.sessionConfig.sessionId}`);
    }

    // =============================================================================
    // 缓存管理
    // =============================================================================

    /**
     * 获取缓存根目录
     */
    get cacheRoot(): string {
        return path.resolve(process.cwd(), this.cacheConfig.rootDir);
    }

    /**
     * 获取工具缓存目录
     */
    get toolsCacheDir(): string {
        return path.join(this.cacheRoot, this.cacheConfig.toolsDir);
    }

    /**
     * 获取 LLM 缓存目录
     */
    get llmCacheDir(): string {
        return path.join(this.cacheRoot, this.cacheConfig.llmCacheDir);
    }

    /**
     * 获取临时文件目录
     */
    get tempDir(): string {
        return path.join(this.cacheRoot, this.cacheConfig.tempDir);
    }

    /**
     * 获取会话缓存目录
     */
    get sessionCacheDir(): string {
        return path.join(this.cacheRoot, 'sessions', this.sessionConfig.sessionId);
    }

    /**
     * 检查缓存是否存在
     */
    async hasCache(key: string): Promise<boolean> {
        const cachePath = this.getCachePath(key);
        try {
            await fs.access(cachePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 获取缓存路径
     */
    getCachePath(key: string): string {
        const hash = this.hashKey(key);
        return path.join(this.sessionCacheDir, `${hash}.cache`);
    }

    /**
     * 读取缓存
     */
    async getCache<T>(key: string): Promise<T | null> {
        const cachePath = this.getCachePath(key);
        try {
            const content = await fs.readFile(cachePath, 'utf-8');
            const data = JSON.parse(content);

            // 检查是否过期
            if (data.expiresAt && Date.now() > data.expiresAt) {
                await fs.unlink(cachePath).catch(() => {});
                return null;
            }

            return data.value as T;
        } catch {
            return null;
        }
    }

    /**
     * 写入缓存
     */
    async setCache<T>(key: string, value: T, ttlMs?: number): Promise<void> {
        const cachePath = this.getCachePath(key);
        const expiresAt = ttlMs ? Date.now() + ttlMs : Date.now() + this.cacheConfig.cacheTtl!;

        await fs.writeFile(
            cachePath,
            JSON.stringify({ value, expiresAt }, null, 2)
        );
    }

    /**
     * 清理缓存
     */
    async clearCache(reason: string = 'manual'): Promise<void> {
        try {
            await fs.rm(this.sessionCacheDir, { recursive: true, force: true });
            await fs.mkdir(this.sessionCacheDir, { recursive: true });
            this.emit('cache:cleared' as any, reason);
        } catch (error) {
            console.error('[Context] Failed to clear cache:', error);
        }
    }

    /**
     * 获取缓存使用情况
     */
    async getCacheUsage(): Promise<{ size: number; fileCount: number }> {
        let totalSize = 0;
        let fileCount = 0;

        const traverse = async (dir: string) => {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        await traverse(fullPath);
                    } else {
                        const stats = await fs.stat(fullPath);
                        totalSize += stats.size;
                        fileCount++;
                    }
                }
            } catch {
                // 忽略权限错误
            }
        };

        await traverse(this.sessionCacheDir);
        return { size: totalSize, fileCount };
    }

    // =============================================================================
    // 会话管理
    // =============================================================================

    /**
     * 获取会话 ID
     */
    get sessionId(): string {
        return this.sessionConfig.sessionId;
    }

    /**
     * 获取用户 ID
     */
    get userId(): string {
        return this.sessionConfig.userId;
    }

    /**
     * 获取会话目录
     */
    get sessionDir(): string {
        return this.sessionConfig.sessionDir;
    }

    /**
     * 切换会话
     */
    async switchSession(newSessionId: string, newUserId?: string): Promise<void> {
        const oldSession = this.sessionConfig.sessionId;

        this.sessionConfig.sessionId = newSessionId;
        this.sessionConfig.sessionDir = path.join(this.cacheRoot, 'sessions', newSessionId);
        this.sessionConfig.messagesFile = path.join(this.sessionConfig.sessionDir, 'messages.json');
        this.sessionConfig.stateFile = path.join(this.sessionConfig.sessionDir, 'state.json');

        if (newUserId) {
            this.sessionConfig.userId = newUserId;
        }

        // 创建新会话目录
        await fs.mkdir(this.sessionConfig.sessionDir, { recursive: true });

        this.emit('session:changed' as any, oldSession, newSessionId);
        console.log(`[Context] Switched session: ${oldSession} -> ${newSessionId}`);
    }

    /**
     * 保存会话状态
     */
    async saveState(state: Record<string, unknown>): Promise<void> {
        await fs.writeFile(
            this.sessionConfig.stateFile,
            JSON.stringify(state, null, 2)
        );
    }

    /**
     * 加载会话状态
     */
    async loadState(): Promise<Record<string, unknown> | null> {
        try {
            const content = await fs.readFile(this.sessionConfig.stateFile, 'utf-8');
            return JSON.parse(content);
        } catch {
            return null;
        }
    }

    // =============================================================================
    // 安全管理
    // =============================================================================

    /**
     * 检查操作是否危险
     */
    analyzeOperation(command: string, args?: Record<string, unknown>): DangerousOperationDef | null {
        for (const op of this.securityConfig.dangerousOperations) {
            for (const pattern of op.patterns) {
                if (pattern.test(command)) {
                    // 检查参数中的路径
                    if (args?.filePath) {
                        const filePath = String(args.filePath);
                        if (this.isBlockedPath(filePath)) {
                            return {
                                type: op.type,
                                patterns: op.patterns,
                                description: op.description,
                                confirmationMessage: `警告：操作目标 ${filePath} 是系统关键路径！`,
                            };
                        }
                    }
                    return op;
                }
            }
        }
        return null;
    }

    /**
     * 检查路径是否被阻止
     */
    private isBlockedPath(filePath: string): boolean {
        const resolved = path.resolve(filePath);
        return this.securityConfig.blockedPaths?.some(p => resolved.startsWith(p)) ?? false;
    }

    /**
     * 检查路径是否安全（白名单）
     */
    isSafePath(filePath: string): boolean {
        const resolved = path.resolve(filePath);
        return this.securityConfig.safePaths?.some(p => resolved.includes(p)) ?? false;
    }

    /**
     * 请求危险操作确认
     */
    async requestConfirmation(
        operation: DangerousOperation,
        description: string,
        command: string,
        affectedPath?: string
    ): Promise<boolean> {
        if (!this.securityConfig.enableConfirmation) {
            return this.securityConfig.dangerousMode !== 'block';
        }

        // 如果是 allow 模式，直接允许
        if (this.securityConfig.dangerousMode === 'allow') {
            return true;
        }

        // 如果是 block 模式，直接拒绝
        if (this.securityConfig.dangerousMode === 'block') {
            return false;
        }

        // 计算风险等级
        const riskLevel = this.calculateRiskLevel(operation, affectedPath);

        const request: ConfirmationRequest = {
            id: this.generateId(),
            operation,
            description,
            command,
            affectedPath,
            timestamp: new Date(),
            riskLevel,
        };

        // 发送安全警告事件
        this.emit('security:warning' as any, request);

        // 等待用户确认（实际实现需要绑定 UI）
        return new Promise((resolve) => {
            this.confirmationCallbacks.set(request.id, (confirmed) => {
                this.confirmationCallbacks.delete(request.id);
                if (confirmed) {
                    this.emit('security:confirmed' as any, request);
                } else {
                    this.emit('security:denied' as any, request);
                }
                resolve(confirmed);
            });

            // 超时自动拒绝（30秒）
            setTimeout(() => {
                if (this.confirmationCallbacks.has(request.id)) {
                    this.confirmationCallbacks.delete(request.id);
                    this.emit('security:denied' as any, request);
                    resolve(false);
                }
            }, 30000);
        });
    }

    /**
     * 处理确认回调（供 UI 调用）
     */
    handleConfirmation(requestId: string, confirmed: boolean): void {
        const callback = this.confirmationCallbacks.get(requestId);
        if (callback) {
            callback(confirmed);
        }
    }

    /**
     * 计算风险等级
     */
    private calculateRiskLevel(operation: DangerousOperation, path?: string): 'low' | 'medium' | 'high' | 'critical' {
        const criticalOps: DangerousOperation[] = ['format_disk', 'modify_system_config'];
        const highOps: DangerousOperation[] = ['delete_file', 'delete_directory', 'execute_sudo'];

        if (criticalOps.includes(operation)) return 'critical';
        if (highOps.includes(operation)) return 'high';
        if (path && this.isBlockedPath(path)) return 'critical';
        return 'medium';
    }

    /**
     * 设置安全模式
     */
    setSecurityMode(mode: 'prompt' | 'block' | 'allow'): void {
        this.securityConfig.dangerousMode = mode;
        console.log(`[Context] Security mode set to: ${mode}`);
    }

    /**
     * 添加危险操作模式
     */
    addDangerousOperation(operation: DangerousOperationDef): void {
        this.securityConfig.dangerousOperations.push(operation);
    }

    // =============================================================================
    // 工具集成
    // =============================================================================

    /**
     * 获取工具上下文
     */
    getToolContext(): {
        sessionId: string;
        sessionDir: string;
        cacheDir: string;
        tempDir: string;
        userId: string;
    } {
        return {
            sessionId: this.sessionConfig.sessionId,
            sessionDir: this.sessionConfig.sessionDir,
            cacheDir: this.sessionCacheDir,
            tempDir: this.tempDir,
            userId: this.sessionConfig.userId,
        };
    }

    /**
     * 检查工具是否允许执行
     */
    async canExecuteTool(toolName: string, args: Record<string, unknown>): Promise<{
        allowed: boolean;
        reason?: string;
        requiresConfirmation?: boolean;
    }> {
        // 分析操作是否危险
        const dangerousOp = this.analyzeOperation(toolName, args);

        if (dangerousOp) {
            const confirmed = await this.requestConfirmation(
                dangerousOp.type,
                dangerousOp.description,
                `${toolName} ${JSON.stringify(args)}`,
                args.filePath as string
            );

            return {
                allowed: confirmed,
                reason: confirmed ? undefined : 'User denied the operation',
                requiresConfirmation: !confirmed,
            };
        }

        return { allowed: true };
    }

    // =============================================================================
    // 私有方法
    // =============================================================================

    private createSessionConfig(override?: Partial<SessionConfig>): SessionConfig {
        const sessionId = override?.sessionId || `session_${Date.now()}`;
        const userId = override?.userId || 'default';
        const sessionDir = path.join(this.cacheRoot, 'sessions', sessionId);

        return {
            sessionId,
            userId,
            sessionDir,
            messagesFile: path.join(sessionDir, 'messages.json'),
            stateFile: path.join(sessionDir, 'state.json'),
            maxHistorySize: override?.maxHistorySize ?? 1000,
            enableCompaction: override?.enableCompaction ?? true,
        };
    }

    private async createCacheStructure(): Promise<void> {
        const dirs = [
            this.cacheRoot,
            this.toolsCacheDir,
            this.llmCacheDir,
            this.tempDir,
            this.sessionCacheDir,
        ];

        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }
    }

    private hashKey(key: string): string {
        const crypto = require('crypto');
        return crypto.createHash('md5').update(key).digest('hex');
    }

    private generateId(): string {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// =============================================================================
// 单例导出
// =============================================================================

let contextInstance: AgentContext | null = null;

export function getAgentContext(options?: ConstructorParameters<typeof AgentContext>[0]): AgentContext {
    if (!contextInstance) {
        contextInstance = new AgentContext(options);
    }
    return contextInstance;
}

export function setAgentContext(context: AgentContext): void {
    contextInstance = context;
}
