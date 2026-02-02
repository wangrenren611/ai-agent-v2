# CLI 消息系统架构（重构版）

## 概述

本文档描述重构后的 CLI 消息系统架构。新架构的核心目标是：

1. **关注点分离**：UI 消息模型与核心消息模型完全分离
2. **内聚的工具调用**：工具调用的完整生命周期（参数、执行、结果）封装在一个单元中
3. **清晰的事件流**：统一的事件系统，从 Agent 到 UI 的单向数据流
4. **类型安全**：完整的 TypeScript 类型支持

## 架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                   UI Layer                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  MessageList    │  │  useMessageStore│  │        useAgent             │  │
│  │   Component     │  │    (Reducer)    │  │      (Orchestrator)         │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────────┬───────────────┘  │
│           │                    │                          │                  │
│           │                    │                          │                  │
│           └────────────────────┴──────────────────────────┘                  │
│                                   │                                          │
│                          UIMessage[]                                         │
│                                   │                                          │
└───────────────────────────────────┼──────────────────────────────────────────┘
                                    │
                                    │ UIEvent
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Adapter Layer                                  │
│                     ┌─────────────────────────┐                             │
│                     │    AgentEventAdapter    │                             │
│                     │   (Event Transformation)│                             │
│                     └───────────┬─────────────┘                             │
│                                 │                                           │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │
                                  │ AgentEvents
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Core Layer                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │     Agent       │  │  SessionManager │  │      ToolRegistry           │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 核心概念

### 1. UI 消息模型 (`UIMessage`)

UI 消息模型专门为界面展示设计，与核心层的 `Message` 类型分离：

```typescript
type UIMessage = 
  | UserMessage              // 用户消息
  | AssistantTextMessage     // 助手纯文本消息
  | AssistantToolMessage     // 助手工具调用消息
  | SystemMessage;           // 系统消息
```

**关键设计**：`AssistantToolMessage` 将工具调用的完整生命周期封装在一起：
- 前置解释文本（可选）
- 工具调用列表（每个包含参数、状态、结果）

### 2. 工具调用单元 (`ToolInvocation`)

```typescript
interface ToolInvocation {
  id: string;                    // 唯一标识
  name: string;                  // 工具名称
  args: Record<string, unknown>; // 调用参数
  status: ToolStatus;            // 状态：pending|running|success|error
  result?: unknown;              // 执行结果
  error?: string;                // 错误信息
  duration?: number;             // 执行耗时
  startedAt: Timestamp;
  completedAt?: Timestamp;
}
```

### 3. 事件流 (`UIEvent`)

统一的事件类型，从 Agent 到 UI 的单向流：

```
assistant-message-start → assistant-message-delta → assistant-message-complete
                                    ↑
tool-invocation-start → tool-invocation-complete/error
```

事件类型：
- `assistant-message-start`：开始新的助手消息
- `assistant-message-delta`：内容增量更新（流式）
- `assistant-message-complete`：消息完成
- `tool-invocation-start`：工具调用开始
- `tool-invocation-complete`：工具调用成功完成
- `tool-invocation-error`：工具调用失败

### 4. 状态管理 (`useMessageStore`)

使用 Reducer 模式管理消息状态：

```typescript
const {
  messages,           // UIMessage[]
  isLoading,          // boolean
  currentStep,        // number
  activeAssistantMessageId, // string | null
  
  // Actions
  addUserMessage,
  applyEvent,
  clearMessages,
  
  // Selectors
  getMessageGroups,
} = useMessageStore();
```

## 数据流

### 场景 1：纯文本对话

```
用户输入 "Hello"
    ↓
useAgent.submitMessage()
    ↓
Agent.run() 发送用户消息到 LLM
    ↓
Agent 接收流式响应
    ↓
stream-chunk 事件（多次）
    ↓
AgentEventAdapter 转换为 UIEvent
    ↓
useMessageStore.applyEvent() 更新状态
    ↓
MessageList 重新渲染
```

### 场景 2：工具调用

```
用户输入 "Read file.txt"
    ↓
Agent 接收包含 tool_calls 的响应
    ↓
stream-chunk（包含工具调用信息）
    ↓
tool-call 事件（每个工具）
    ↓
tool-result 事件（每个工具完成）
    ↓
AgentEventAdapter 协调转换
    ↓
生成 START_TOOL_CALLS 和 UPDATE_TOOL_CALL_STATUS 事件
    ↓
MessageList 显示工具调用和结果
```

## 文件结构

```
src/cli/
├── types/
│   ├── message-types.ts    # UI 消息类型定义
│   └── index.ts            # 类型导出
├── hooks/
│   ├── use-agent.ts        # Agent Hook（重构版）
│   ├── use-message-store.ts # 消息状态管理
│   └── index.ts            # Hooks 导出
├── utils/
│   ├── event-adapter.ts    # 事件适配器
│   ├── constants.ts        # 常量
│   └── index.ts            # 工具函数导出
└── components/
    └── message-list/
        ├── index.tsx       # MessageList 组件（重构版）
        └── MarkdownText.tsx # Markdown 渲染组件
```

## 使用示例

```tsx
import { useAgent } from '../hooks/use-agent';
import { MessageList } from '../components/message-list';

function ChatInterface() {
  const { 
    messages, 
    isLoading, 
    submitMessage, 
    usedTokens,
    error 
  } = useAgent({ model: 'claude' });

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

## 优势

1. **可维护性**：清晰的职责分离，每个模块只负责单一功能
2. **可测试性**：Reducer 和适配器可以独立测试
3. **可扩展性**：新增消息类型只需在 `UIMessage` 和 Reducer 中添加
4. **类型安全**：完整的 TypeScript 类型覆盖
5. **性能**：合理的状态更新策略，避免不必要的重渲染

## 迁移指南

从旧架构迁移：

1. 更新导入路径：
   ```typescript
   // 旧
   import { Message } from '../../agent/message';
   
   // 新
   import type { UIMessage } from '../types/message-types';
   ```

2. 消息类型检查：
   ```typescript
   // 旧
   if (message.type === 'tool-call') { ... }
   
   // 新
   if (message.type === 'assistant-tool') { ... }
   ```

3. 工具访问方式：
   ```typescript
   // 旧
   message.toolName, message.args, message.result
   
   // 新
   message.toolCalls[0].name, message.toolCalls[0].args, message.toolCalls[0].result
   ```
