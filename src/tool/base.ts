import { z } from 'zod';

/**
 * 统一的工具执行结果接口
 */
export interface ToolResult<T = unknown> {
    /** 是否成功 */
    success: boolean;
    /** 结果数据 */
    data?: T;
    /** 错误信息（失败时必填） */
    error?: string;
    /** 元数据 */
    metadata?: {
        /** 工具名称 */
        toolName?: string;
        /** 执行耗时（毫秒） */
        duration?: number;
        /** 结果是否被截断 */
        truncated?: boolean;
        /** 其他信息 */
        [key: string]: unknown;
    };
}

/**
 * 工具上下文信息
 */
export type ToolContext = {
    environment: string;
    platform: string;
    time: string;
    sessionId?: string;
    sessionPath?: string;
};

/**
 * 工具基类
 *
 * @typeParam T - Zod schema 类型
 */
export abstract class BaseTool<T extends z.ZodType> {
    /** 工具名称 */
    abstract name: string;

    /** 工具描述 */
    abstract description: string;

    /** 参数 schema */
    abstract schema: T;

    /** 会话 ID */
    sessionId?: string;

    /**
     * 执行工具
     * @param args - 解析后的参数
     * @returns 统一的工具结果
     */
    abstract execute(args?: z.infer<T>): Promise<ToolResult> | ToolResult;

    /**
     * 获取上下文信息
     */
    protected getContext(): ToolContext {
        return {
            environment: process.cwd(),
            platform: process.platform,
            time: new Date().toISOString(),
            sessionId: this?.sessionId,
        };
    }

    /**
     * 创建成功结果
     */
    protected success<T>(data: T, metadata?: ToolResult['metadata']): ToolResult<T> {
        return {
            success: true,
            data,
            metadata: {
                toolName: this.name,
                ...metadata,
            },
        };
    }

    /**
     * 创建失败结果
     */
    protected fail(error: string, metadata?: ToolResult['metadata']): ToolResult {
        return {
            success: false,
            error,
            metadata: {
                toolName: this.name,
                ...metadata,
            },
        };
    }
}

export { z };
