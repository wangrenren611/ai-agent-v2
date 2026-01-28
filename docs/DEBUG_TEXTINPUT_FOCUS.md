# 调试 TextInput 焦点问题

## 🔍 问题分析

### 当前问题
在应用初始化时，输入 `/` 无法唤醒命令选择列表。

### 可能的原因

#### 1. TextInput 焦点问题
- **症状**: TextInput 没有获得焦点，无法接收输入
- **检查**: `focus={!disabled}` 属性是否正确

#### 2. 多个 TextInput 竞争焦点
- **症状**: Home 页面的 TextInput 和 Session 页面的 TextInput 可能同时存在
- **检查**: 路由切换时，旧的 TextInput 是否正确卸载

#### 3. 输入事件被拦截
- **症状**: `useInput` 拦截了所有输入，导致 TextInput 无法接收
- **检查**: `useInput` 的拦截逻辑是否正确

---

## 🧪 调试步骤

### 1. 重新编译
```bash
pnpm build
```

### 2. 启动 CLI
```bash
pnpm dev:cli-v2-ink
```

### 3. 观察日志

#### 启动时
应该看到：
```
[CustomInput] Component mounted, disabled: false, focus: true
[CustomInput] Props changed: { value: '', disabled: false, focus: true }
```

#### 输入 `/` 时
应该看到：
```
[CustomInput] Value changed: /
[Session] Input changed: /
[Session] Showing command list
[Session] Render state: { input: '/', showCommandList: true, matchedCommandsCount: 6, ready: false }
```

---

## 🐛 如果还是不行

### 测试 1: 检查 TextInput 是否获得焦点

**方法**: 尝试直接在输入框中输入字符

**预期**: 应该能看到字符出现在输入框中

**实际**: 如果看不到字符，说明 TextInput 没有获得焦点

### 测试 2: 检查 `useInput` 是否拦截了输入

**方法**: 注释掉 `useInput`，测试输入是否正常

**步骤**:
1. 注释掉 `useInput` 的所有代码
2. 重新编译
3. 测试输入是否正常

**代码**:
```tsx
// 暂时注释掉 useInput
// useInput((inputChar, key) => {
//   console.log('[Session] useInput:', { inputChar, key, showCommandList, showModelSelector, ready });
//   ...
// });
```

### 测试 3: 检查路由切换

**问题**: Home 页面的 TextInput 可能还在监听输入

**解决**: 确保 Home 页面的 TextInput 在切换路由时正确卸载

---

## 🔧 可能的修复方案

### 方案 1: 使用 `focus` 属性

确保 TextInput 的 `focus` 属性正确：

```tsx
<TextInput
  value={value}
  onChange={onChange}
  onSubmit={onSubmit}
  placeholder={placeholder}
  focus={!disabled}
  showCursor={!disabled}
/>
```

### 方案 2: 使用 `useFocus` Hook

如果 `focus` 属性不够，可以使用 `useFocus` Hook：

```tsx
import { useFocus } from 'ink';

const { isFocused } = useFocus();

return (
  <TextInput
    value={value}
    onChange={onChange}
    onSubmit={onSubmit}
    placeholder={placeholder}
    focus={!disabled && isFocused}
    showCursor={!disabled}
  />
);
```

### 方案 3: 使用 `StdinContext`

如果以上方案都不行，可以使用 `StdinContext` 直接监听输入：

```tsx
import { useStdin } from 'ink';

const { stdin, setRawMode } = useStdin();

useEffect(() => {
  setRawMode(true);
  const handleData = (data: Buffer) => {
    console.log('Received input:', data.toString());
  };
  stdin.on('data', handleData);
  return () => {
    stdin.off('data', handleData);
    setRawMode(false);
  };
}, [stdin, setRawMode]);
```

---

## 📋 调试清单

- [ ] CustomInput 是否挂载
- [ ] CustomInput 的 `focus` 属性是否为 `true`
- [ ] 输入字符是否出现在输入框中
- [ ] `onChange` 回调是否被调用
- [ ] `showCommandList` 是否变为 `true`
- [ ] `matchedCommands` 是否有内容
- [ ] `CommandList` 组件是否渲染

---

## 💡 快速测试

### 测试代码

在 `src/cli-v2-ink/components/CustomInput.tsx` 中添加：

```tsx
export default function CustomInput({
  value,
  onChange,
  placeholder = '',
  onSubmit,
  disabled = false,
}: CustomInputProps) {
  // ... existing code

  const handleKeyDown = (event: any) => {
    console.log('[CustomInput] Key down:', event.key);
  };

  return (
    <TextInput
      value={value}
      onChange={handleChange}
      onSubmit={handleSubmit}
      placeholder={placeholder}
      focus={!disabled}
      showCursor={!disabled}
    />
  );
}
```

### 预期输出

输入 `/` 时，应该看到：
```
[CustomInput] Key down: /
[CustomInput] Value changed: /
```

---

## 🐛 如果还是不行

### 请提供以下信息

1. **完整的日志输出**
   - 程序启动时的日志
   - 输入 `/` 时的日志
   - 所有 `[CustomInput]` 开头的日志
   - 所有 `[Session]` 开头的日志

2. **界面状态**
   - 输入框是否可见
   - 输入框中是否有光标
   - 输入字符是否出现在输入框中

3. **运行环境**
   - 终端类型（iTerm2、Terminal.app 等）
   - 操作系统版本
   - Node.js 版本

---

## 📚 相关资源

- [ink-text-input GitHub](https://github.com/vadimdemedes/ink-text-input)
- [ink useFocus](https://github.com/vadimdemedes/ink#usefocus)
- [ink useStdin](https://github.com/vadimdemedes/ink#usestdin)

---

**调试状态**: ⏳ 等待用户反馈
**下一步**: 根据用户反馈的日志进一步调试
