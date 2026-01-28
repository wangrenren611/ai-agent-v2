# 修复 TextInput 和 useInput 冲突问题

## 🎯 核心问题分析

### 问题根源
`useInput` 和 `TextInput` 都在监听标准输入（stdin），导致输入冲突。

### Ink 的工作原理

1. **TextInput** 组件
   - 自动监听 stdin
   - 处理所有字符输入
   - 处理光标移动
   - 处理特殊键（Enter、Escape 等）

2. **useInput** Hook
   - 监听 stdin 的所有输入
   - 可以拦截输入事件
   - 如果拦截了输入，TextInput 就收不到

### 冲突场景

当同时使用 `useInput` 和 `TextInput` 时：

```
用户输入 '/' → useInput 拦截 → TextInput 收不到
```

这就是为什么第一次输入 `/` 无法触发命令列表的原因。

---

## ✅ 解决方案

### 方案：让 TextInput 处理所有输入

#### 1. useInput 只处理导航键

修改 `useInput` 的逻辑：
- ✅ 只在特定情况下（showCommandList 或 showModelSelector）拦截导航键
- ✅ 其他情况不拦截，让 TextInput 处理

```tsx
useInput((inputChar, key) => {
  console.log('[Session] useInput:', { inputChar, key, showCommandList, showModelSelector, ready, input });
  
  // ONLY handle navigation when command list is shown
  if (showCommandList) {
    if (key.upArrow) {
      setCommandListIndex(prev => (prev > 0 ? prev - 1 : matchedCommands.length - 1));
    }
    if (key.downArrow) {
      setCommandListIndex(prev => (prev < matchedCommands.length - 1 ? prev + 1 : 0));
    }
    if (key.escape) {
      setShowCommandList(false);
    }
    // Don't handle Enter here - let TextInput handle it
    return;
  }

  // ONLY handle navigation when model selector is shown
  if (showModelSelector) {
    if (key.upArrow) {
      const models = Object.values(PROVIDER_METADATA);
      setModelSelectorIndex(prev => (prev > 0 ? prev - 1 : models.length - 1));
    }
    if (key.downArrow) {
      const models = Object.values(PROVIDER_METADATA);
      setModelSelectorIndex(prev => (prev < models.length - 1 ? prev + 1 : 0));
    }
    if (key.escape) {
      setShowModelSelector(false);
    }
    // Don't handle Enter here - let TextInput handle it
    return;
  }

  // ONLY handle escape for navigation
  if (ready && key.escape) {
    navigate('home');
  }
  
  // Don't intercept any other keys - let TextInput handle them
});
```

#### 2. CustomInput 处理 Enter 键

修改 `CustomInput` 的 `handleSubmit` 逻辑：
- ✅ 如果命令列表显示，执行选中的命令
- ✅ 否则，提交消息

```tsx
const handleSubmit = (newValue: string) => {
  console.log('[CustomInput] Submit:', newValue, 'showCommandList:', showCommandList);
  
  // If command list is shown, execute selected command
  if (showCommandList && executeCommand) {
    console.log('[CustomInput] Executing command');
    executeCommand();
    return;
  }
  
  // Otherwise, submit normally
  if (onSubmit && newValue.trim()) {
    console.log('[CustomInput] Calling onSubmit');
    onSubmit();
  }
};
```

#### 3. Session 传递 executeCommand

修改 `Session` 组件，将 `executeCommand` 传递给 `CustomInput`：

```tsx
<CustomInput
  value={input}
  onChange={handleInputChange}
  onSubmit={submitMessage}
  placeholder="Type a message or / to see commands..."
  disabled={isProcessing || showModelSelector}
  showCommandList={showCommandList}
  executeCommand={() => {
    if (matchedCommands[commandListIndex]) {
      executeCommand(matchedCommands[commandListIndex]);
    }
  }}
/>
```

---

## 🔑 关键改动

### 1. useInput 不再拦截 Enter 键

**之前**:
```tsx
if (key.return) {
  if (matchedCommands[commandListIndex]) {
    executeCommand(matchedCommands[commandListIndex]);
  }
  return; // 拦截 Enter，TextInput 收不到
}
```

**之后**:
```tsx
// Don't handle Enter here - let TextInput handle it
```

### 2. CustomInput 处理 Enter 键

**之前**:
```tsx
const handleSubmit = (newValue: string) => {
  if (onSubmit && newValue.trim()) {
    onSubmit();
  }
};
```

