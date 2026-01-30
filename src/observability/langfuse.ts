/**
 * ============================================================================
 * Langfuse 集成模块
 * ============================================================================
 *
 * 用于追踪和监控 LLM 调用、工具使用和会话数据
 */

import { Langfuse } from 'langfuse';
import dotenv from 'dotenv';

type LangfuseTraceClient = ReturnType<Langfuse['trace']>;
const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${env}`, override: true });

// 从环境变量获取配置
const LANGFUSE_PUBLIC_KEY = process.env.LANGFUSE_PUBLIC_KEY || '';
const LANGFUSE_SECRET_KEY = process.env.LANGFUSE_SECRET_KEY || '';
const LANGFUSE_BASE_URL = process.env.LANGFUSE_BASE_URL || 'http://localhost:3030';

/**
 * Langfuse 客户端单例
 */
let langfuseClient: Langfuse | null = null;

/**
 * 获取 Langfuse 客户端实例
 */
export function getLangfuseClient(): Langfuse | null {
    if (!LANGFUSE_PUBLIC_KEY || !LANGFUSE_SECRET_KEY) {
        // console.warn('[Langfuse] Missing credentials. Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY environment variables.');
        return null;
    }

    if (!langfuseClient) {
        langfuseClient = new Langfuse({
            publicKey: LANGFUSE_PUBLIC_KEY,
            secretKey: LANGFUSE_SECRET_KEY,
            baseUrl: LANGFUSE_BASE_URL,
        });
        // console.log('[Langfuse] Client initialized');
    }

    return langfuseClient;
}

/**
 * 创建追踪客户端
 */
export function createTraceClient(sessionId?: string, userId?: string): LangfuseTraceClient | null {
    const client = getLangfuseClient();
    if (!client) return null;

    return client.trace({
        name: 'agent_run',
        sessionId,
        userId,
    });
}

/**
 * 追踪 LLM 调用
 */
export interface LLMCallOptions {
    model: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    latency?: number; // 毫秒
}

export function traceLLMCall(
    trace: LangfuseTraceClient | null,
    options: LLMCallOptions & {
        input: string;
        output: string;
    }
) {
    if (!trace) return;

    trace.generation({
        name: 'llm_call',
        input: options.input,
        output: options.output,
        metadata: {
            model: options.model,
            latency: options.latency,
        },
        usage: {
            promptTokens: options.promptTokens || 0,
            completionTokens: options.completionTokens || 0,
            totalTokens: options.totalTokens || 0,
        },
    });
}

/**
 * 追踪工具调用
 */
export interface ToolCallOptions {
    name: string;
    input: unknown;
    output: string;
    latency?: number;
    error?: string;
}

export function traceToolCall(
    trace: LangfuseTraceClient | null,
    options: ToolCallOptions
) {
    if (!trace) return;

    trace.span({
        name: `tool:${options.name}`,
        input: JSON.stringify(options.input),
        output: options.output,
        metadata: {
            toolName: options.name,
            latency: options.latency,
            error: options.error,
        },
        level: options.error ? 'ERROR' : 'DEFAULT',
    });
}

/**
 * 刷新待处理的追踪数据
 */
export async function flushTraces() {
    const client = getLangfuseClient();
    if (!client) return;

    try {
        await client.flushAsync();
        // console.log('[Langfuse] Traces flushed');
    } catch (error) {
        // console.error('[Langfuse] Failed to flush traces:', error);
    }
}

/**
 * 创建会话追踪
 */
export class SessionTracker {
    private trace: LangfuseTraceClient | null;
    private startTime: number;
    private llmCallCount = 0;
    private toolCallCount = 0;

    constructor(sessionId: string, userId?: string) {
        this.trace = createTraceClient(sessionId, userId);
        this.startTime = Date.now();
    }

    /**
     * 追踪 LLM 调用
     */
    trackLLM(options: LLMCallOptions & { input: string; output: string }) {
        this.llmCallCount++;
        traceLLMCall(this.trace, {
            ...options,
            latency: options.latency,
        });
    }

    /**
     * 追踪工具调用
     */
    trackTool(options: ToolCallOptions) {
        this.toolCallCount++;
        traceToolCall(this.trace, options);
    }

    /**
     * 完成追踪并提交
     */
    async complete(finalOutput?: string) {
        if (!this.trace) return;

        const duration = Date.now() - this.startTime;

        this.trace.update({
            output: finalOutput,
            metadata: {
                llmCallCount: this.llmCallCount,
                toolCallCount: this.toolCallCount,
                duration,
            },
        });

    }

    /**
     * 获取原始 trace 客户端（用于高级用法）
     */
    getTrace() {
        return this.trace;
    }
}

/**
 * 导出便于使用的工厂函数
 */
export function createSessionTracker(sessionId: string, userId?: string) {
    return new SessionTracker(sessionId, userId);
}
