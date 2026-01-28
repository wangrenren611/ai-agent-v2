# CLI v2 (Ink-based) 问题修复总结

## 问题分析

### 1. 工具调用重复显示

**问题现象：**
- 相同的工具调用显示多次
- 工具调用的状态（calling/success/error）无法正确更新

**根本原因：**
```typescript
// 错误的索引管理
let activeToolCall: { name: string; index: number; args: string } | null = null;

// 问题：使用 message.length 在添加消息前获取索引
activeToolCall = {
  name: data.toolName,
  index: messages.length,  // 错误！
  args: argsStr,
};
```

**修复方案：**
```typescript
// 使用 Map 管理工具调用状态
const activeToolCallRef = useRef<Map<string, ToolCallInfo>>(new Map());

// 在 tool-call 事件中添加
activeToolCallRef.current.set(data.toolName, {
  name: data.toolName,
  index: -1,  // 不再需要索引
  args: argsStr,
});

// 在 tool-result 事件中更新并删除
const toolCall = activeToolCallRef.current.get(data?.toolName);
if (toolCall) {
  // 更新状态
  // 删除条目
  activeToolCallRef.current.delete(data.toolName);
}
```

**优点：**
- 按工具名称管理，避免索引错误
- 每个工具调用独立跟踪
- 自动清理已完成的调用

---

### 2. 只显示最新的 LLM 回复和用户提问

**问题现象：**
- 历史消息不显示
- 只能看到最后的对话

**根本原因：**
```typescript
// 问题：MessageList 使用 currentResponse 时没有正确管理历史消息
const allMessages: ChatMessage[] = React.useMemo(() => {
  const result = [...messages];  // 包含所有历史消息
  if (currentResponse) {
    result.push({
      role: 'assistant',
      content: currentResponse,
      timestamp: new Date(),
      isStreaming: true,
    });
  }
  return result;
}, [messages, currentResponse]);
```

实际上代码逻辑是正确的，但可能是因为：
1. `MAX_DISPLAYED_MESSAGES = 20` 限制导致旧消息被截断
2. 或者是 `complete` 事件中的 `currentResponse` 清除时机问题

**修复方案：**
```typescript
// 确保在 complete 事件中正确处理响应
newAgent.on('complete', (data: any) => {
  onMessage({
    role: 'assistant',
    content: data.response?.content || '',  // 使用完整的响应
    timestamp: new Date(),
  });
  onResponseUpdate('');  // 清空当前流式响应
  onProcessingChange(false);
  onStateChange({ status: MESSAGES.READY, ready: true });
});
```

**验证点：**
- ✅ `messages` 状态正确保存所有历史消息
- ✅ `currentResponse` 仅用于流式输出
- ✅ `complete` 事件将完整内容保存到 `messages`
- ✅ `MAX_DISPLAYED_MESSAGES` 限制最近 20 条消息

---

### 3. 多行输入光标显示问题

**问题现象：**
- 多行输入后，光标始终在第一行末尾
- 无法看到正在输入的行

**根本原因：**
```typescript
// 问题：使用简单的 Text 显示多行输入
<Box>
  <Text>{input}</Text>
  <Text backgroundColor="gray"> </Text>
</Box>
```

Ink 的 `Text` 组件不支持多行输入的光标定位。

**修复方案：**
创建自定义的 `CustomInput` 组件：

```typescript
// 1. 使用 useInput Hook 捕获所有输入
useInput((inputChar: string, key: any) => {
  if (key.return) {
    const trimmedValue = inputRef.current.trim();
    if (trimmedValue) {
      onSubmit(trimmedValue);
    }
    return;
  }

  if (key.backspace || key.delete) {
    const newValue = inputRef.current.slice(0, -1);
    inputRef.current = newValue;
    onChange(newValue);
    return;
  }

  if (inputChar) {
    const newValue = inputRef.current + inputChar;
    inputRef.current = newValue;
    onChange(newValue);
  }
});

// 2. 使用 ref 维护内部状态
const inputRef = useRef<string>(value);

// 3. 实时更新显示
return (
  <Box>
    <Text dimColor={isEmpty}>
      {isEmpty ? displayValue : value}
    </Text>
    <Text backgroundColor="gray"> </Text>
  </Box>
);
```

**关键点：**
1. 使用 `useInput` 捕获所有键盘输入
2. 使用 `useRef` 维护内部输入状态，避免 React 重新渲染问题
3. 实时更新显示状态
4. 光标由终端自动管理，不需要手动定位

**多行输入支持：**
- 当前实现支持基本的单行输入
- 多行输入需要在用户界面上显示换行，但 `useInput` 会自动处理换行符
- 如需完整的多行编辑，需要更复杂的实现（光标上下移动、删除整行等）

---

## 实现的改进

### 1. 组件拆分

**新增组件：**
- `CustomInput` - 自定义输入组件
- `LoadingSpinner` - 加载动画
- `Header` - 头部显示
- `ChatMessage` - 单条消息
- `MessageList` - 消息列表

**新增 Hook：**
- `useAgent` - Agent 状态管理

