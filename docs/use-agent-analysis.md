# use-agent.ts 消息处理问题分析

## 问题根源

### Agent.ts 的事件结构

从 `Agent.ts` 代码分析，事件流程如下：

```typescript
// 1. 工具调用事件 (line 469)
this.events.emit('tool-call', { messageId, toolName: name, args });

// 2. 工具结果事件 (line 476, 488)
this.events.emit('tool-result', { messageId, toolName: name, result, duration });

// 3. 工具结果作为消息添加 (line 435-436)
this.sessionManager.addMessages(toolResults);
toolResults.forEach(msg => this.events.emit('message', { message: msg }));
```

**关键发现**：
- `tool-call` 和 `tool-result` 使用**相同的 messageId**
- Agent 内部将工具结果作为 `role='tool'` 的消息存储
- 但是 `use-agent.ts` 不应该创建独立的 `tool-result` 消息

---

## 当前 use-agent.ts 的问题

### 问题 1：工具结果被分离

```typescript
// ❌ 错误处理：创建独立的 tool-result 消息
const handleToolResult = (data: any) => {
    // 尝试找到工具调用并附加结果
    if (existingToolCallIndex !== -1) {
        updatedMessages = updatedMessages.map((msg, index) =>
            index === existingToolCallIndex
                ? { ...msg, result: data.result }
                : msg
        );
    }

    // ❌ 问题：又创建了一个新的独立消息
    const resultMessage: Message = {
        messageId: `${data.messageId}-tool-result-${Date.now()}`,
        role: 'assistant',
        type: 'tool-result',
        toolName: data.toolName,
        result: data.result,
        duration: data.duration,
        parentMessageId: data.messageId,
    };

    return [...updatedMessages, resultMessage];
};
```

**结果**：同一个工具调用的结果被显示两次

### 问题 2：工具调用消息没有正确处理

根据用户提供的实际数据：
```json
{
  "messageId": "f99c505a-6e2e-4733-a1db-cc4c76258153",
  "content": "我来帮您查看当前项目中的数据情况。",
  "type": "tool-call",
  "toolName": "glob",
  "args": "{\"pattern\":\"**/schema/**/*.ts\"}",
  "result": {...}
}
```

这说明 Agent 内部已经将工具调用和结果合并到了一条消息中，但是 `use-agent.ts` 又创建了额外的 `tool-result` 消息。

---

## 正确的数据结构

### 预期的消息列表

```
1. 用户消息
   - messageId: user-xxx
   - role: user
   - content: "当前数据有什么"

2. 助手消息（带工具调用）
   - messageId: f99c505a-6e2e-4733-a1db-cc4c76258153
   - role: assistant
   - type: tool-call
   - toolName: glob
   - args: {...}
   - result: {...}  // 工具执行结果
```

### 不应该有的消息

```
❌ 独立的 tool-result 消息
   - messageId: f99c505a-6e2e-4733-a1db-cc4c76258153-tool-result-xxx
   - type: tool-result
   - parentMessageId: f99c505a-6e2e-4733-a1db-cc4c76258153
```

---

## 修复方案

### 核心思路

1. **tool-call 事件**：创建或更新工具调用消息
2. **tool-result 事件**：直接将结果附加到对应的工具调用消息上
3. **不再创建独立的 tool-result 消息**

### 修复逻辑

```typescript
// handleToolCall: 创建/更新工具调用消息
const handleToolCall = (data: any) => {
    setMessages((prev) => {
        const existingIndex = prev.findIndex(msg =>
            msg.messageId === data.messageId
        );

        if (existingIndex !== -1) {
            // 更新已存在的消息为工具调用
            return prev.map((msg, index) =>
                index === existingIndex
                    ? {
                        ...msg,
                        type: 'tool-call',
                        toolName: data.toolName,
                        args: data.args,
                    }
                    : msg
            );
        }

        // 创建新的工具调用消息
        const toolMessage: Message = {
            messageId: data.messageId,
            role: 'assistant',
            type: 'tool-call',
            content: '',  // 初始为空，等待 stream-chunk 填充
            toolName: data.toolName,
            args: data.args,
        };

        return [...prev, toolMessage];
    });
};

// handleToolResult: 直接附加到工具调用消息，不创建新消息
const handleToolResult = (data: any) => {
    setMessages(prev => {
        return prev.map(msg => {
            // 直接找到对应 messageId 的消息并附加结果
            if (msg.messageId === data.messageId) {
                return {
                    ...msg,
                    result: data.result,
                    duration: data.duration,
                };
            }
            return msg;
        });
    });
};
```

---

## Agent.ts 事件顺序

```
1. stream-chunk (流式内容)
   ↓
2. tool-call (工具调用开始)
   ↓
3. tool-result (工具执行结果)
   ↓
4. message (role='tool' 的消息，由 Agent 内部处理)
```

---

## 修复完成状态

### ✅ 已完成的修复

| 问题 | 原因 | 解决方案 | 状态 |
|------|------|---------|------|
| 工具结果显示两次 | 创建了独立的 tool-result 消息 | 不再创建独立消息 | ✅ 已完成 |
| 工具调用和结果分离 | handleToolResult 创建了新消息 | 直接附加到对应的消息 | ✅ 已完成 |
| 数据结构混乱 | messageId 不统一 | 使用相同的 messageId | ✅ 已完成 |
| TypeScript IIFE 类型错误 | IIFE 返回 unknown 类型 | 使用 useMemo 预计算 | ✅ 已完成 |
| 层次显示不清晰 | 结果没有缩进显示 | marginLeft={2} 创建层次 | ✅ 已完成 |
| **多工具调用只显示最后一个** | **多个工具共享相同 messageId** | **使用 `${baseMessageId}-${toolCall.id}`** | ✅ 已完成 |
| **用户消息显示两次** | **use-agent.ts 和 Agent.run 都添加用户消息** | **移除 submitMessage 中手动添加逻辑** | ✅ 已完成 |

### 修复后的数据结构

每个工具调用现在只有一个消息对象：

```typescript
// 单个工具调用
{
  messageId: "f99c505a-6e2e-4733-a1db-cc4c76258153",
  role: "assistant",
  type: "tool-call",
  toolName: "glob",
  args: {"pattern": "**/schema/**/*.ts"},
  result: {
    success: true,
    data: [...],
  },
  duration: 123
}

// 多个工具同时调用（每个工具有唯一的 messageId）
{
  messageId: "msg-123-call_abc123",  // baseMessageId + toolCall.id
  role: "assistant",
  type: "tool-call",
  toolName: "Read",
  args: {"file_path": "file1.ts"},
  result: {...},
  duration: 5
},
{
  messageId: "msg-123-call_def456",  // baseMessageId + toolCall.id
  role: "assistant",
  type: "tool-call",
  toolName: "Read",
  args: {"file_path": "file2.ts"},
  result: {...},
  duration: 3
}
```

### 修复后的显示效果

```
● glob **/*.schema

  ⎿ glob {"pattern":"**/*.schema"}
    ✓ (123ms)
    ["file1.ts", "file2.ts"]
```

**修复后**：每个工具调用只有一个消息，包含 `toolName`、`args` 和 `result`，结果显示有层次感（缩进）。
