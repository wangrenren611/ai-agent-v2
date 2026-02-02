# MessageList 组件实现总结

## ✅ 完成的实现

### 文件结构

```
src/cli/components/message-list/
├── index.tsx         # 主组件
└── MarkdownText.tsx  # Markdown 渲染组件（已存在）
```

---

## 组件功能

### 1. 消息类型支持

| 类型 | 显示样式 | 示例 |
|------|---------|------|
| **用户消息** | `●` 绿色图标 + 内容 | `● What files are in src/` |
| **助手文本** | `◆` 蓝色图标 + Markdown 内容 | `◆ I'll search for files...` |
| **工具调用** | `⎿` 黄色工具名 + 参数 | `⎿ Read src/file.ts (100 lines)` |
| **工具结果** | `⎾` 成功/失败图标 + 结果 | `✓ Found 5 files` |

### 2. 样式参考 Claude Code

```
✻ Conversation compacted (ctrl+o for history)

  ⎿  Read src\cli\components\chat-input\index.tsx (157 lines)
  ⎿  Read docs\multi-page-appmode-guide.md (347 lines)
  ...
● I'll continue with the task...
◆ Here's what I found:
  ⎾ ✓ Search completed (23ms)
  ⎿  Update(src\cli\context\keyboard.tsx)
  ...
```

---

## 核心特性

### 1. 消息分组

自动将连续的助手消息（工具调用 + 文本 + 结果）组合在一起：

```tsx
// 用户消息
<UserMessage content="Help me refactor this code" />

// 助手消息组（自动组合）
<MessageGroup messages={[
  { type: 'tool-call', toolName: 'Read', args: {...} },
  { type: 'tool-result', result: {...} },
  { type: 'text', content: 'I found the file...' }
]} />
```

### 2. 工具调用智能显示

自动识别常用工具并格式化输出：

| 工具 | 显示格式 |
|------|---------|
| `Read` | `⎿ Read path/to/file.ts (100 lines)` |
| `Glob` | `⎿ Glob **/*.ts` |
| `Grep` | `⎿ Grep pattern` |
| `Bash` | `⎿ $ command arg1 arg2` |
| 其他 | `⎿ ToolName {...args}` |

### 3. 工具结果格式化

- **成功结果**: 绿色 `✓` + 结果摘要
- **失败结果**: 红色 `✗` + 错误信息
- **耗时显示**: `(123ms)`
- **长内容截断**: 超过 5 行显示 `(N more lines)`

### 4. 历史记录压缩

- 默认只显示最近 10 条消息组
- `Ctrl+O` 切换完整历史记录
- 状态栏提示当前状态

### 5. 流式输出支持

- 思考状态: `◐ Thinking...`
- 流式文本: 自动添加 `◐` 动画
- 使用 MarkdownText 组件渲染

---

## 组件 API

### MessageList Props

```tsx
interface MessageListProps {
  /** 消息列表 */
  messages: Message[];
  /** 是否正在加载 */
  isLoading?: boolean;
  /** 已使用 token 数 */
  usedTokens?: { usedTokens: number; totalTokens: number };
  /** 错误信息 */
  error?: { message: string; phase: string } | null;
  /** 是否显示历史记录（默认压缩） */
  showHistory?: boolean;
  /** 切换历史记录显示 */
  onToggleHistory?: () => void;
}
```

### 使用示例

```tsx
import { MessageList } from './components/message-list';
import { useAgent } from './hooks/use-agent';

const App = () => {
  const [showHistory, setShowHistory] = useState(false);
  const { messages, isLoading, usedTokens, error } = useAgent({ model: 'gpt-4' });

  return (
    <MessageList
      messages={messages}
      isLoading={isLoading}
      usedTokens={usedTokens}
      error={error}
      showHistory={showHistory}
      onToggleHistory={() => setShowHistory(!showHistory)}
    />
  );
};
```

