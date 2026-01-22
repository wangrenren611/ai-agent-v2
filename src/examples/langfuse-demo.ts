/**
 * ============================================================================
 * Langfuse 集成使用示例
 * ============================================================================
 *
 * 演示如何在项目中使用 Langfuse 进行追踪和监控
 */

import { createSessionTracker, flushTraces } from '../observability/langfuse';
import dotenv from 'dotenv';

const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${env}`, override: true });
/**
 * 示例 1: 基本使用 - 在 Agent 运行中添加追踪
 */
async function example1_BasicTracking() {
    console.log('\n=== 示例 1: 基本追踪 ===\n');

    // 创建会话追踪器
    const sessionId = 'session_' + Date.now();
    const tracker = createSessionTracker(sessionId, 'user_123');

    // 模拟 LLM 调用
    const startTime = Date.now();
    // ... 你的 LLM 调用代码 ...
    const latency = Date.now() - startTime;

    tracker.trackLLM({
        model: 'glm-4.7',
        input: '用户消息',
        output: 'AI 回复',
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
        latency,
    });

    // 完成追踪
    await tracker.complete('最终输出');

    // 刷新数据到 Langfuse
    await flushTraces();
}

/**
 * 示例 2: 追踪工具调用
 */
async function example2_ToolTracking() {
    console.log('\n=== 示例 2: 工具调用追踪 ===\n');

    const tracker = createSessionTracker('session_demo', 'user_123');

    // 追踪 LLM 调用
    tracker.trackLLM({
        model: 'glm-4.7',
        input: '帮我读取文件内容',
        output: '我需要调用工具来读取文件',
        promptTokens: 50,
        completionTokens: 20,
        totalTokens: 70,
    });

    // 追踪工具调用
    const toolStart = Date.now();
    // ... 执行工具 ...
    const toolLatency = Date.now() - toolStart;

    tracker.trackTool({
        name: 'read',
        input: { filePath: '/path/to/file.txt' },
        output: '文件内容...',
        latency: toolLatency,
    });

    // 追踪第二次 LLM 调用（基于工具结果）
    tracker.trackLLM({
        model: 'glm-4.7',
        input: '工具返回的文件内容',
        output: '根据文件内容，我的分析是...',
        promptTokens: 500,
        completionTokens: 300,
        totalTokens: 800,
    });

    await tracker.complete('任务完成');
    await flushTraces();
}

/**
 * 示例 3: 集成到现有 Agent 代码
 */
async function example3_AgentIntegration() {
    console.log('\n=== 示例 3: Agent 集成 ===\n');

    // 在 Agent 类中使用
    class AgentWithTracking {
        private tracker: ReturnType<typeof createSessionTracker> | null = null;

        constructor() {
            // 在构造函数中不创建 tracker，在 run 方法中创建
        }

        async run(query: string, sessionId: string, userId?: string) {
            // 创建追踪器
            this.tracker = createSessionTracker(sessionId, userId);

            try {
                // ... 原有的 Agent 逻辑 ...

                // 在 LLM 调用处添加追踪
                const llmStart = Date.now();
                // const response = await this.llmProvider.generate(...);
                const llmLatency = Date.now() - llmStart;

                this.tracker?.trackLLM({
                    model: process.env.AI_MODEL || 'glm-4.7',
                    input: query,
                    output: 'LLM 响应内容', // response.content
                    promptTokens: 100, // response.usage?.prompt_tokens
                    completionTokens: 200, // response.usage?.completion_tokens
                    totalTokens: 300, // response.usage?.total_tokens
                    latency: llmLatency,
                });

                // 在工具调用处添加追踪
                // const toolStart = Date.now();
                // const result = await ToolRegistry.execute(...);
                // const toolLatency = Date.now() - toolStart;

                this.tracker?.trackTool({
                    name: 'bash',
                    input: { command: 'ls -la' },
                    output: '工具执行结果',
                    latency: 100,
                });

                return { content: '最终响应', role: 'assistant' as const };
            } finally {
                // 完成追踪
                await this.tracker?.complete('最终输出');
                await flushTraces();
            }
        }
    }

    // 使用示例
    const agent = new AgentWithTracking();
    await agent.run('用户的问题', 'session_123', 'user_456');
}

/**
 * 示例 4: 错误追踪
 */
async function example4_ErrorTracking() {
    console.log('\n=== 示例 4: 错误追踪 ===\n');

    const tracker = createSessionTracker('session_error', 'user_123');

    // 追踪一个失败的工具调用
    tracker.trackTool({
        name: 'bash',
        input: { command: 'invalid-command' },
        output: '',
        error: 'Command not found: invalid-command',
        latency: 50,
    });

    await tracker.complete('执行失败');
    await flushTraces();
}

/**
 * 运行所有示例
 */
export async function runLangfuseExamples() {
    console.log('🚀 Langfuse 集成示例\n');

    await example1_BasicTracking();
    await example2_ToolTracking();
    await example3_AgentIntegration();
    await example4_ErrorTracking();

    console.log('\n✅ 所有示例执行完成！');
    console.log('📊 请访问 http://localhost:3030 查看 Langfuse 仪表板');
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
    runLangfuseExamples().catch(console.error);
}
