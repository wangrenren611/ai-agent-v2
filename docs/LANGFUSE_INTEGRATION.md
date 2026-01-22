# Langfuse 集成文档

## 概述

Langfuse 已集成到项目中，用于追踪和监控 LLM 调用、工具使用和会话数据。

## 配置

环境变量已在 `.env.development` 中配置：

```env
LANGFUSE_SECRET_KEY="sk-lf-4fbf122a-47ad-4698-99d8-9f0449168aed"
LANGFUSE_PUBLIC_KEY="pk-lf-71b471c8-8336-49b3-a3f7-dc6790f8e61a"
LANGFUSE_BASE_URL="http://localhost:3030"
```

## 安装依赖

```bash
# 如果遇到权限问题，可以先修复权限或使用 sudo
chmod -R +w node_modules 2>/dev/null
pnpm install

# 或者重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## 使用方式

### 1. 基本追踪

```typescript
import { createSessionTracker, flushTraces } from '../observability/langfuse';

// 创建会话追踪器
const tracker = createSessionTracker('session_id', 'user_id');

// 追踪 LLM 调用
tracker.trackLLM({
    model: 'glm-4.7',
    input: '用户消息',
    output: 'AI 回复',
    promptTokens: 100,
    completionTokens: 200,
    totalTokens: 300,
    latency: 1500, // 毫秒
});

// 完成追踪
await tracker.complete('最终输出');
await flushTraces();
```

### 2. 工具调用追踪

```typescript
// 追踪工具调用
tracker.trackTool({
    name: 'bash',
    input: { command: 'ls -la' },
    output: '命令执行结果',
    latency: 500,
});

// 追踪工具调用错误
tracker.trackTool({
    name: 'read',
    input: { filePath: '/invalid/path' },
    output: '',
    error: 'File not found',
    latency: 100,
});
```

### 3. 在 Agent 中集成

```typescript
class Agent {
    private tracker: ReturnType<typeof createSessionTracker> | null = null;

    async run(query: string, sessionId: string, userId?: string) {
        // 创建追踪器
        this.tracker = createSessionTracker(sessionId, userId);

        try {
            // LLM 调用
            const llmStart = Date.now();
            const response = await this.llmProvider.generate(...);
            const llmLatency = Date.now() - llmStart;

            this.tracker?.trackLLM({
                model: this.model,
                input: query,
                output: response.content,
                promptTokens: response.usage?.prompt_tokens,
                completionTokens: response.usage?.completion_tokens,
                totalTokens: response.usage?.total_tokens,
                latency: llmLatency,
            });

            // 工具调用
            if (response.tool_calls) {
                for (const toolCall of response.tool_calls) {
                    const toolStart = Date.now();
                    const result = await ToolRegistry.execute(...);
                    const toolLatency = Date.now() - toolStart;

                    this.tracker?.trackTool({
                        name: toolCall.function.name,
                        input: toolCall.function.arguments,
                        output: result,
                        latency: toolLatency,
                    });
                }
            }

            return response;
        } finally {
            await this.tracker?.complete(response.content);
            await flushTraces();
        }
    }
}
```

## API 参考

### `createSessionTracker(sessionId, userId?)`

创建会话追踪器实例。

### `SessionTracker` 类

#### `trackLLM(options)`

追踪 LLM 调用。

**参数：**
- `model`: 模型名称
- `input`: 输入消息
- `output`: 输出消息
- `promptTokens`: 输入 token 数
- `completionTokens`: 输出 token 数
- `totalTokens`: 总 token 数
- `latency`: 延迟（毫秒）

#### `trackTool(options)`

追踪工具调用。

**参数：**
- `name`: 工具名称
- `input`: 工具输入参数
- `output`: 工具输出
- `latency`: 延迟（毫秒）
- `error`: 错误信息（可选）

#### `complete(finalOutput?)`

完成追踪并提交数据。

### `flushTraces()`

手动刷新待处理的追踪数据到 Langfuse 服务器。

## 查看追踪数据

访问 Langfuse 仪表板：http://localhost:3030

## 示例代码

运行示例：

```bash
pnpm langfuse:demo
```

## 故障排查

### 权限错误

如果遇到权限问题：

```bash
# 方案 1: 修复权限
chmod -R +w node_modules

# 方案 2: 重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Langfuse 连接失败

确认 Langfuse 服务正在运行：

```bash
cd ~/langfuse && docker compose ps
```

检查环境变量配置是否正确。
