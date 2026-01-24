/**
 * ============================================================================
 * Sandbox Types
 * ============================================================================
 *
 * 沙箱执行器类型定义
 */

/**
 * 沙箱模式
 */
export type SandboxMode = 'none' | 'docker' | 'firejail' | 'bubblewrap';

/**
 * 沙箱配置
 */
export interface SandboxConfig {
    /** 沙箱模式 */
    mode: SandboxMode;
    
    /** Docker 镜像名称 */
    dockerImage?: string;
    
    /** 工作目录挂载点 */
    workdir?: string;
    
    /** 资源限制 */
    resources?: SandboxResources;
    
    /** 网络策略 */
    network?: SandboxNetwork;
    
    /** 只读挂载点 */
    readonlyMounts?: string[];
    
    /** 环境变量 */
    env?: Record<string, string>;
    
    /** 超时时间（毫秒） */
    timeout?: number;
}

/**
 * 资源限制
 */
export interface SandboxResources {
    /** CPU 限制（1-4 核） */
    cpus?: number;
    
    /** 内存限制（如 '512m', '1g'） */
    memory?: string;
    
    /** 磁盘空间限制（如 '1g'） */
    disk?: string;
}

/**
 * 网络策略
 */
export type SandboxNetwork = 'none' | 'bridge' | 'host';

/**
 * 沙箱执行结果
 */
export interface SandboxExecutionResult {
    /** 退出码 */
    exitCode: number;
    
    /** 标准输出 */
    stdout: string;
    
    /** 标准错误 */
    stderr: string;
    
    /** 执行时间（毫秒） */
    duration: number;
    
    /** 沙箱特定信息 */
    sandbox?: {
        containerId?: string;
        imageName?: string;
        resourcesUsed?: {
            cpu?: string;
            memory?: string;
        };
    };
}

/**
 * 沙箱执行器接口
 */
export interface ISandboxExecutor {
    /** 检查沙箱是否可用 */
    isAvailable(): Promise<boolean>;
    
    /** 执行命令 */
    execute(command: string, options?: SandboxConfig): Promise<SandboxExecutionResult>;
    
    /** 清理资源 */
    cleanup(): Promise<void>;
}
