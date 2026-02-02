# CLI 消息系统重构总结

## 重构概述

本次重构彻底改造了 CLI 的消息系统，解决了原有架构中的多个问题，提供了更清晰、更易于维护的代码结构。

## 解决的问题

### 1. 消息模型混乱
**原问题**：`Message` 类型同时承担 LLM 通信和 UI 展示职责，导致 UI 相关字段（`toolName`, `args`, `result` 等）污染核心消息类型。

**解决方案**：创建了独立的 `UIMessage` 类型系统，与核心 `Message` 类型完全分离。

### 2. 工具调用和结果分离
**原问题**：工具调用和结果是独立的事件，UI 需要通过 `messageId` 手动关联，逻辑复杂且容易出错。

**解决方案**：设计了 `ToolInvocation` 类型，将工具调用的完整生命周期（参数、状态、结果）封装在一个单元中。工具结果直接更新到对应的 `ToolInvocation` 对象。

### 3. 事件设计不合理
**原问题**：`stream-chunk` 事件只包含内容片段，缺乏完整上下文；`tool-call` 和 `tool-result` 是独立事件。

**解决方案**：设计了新的 `UIEvent` 系统，提供清晰的事件流：
```
assistant-message-start → assistant-message-delta → assistant-message-complete
tool-invocation-start → tool-invocation-complete/error
```

### 4. 状态管理分散
**原问题**：消息组装逻辑分散在 `Agent.ts` 和 `use-agent.ts` 中，`setMessages` 被多处调用。

**解决方案**：使用 Reducer 模式集中管理消息状态，`useMessageStore` 提供单一状态管理入口。

### 5. UI 组件设计混乱
**原问题**：组件职责不清晰，`MessageGroup` 定义位置不当，渲染逻辑混乱。

**解决方案**：重新设计了 `MessageList` 组件及其子组件，每个组件职责单一，渲染逻辑清晰。

---

## 新架构文件结构

```
src/cli/
├── types/
│   ├── message-types.ts      # UI 消息类型定义（新）
│   └── index.ts              # 类型导出（新）
├── hooks/
│   ├── use-agent.ts          # Agent Hook（重构）
│   ├── use-message-store.ts  # 消息状态管理（新）
│   └── index.ts              # Hooks 导出（新）
├── utils/
│   ├── event-adapter.ts      # 事件适配器（新）
│   ├── constants.ts          # 常量
│   └── index.ts              # 工具函数导出（新）
└── components/
    └── message-list/
        ├── index.tsx         # MessageList 组件（重构）
        └── MarkdownText.tsx  # Markdown 渲染组件（保留）
```

---

## 核心类型说明

### UIMessage（UI 消息联合类型）

```typescript
type UIMessage = 
  | UserMessage              // 用户消息
  | AssistantTextMessage     // 助手纯文本消息
  | AssistantToolMessage     // 助手工具调用消息
  | SystemMessage;           // 系统消息
```

### ToolInvocation（工具调用单元）

```typescript
interface ToolInvocation {
  id: string;                    // 唯一标识
  name: string;                  // 工具名称
  args: Record<string, unknown>; // 调用参数
  status: ToolStatus;            // pending|running|success|error
  result?: unknown;              // 执行结果
  error?: string;                // 错误信息
  duration?: number;             // 执行耗时
  startedAt: Timestamp;
  completedAt?: Timestamp;
}
```

### AssistantToolMessage（助手工具调用消息）

```typescript
interface AssistantToolMessage extends BaseMessage {
  type: 'assistant-tool';
  content?: string;              // 前置解释文本
  toolCalls: ToolInvocation[];   // 工具调用列表
  status: MessageStatus;
}
```

---

## 使用方式

### 基础使用

```tsx
import { useAgent } from './hooks';
import { MessageList } from './components/message-list';

function ChatInterface() {
  const { messages, isLoading, submitMessage, usedTokens, error } = useAgent({ 
    model: 'claude' 
  });

  return (
    <Box flexDirection="column">
      <MessageList
        messages={messages}
        isLoading={isLoading}
        usedTokens={usedTokens}
        error={error}
      />
      <Input onSubmit={submitMessage} />
    </Box>
  );
}
```

### 直接使用消息存储

```tsx
import { useMessageStore } from './hooks';
import { AgentEventAdapter } from './utils';

function CustomComponent() {
  const { messages, applyEvent, addUserMessage } = useMessageStore();
  
  // 连接 Agent 事件
  useEffect(() => {
    const adapter = new AgentEventAdapter(agent.events, applyEvent);
    adapter.start();
    return () => adapter.stop();
  }, [agent, applyEvent]);
  
  // ...
}
```

