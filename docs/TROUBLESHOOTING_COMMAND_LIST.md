# 命令列表不显示问题排查

## 问题描述

用户输入 `/` 或 `/m` 时，命令列表没有出现。

---

## 排查步骤

### 1. 检查 CustomInput 是否正确调用 `onChange`

**代码位置**: `src/cli-v2-ink/components/CustomInput.tsx`

```typescript
useInput((input, key) => {
  if (!isMounted.current || disabled) return;

  if (key.return && onSubmit) {
    onSubmit();
  } else if (key.backspace || key.delete) {
    onChange(value.slice(0, -1));
  } else if (key.escape) {
    onChange('');
    if (onEscape) {
      onEscape();
    }
    if (onCommand) {
      onCommand('');
    }
  } else if (key.ctrl && input === 'c' && onExit) {
    onExit();
  } else if (input && !key.ctrl && !key.meta) {
    const newValue = value + input;
    onChange(newValue);  // ← 这里应该触发

    // Check for commands
    if (onCommand) {
      const match = newValue.match(COMMAND_PATTERN);
      if (match) {
        onCommand(match[1]);
      } else if (newValue.length === 0) {
        onCommand('');
      }
    }
  }
});
```

**检查点**:
- ✅ `disabled` 属性是否为 `false`
- ✅ `isMounted.current` 是否为 `true`
- ✅ `input` 是否不为空
- ✅ `key.ctrl` 和 `key.meta` 是否都为 `false`

---

### 2. 检查 Session 的 `handleInputChange` 是否被调用

**代码位置**: `src/cli-v2-ink/components/Session.tsx`

```typescript
const handleInputChange = useCallback((value: string) => {
  setInput(value);

  // Show command list when input starts with '/'
  if (value.startsWith('/')) {
    setShowCommandList(true);  // ← 这里应该设置为 true
    setCommandListIndex(0);
  } else {
    setShowCommandList(false);
  }
}, []);
```

**检查点**:
- ✅ `value.startsWith('/')` 是否为 `true`
- ✅ `setShowCommandList(true)` 是否被调用

---

### 3. 检查 `matchedCommands` 是否正确计算

**代码位置**: `src/cli-v2-ink/components/Session.tsx`

```typescript
const matchedCommands = useMemo(() => {
  if (!input.startsWith('/')) {
    return [];  // ← 如果输入不是以 / 开头，返回空数组
  }
  return matchCommands(input);  // ← 否则匹配命令
}, [input]);
```

**检查点**:
- ✅ `input` 是否以 `/` 开头
- ✅ `matchCommands('/')` 是否返回非空数组

---

### 4. 检查 `CommandList` 组件是否渲染

**代码位置**: `src/cli-v2-ink/components/Session.tsx`

```typescript
{showCommandList && matchedCommands.length > 0 && (
  <Box flexDirection="column" paddingX={2} marginBottom={1}>
    <Box marginBottom={1}>
      <Text color="cyan" bold>Commands:</Text>
      <Text color="gray"> (↑↓ navigate, Enter execute, Esc cancel)</Text>
    </Box>
    <CommandList
      keyword={input}
      selectedIndex={commandListIndex}
      onSelect={executeCommand}
    />
  </Box>
)}
```

**检查点**:
- ✅ `showCommandList` 是否为 `true`
- ✅ `matchedCommands.length > 0` 是否为 `true`
- ✅ `CommandList` 组件是否正确渲染

---

## 可能的问题

### 问题 1: `disabled` 属性为 `true`

**检查代码**:
```typescript
<CustomInput
  disabled={isProcessing || showModelSelector || showCommandList}
  ...
/>
```

**解决方案**: 确保 `isProcessing`、`showModelSelector` 和 `showCommandList` 都为 `false`

---

### 问题 2: `matchCommands` 函数返回空数组

**测试代码**:
```typescript
import { matchCommands } from './src/cli-v2-ink/utils/commands';

console.log('"/" matches:', matchCommands('/').length);  // 应该返回 6
console.log('"/m" matches:', matchCommands('/m').length);  // 应该返回 1
console.log('"/model" matches:', matchCommands('/model').length);  // 应该返回 1
```

---

### 问题 3: Ink 的 `useInput` hook 没有正确触发

**可能原因**:
- Ink 的版本问题
- 多个 `useInput` hook 冲突
- Terminal 配置问题

