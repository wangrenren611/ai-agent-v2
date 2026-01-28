# 修复初始化时输入无法唤醒命令列表

## ✅ 已修复的问题

### 问题描述
在应用初始化时（Loading 状态），输入 `/` 无法唤醒命令选择列表。

### 根本原因
在 Loading 状态下（`!ready`），Session 组件只返回一个简单的 Loading 文本，**没有渲染 CustomInput**：

```tsx
// 修改前
if (!ready) {
  return (
    <Box flexDirection="column" paddingX={2}>
      <Text bold color={COLORS.PRIMARY}>AI Agent CLI</Text>
      <Text dimColor>{status || MESSAGES.LOADING}</Text>
    </Box>
  );
}

// CustomInput 在这里渲染，但只有在 ready 时
return (
  <Box flexDirection="column" flexGrow={1}>
    <Header />
    <MessageList />
    <CustomInput />  {/* 这里才渲染 */}
  </Box>
);
```

因为 CustomInput 没有渲染，所以无法接收任何输入。

### 修复方案

#### 1. CustomInput 始终渲染

**修改后的逻辑**：
- ✅ CustomInput 始终渲染，不管 ready 状态如何
- ✅ Header、MessageList、StatusIndicator 只在 ready 时渲染
- ✅ Loading 状态下，只显示一个简单的 Loading 指示器

```tsx
return (
  <Box flexDirection="column" flexGrow={1}>
    {/* Header - 只在 ready 时渲染 */}
    {ready && <Header model={selectedModel} />}

    {/* Loading indicator - 只在 loading 时渲染 */}
    {!ready && (
      <Box flexDirection="column" paddingX={2} marginBottom={1}>
        <Text bold color={COLORS.PRIMARY}>AI Agent CLI</Text>
        <Text dimColor>{status || MESSAGES.LOADING}</Text>
      </Box>
    )}

    {/* Messages - 只在 ready 时渲染 */}
    {ready && <MessageList messages={messages} currentResponse={currentResponse} />}
  
    {/* Status Indicator - 只在 ready 时渲染 */}
    {ready && <StatusIndicator
      isProcessing={isProcessing}
      status={status}
      currentResponse={currentResponse}
    />}

    {/* Model Selector - 条件渲染 */}
    {showModelSelector && (
      <Box>...</Box>
    )}

    {/* Command List - 条件渲染 */}
    {showCommandList && (
      <Box>...</Box>
    )}

    {/* Input - 始终渲染 */}
    <Box paddingX={2}>
      <Text bold color={COLORS.PRIMARY}>{ICONS.INPUT} </Text>
      <Box flexGrow={1}>
        <CustomInput
          value={input}
          onChange={handleInputChange}
          onSubmit={submitMessage}
          placeholder="Type a message or / to see commands..."
          disabled={isProcessing || showModelSelector}
        />
      </Box>
    </Box>

    {/* Help text - 始终渲染 */}
    <Box marginBottom={4}>
      <Text dimColor color={COLORS.DIM}>
        Type / to see commands | /help for more | Ctrl+C: Exit
      </Text>
    </Box>
  </Box>
);
```

---

## 🚀 测试步骤

### 1. 重新编译
```bash
pnpm build
```

### 2. 启动 CLI
```bash
pnpm dev:cli-v2-ink
```

### 3. 测试初始化时输入 `/`

程序启动后，**立即输入**：
```
> /
```

**预期结果**:
- ✅ 显示所有 6 个命令
- ✅ 命令列表位于底部
- ✅ 即使 Agent 还在加载，也能显示命令列表

**日志输出**:
```
[Session] State changed: { status: 'Loading...', ready: false }
[Session] Render state: { input: '/', showCommandList: true, matchedCommandsCount: 6, ready: false }
[Session] State changed: { status: 'Ready X tools', ready: false }
[Session] State changed: { status: 'Ready', ready: true }
```

### 4. 测试初始化时继续输入

程序启动后，立即输入：
```
> /mo
```

