# Bug 修复：LLM 消息不显示

## 问题描述
用户报告只有用户输入的消息显示，LLM 的消息（包括文本和工具调用）不展示。

## 根本原因
1. **Ink Static 组件问题**：使用 `Static` 组件渲染消息，但 Static 组件一旦渲染不会更新，导致流式消息无法实时显示
2. **事件适配器过滤**：`handleStreamChunk` 中忽略了包含 `tool_calls` 的块，导致工具调用相关的消息内容丢失

## 修复内容

### 1. 移除 Static 组件 (`src/cli/components/message-list/index.tsx`)
**旧代码：**
```tsx
<Static items={items}>
  {(message) => (
    <Box key={message.id}>
      <MessageItem message={message} />
    </Box>
  )}
</Static>
```

**新代码：**
```tsx
{items.map((message) => (
  <Box key={message.id}>
    <MessageItem message={message} />
  </Box>
))}
```

**原因：** Static 组件只渲染一次，不支持流式更新。改用普通 map 渲染实现实时更新。

### 2. 修复事件适配器 (`src/cli/utils/event-adapter.ts`)
**旧代码：**
```typescript
private handleStreamChunk(chunk: AgentEvents['stream-chunk']): void {
  // 忽略包含工具调用的块（由 handleToolCall 处理）
  if (chunk.tool_calls && chunk.tool_calls.length > 0) {
    return;  // ← 问题：完全忽略了包含 tool_calls 的 chunk
  }
  // ...
}
```

**新代码：**
```typescript
private handleStreamChunk(chunk: AgentEvents['stream-chunk']): void {
  const { messageId, content, finish_reason, tool_calls } = chunk;
  // ...
  
  // 发送内容增量（即使同时有 tool_calls，也要处理内容）
  if (content) {
    this.streamingState.buffer += content;
    this.uiEventCallback({
      type: 'assistant-message-delta',
      messageId,
      contentDelta: content,
      isDone: finish_reason === 'stop' || finish_reason === 'eos',
    });
  }

  // 消息完成（或者有工具调用时也视为消息完成）
  if (finish_reason === 'stop' || finish_reason === 'eos' || (tool_calls && tool_calls.length > 0)) {
    this.uiEventCallback({
      type: 'assistant-message-complete',
      messageId,
      content: this.streamingState.buffer,
    });
  }
}
```

**原因：** 即使 chunk 包含 tool_calls，也可能包含文本内容，需要同时处理。

### 3. 过滤空内容消息 (`src/cli/components/message-list/index.tsx`)
```typescript
case 'assistant-text':
  // 如果内容为空，不渲染（可能是工具调用消息的前置消息）
  if (!message.content || message.content.trim() === '') {
    return null;
  }
  return <AssistantTextMessageView message={message} />;
```

**原因：** 当消息只有工具调用没有文本内容时，避免渲染空白消息。

## 修复后的行为

### 正常对话
```
❯ 你好
● 你好！有什么可以帮助你的？
```

### 工具调用
```
❯ 使用slides-generator 做报告
● 我来帮你生成分享报告
  ◆ slides-generator xxx
  └─ ✓ (1200ms)
     Report generated successfully
```

### 流式输出
```
❯ 写一段代码
● 我来帮你写代码...（实时显示）
```

## 测试建议

1. **普通对话**
   ```
   > 你好
   ```
   期望：显示助手回复

2. **工具调用**
   ```
   > 读一下 README.md
   ```
   期望：显示工具调用和结果

3. **多轮对话**
   ```
   > 任务1
   > 任务2
   > 任务3
   ```
   期望：所有消息都显示

4. **流式输出**
   ```
   > 写一篇文章
   ```
   期望：内容逐字显示