**解决方案**:
1. 确保 Ink 版本正确
2. 检查是否有多个 `useInput` hook 冲突
3. 尝试在不同 terminal 中运行

---

## 调试日志

添加以下调试日志来追踪问题：

### CustomInput.tsx
```typescript
useInput((input, key) => {
  console.log('[CustomInput] Input:', input, 'Key:', key);
  console.log('[CustomInput] Disabled:', disabled);
  console.log('[CustomInput] Value:', value);
  
  if (!isMounted.current || disabled) return;

  if (key.return && onSubmit) {
    onSubmit();
  } else if (key.backspace || key.delete) {
    onChange(value.slice(0, -1));
  } else if (key.escape) {
    onChange('');
    if (onEscape) {
      onEscape();
    }
    if (onCommand) {
      onCommand('');
    }
  } else if (key.ctrl && input === 'c' && onExit) {
    onExit();
  } else if (input && !key.ctrl && !key.meta) {
    const newValue = value + input;
    console.log('[CustomInput] New value:', newValue);
    onChange(newValue);

    // Check for commands
    if (onCommand) {
      const match = newValue.match(COMMAND_PATTERN);
      if (match) {
        console.log('[CustomInput] Command matched:', match[1]);
        onCommand(match[1]);
      } else if (newValue.length === 0) {
        onCommand('');
      }
    }
  }
});
```

### Session.tsx
```typescript
const handleInputChange = useCallback((value: string) => {
  console.log('[Session] Input changed:', value);
  console.log('[Session] Starts with /:', value.startsWith('/'));
  setInput(value);

  // Show command list when input starts with '/'
  if (value.startsWith('/')) {
    console.log('[Session] Showing command list');
    setShowCommandList(true);
    setCommandListIndex(0);
  } else {
    console.log('[Session] Hiding command list');
    setShowCommandList(false);
  }
}, []);

const matchedCommands = useMemo(() => {
  console.log('[Session] Matching commands for:', `"${input}"`);
  if (!input.startsWith('/')) {
    console.log('[Session] Not starting with /, returning []');
    return [];
  }
  const result = matchCommands(input);
  console.log('[Session] Matched commands:', result.length);
  return result;
}, [input]);
```

---

## 测试步骤

### 步骤 1: 测试输入是否被接收

```bash
# 运行 CLI
pnpm dev:cli-v2-ink

# 测试输入普通字符
> test
# 应该看到调试日志显示 input 被接收
```

### 步骤 2: 测试 `/` 是否被识别

```bash
# 测试输入 /
> /
# 应该看到:
# - [CustomInput] New value: /
# - [Session] Input changed: /
# - [Session] Starts with /: true
# - [Session] Showing command list
# - [Session] Matching commands for: "/"
# - [Session] Matched commands: 6
```

### 步骤 3: 测试命令列表是否显示

如果步骤 2 的日志都正常，但命令列表仍然不显示，可能是渲染问题。

---

## 常见问题

### Q: 为什么输入 `/` 后没有日志输出？

**A**: 可能是 `disabled` 为 `true`，或者 Ink 的 `useInput` 没有正确触发。检查 `isProcessing` 和 `showModelSelector` 的值。

---

### Q: 为什么 `matchedCommands` 为空数组？

**A**: 检查 `input` 是否以 `/` 开头，以及 `matchCommands` 函数是否正确实现。

---

### Q: 为什么 `CommandList` 组件没有渲染？

**A**: 检查 `showCommandList` 和 `matchedCommands.length` 的值。

---

## 解决方案

### 方案 1: 简化测试

创建一个简单的测试组件来验证 `useInput` 是否工作：

```typescript
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

function TestInput() {
  const [input, setInput] = useState('');

  useInput((char, key) => {
    if (key.backspace) {
      setInput(prev => prev.slice(0, -1));
    } else if (char) {
      setInput(prev => prev + char);
    }
  });

  return (
    <Box>
      <Text>Input: {input}</Text>
    </Box>
  );
}

export default TestInput;
```

---

### 方案 2: 使用原生 readline

如果 Ink 的 `useInput` 有问题，可以考虑使用 Node.js 的原生 `readline` 模块。

---

## 下一步

请提供以下信息以便进一步排查：

1. 运行 CLI 后的完整日志输出
2. 输入 `/` 后的日志输出
3. `isProcessing` 和 `showModelSelector` 的值
4. `matchedCommands` 的值

---

**文档版本**: 1.0.0
**更新时间**: 2026-01-28