---

## 事件流说明

### 场景 1：纯文本对话

```
用户输入 → Agent.run() → LLM 流式响应
                                    ↓
                              stream-chunk（多次）
                                    ↓
                         AgentEventAdapter 转换
                                    ↓
                    ┌───────────────┼───────────────┐
                    ↓               ↓               ↓
           assistant-message-start assistant-message-delta assistant-message-complete
                    ↓               ↓               ↓
                    └───────────────┴───────────────┘
                                    ↓
                         useMessageStore 更新
                                    ↓
                              MessageList 渲染
```

### 场景 2：工具调用

```
用户输入 → Agent.run() → LLM 响应（包含 tool_calls）
                                    ↓
                              stream-chunk
                                    ↓
                              tool-call 事件（每个工具）
                                    ↓
                              工具执行
                                    ↓
                              tool-result 事件
                                    ↓
                         AgentEventAdapter 协调转换
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
           START_TOOL_CALLS              UPDATE_TOOL_CALL_STATUS
                    ↓                               ↓
                    └───────────────┬───────────────┘
                                    ↓
                         useMessageStore 更新
                                    ↓
                              MessageList 渲染
```

---

## 视觉展示

重构后的消息列表展示效果：

```
❯ 用户输入的消息

● 助手的纯文本回复

● Read
  └─ ✓ src/file.txt (45ms)
     File content preview here...

● Bash
  └─ ✗ ls /nonexistent (12ms)
     No such file or directory

◐ Thinking (step 3)...
```

### 设计特点

1. **用户消息**：使用 `❯` 图标，青色显示
2. **助手消息**：使用 `●` 图标，绿色显示
3. **工具调用**：
   - 工具名称突出显示（黄色）
   - 参数简短显示
   - 状态图标：`◐`（等待）、`◑`（执行中）、`✓`（成功）、`✗`（错误）
   - 结果显示在工具调用下方，缩进显示
4. **加载状态**：旋转图标 + "Thinking..." 文本

---

## 优势对比

| 特性 | 重构前 | 重构后 |
|------|--------|--------|
| 消息模型 | 混合核心和UI类型 | 完全分离 |
| 工具调用 | 分散的事件 | 内聚的单元 |
| 状态管理 | 分散逻辑 | Reducer 集中管理 |
| 类型安全 | 多处类型断言 | 完整类型覆盖 |
| 可测试性 | 困难 | 各模块可独立测试 |
| 可扩展性 | 困难 | 易于添加新消息类型 |

---

## 迁移指南

### 类型迁移

```typescript
// 旧
import { Message } from '../../agent/message';

// 新
import type { UIMessage, AssistantToolMessage } from '../types/message-types';
```

### 消息类型检查

```typescript
// 旧
if (message.type === 'tool-call') { 
  console.log(message.toolName, message.result);
}

// 新
if (message.type === 'assistant-tool') {
  for (const toolCall of message.toolCalls) {
    console.log(toolCall.name, toolCall.result);
  }
}
```

### 工具调用访问

```typescript
// 旧
message.toolName, message.args, message.result

// 新
message.toolCalls[0].name
message.toolCalls[0].args
message.toolCalls[0].result
```

---

## 后续优化建议

1. **虚拟滚动**：当消息数量很多时，实现虚拟滚动以提高性能
2. **消息搜索**：添加消息搜索功能
3. **消息导出**：支持导出对话记录
4. **主题定制**：支持自定义颜色和图标
5. **键盘导航**：支持键盘上下键浏览消息

---

## 测试建议

### 单元测试

```typescript
// 测试 useMessageStore
describe('useMessageStore', () => {
  it('should handle user message', () => {
    const { result } = renderHook(() => useMessageStore());
    act(() => {
      result.current.addUserMessage('Hello', 'msg-1');
    });
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].type).toBe('user');
  });
});

// 测试事件适配器
describe('AgentEventAdapter', () => {
  it('should convert stream-chunk to UIEvent', () => {
    const mockCallback = jest.fn();
    const adapter = new AgentEventAdapter(mockEventBus, mockCallback);
    // ...
  });
});
```

### 集成测试

```typescript
describe('Message System Integration', () => {
  it('should handle complete conversation flow', async () => {
    // 测试完整的对话流程
  });
});
```
