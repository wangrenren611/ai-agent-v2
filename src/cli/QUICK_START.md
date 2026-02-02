# CLI 消息系统 - 快速参考

## 新文件一览

### 类型定义
- `src/cli/types/message-types.ts` - UI 消息类型定义（UIMessage, ToolInvocation, UIEvent）

### Hooks
- `src/cli/hooks/use-message-store.ts` - 消息状态管理（Reducer 模式）
- `src/cli/hooks/use-agent.ts` - Agent Hook（重构版）

### 工具函数
- `src/cli/utils/event-adapter.ts` - Agent 事件到 UI 事件的适配器

### 组件
- `src/cli/components/message-list/index.tsx` - MessageList 组件（重构版）

## 关键改进

### 1. 消息模型分离
```typescript
// 核心层 Message - 用于 LLM 通信
// UI 层 UIMessage - 用于界面展示
type UIMessage = 
  | { type: 'user'; content: string }
  | { type: 'assistant-text'; content: string; status: MessageStatus }
  | { type: 'assistant-tool'; content?: string; toolCalls: ToolInvocation[]; status: MessageStatus }
  | { type: 'system'; level: 'info'|'warn'|'error'; content: string }
```

### 2. 工具调用内聚
```typescript
interface ToolInvocation {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: unknown;
  error?: string;
  duration?: number;
}
```

### 3. 清晰的事件流
```
用户输入
    ↓
Agent 处理
    ↓
AgentEventAdapter 转换
    ↓
UIEvent 流 → useMessageStore
    ↓
MessageList 渲染
```

## 使用示例

```tsx
import { useAgent } from './hooks';
import { MessageList } from './components/message-list';

function Chat() {
  const { messages, isLoading, submitMessage, usedTokens, error } = useAgent({ 
    model: 'claude' 
  });

  return (
    <Box flexDirection="column">
      <MessageList
        messages={messages}        // UIMessage[]
        isLoading={isLoading}      // boolean
        usedTokens={usedTokens}    // { usedTokens, totalTokens }
        error={error}              // { message, phase } | null
      />
      <Input onSubmit={submitMessage} />
    </Box>
  );
}
```

## 消息渲染效果

```
❯ 用户的消息

● 助手的文本回复

● Read  src/file.txt
  └─ ✓ (45ms)
     File content here...

● Bash  ls -la
  └─ ✗ (12ms)
     Error: Command not found

◐ Thinking...
```

## 滚动功能

### 自动滚动
- 新消息自动滚动到底部
- 用户手动滚动后暂停自动滚动
- 按 `Ctrl+E` 恢复自动滚动

### 键盘控制
| 按键 | 功能 |
|------|------|
| `↑` | 向上滚动查看历史 |
| `↓` | 向下滚动查看新消息 |
| `Ctrl+H` | 跳到顶部 |
| `Ctrl+E` | 跳到底部，恢复自动滚动 |

### 界面提示
```
↑ 5 older messages | Press ↓ for newer | Press Ctrl+E for latest
```

## 输入历史功能

### 使用上下键切换输入历史
| 按键 | 功能 |
|------|------|
| `↑` | 切换到上一条输入历史 |
| `↓` | 切换到下一条（或恢复草稿）|

### 使用示例
```
> 帮我写代码
... 助手回复 ...

> 优化这段代码  
... 助手回复 ...

> ↑            ← 按上箭头
> 优化这段代码  ← 显示上一条输入

> ↑            ← 再按上箭头
> 帮我写代码    ← 显示更早的输入

> ↓            ← 按下箭头
> 优化这段代码  ← 显示较新的输入
```

### 草稿保存
当您在输入中按 ↑ 键时，当前输入会被保存为草稿：
```
> 我正在输入...
> ↑              ← 按上箭头，草稿被保存
> 历史消息

> ↓              ← 按下箭头
> 我正在输入...   ← 草稿被恢复
```

## 数据流

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   User      │────▶│   Agent      │────▶│   Adapter   │────▶│    Store     │
│   Input     │     │   (Core)     │     │  (Convert)  │     │   (Reducer)  │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
                                                                      │
                                                                      ▼
                                                               ┌──────────────┐
                                                               │ MessageList  │
                                                               │  (Render)    │
                                                               └──────────────┘
```

## 文件依赖关系

```
app.tsx
  ├── use-agent.ts
  │     ├── use-message-store.ts (Reducer)
  │     └── event-adapter.ts (AgentEventAdapter)
  │           └── types/message-types.ts (UIEvent)
  └── components/message-list/index.tsx
        └── types/message-types.ts (UIMessage)
```

## 状态转换示例

### 纯文本消息
```
State: []
  ↓ addUserMessage("Hello")
State: [{ type: 'user', content: 'Hello' }]
  ↓ assistant-message-start
State: [..., { type: 'assistant-text', content: '', status: 'streaming' }]
  ↓ assistant-message-delta × N
State: [..., { type: 'assistant-text', content: 'Hi!', status: 'streaming' }]
  ↓ assistant-message-complete
State: [..., { type: 'assistant-text', content: 'Hi!', status: 'complete' }]
```

### 工具调用消息
```
State: [{ type: 'user', content: 'Read file' }]
  ↓ assistant-message-start
State: [..., { type: 'assistant-text', content: '', status: 'streaming' }]
  ↓ START_TOOL_CALLS
State: [..., { type: 'assistant-tool', toolCalls: [{ id: '1', name: 'Read', status: 'running' }] }]
  ↓ UPDATE_TOOL_CALL_STATUS (success)
State: [..., { type: 'assistant-tool', toolCalls: [{ ..., status: 'success', result: '...' }] }]
```

## 架构优势

1. **单一职责**：每个模块只负责一个功能
2. **类型安全**：完整的 TypeScript 类型覆盖
3. **可测试性**：各模块可独立测试
4. **可维护性**：清晰的代码结构和数据流
5. **可扩展性**：易于添加新消息类型和事件