**之后**:
```tsx
const handleSubmit = (newValue: string) => {
  if (showCommandList && executeCommand) {
    executeCommand();
    return;
  }
  
  if (onSubmit && newValue.trim()) {
    onSubmit();
  }
};
```

### 3. Session 传递 executeCommand

**之前**:
```tsx
<CustomInput
  value={input}
  onChange={handleInputChange}
  onSubmit={submitMessage}
  placeholder="Type a message or / to see commands..."
  disabled={isProcessing || showModelSelector}
/>
```

**之后**:
```tsx
<CustomInput
  value={input}
  onChange={handleInputChange}
  onSubmit={submitMessage}
  placeholder="Type a message or / to see commands..."
  disabled={isProcessing || showModelSelector}
  showCommandList={showCommandList}
  executeCommand={() => {
    if (matchedCommands[commandListIndex]) {
      executeCommand(matchedCommands[commandListIndex]);
    }
  }}
/>
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

### 3. 测试第一次输入 `/`

**步骤**:
1. 程序启动后，立即输入 `/`
2. 观察日志输出

**预期结果**:
```
[CustomInput] Component mounted, disabled: false, focus: true
[CustomInput] Props changed: { value: '', disabled: false, focus: true, showCommandList: false }
[CustomInput] Value changed: /
[Session] Input changed: /
[Session] Showing command list
[Session] Render state: { input: '/', showCommandList: true, matchedCommandsCount: 6, ready: false }
```

**界面显示**:
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

### 4. 测试继续输入

**步骤**:
1. 输入 `/mo`
2. 观察命令列表是否过滤

**预期结果**:
```
[CustomInput] Value changed: /mo
[Session] Input changed: /mo
[Session] Showing command list
[Session] Render state: { input: '/mo', showCommandList: true, matchedCommandsCount: 1, ready: false }
```

**界面显示**:
```
Commands: (↑↓ navigate, Enter execute, Esc cancel)
▶ /model      - Select AI model

───────────────
Type / to see commands | /help for more | Ctrl+C: Exit
> /mo 
```

### 5. 测试执行命令

**步骤**:
1. 输入 `/model`
2. 按 [Enter]

**预期结果**:
```
[CustomInput] Submit: /model, showCommandList: true
[CustomInput] Executing command
[Session] Executing command: /model
```

**界面显示**: 模型选择器出现

---

## 📋 完整测试清单

- [ ] 初始化时输入 `/` 能显示命令列表
- [ ] 初始化时输入 `/` 能继续输入
- [ ] 初始化时输入 `/mo` 能过滤命令
- [ ] 初始化时能使用上下键导航
- [ ] 初始化时能按 [Enter] 执行命令
- [ ] 初始化时能按 [Esc] 隐藏命令列表
- [ ] Ready 后功能正常
- [ ] 发送消息功能正常
- [ ] 所有输入都能正确显示

---

## 🐛 如果还有问题

### 问题 1: 日志显示 `[Session] useInput` 但输入没有变化

**原因**: `useInput` 拦截了输入

**检查**:
1. `useInput` 是否正确拦截了导航键
2. `useInput` 是否正确放行了其他键
3. 日志中 `input` 字段是否显示正确的值

### 问题 2: 日志没有显示 `[CustomInput] Value changed`

**原因**: TextInput 没有收到输入

**检查**:
1. CustomInput 是否正确渲染
2. `focus={!disabled}` 是否正确
3. 是否有其他组件拦截了输入

### 问题 3: 命令列表显示但无法导航

**原因**: 导航键没有被正确处理

**检查**:
1. `useInput` 是否正确处理上下箭头
2. `commandListIndex` 是否正确更新
3. 命令列表的高亮是否正确显示

---

## 📚 相关文档

- [Ink useInput](https://github.com/vadimdemedes/ink#useinput)
- [ink-text-input](https://github.com/vadimdemedes/ink-text-input)
- [Ink 最佳实践](https://github.com/vadimdemedes/ink/blob/master/docs/introduction.md)

---

**修复完成时间**: 2026-01-28
**状态**: ✅ 修复完成
**修改文件**: `src/cli-v2-ink/components/Session.tsx`, `src/cli-v2-ink/components/CustomInput.tsx`
**核心改动**: useInput 只拦截导航键，让 TextInput 处理所有其他输入