---

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+O` | 切换历史记录显示 |

---

## 样式常量

```tsx
const ICONS = {
  user: '●',       // 用户消息
  assistant: '◆',  // 助手消息
  tool: '⎿',       // 工具调用
  result: '⎾',     // 工具结果
  success: '✓',    // 成功
  error: '✗',      // 失败
  loading: '◐',    // 加载中
  ellipsis: '…',   // 省略号
  compact: '✻',    // 压缩状态
} as const;
```

---

## 辅助函数

### formatToolArgs

格式化工具参数为易读的字符串：

```tsx
formatToolArgs({ file_path: 'src/index.ts', limit: 100 })
// => '{"file_path":"src/index.ts","limit":100}'
```

### formatToolResult

格式化工具结果：

```tsx
formatToolResult({ success: true, data: ['file1.ts', 'file2.ts'] })
// => '["file1.ts","file2.ts"]'
```

### getFileInfo

从工具参数中提取文件信息：

```tsx
getFileInfo('Read', { file_path: 'src/index.ts', limit: 100 })
// => { path: 'src/index.ts', lines: ' (100 lines)' }
```

---

## 状态栏

显示在消息列表底部，包含：

```
┌────────────────────────────────────────┐
│ ✻ Conversation compacted (ctrl+o)    │
└────────────────────────────────────────┘
```

- 加载中显示: `◐ Thinking...`
- 完整历史显示: `Conversation expanded`
- 压缩历史显示: `Conversation compacted`

---

## 消息分组示例

```tsx
// 输入消息
[
  { role: 'user', content: 'Read the config file' },
  { role: 'assistant', type: 'tool-call', toolName: 'Read', args: {...} },
  { role: 'assistant', type: 'tool-result', result: {...} },
  { role: 'assistant', content: 'I found the config...' },
  { role: 'user', content: 'Now update it' },
  { role: 'assistant', type: 'tool-call', toolName: 'Write', args: {...} },
]

// 渲染结果
● Read the config file

⎿ Read src/config.json (50 lines)
✓ Config loaded (12ms)
◆ I found the config...

● Now update it

⎿ Write src/config.json
```

---

## 扩展点

### 添加新的工具识别

在 `getFileInfo` 函数中添加：

```tsx
// YourTool 工具
if (toolName === 'YourTool' && argObj.yourArg) {
  return {
    path: String(argObj.yourArg),
  };
}
```

### 自定义样式

修改 `COLORS` 和 `ICONS` 常量：

```tsx
const COLORS = {
  userIcon: 'green',
  assistantIcon: 'blue',
  toolIcon: 'yellow',
  // ...
};
```

---

## 依赖

- `ink` - UI 组件库
- `marked` - Markdown 解析
- `marked-terminal` - 终端 Markdown 渲染
- `chalk` - 颜色支持

---

## 测试

```bash
# 类型检查
pnpm typecheck

# 运行 CLI
pnpm dev:cli
```

---

## 修复记录

### 2025-01-31: 工具结果显示修复

**问题**：工具结果被创建为独立消息，导致重复显示

**修复内容**：
1. `use-agent.ts`: 重写 `handleToolResult`，不再创建独立消息
2. `message-list/index.tsx`: 移除 `ToolResult` 组件，结果嵌入 `ToolCall` 组件
3. `ToolCall`: 使用 `useMemo` 替代 IIFE，修复 TypeScript 类型错误

**修复后的数据流**：
```
Agent 事件 → use-agent.ts → messages 状态 → MessageList 渲染

tool-call 事件: 创建/更新 tool-call 消息
tool-result 事件: 直接附加到对应的 tool-call 消息（不创建新消息）
```

---

## 总结

MessageList 组件提供了完整的对话消息展示功能：

1. ✅ 支持所有消息类型（用户、助手、工具调用、工具结果）
2. ✅ Claude Code 风格的界面设计
3. ✅ 智能消息分组
4. ✅ 工具调用参数/结果格式化
5. ✅ 历史记录压缩/展开
6. ✅ 流式输出支持
7. ✅ 键盘快捷键
8. ✅ Markdown 渲染
9. ✅ 工具结果嵌入工具调用消息（不重复显示）
10. ✅ 层次化结果显示（缩进）