**预期结果**:
- ✅ 命令列表自动过滤，只显示 `/model`
- ✅ 可以继续输入
- ✅ 即使 Agent 还在加载，也能输入

### 5. 测试导航和执行

程序启动后，立即输入 `/`，然后：
- 按下 [↓] - 应该切换到下一个命令
- 按下 [Enter] - 应该执行选中的命令

---

## 📋 渲染逻辑对比

### 修改前
| 组件 | Loading 状态 | Ready 状态 |
|------|-------------|------------|
| CustomInput | ❌ 不渲染 | ✅ 渲染 |
| Header | ❌ 不渲染 | ✅ 渲染 |
| MessageList | ❌ 不渲染 | ✅ 渲染 |
| StatusIndicator | ❌ 不渲染 | ✅ 渲染 |
| CommandList | ❌ 不渲染 | ✅ 渲染 |

### 修改后
| 组件 | Loading 状态 | Ready 状态 |
|------|-------------|------------|
| CustomInput | ✅ 渲染 | ✅ 渲染 |
| Header | ❌ 不渲染 | ✅ 渲染 |
| MessageList | ❌ 不渲染 | ✅ 渲染 |
| StatusIndicator | ❌ 不渲染 | ✅ 渲染 |
| CommandList | ✅ 渲染 | ✅ 渲染 |

---

## 🎨 界面示例

### Loading 状态下输入 `/`

```
AI Agent CLI
Loading...

───────────────
Type / to see commands | /help for more | Ctrl+C: Exit
> / 
```

**命令列表显示**：
```
AI Agent CLI
Loading...

Commands: (↑↓ navigate, Enter execute, Esc cancel)
▶ /model      - Select AI model
  /settings   - Open settings
  /config     - Open configuration
  /clear      - Clear message history
  /help       - Show help
  /exit       - Exit application

───────────────
Type / to see commands | /help for more | Ctrl+C: Exit
> / 
```

### Ready 状态

```
┌─────────────────────────────────────────────┐
│ Chat Session - 5 messages                 │
│                                            │
│ [User] 你好                                │
│ [AI] 你好！我是 AI 助手                   │
│                                            │
│ Commands: (↑↓ navigate, Enter execute...)│
│ ▶ /model      - Select AI model           │
│                                            │
│ Type / to see commands | /help for more  │
│ > /                                       │
└─────────────────────────────────────────────┘
```

---

## 📝 相关文档

- [修复输入框禁用问题](./FIX_INPUT_DISABLED.md)
- [使用 ink-text-input](./USE_INK_TEXT_INPUT_FINAL.md)
- [调试命令列表](./DEBUG_COMMAND_LIST.md)

---

## ✅ 测试清单

- [ ] 初始化时输入 `/` 能显示命令列表
- [ ] 初始化时输入 `/` 能继续输入
- [ ] 初始化时输入 `/mo` 能过滤命令
- [ ] 初始化时能使用上下键导航
- [ ] 初始化时能按 [Enter] 执行命令
- [ ] 初始化时能按 [Esc] 隐藏命令列表
- [ ] Ready 后功能正常
- [ ] 发送消息功能正常

---

## 🐛 如果还有问题

### 问题 1: 初始化时仍然无法输入 `/`

**检查点**:
1. CustomInput 是否渲染
2. TextInput 的 `focus` 属性是否为 `true`
3. 日志是否显示 `[Session] Render state`

### 问题 2: 命令列表不显示

**检查点**:
1. `showCommandList` 是否为 `true`
2. `matchedCommands` 是否有内容
3. CommandList 组件是否渲染

### 问题 3: 输入 `/` 后无法继续输入

**检查点**:
1. CustomInput 的 `disabled` 属性是否为 `false`
2. `useInput` 是否正确处理键事件

---

**修复完成时间**: 2026-01-28
**状态**: ✅ 修复完成
**修改文件**: `src/cli-v2-ink/components/Session.tsx`
**关键改动**: CustomInput 始终渲染，不管 ready 状态
