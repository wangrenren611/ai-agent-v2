# 调试TextInput焦点问题 - 简化测试版本

## 🧪 测试步骤

### 1. 重新编译
```bash
pnpm build
```

### 2. 启动 CLI
```bash
pnpm dev:cli-v2-ink
```

### 3. 观察日志

#### 程序启动时应该看到
```
[CustomInput] Component mounted, disabled: false, focus: true
[CustomInput] Props changed: { value: '', disabled: false, focus: true }
```

#### 输入 `/` 时应该看到
```
[CustomInput] Value changed: /
[Session] Input changed: /
[Session] Showing command list
[Session] Render state: { input: '/', showCommandList: true, matchedCommandsCount: 6, ready: false }
```

---

## 🔍 诊断问题

### 如果没有看到 `[CustomInput] Component mounted`

**原因**: CustomInput 没有渲染

**检查**:
1. Session 组件是否渲染
2. CustomInput 是否在 Session 组件中
3. 是否有条件渲染阻止了 CustomInput 渲染

### 如果看到 `disabled: false, focus: true` 但输入没有变化

**原因**: TextInput 没有获得焦点

**检查**:
1. 是否有多个 TextInput 同时渲染
2. 是否有其他组件拦截了输入
3. `useInput` 是否拦截了所有输入

### 如果看到 `Value changed: /` 但 `showCommandList` 还是 `false`

**原因**: `handleInputChange` 逻辑有问题

**检查**:
1. `value.startsWith('/')` 是否正确
2. `setShowCommandList` 是否被调用
3. 是否有其他地方重置了 `showCommandList`

---

## 🐛 快速修复测试

### 测试 1: 移除 `useInput`

**目的**: 确认 `useInput` 是否拦截了输入

**步骤**:
1. 在 `src/cli-v2-ink/components/Session.tsx` 中注释掉 `useInput`
2. 重新编译
3. 测试输入是否正常

**代码**:
```tsx
// 临时注释掉 useInput
// useInput((inputChar, key) => {
//   console.log('[Session] useInput:', { inputChar, key, showCommandList, showModelSelector, ready });
//   // ...
// });
```

**预期结果**:
- 如果输入正常，说明 `useInput` 拦截了输入
- 如果输入还是不行，说明不是 `useInput` 的问题

### 测试 2: 简化 `useInput`

**目的**: 确认 `useInput` 的拦截逻辑是否正确

**步骤**:
1. 在 `useInput` 中只拦截导航键，其他键不拦截
2. 重新编译
3. 测试输入是否正常

**代码**:
```tsx
useInput((inputChar, key) => {
  console.log('[Session] useInput:', { inputChar, key, showCommandList, showModelSelector, ready });
  
  // 只拦截上下箭头、回车、Esc
  if (key.upArrow || key.downArrow || key.return || key.escape) {
    if (showCommandList) {
      // 处理命令列表导航
    }
    return; // 拦截这些键
  }
  
  // 其他键不拦截，让 TextInput 处理
  return;
});
```

**预期结果**:
- 如果输入正常，说明之前的 `useInput` 逻辑有问题
- 如果输入还是不行，说明不是 `useInput` 的问题

### 测试 3: 移除条件渲染

**目的**: 确认条件渲染是否阻止了 CustomInput 渲染

**步骤**:
1. 移除所有条件渲染
2. 重新编译
3. 测试输入是否正常

**代码**:
```tsx
return (
  <Box flexDirection="column" flexGrow={1}>
    {/* 移除所有条件渲染 */}
    <Header model={selectedModel} />
    <MessageList messages={messages} currentResponse={currentResponse} />
    <StatusIndicator
      isProcessing={isProcessing}
      status={status}
      currentResponse={currentResponse}
    />
    
    <CustomInput
      value={input}
      onChange={handleInputChange}
      onSubmit={submitMessage}
      placeholder="Type a message or / to see commands..."
      disabled={false}
    />
  </Box>
);
```

**预期结果**:
- 如果输入正常，说明条件渲染有问题
- 如果输入还是不行，说明不是条件渲染的问题

---

## 📋 诊断清单

- [ ] CustomInput 是否挂载
- [ ] CustomInput 的 `focus` 属性是否为 `true`
- [ ] 输入字符是否出现在输入框中
- [ ] `onChange` 回调是否被调用
- [ ] `showCommandList` 是否变为 `true`
- [ ] `matchedCommands` 是否有内容
- [ ] `CommandList` 组件是否渲染
- [ ] `useInput` 是否拦截了输入
- [ ] 是否有多个 TextInput 同时渲染

---

## 💡 最终解决方案

根据诊断结果，可能的解决方案：

### 方案 A: 修复 `useInput` 逻辑
```tsx
useInput((inputChar, key) => {
  // 只在特定条件下拦截
  if (showCommandList && (key.upArrow || key.downArrow || key.return || key.escape)) {
    // 处理导航
    return; // 拦截
  }
  
  // 其他情况不拦截
  return;
});
```

### 方案 B: 移除 `useInput`，使用 TextInput 的 `onSubmit`
```tsx
// 不使用 useInput，让 TextInput 处理所有输入
const handleKeyDown = (event: KeyboardEvent) => {
  if (showCommandList) {
    // 处理导航
  }
};
```

### 方案 C: 使用 `useFocus` Hook
```tsx
import { useFocus } from 'ink';

const { isFocused } = useFocus();

// 只在聚焦时处理导航
useInput((inputChar, key) => {
  if (!isFocused) return;
  // 处理导航
});
```

---

## 📝 请提供以下信息

1. **完整的日志输出**
   - 程序启动时的日志
   - 输入 `/` 时的日志

2. **界面状态**
   - 输入框是否可见
   - 输入框中是否有光标
   - 输入字符是否出现在输入框中

3. **测试结果**
   - 测试 1（移除 `useInput`）的结果
   - 测试 2（简化 `useInput`）的结果
   - 测试 3（移除条件渲染）的结果

---

**调试状态**: ⏳ 等待用户反馈
**下一步**: 根据用户反馈确定具体问题并提供最终解决方案
