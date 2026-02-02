# 多工具同时调用问题分析

## 问题描述

当 LLM 同时调用多个工具时（例如同时读取多个文件），当前代码存在严重的数据结构问题。

---

## 问题根源

### Agent.ts 的事件流程

```typescript
// handleToolCalls 方法 - 所有工具调用共享相同的 messageId
private async handleToolCalls(llmResponse: Message, ...): Promise<...> {
    const messageId = llmResponse.messageId;  // 单个 messageId

    for (const call of llmResponse.tool_calls) {
        // ❌ 所有工具调用都使用相同的 messageId
        const result = await this.executeTool(call, messageId);
        toolResults.push(result);
    }
}

// executeTool 方法
private async executeTool(toolCall: ToolCall, messageId: Message['messageId']) {
    // 发出事件，使用相同的 messageId
    this.events.emit('tool-call', { messageId, toolName: name, args });
    // ...
    this.events.emit('tool-result', { messageId, toolName: name, result, duration });
}
```

### use-agent.ts 的消息处理

```typescript
const handleToolCall = (data: { messageId: string; toolName: string; args: any }) => {
    setMessages((prev) => {
        const existingIndex = prev.findIndex(msg => msg.messageId === data.messageId);

        if (existingIndex !== -1) {
            // ❌ 问题：多个工具调用共享 messageId
            // 后面的工具调用会覆盖前面的！
            return prev.map((msg, index) =>
                index === existingIndex
                    ? { ...msg, type: 'tool-call', toolName: data.toolName, args: data.args }
                    : msg
            );
        }

        // 创建新消息
        return [...prev, toolMessage];
    });
};
```

---

## 实际场景示例

假设 LLM 同时调用 3 个工具：

```json
{
  "messageId": "msg-123",
  "tool_calls": [
    { "id": "call-1", "function": { "name": "Read", "arguments": "{\"file_path\":\"file1.ts\"}" } },
    { "id": "call-2", "function": { "name": "Read", "arguments": "{\"file_path\":\"file2.ts\"}" } },
    { "id": "call-3", "function": { "name": "Glob", "arguments": "{\"pattern\":\"**/*.ts\"}" } }
  ]
}
```

### 当前行为（错误）

```
事件 1: tool-call { messageId: "msg-123", toolName: "Read", args: {file_path: "file1.ts"} }
→ 创建消息 { messageId: "msg-123", toolName: "Read", ... }

事件 2: tool-call { messageId: "msg-123", toolName: "Read", args: {file_path: "file2.ts"} }
→ 覆盖消息 { messageId: "msg-123", toolName: "Read", args: {file_path: "file2.ts"} }
   ❌ file1.ts 的调用丢失了！

事件 3: tool-call { messageId: "msg-123", toolName: "Glob", args: {pattern: "**/*.ts"} }
→ 覆盖消息 { messageId: "msg-123", toolName: "Glob", args: {pattern: "**/*.ts"} }
   ❌ file2.ts 的调用也丢失了！
```

**最终结果**：只显示最后一个 Glob 工具调用，前两个 Read 调用全部丢失！

---

## 解决方案

### 方案：为每个工具调用生成唯一的 messageId

修改 `Agent.ts` 的 `executeTool` 方法，为每个工具调用生成唯一的 messageId：

```typescript
private async executeTool(toolCall: ToolCall, baseMessageId: Message['messageId']): Promise<Message> {
    // 生成唯一的 messageId
    const uniqueMessageId = `${baseMessageId}-${toolCall.id}`;

    const { name, arguments: args } = toolCall.function;

    // 使用唯一的 messageId 发出事件
    this.events.emit('tool-call', { messageId: uniqueMessageId, toolName: name, args });

    const startTime = Date.now();
    try {
        const result = await ToolRegistry.execute(name, args);
        const duration = Date.now() - startTime;

        this.events.emit('tool-result', { messageId: uniqueMessageId, toolName: name, result, duration });
        return {
            messageId: baseMessageId,  // 返回的 Message 仍使用 baseMessageId（用于 session 管理）
            role: 'tool',
            type: 'text',
            content: this.formatToolResult(result),
            tool_call_id: toolCall.id,
        };
    } catch (error) {
        const duration = Date.now() - startTime;
        const errorMsg = error instanceof Error ? error.message : String(error);

        this.events.emit('tool-result', {
            messageId: uniqueMessageId,
            toolName: name,
            result: { success: false, error: errorMsg },
            duration,
        });

        throw new ToolError({
            messageId: baseMessageId,
            role: 'tool',
            type: 'text',
            content: `Error: Tool execution failed - ${errorMsg}`,
            tool_call_id: toolCall.id,
        });
    }
}
```

### 修复后的数据流

```
事件 1: tool-call { messageId: "msg-123-call-1", toolName: "Read", args: {file_path: "file1.ts"} }
→ 创建消息 { messageId: "msg-123-call-1", toolName: "Read", ... }

事件 2: tool-call { messageId: "msg-123-call-2", toolName: "Read", args: {file_path: "file2.ts"} }
→ 创建消息 { messageId: "msg-123-call-2", toolName: "Read", ... }

事件 3: tool-call { messageId: "msg-123-call-3", toolName: "Glob", args: {pattern: "**/*.ts"} }
→ 创建消息 { messageId: "msg-123-call-3", toolName: "Glob", ... }
```

**最终结果**：所有 3 个工具调用都正确显示！

---

## messageId 命名规范

| 类型 | messageId 格式 | 示例 |
|------|----------------|------|
| 基础消息 | LLM 提供的原始 messageId | `msg-123` |
| 单个工具调用 | `{baseMessageId}-{toolCallId}` | `msg-123-call_abc123` |
| 流式文本 | LLM 提供的 messageId | `msg-123` |
| 用户消息 | `user-{timestamp}` | `user-1769794116723` |

---

## 需要修改的文件

1. **src/agent/Agent.ts** ✅ 已修复
   - 修改 `executeTool` 方法签名：`baseMessageId` 替代 `messageId`
   - 为每个工具调用生成唯一的 `messageId`：`${baseMessageId}-${toolCall.id}`
   - 更新事件发出逻辑使用 `uniqueMessageId`
   - 返回的 Message 仍使用 `baseMessageId`（用于 session 管理）

2. **src/cli/hooks/use-agent.ts** ✅ 无需修改
   - 当前代码已经能正确处理不同的 messageId

3. **src/cli/components/message-list/index.tsx** ✅ 无需修改
   - 当前代码已经能正确处理不同的 messageId

---

## 测试场景

修复后应能正确显示以下场景：

```
用户：帮我查看 package.json 和 tsconfig.json

● 帮我查看 package.json 和 tsconfig.json

  ⎿ Read package.json (50 lines)
    ✓ (5ms)
    {...}

  ⎿ Read tsconfig.json (30 lines)
    ✓ (3ms)
    {...}

● 我已经读取了这两个文件...
```

---

## 总结

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 多工具调用时只显示最后一个 | 所有工具调用共享相同的 messageId | 为每个工具调用生成唯一的 messageId |
| 工具调用数据丢失 | 后续事件覆盖前面的消息 | 使用 `${baseMessageId}-${toolCall.id}` 格式 |
| 无法区分同时调用的工具 | messageId 冲突 | ToolCall.id 是唯一的，可以作为区分标识 |
