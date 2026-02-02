# 键盘管理器完整使用指南

## 目录

1. [核心概念](#1-核心概念)
2. [架构设计](#2-架构设计)
3. [API 参考](#3-api-参考)
4. [快速开始](#4-快速开始)
5. [完整示例](#5-完整示例)
6. [高级用法](#6-高级用法)
7. [最佳实践](#7-最佳实践)
8. [故障排除](#8-故障排除)

---

## 1. 核心概念

### 1.1 什么是键盘管理器？

键盘管理器是一个**集中式键盘事件处理系统**，解决多个组件使用 `useInput` 时的冲突问题。

### 1.2 核心思想

```
传统方式（有问题）:
┌─────────────┐
│   Parent    │ useInput → 处理 Esc
│  useInput   │
└──────┬──────┘
       │
┌──────▼──────┐
│   Child     │ useInput → 也处理 Esc！❌
│  useInput   │ 冲突！
└─────────────┘

键盘管理器方式:
┌─────────────────────────────────┐
│    KeyboardManager              │
│    (单一全局 useInput)          │
│                                │
│  事件 → 优先级排序 → 逐个调用   │
│         ↓                      │
│    返回 true?                  │
│         ↓                      │
│      停止传播 ✅                │
└─────────────────────────────────┘
       │
       ├─→ Parent Handler (优先级 30)
       ├─→ Child Handler  (优先级 20)
       └─→ Global Handler (优先级 0)
```

### 1.3 关键概念

| 概念 | 说明 | 示例 |
|------|------|------|
| **AppMode** | 应用状态模式 | `'typing'`, `'commandSelect'`, `'confirmExit'` |
| **Handler** | 键盘事件处理函数 | `({ input, key }) => boolean` |
| **Priority** | 处理器优先级 | `0-100`，数字越小优先级越高 |
| **activeModes** | 处理器激活的模式 | `['typing', 'commandSelect']` |
| **Event** | 键盘事件对象 | `{ input: 'a', key: { ctrl: false, ... } }` |

---

## 2. 架构设计

### 2.1 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                     Application                         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              KeyboardManager Provider                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │         单一全局 useInput 监听                    │  │
│  │  - 接收所有键盘事件                               │  │
│  │  - 按优先级排序处理器                             │  │
│  │  - 逐个调用处理器                                 │  │
│  │  - 返回 true 时停止传播                          │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  handlersRef: Map<string, RegisteredHandler>            │
│    ├─ 'global-exit'      (priority: 0)                 │
│    ├─ 'exit-confirm'     (priority: 10)                │
│    ├─ 'command-selector' (priority: 20)                │
│    ├─ 'navigation'       (priority: 30)                │
│    └─ 'chat-input'       (priority: 40)                │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Context
                     │
┌────────────────────▼────────────────────────────────────┐
│                   子组件层级                             │
│                                                          │
│  ┌─────────────────────────────────────────────┐       │
│  │  ChatInput                                  │       │
│  │  - useGlobalKeyboard({ priority: 40 })      │       │
│  │  - activeModes: ['typing']                  │       │
│  └─────────────────────────────────────────────┘       │
│                                                         │
│  ┌─────────────────────────────────────────────┐       │
│  │  CommandSelector                            │       │
│  │  - useGlobalKeyboard({ priority: 20 })      │       │
│  │  - activeModes: ['commandSelect']           │       │
│  └─────────────────────────────────────────────┘       │
│                                                         │
│  ┌─────────────────────────────────────────────┐       │
│  │  ExitConfirmDialog                          │       │
│  │  - useGlobalKeyboard({ priority: 10 })      │       │
│  │  - activeModes: ['confirmExit']             │       │
│  └─────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

### 2.2 事件处理流程

```
用户按键 "q"
    ↓
KeyboardManager.useInput 接收事件
    ↓
构建 KeyboardEvent: { input: 'q', key: { ... } }
    ↓
获取当前模式: mode = 'typing'
    ↓
筛选激活的处理器:
  - 'global-exit'      ✅ (activeModes 包含 'typing')
  - 'exit-confirm'     ❌ (activeModes 不包含 'typing')
  - 'command-selector' ❌ (activeModes 不包含 'typing')
  - 'navigation'       ✅ (activeModes 包含 'typing')
  - 'chat-input'       ✅ (activeModes 包含 'typing')
    ↓
按优先级排序:
  1. 'global-exit'      (priority: 0)
  2. 'navigation'       (priority: 30)
  3. 'chat-input'       (priority: 40)
    ↓
依次调用:
  1. global-exit handler
     → 检测到 'q'
     → 执行 exit()
     → 返回 true
     → 停止传播 ✅
```

---

## 3. API 参考

### 3.1 KeyboardManager Provider

应用的根组件，提供键盘管理功能。

```tsx
import { KeyboardManager } from './context/keyboard';

<KeyboardManager onExit={handleExit}>
  <App />
</KeyboardManager>
```

**Props:**

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `children` | `ReactNode` | ✅ | 子组件 |
| `onExit` | `() => void` | ❌ | 退出回调 |

### 3.2 useKeyboard Hook

访问键盘管理器的上下文。

```tsx
const { mode, setMode, registerHandler, isHandlerActive } = useKeyboard();
```

**返回值:**

| 属性 | 类型 | 说明 |
|------|------|------|
| `mode` | `AppMode` | 当前应用模式 |
| `setMode` | `(mode: AppMode) => void` | 设置模式 |
| `registerHandler` | `Function` | 注册处理器 |
| `isHandlerActive` | `(id: string) => boolean` | 检查处理器是否激活 |

### 3.3 useGlobalKeyboard Hook

注册全局键盘处理器。

```tsx
useGlobalKeyboard({
  id: 'my-handler',
  priority: HandlerPriority.MODAL,
  activeModes: ['typing', 'commandSelect'],
  handler: ({ input, key }) => {
    // 处理逻辑
    return true;  // 返回 true 停止传播
  }
});
```

**参数:**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `id` | `string` | ✅ | 唯一标识符 |
| `priority` | `HandlerPriority` | ✅ | 优先级级别 |
| `activeModes` | `AppMode[]` | ✅ | 激活的模式列表 |
| `handler` | `KeyboardHandler` | ✅ | 处理函数 |

### 3.4 HandlerPriority 枚举

预定义的优先级级别。

```tsx
enum HandlerPriority {
  GLOBAL = 0,        // 全局快捷键（Ctrl+C, Q）
  CRITICAL = 10,      // 关键操作（退出确认）
  MODAL = 20,        // 模态框（选择器、对话框）
  NAVIGATION = 30,   // 导航（菜单、列表）
  INPUT = 40,        // 普通输入
}
```

### 3.5 KeyboardEvent 类型

键盘事件对象。

```tsx
interface KeyboardEvent {
  input: string;           // 按下的字符
  key: {
    upArrow: boolean;      // ↑
    downArrow: boolean;    // ↓
    leftArrow: boolean;    // ←
    rightArrow: boolean;   // →
    return: boolean;       // Enter
    escape: boolean;       // Esc
    ctrl: boolean;         // Ctrl
    shift: boolean;        // Shift
    tab: boolean;          // Tab
    backspace: boolean;    // Backspace
    delete: boolean;       // Delete
    pageUp: boolean;       // Page Up
    pageDown: boolean;     // Page Down
    home: boolean;         // Home
    end: boolean;          // End
    meta: boolean;         // Meta/Win/Command
  };
}
```

### 3.6 KeyboardHandler 类型

处理函数类型。

```tsx
type KeyboardHandler = (event: KeyboardEvent) => boolean | void;

// 返回值说明:
// - true  : 事件已处理，停止传播
// - false : 事件未处理，继续传播
// - void  : 等同于 false，继续传播
```

### 3.7 isKeyMatch 工具函数

检查键盘事件是否匹配特定模式。

```tsx
import { isKeyMatch } from './context/keyboard';

// 检查 Ctrl+C
if (isKeyMatch(key, { input: 'c', ctrl: true })) {
  // 处理 Ctrl+C
}

// 检查 Esc
if (isKeyMatch(key, { escape: true })) {
  // 处理 Esc
}

// 检查 Shift+Enter
if (isKeyMatch(key, { return: true, shift: true })) {
  // 处理 Shift+Enter
}
```

---

## 4. 快速开始

### 4.1 最小示例

```tsx
import React, { useState } from 'react';
import { render, Box, Text } from 'ink';
import { KeyboardManager, useKeyboard, useGlobalKeyboard, HandlerPriority } from './context/keyboard';

// 1. 定义应用模式
type AppMode = 'idle' | 'typing' | 'selecting';

// 2. 创建应用组件
const App = () => {
  const [mode, setMode] = useState<AppMode>('idle');

  return (
    <KeyboardManager onExit={() => process.exit(0)}>
      <Box flexDirection="column">
        <Text>当前模式: {mode}</Text>
        <MyComponent />
      </Box>
    </KeyboardManager>
  );
};

// 3. 在子组件中使用
const MyComponent = () => {
  const { mode, setMode } = useKeyboard();

  useGlobalKeyboard({
    id: 'my-handler',
    priority: HandlerPriority.INPUT,
    activeModes: ['idle', 'typing'],
    handler: ({ input, key }) => {
      if (input === 's') {
        console.log('按下了 S 键');
        return true;
      }
      if (key.escape) {
        setMode('idle');
        return true;
      }
    }
  });

  return <Text>按 S 测试，按 Esc 返回</Text>;
};

render(<App />);
```

### 4.2 添加全局快捷键

```tsx
const App = () => {
  return (
    <KeyboardManager onExit={() => process.exit(0)}>
      <Content />
    </KeyboardManager>
  );
};

const GlobalShortcuts = () => {
  useGlobalKeyboard({
    id: 'global-exit',
    priority: HandlerPriority.GLOBAL,  // 最高优先级
    activeModes: ['idle', 'typing', 'selecting'],  // 所有模式
    handler: ({ input, key }) => {
      // Ctrl+C 或 Q 退出
      if ((input === 'c' && key.ctrl) || input === 'q') {
        console.log('退出程序...');
        process.exit(0);
        return true;
      }
    }
  });

  return null;  // 不渲染任何内容
};

const Content = () => {
  return (
    <>
      <GlobalShortcuts />
      <OtherComponents />
    </>
  );
};
```

---

## 5. 完整示例

### 5.1 聊天应用完整实现

```tsx
import React, { useState } from 'react';
import { render, Box, Text } from 'ink';
import {
  KeyboardManager,
  useKeyboard,
  useGlobalKeyboard,
  HandlerPriority,
  type AppMode
} from './context/keyboard';

// ============== 应用组件 ==============

const ChatApp = () => {
  const [mode, setMode] = useState<AppMode>('typing');
  const [messages, setMessages] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');

  const handleExit = () => {
    setMode('confirmExit');
  };

  return (
    <KeyboardManager onExit={handleExit}>
      <Box flexDirection="column" padding={1}>
        {/* 消息历史 */}
        <Box flexGrow={1} flexDirection="column">
          {messages.map((msg, i) => (
            <Text key={i}>{msg}</Text>
          ))}
        </Box>

        {/* 根据模式渲染不同内容 */}
        {mode === 'typing' && (
          <TypingInterface
            input={currentInput}
            onChange={setCurrentInput}
            onSend={(msg) => {
              setMessages(prev => [...prev, `我: ${msg}`]);
              setCurrentInput('');
            }}
            onCommandSelect={() => setMode('commandSelect')}
          />
        )}

        {mode === 'commandSelect' && (
          <CommandSelector
            onSelect={(cmd) => {
              setMessages(prev => [...prev, `执行命令: ${cmd}`]);
              setMode('typing');
            }}
            onCancel={() => setMode('typing')}
          />
        )}

        {mode === 'confirmExit' && (
          <ExitConfirmDialog
            onConfirm={() => process.exit(0)}
            onCancel={() => setMode('typing')}
          />
        )}

        {/* 状态栏 */}
        <StatusBar mode={mode} />
      </Box>
    </KeyboardManager>
  );
};

// ============== 输入界面 ==============

const TypingInterface = ({
  input,
  onChange,
  onSend,
  onCommandSelect
}: {
  input: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
  onCommandSelect: () => void;
}) => {
  const { mode } = useKeyboard();

  // 只在 typing 模式激活
  useGlobalKeyboard({
    id: 'typing-input',
    priority: HandlerPriority.INPUT,
    activeModes: ['typing'],
    handler: ({ inputChar, key }) => {
      // Enter 发送
      if (key.return) {
        if (input.trim()) {
          if (input.startsWith('/')) {
            onCommandSelect();
          } else {
            onSend(input);
          }
        }
        return true;
      }

      // 普通字符输入
      if (inputChar && !key.ctrl && !key.meta && inputChar.length === 1) {
        onChange(input + inputChar);
        return true;
      }

      // 退格
      if (key.backspace) {
        onChange(input.slice(0, -1));
        return true;
      }

      return false;
    }
  });

  if (mode !== 'typing') return null;

  return (
    <Box>
      <Text color="cyan">{'> '}</Text>
      <Text>{input}</Text>
      <Text dimColor>█</Text>
    </Box>
  );
};

// ============== 命令选择器 ==============

const CommandSelector = ({
  onSelect,
  onCancel
}: {
  onSelect: (command: string) => void;
  onCancel: () => void;
}) => {
  const { mode } = useKeyboard();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands = [
    { label: '/help - 帮助', value: 'help' },
    { label: '/clear - 清屏', value: 'clear' },
    { label: '/exit - 退出', value: 'exit' },
    { label: '/settings - 设置', value: 'settings' },
  ];

  // 只在 commandSelect 模式激活，优先级高于 INPUT
  useGlobalKeyboard({
    id: 'command-selector',
    priority: HandlerPriority.MODAL,
    activeModes: ['commandSelect'],
    handler: ({ key }) => {
      if (key.escape) {
        onCancel();
        return true;
      }

      if (key.upArrow) {
        setSelectedIndex(i => Math.max(0, i - 1));
        return true;
      }

      if (key.downArrow) {
        setSelectedIndex(i => Math.min(commands.length - 1, i + 1));
        return true;
      }

      if (key.return) {
        onSelect(commands[selectedIndex].value);
        return true;
      }

      return false;
    }
  });

  if (mode !== 'commandSelect') return null;

  return (
    <Box flexDirection="column" borderStyle="round" padding={1}>
      <Text bold color="yellow">选择命令:</Text>
      {commands.map((cmd, i) => (
        <Text
          key={cmd.value}
          color={i === selectedIndex ? 'cyan' : 'white'}
        >
          {i === selectedIndex ? '→ ' : '  '}
          {cmd.label}
        </Text>
      ))}
      <Text dimColor marginTop={1}>
        ↑↓ 选择 | Enter 确认 | Esc 取消
      </Text>
    </Box>
  );
};

// ============== 退出确认对话框 ==============

const ExitConfirmDialog = ({
  onConfirm,
  onCancel
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const { mode } = useKeyboard();

  // 优先级高于 MODAL
  useGlobalKeyboard({
    id: 'exit-confirm',
    priority: HandlerPriority.CRITICAL,
    activeModes: ['confirmExit'],
    handler: ({ input, key }) => {
      if (input.toLowerCase() === 'y') {
        onConfirm();
        return true;
      }

      if (input.toLowerCase() === 'n' || key.escape) {
        onCancel();
        return true;
      }

      return false;
    }
  });

  if (mode !== 'confirmExit') return null;

  return (
    <Box borderStyle="double" padding={1}>
      <Text bold color="red">确定要退出吗？</Text>
      <Box marginTop={1}>
        <Text color="green">[Y]</Text>
        <Text>es </Text>
        <Text color="red">[N]</Text>
        <Text>o</Text>
      </Box>
    </Box>
  );
};

// ============== 状态栏 ==============

const StatusBar = ({ mode }: { mode: AppMode }) => {
  const modeLabels: Record<AppMode, string> = {
    typing: '输入',
    commandSelect: '选择命令',
    confirmExit: '确认退出'
  };

  return (
    <Box borderStyle="single" paddingX={1} marginTop={1}>
      <Text>模式: {modeLabels[mode]}</Text>
      <Text dimColor> | Ctrl+C: 退出</Text>
    </Box>
  );
};

render(<ChatApp />);
```

---

## 6. 高级用法

### 6.1 动态优先级调整

```tsx
const DynamicPriority = () => {
  const { mode, setMode } = useKeyboard();
  const [isUrgent, setIsUrgent] = useState(false);

  useGlobalKeyboard({
    id: 'dynamic-handler',
    priority: isUrgent ? HandlerPriority.CRITICAL : HandlerPriority.INPUT,
    activeModes: ['typing'],
    handler: ({ input }) => {
      if (input === '!') {
        setIsUrgent(true);  // 提升优先级
        return true;
      }
    }
  });

  // 紧急模式下按任意键恢复
  useGlobalKeyboard({
    id: 'urgent-handler',
    priority: HandlerPriority.CRITICAL,
    activeModes: isUrgent ? ['typing'] : [],
    handler: () => {
      setIsUrgent(false);
      return true;
    }
  });

  return <Text>{isUrgent ? '紧急模式！' : '正常模式'}</Text>;
};
```

### 6.2 组合键处理

```tsx
const ComboKeys = () => {
  useGlobalKeyboard({
    id: 'combo-keys',
    priority: HandlerPriority.GLOBAL,
    activeModes: ['typing'],
    handler: ({ input, key }) => {
      // Ctrl+S 保存
      if (isKeyMatch(key, { input: 's', ctrl: true })) {
        saveFile();
        return true;
      }

      // Shift+Enter 发送（而不是单个 Enter）
      if (isKeyMatch(key, { return: true, shift: true })) {
        sendMessage();
        return true;
      }

      // Ctrl+Shift+N 新建
      if (input === 'n' && key.ctrl && key.shift) {
        newFile();
        return true;
      }

      return false;
    }
  });

  return <Text>支持组合键</Text>;
};
```

### 6.3 键盘序列检测

```tsx
const KeySequence = () => {
  const sequenceRef = useRef<string[]>([]);
  const TIMEOUT = 1000;  // 1秒内完成序列

  useGlobalKeyboard({
    id: 'key-sequence',
    priority: HandlerPriority.GLOBAL,
    activeModes: ['typing'],
    handler: ({ input }) => {
      // 添加到序列
      sequenceRef.current.push(input);

      // 检测 "上上下下左右左右BA" (Konami 代码)
      const sequence = sequenceRef.current.join('');
      if (sequence.includes('↑↑↓↓←→←→BA')) {
        activateCheats();
        sequenceRef.current = [];
        return true;
      }

      // 超时重置
      setTimeout(() => {
        sequenceRef.current = [];
      }, TIMEOUT);

      return false;
    }
  });

  return <Text>输入 Konami 代码解锁彩蛋</Text>;
};
```

### 6.4 可撤销的操作

```tsx
const UndoRedo = () => {
  const [history, setHistory] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  useGlobalKeyboard({
    id: 'undo-redo',
    priority: HandlerPriority.GLOBAL,
    activeModes: ['typing'],
    handler: ({ key, input }) => {
      // Ctrl+Z 撤销
      if (isKeyMatch(key, { input: 'z', ctrl: true })) {
        if (currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
          restoreState(history[currentIndex - 1]);
        }
        return true;
      }

      // Ctrl+Y 或 Ctrl+Shift+Z 重做
      if (isKeyMatch(key, { input: 'y', ctrl: true }) ||
          (input === 'z' && key.ctrl && key.shift)) {
        if (currentIndex < history.length - 1) {
          setCurrentIndex(currentIndex + 1);
          restoreState(history[currentIndex + 1]);
        }
        return true;
      }

      return false;
    }
  });

  return <Text>Ctrl+Z 撤销 | Ctrl+Y 重做</Text>;
};
```

---

## 7. 最佳实践

### 7.1 模式设计原则

```tsx
// ✅ 好: 互斥的模式
type AppMode = 'idle' | 'typing' | 'selecting' | 'confirming';

// ❌ 不好: 可能同时为真的多个状态
const [isTyping, setIsTyping] = useState(false);
const [isSelecting, setIsSelecting] = useState(false);
const [isConfirming, setIsConfirming] = useState(false);
```

### 7.2 处理器命名规范

```tsx
// ✅ 好: 描述性的 ID
useGlobalKeyboard({
  id: 'chat-input-handler',
  // ...
});

useGlobalKeyboard({
  id: 'command-selector-navigation',
  // ...
});

// ❌ 不好: 不清晰的 ID
useGlobalKeyboard({
  id: 'handler1',
  // ...
});
```

### 7.3 返回值使用

```tsx
// ✅ 好: 明确返回
handler: ({ key }) => {
  if (key.escape) {
    closeModal();
    return true;  // 明确表示已处理
  }
  return false;  // 明确表示未处理
}

// ⚠️ 可接受: 使用 void 表示未处理
handler: ({ key }) => {
  if (key.escape) {
    closeModal();
    return true;
  }
  // 不返回任何值 = void = false
}

// ❌ 不好: 总是返回 true
handler: ({ key }) => {
  if (key.escape) {
    closeModal();
  }
  return true;  // 阻止所有其他处理器！
}
```

### 7.4 优先级分配

```tsx
// 全局快捷键 - 最低数字，最高优先级
useGlobalKeyboard({
  id: 'global-exit',
  priority: HandlerPriority.GLOBAL,  // 0
  // ...
});

// 关键对话框
useGlobalKeyboard({
  id: 'exit-confirm',
  priority: HandlerPriority.CRITICAL,  // 10
  // ...
});

// 模态框/选择器
useGlobalKeyboard({
  id: 'selector',
  priority: HandlerPriority.MODAL,  // 20
  // ...
});

// 普通导航
useGlobalKeyboard({
  id: 'navigation',
  priority: HandlerPriority.NAVIGATION,  // 30
  // ...
});

// 普通输入
useGlobalKeyboard({
  id: 'typing',
  priority: HandlerPriority.INPUT,  // 40
  // ...
});
```

### 7.5 activeModes 设计

```tsx
// ✅ 好: 明确指定激活的模式
useGlobalKeyboard({
  id: 'typing-handler',
  activeModes: ['typing'],  // 只在 typing 模式激活
  // ...
});

// ✅ 好: 多个模式共享同一个处理器
useGlobalKeyboard({
  id: 'global-shortcuts',
  activeModes: ['typing', 'selecting', 'confirming'],  // 所有模式
  // ...
});

// ❌ 不好: 空数组（永不激活）
activeModes: []

// ❌ 不好: 过于宽泛
activeModes: ['typing', 'selecting', 'confirming', 'idle', 'loading', ...]
```

---

## 8. 故障排除

### 8.1 按键没有反应

**问题**: 注册的处理器不工作

**排查步骤**:

```tsx
// 1. 检查是否在 KeyboardManager 内
const MyComponent = () => {
  // ✅ 确保在 Provider 内
  return <Component />;
};

<KeyboardManager>
  <MyComponent />  {/* ✅ 正确 */}
</KeyboardManager>

<MyComponent />    {/* ❌ 错误：不在 Provider 内 */}

// 2. 检查模式是否匹配
const { mode } = useKeyboard();
console.log('当前模式:', mode);  // 调试输出

useGlobalKeyboard({
  activeModes: ['typing'],  // 确保包含当前 mode
  // ...
});

// 3. 检查处理器是否返回 false
handler: ({ input, key }) => {
  console.log('处理器被调用', { input, key });  // 调试日志

  if (key.escape) {
    // 处理逻辑
    return true;  // 确保返回 true
  }
  return false;  // 确保返回 false
}
```

### 8.2 多个处理器同时触发

**问题**: 按一次键，多个处理器都执行

**原因**: 处理器没有返回 `true` 停止传播

**解决**:

```tsx
// ❌ 错误：没有返回值
handler: ({ key }) => {
  if (key.escape) {
    closeModal();
    // 缺少 return true
  }
}

// ✅ 正确：返回 true
handler: ({ key }) => {
  if (key.escape) {
    closeModal();
    return true;  // 停止传播
  }
  return false;  // 继续传播
}
```

### 8.3 处理器优先级不生效

**问题**: 低优先级的处理器先执行

**原因**: 优先级值设置错误

**解决**:

```tsx
// 记住：数字越小，优先级越高
// ❌ 错误：期望 INPUT 优先于 MODAL
useGlobalKeyboard({
  id: 'input',
  priority: HandlerPriority.INPUT,      // 40 (低优先级)
  // ...
});

useGlobalKeyboard({
  id: 'modal',
  priority: HandlerPriority.MODAL,      // 20 (高优先级)
  // ...
});

// ✅ 正确：调整优先级
useGlobalKeyboard({
  id: 'input',
  priority: HandlerPriority.CRITICAL,   // 10 (高优先级)
  // ...
});

useGlobalKeyboard({
  id: 'modal',
  priority: HandlerPriority.INPUT,      // 40 (低优先级)
  // ...
});
```

### 8.4 Ctrl+C 不生效

**问题**: Ctrl+C 无法退出程序

**原因**: 没有注册全局处理器或优先级不够高

**解决**:

```tsx
// 确保注册了全局退出处理器
useGlobalKeyboard({
  id: 'global-exit',
  priority: HandlerPriority.GLOBAL,  // 最高优先级 0
  activeModes: ['typing', 'selecting', 'confirming'],  // 所有模式
  handler: ({ input, key }) => {
    // 确保 isKeyMatch 正确使用
    if (isKeyMatch(key, { input: 'c', ctrl: true })) {
      console.log('退出程序...');
      process.exit(0);
      return true;
    }
    if (input === 'q') {
      console.log('退出程序...');
      process.exit(0);
      return true;
    }
    return false;
  }
});
```

### 8.5 调试工具

```tsx
// 添加键盘事件日志
const KeyboardDebugger = () => {
  useGlobalKeyboard({
    id: 'keyboard-debugger',
    priority: HandlerPriority.GLOBAL,
    activeModes: ['typing', 'selecting', 'confirming'],
    handler: ({ input, key }) => {
      console.log('=== 键盘事件 ===');
      console.log('input:', input);
      console.log('key:', {
        escape: key.escape,
        return: key.return,
        ctrl: key.ctrl,
        shift: key.shift,
        upArrow: key.upArrow,
        downArrow: key.downArrow,
      });
      return false;  // 不阻止传播
    }
  });

  return null;
};

// 在开发环境使用
<KeyboardManager>
  {process.env.DEBUG && <KeyboardDebugger />}
  <App />
</KeyboardManager>
```

---

## 9. 总结

### 9.1 核心要点

1. **单一入口** - 所有键盘事件由 KeyboardManager 统一管理
2. **优先级系统** - 按优先级依次调用处理器
3. **停止传播** - 返回 `true` 停止事件继续传播
4. **模式驱动** - 使用 AppMode 控制处理器激活

### 9.2 使用流程

```
1. 定义应用模式 (AppMode)
   ↓
2. 在根组件包裹 KeyboardManager
   ↓
3. 在子组件中使用 useGlobalKeyboard
   ↓
4. 设置合适的优先级和 activeModes
   ↓
5. 在处理器中返回 true/false
```

### 9.3 文件结构

```
src/
├── context/
│   └── keyboard.tsx         # 键盘管理器
├── components/
│   ├── chat-input.tsx       # 使用 useGlobalKeyboard
│   ├── command-selector.tsx # 使用 useGlobalKeyboard
│   └── exit-dialog.tsx      # 使用 useGlobalKeyboard
└── app.tsx                  # KeyboardManager Provider
```

### 9.4 相关文档

- **API 参考**: `src/cli/context/keyboard.tsx`
- **演示程序**: `src/cli/examples/keyboard-manager-demo.tsx`
- **问题解决**: `docs/multiple-useinput-handling.md`
- **快速参考**: `docs/keyboard-management-summary.md`

---

**文档版本**: 1.0.0
**最后更新**: 2025-01-30
