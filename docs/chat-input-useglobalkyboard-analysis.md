# ChatInput 是否需要 useGlobalKeyboard？

## 结论

**是的，推荐使用 `useGlobalKeyboard`**，但需要注意一些细节。

---

## 对比分析

### 当前实现（不推荐）

```tsx
export const ChatInput = () => {
  // ❌ 使用 ref 手动同步状态
  const isCommandRef = useRef(false);

  useEffect(() => {
    isCommandRef.current = showCommandSelector;
  }, [showCommandSelector]);

  // ❌ 直接使用 useInput，创建新监听器
  useInput((inputChar, key) => {
    if ((inputChar === 'c' && key.ctrl) || inputChar === 'q') {
      exit();
    }

    if (key.escape) {
      if (isCommandRef.current) {
        return;  // 让 ScrollableSelect 处理
      }
    }
  });

  return <Input {...} />;
};
```

**问题**:
1. ❌ 多个 `useInput` 可能冲突
2. ❌ 手动 ref 同步状态
3. ❌ 没有优先级控制
4. ❌ Esc 键处理逻辑复杂

### 推荐实现（使用 useGlobalKeyboard）

```tsx
export const ChatInput = () => {
  // ✅ 使用键盘管理器的模式
  const { mode, setMode } = useKeyboard();

  // ✅ 全局快捷键（只需要一次）
  useGlobalShortcuts(() => process.exit(0));

  // ✅ 不需要额外的键盘处理！
  // Input 组件本身处理输入
  // CommandSelector 内部使用 useGlobalKeyboard 处理导航

  return (
    <>
      <Input
        value={input}
        onChange={(value) => {
          setInput(value);
          // 根据输入切换模式
          if (checkCommand(value)) {
            setMode('commandSelect');
          } else {
            setMode('typing');
          }
        }}
        onSubmit={(value) => {
          if (checkCommand(value)) {
            setMode('commandSelect');
          } else {
            sendMessage(value);
          }
        }}
      />

      {mode === 'commandSelect' && (
        <CommandSelector
          commands={commandList}
          onSelect={handleSelect}
          onCancel={() => setMode('typing')}
        />
      )}
    </>
  );
};
```

---

## 关键点

### 1. Input 组件本身处理输入

```tsx
// ✅ Input 组件已经处理了键盘输入
<Input
  value={input}
  onChange={handleChange}
  onSubmit={handleSubmit}
/>

// ❌ 不需要额外的 useInput 来处理字符输入
```

### 2. 只需要处理模式切换

```tsx
// ✅ 只需要根据输入状态切换模式
const handleChange = (value: string) => {
  setInput(value);

  if (checkCommand(value)) {
    setMode('commandSelect');  // 切换到命令选择模式
  } else {
    setMode('typing');  // 切换到输入模式
  }
};
```

### 3. 全局快捷键只需注册一次

```tsx
// ✅ 在应用根部注册一次全局快捷键
const App = () => {
  return (
    <KeyboardManager onExit={() => process.exit(0)}>
      <GlobalShortcuts />  {/* ← 只需要在这里 */}
      <ChatInput />
    </KeyboardManager>
  );
};

const GlobalShortcuts = () => {
  useGlobalShortcuts(() => process.exit(0));
  return null;
};
```

### 4. CommandSelector 内部已处理键盘

```tsx
// ✅ CommandSelector 内部已经使用了 useGlobalKeyboard
// 不需要在 ChatInput 中重复处理

<CommandSelector
  commands={commandList}
  onSelect={handleSelect}
  onCancel={() => setMode('typing')}
/>
```

---

## 完整示例：最佳实践