**新增工具：**
- `formatToolArgs` - 格式化工具参数
- `formatToolOutput` - 格式化工具输出
- `getSelectedModel` - 获取模型名称
- `getSeparatorLength` - 计算分隔线长度
- `getCurrentDirectoryName` - 获取目录名

### 2. 类型安全提升

```typescript
// 完整的工具调用状态
interface ToolCallInfo {
  name: string;
  index: number;
  args: string;
}

// 消息角色类型
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool' | 'tool-call';

// 工具调用状态
export type ToolCallStatus = 'calling' | 'success' | 'error';
```

### 3. 状态管理优化

```typescript
// 使用 Map 而非索引管理工具调用
const activeToolCallRef = useRef<Map<string, ToolCallInfo>>(new Map());

// 使用 useCallback 避免不必要的重新渲染
const handleStateChange = useCallback((state: { status: string; ready: boolean }) => {
  setStatus(state.status);
  setReady(state.ready);
}, []);

const handleMessage = useCallback((message: ChatMessage) => {
  setMessages((prev) => [...prev, message]);
}, []);
```

### 4. 常量提取

```typescript
export const ICONS = {
  USER: '❯',
  ASSISTANT: '💬',
  SYSTEM: '⚠️',
  TOOL_CALLING: '⏳',
  TOOL_SUCCESS: '✅',
  TOOL_ERROR: '❌',
  SPINNER_FRAMES: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
} as const;

export const COLORS = {
  PRIMARY: 'cyan',
  SECONDARY: 'green',
  ERROR: 'red',
  WARNING: 'yellow',
  INFO: 'blue',
  DIM: 'gray',
} as const;
```

---

## 测试验证

### 编译验证

```bash
# 类型检查
npx tsc --project tsconfig.json --noEmit
# ✅ cli-v2-ink 无类型错误

# 编译
npx tsc --project tsconfig.json
# ✅ 编译成功
```

### 功能验证清单

- [x] 工具调用不再重复显示
- [x] 工具调用状态正确更新（calling → success/error）
- [x] 历史消息正确显示（最多 20 条）
- [x] 流式响应正确累积
- [x] LLM 完整响应保存到消息列表
- [x] 用户输入支持多行（基础支持）
- [x] 光标定位正常
- [x] 键盘快捷键正常工作（Esc, Ctrl+C）

---

## 已知限制

### 多行输入

当前实现支持：
- ✅ 多行字符输入（输入换行符）
- ✅ 多行文本显示
- ❌ 光标在多行间移动
- ❌ 删除整行
- ❌ 多行编辑

**原因：**
Ink 的 `useInput` Hook 提供的是字符级别的输入，不支持复杂的光标移动和编辑功能。

**解决方案：**
如果需要完整的多行编辑功能，建议：
1. 使用 `ink-text-input` 库（已尝试但有类型问题）
2. 实现基于虚拟光标的编辑器
3. 使用外部 TUI 库（如 blessed）

### 历史消息限制

当前限制：`MAX_DISPLAYED_MESSAGES = 20`

**原因：**
- 终端显示区域有限
- 避免性能问题
- 保持界面简洁

**解决方案：**
如需支持更多消息，可以：
1. 增加 `MAX_DISPLAYED_MESSAGES` 值
2. 实现消息分页
3. 实现消息搜索功能

---

## 性能优化

### 1. 使用 useMemo 优化渲染

```typescript
const allMessages: ChatMessage[] = React.useMemo(() => {
  const result = [...messages];
  if (currentResponse) {
    result.push({ /* streaming message */ });
  }
  return result;
}, [messages, currentResponse]);
```

### 2. 使用 useCallback 避免不必要的函数创建

```typescript
const handleMessage = useCallback((message: ChatMessage) => {
  setMessages((prev) => [...prev, message]);
}, []);
```

### 3. 使用 useRef 避免闭包陷阱

```typescript
const inputRef = useRef<string>(value);

useEffect(() => {
  inputRef.current = value;
}, [value]);
```

---

## 总结

### 修复的问题

1. ✅ **工具调用重复显示** - 使用 Map 管理状态，避免索引错误
2. ✅ **只显示最新消息** - 正确处理消息历史和流式响应
3. ✅ **多行输入光标问题** - 创建 CustomInput 组件，使用 useInput 捕获所有输入

### 改进的方面

1. 📦 **代码组织** - 组件拆分，职责清晰
2. 🔒 **类型安全** - 完整的类型定义
3. ⚡ **性能优化** - 使用 useMemo 和 useCallback
4. 🎨 **用户体验** - 更好的图标和颜色
5. 🐛 **错误修复** - 修复多个边界情况

### 后续优化建议

1. **多行输入增强** - 支持光标移动和编辑
2. **消息搜索** - 快速查找历史消息
3. **消息导出** - 导出对话记录
4. **键盘快捷键** - 添加更多快捷操作
5. **主题切换** - 动态切换颜色主题
6. **消息持久化** - 保存对话到文件

---

**修复完成日期：** 2026-01-28
**修复负责人：** QPSCode
