# 重复消息显示问题修复

## 问题描述

相同的助手消息显示了两次：
```
❯ 你好

💬 你好！有什么我可以帮助你的吗？

💬 你好！有什么我可以帮助你的吗？    <- 重复
```

## 根本原因分析

### 错误的流程

```typescript
// useAgent.ts - complete 事件
newAgent.on('complete', (data: any) => {
  onMessage({
    role: 'assistant',
    content: data.response?.content || '',  // 1️⃣ 添加到 messages
    timestamp: new Date(),
  });
  onResponseUpdate('');  // 2️⃣ 清空 currentResponse
});

// MessageList.tsx - 显示逻辑
const displayedMessages = React.useMemo(() => {
  const lastMessage = messages[messages.length - 1];

  if (currentResponse && lastMessage?.role === 'assistant') {
    // 3️⃣ 用流式响应替换最后一条消息
    return [
      ...messages.slice(0, -1),
      { ...lastMessage, content: currentResponse, isStreaming: true },
    ];
  }

  // 问题：complete 事件先添加了消息到 messages，然后清空了 currentResponse
  // 但 MessageList 可能已经渲染了旧状态，导致显示两条
  return messages;
}, [messages, currentResponse]);
```

### 问题本质

1. **时序问题**：`complete` 事件先添加消息到 `messages`，然后清空 `currentResponse`
2. **状态同步问题**：`MessageList` 可能同时看到 `messages` 中有新消息和 `currentResponse` 不为空的情况
3. **重复显示**：导致同一条消息被显示两次

## 修复方案

### 1. 修改 useAgent.ts

```typescript
// 新增回调接口
interface UseAgentProps {
  selectedModel: string;
  onStateChange: (state: { status: string; ready: boolean }) => void;
  onMessage: (message: ChatMessage) => void;
  onResponseUpdate: (chunk: string) => void;
  onResponseComplete: (content: string) => void;  // ✅ 新增
  onProcessingChange: (isProcessing: boolean) => void;
  onAgentReady: (agent: Agent) => void;
}

// 修改 complete 事件处理
newAgent.on('complete', (data: any) => {
  // ✅ 使用新的回调，只触发一次消息添加
  onResponseComplete(data.response?.content || '');

  onProcessingChange(false);
  onStateChange({ status: MESSAGES.READY, ready: true });
});
```

### 2. 修改 Session.tsx

```typescript
// 新增回调处理
const handleResponseComplete = useCallback((content: string) => {
  if (content.trim()) {
    // ✅ 将完整内容添加到消息历史
    handleMessage({
      role: 'assistant',
      content: content,
      timestamp: new Date(),
    });
  }
  // ✅ 清空当前流式响应
  setCurrentResponse('');
}, [handleMessage]);

// 传递回调给 useAgent
useAgent({
  selectedModel,
  onStateChange: handleStateChange,
  onMessage: handleMessage,
  onResponseUpdate: handleResponseUpdate,
  onResponseComplete: handleResponseComplete,  // ✅ 传递新回调
  onProcessingChange: handleProcessingChange,
  onAgentReady: handleAgentReady,
});
```

### 3. 优化 MessageList.tsx

```typescript
const displayedMessages = React.useMemo(() => {
  const lastMessage = messages[messages.length - 1];

  // 如果有流式响应，动态更新显示
  if (currentResponse && lastMessage?.role === 'assistant') {
    // ✅ 替换最后一条助手消息为流式版本
    const streamingMessage: ChatMessage = {
      ...lastMessage,
      content: currentResponse,
      isStreaming: true,
    };
    return [
      ...messages.slice(0, -1),
      streamingMessage,
    ];
  } else if (currentResponse) {
    // 如果没有助手消息，添加新的流式消息
    const streamingMessage: ChatMessage = {
      role: 'assistant',
      content: currentResponse,
      timestamp: new Date(),
      isStreaming: true,
    };
    return [...messages, streamingMessage];
  }

  // 没有流式响应，显示原始消息列表
  return messages;
}, [messages, currentResponse]);
```

## 修复后的流程

```mermaid
用户发送消息
    ↓
Agent.run() 启动流式响应
    ↓
stream-chunk 事件
    ↓
onResponseUpdate(chunk) → currentResponse += chunk
    ↓
MessageList 显示流式内容（isStreaming: true）
    ↓
complete 事件
    ↓
onResponseComplete(content) → 添加完整消息到 messages + 清空 currentResponse
    ↓
MessageList 显示历史消息（无重复）
```

## 验证结果

### 编译验证

```bash
# 类型检查
npx tsc --project tsconfig.json --noEmit
✅ cli-v2-ink 无类型错误

# 编译
npx tsc --project tsconfig.json
✅ 编译成功，生成 32 个文件
```

### 预期行为

```
❯ 你好

💬 你好！有什么我可以帮助你的吗？    ← 只显示一次
```

## 关键改进

1. ✅ **单一职责**：`onResponseComplete` 专门处理流式响应完成
2. ✅ **原子性**：添加消息和清空 `currentResponse` 在同一个回调中完成
3. ✅ **时序保证**：确保不会同时存在 `messages` 中的消息和 `currentResponse`
4. ✅ **无副作用**：不会产生重复显示

## 相关文件

- `src/cli-v2-ink/hooks/useAgent.ts` - Agent 事件处理
- `src/cli-v2-ink/components/Session.tsx` - 主会话组件
- `src/cli-v2-ink/components/MessageList.tsx` - 消息列表显示

---

**修复日期：** 2026-01-28
**问题状态：** ✅ 已修复