```tsx
import { useState } from 'react';
import { Box, Text } from 'ink';
import Input from 'ink-text-input';
import {
  KeyboardManager,
  useKeyboard,
  useGlobalShortcuts,
  type AppMode
} from '../../context';
import { CommandSelector } from '../scrollable-select';

// ============== 应用根部 ==============

const App = () => {
  const [mode, setMode] = useState<AppMode>('typing');

  return (
    <KeyboardManager onExit={() => process.exit(0)}>
      <GlobalShortcuts />
      <ChatInput mode={mode} setMode={setMode} />
    </KeyboardManager>
  );
};

// ============== 全局快捷键 ==============

const GlobalShortcuts = () => {
  useGlobalShortcuts(() => process.exit(0));
  return null;
};

// ============== ChatInput 组件 ==============

interface ChatInputProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ mode, setMode }) => {
  const [input, setInput] = useState('');

  const commandList = [
    { label: '/help', value: 'help' },
    { label: '/clear', value: 'clear' },
    { label: '/exit', value: 'exit' },
  ];

  const checkCommand = (v: string) =>
    v.startsWith('/') && commandList.some(cmd => cmd.label.includes(v));

  const handleSelectCommand = (item: any) => {
    setInput(item.label);
    setMode('typing');
  };

  const handleCancelCommand = () => {
    setMode('typing');
  };

  const handleSubmit = (value: string) => {
    if (checkCommand(value)) {
      setMode('commandSelect');
      return;
    }

    // 发送消息
    console.log('发送:', value);
    setInput('');
  };

  const handleChange = (value: string) => {
    setInput(value);

    // 根据输入内容切换模式
    if (checkCommand(value)) {
      setMode('commandSelect');
    } else {
      setMode('typing');
    }
  };

  return (
    <Box flexDirection="column" width="100%">
      {/* 输入框 - 始终显示 */}
      <Box borderColor="gray" borderStyle="single">
        <Text>{'> '}</Text>
        <Input
          value={input}
          onChange={handleChange}
          onSubmit={handleSubmit}
          placeholder="Enter /command or message..."
        />
      </Box>

      {/* 命令选择器 - 只在 commandSelect 模式显示 */}
      {mode === 'commandSelect' && (
        <Box marginTop={1}>
          <CommandSelector
            commands={commandList}
            searchQuery={input}
            onSelect={handleSelectCommand}
            onCancel={handleCancelCommand}
          />
        </Box>
      )}

      {/* 状态指示 */}
      <Box marginTop={1}>
        <Text dimColor>
          Mode: <Text color={mode === 'commandSelect' ? 'yellow' : 'white'}>
            {mode}
          </Text>
        </Text>
      </Box>
    </Box>
  );
};
```

---

## 总结

### 是否需要 useGlobalKeyboard？

**简短回答**: **不需要直接在 ChatInput 中使用**，但需要在以下地方使用：

1. ✅ **应用根部** - 使用 `KeyboardManager` 包裹
2. ✅ **全局快捷键** - 使用 `useGlobalShortcuts`（只需一次）
3. ✅ **子组件内部** - `CommandSelector` 等已经使用

### ChatInput 应该做什么？

ChatInput 应该：
1. ✅ 使用 `useKeyboard` 获取模式状态
2. ✅ 使用 `setMode` 切换模式
3. ✅ 根据输入内容判断是否显示选择器
4. ❌ 不使用 `useInput` 或 `useGlobalKeyboard`

### 键盘处理在哪里？

- **输入处理**: `Input` 组件本身
- **导航处理**: `CommandSelector` 内部
- **全局快捷键**: `GlobalShortcuts` 组件
- **模式切换**: `onChange` 和 `onSubmit` 回调

---

## 迁移步骤

### 步骤 1: 添加 KeyboardManager

```tsx
// src/cli/index.tsx
import { KeyboardManager } from './context';

render(
  <KeyboardManager onExit={() => process.exit(0)}>
    <ChatApp mode={mode} setMode={setMode} />
  </KeyboardManager>
);
```

### 步骤 2: 添加全局快捷键

```tsx
// src/cli/components/global-shortcuts.tsx
import { useGlobalShortcuts } from '../context';

export const GlobalShortcuts = () => {
  useGlobalShortcuts(() => process.exit(0));
  return null;
};
```

### 步骤 3: 更新 ChatInput

```tsx
// src/cli/components/chat-input/index.tsx
import { useKeyboard, type AppMode } from '../../context';

export const ChatInput: React.FC<{
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}> = ({ mode, setMode }) => {
  // 不需要 useInput 或 useGlobalKeyboard！
  // 只需要根据输入切换模式

  const handleChange = (value: string) => {
    setInput(value);
    if (checkCommand(value)) {
      setMode('commandSelect');
    } else {
      setMode('typing');
    }
  };

  return (
    <>
      <Input onChange={handleChange} />
      {mode === 'commandSelect' && <CommandSelector />}
    </>
  );
};
```

---

## 关键要点

1. **Input 组件** - 已处理输入，不需要额外键盘处理
2. **模式切换** - 通过 `onChange` 回调，不需要 `useInput`
3. **全局快捷键** - 在应用根部注册一次即可
4. **选择器导航** - `CommandSelector` 内部已处理
5. **Esc 冲突** - 通过模式系统自动避免，不需要手动 ref

所以：**ChatInput 不需要使用 `useGlobalKeyboard`**，只需要使用 `useKeyboard` 访问模式和切换模式！
