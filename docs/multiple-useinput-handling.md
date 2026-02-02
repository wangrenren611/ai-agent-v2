# 多个 useInput 监听的处理方案

## 问题

当多个组件都使用 `useInput` 监听键盘事件时：

```tsx
// 问题场景
const Parent = () => {
  useInput((input, key) => {
    if (key.escape) console.log('Parent: Esc pressed');
  });

  return <Child />;
};

const Child = () => {
  useInput((input, key) => {
    if (key.escape) console.log('Child: Esc pressed');
  });

  return <Text>Child</Text>;
};

// 结果：按 Esc 会打印两次！
// Child: Esc pressed
// Parent: Esc pressed
```

## 问题表现

1. **重复执行**: 同一个按键触发多个处理函数
2. **顺序混乱**: 不确定哪个先执行
3. **状态冲突**: 难以控制谁应该处理
4. **资源浪费**: 多次处理同一事件

## 解决方案

### 方案 1: 使用 `isActive` 选项（推荐）

Ink 的 `useInput` 提供 `isActive` 选项来控制是否激活监听。

```tsx
const Parent = () => {
  const [mode, setMode] = useState('input'); // 'input' | 'selector'

  useInput((input, key) => {
    console.log('Parent: Processing');
  }, { isActive: mode === 'input' });  // 只在 input 模式下激活

  return (
    <Box flexDirection="column">
      <ChildSelector
        visible={mode === 'selector'}
        onClose={() => setMode('input')}
      />
    </Box>
  );
};

const ChildSelector = ({ visible, onClose }) => {
  useInput((input, key) => {
    if (key.escape) {
      onClose();
    }
    console.log('Child: Processing');
  }, { isActive: visible });  // 只在可见时激活

  return <Text>Selector</Text>;
};
```

### 方案 2: 单一全局监听 + 状态机

在一个地方集中处理所有键盘事件，根据状态分发。

```tsx
type AppState = 'normal' | 'commandSelect' | 'confirmExit';

const App = () => {
  const [state, setState] = useState<AppState>('normal');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 单一的全局键盘处理
  useInput((input, key) => {
    switch (state) {
      case 'normal':
        handleNormalInput(input, key);
        break;
      case 'commandSelect':
        handleCommandSelectInput(input, key);
        break;
      case 'confirmExit':
        handleConfirmExitInput(input, key);
        break;
    }
  });

  const handleNormalInput = (input: string, key: any) => {
    if (input.startsWith('/')) {
      setState('commandSelect');
    }
    if (key.return) {
      submitMessage(input);
    }
  };

  const handleCommandSelectInput = (input: string, key: any) => {
    if (key.escape) {
      setState('normal');
    }
    if (key.upArrow) {
      setSelectedIndex(i => Math.max(0, i - 1));
    }
    if (key.downArrow) {
      setSelectedIndex(i => Math.min(commands.length - 1, i + 1));
    }
    if (key.return) {
      selectCommand(commands[selectedIndex]);
      setState('normal');
    }
  };

  const handleConfirmExitInput = (input: string, key: any) => {
    if (input.toLowerCase() === 'y') {
      exit();
    }
    if (key.escape || input.toLowerCase() === 'n') {
      setState('normal');
    }
  };

  return (
    <Box flexDirection="column">
      {state === 'commandSelect' && <CommandSelector selectedIndex={selectedIndex} />}
      {state === 'confirmExit' && <ExitConfirmDialog />}
    </Box>
  );
};
```

### 方案 3: 事件冒泡控制（使用 ref 标记）

```tsx
// 创建一个键盘事件上下文
const KeyboardContext = React.createContext<{
  registerHandler: (id: string, handler: Function) => void;
  unregisterHandler: (id: string) => void;
  isHandled: () => boolean;
  markAsHandled: () => void;
}>(null);

const KeyboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const handlersRef = useRef<Map<string, Function>>(new Map());
  const handledRef = useRef(false);

  // 单一全局监听
  useInput((input, key) => {
    handledRef.current = false;

    // 按注册顺序调用处理器
    for (const [id, handler] of handlersRef.current) {
      handler(input, key);
      if (handledRef.current) {
        break;  // 停止传播
      }
    }
  });

  const registerHandler = (id: string, handler: Function) => {
    handlersRef.current.set(id, handler);
  };

  const unregisterHandler = (id: string) => {
    handlersRef.current.delete(id);
  };

  return (
    <KeyboardContext.Provider value={{
      registerHandler,
      unregisterHandler,
      isHandled: () => handledRef.current,
      markAsHandled: () => { handledRef.current = true; }
    }}>
      {children}
    </KeyboardContext.Provider>
  );
};

// 使用示例
const ChildComponent = () => {
  const { registerHandler, unregisterHandler, markAsHandled } = useContext(KeyboardContext);

  useEffect(() => {
    const handler = (input: string, key: any) => {
      if (key.escape) {
        markAsHandled();  // 标记为已处理，阻止传播
        closeSelector();
      }
    };

    registerHandler('child-selector', handler);
    return () => unregisterHandler('child-selector');
  }, []);

  return <Text>Child</Text>;
};
```

### 方案 4: 优先级队列系统

```tsx
type KeyboardHandler = {
  id: string;
  priority: number;  // 数字越小优先级越高
  active: boolean;
  handler: (input: string, key: any) => boolean;  // 返回 true 表示已处理
};

const KeyboardManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const handlersRef = useRef<KeyboardHandler[]>([]);

  const registerHandler = (config: Omit<KeyboardHandler, 'handler'> & { handler: KeyboardHandler['handler'] }) => {
    handlersRef.current.push(config);
    // 按优先级排序
    handlersRef.current.sort((a, b) => a.priority - b.priority);
  };

  const unregisterHandler = (id: string) => {
    handlersRef.current = handlersRef.current.filter(h => h.id !== id);
  };

  const updateHandlerActive = (id: string, active: boolean) => {
    const handler = handlersRef.current.find(h => h.id === id);
    if (handler) handler.active = active;
  };

  // 单一全局监听
  useInput((input, key) => {
    // 按优先级遍历处理器
    for (const handlerConfig of handlersRef.current) {
      if (!handlerConfig.active) continue;

      const handled = handlerConfig.handler(input, key);
      if (handled) {
        return;  // 已处理，停止传播
      }
    }
  });

  return (
    <KeyboardManagerContext.Provider value={{ registerHandler, unregisterHandler, updateHandlerActive }}>
      {children}
    </KeyboardManagerContext.Provider>
  );
};

// 使用示例
const CommandSelector = () => {
  const { registerHandler, unregisterHandler, updateHandlerActive } = useContext(KeyboardManagerContext);

  useEffect(() => {
    const handlerId = 'command-selector';

    registerHandler({
      id: handlerId,
      priority: 10,  // 高优先级
      active: true,
      handler: (input, key) => {
        if (key.escape) {
          closeSelector();
          return true;  // 已处理
        }
        if (key.upArrow) {
          moveUp();
          return true;
        }
        return false;  // 未处理，继续传播
      }
    });

    return () => unregisterHandler(handlerId);
  }, []);

  return <Text>Selector</Text>;
};
```

## 实际项目推荐方案

**方案 1（isActive）+ 方案 2（状态机）组合**

```tsx
const App = () => {
  // 应用级状态
  const [appMode, setAppMode] = useState<'chat' | 'commandSelect' | 'navigation'>('chat');

  return (
    <KeyboardManager mode={appMode}>
      <ChatInput />
      <CommandSelector visible={appMode === 'commandSelect'} />
      <Navigation visible={appMode === 'navigation'} />
    </KeyboardManager>
  );
};

const KeyboardManager = ({ children, mode }) => {
  // 全局低优先级处理
  useInput((input, key) => {
    // Ctrl+C / Q - 始终退出（最高优先级）
    if ((input === 'c' && key.ctrl) || input === 'q') {
      exit();
      return;
    }

    // 只有在普通模式下才处理其他按键
    if (mode === 'chat') {
      // 处理普通输入
    }
  }, {
    isActive: true  // 始终激活，但内部判断
  });

  return <>{children}</>;
};

const ChatInput = () => {
  const { mode } = useContext(KeyboardContext);

  // 只在 chat 模式下激活
  useInput((input, key) => {
    // 处理输入
  }, { isActive: mode === 'chat' });

  return <TextInput />;
};

const CommandSelector = () => {
  const { mode } = useContext(KeyboardContext);

  // 只在 commandSelect 模式下激活
  useInput((input, key) => {
    if (key.escape) {
      setMode('chat');  // 切换回 chat 模式
    }
  }, { isActive: mode === 'commandSelect' });

  return <Selector />;
};
```

## 最佳实践

### 1. 明确模式状态

```tsx
// ✅ 好：明确的模式状态
type AppMode = 'idle' | 'typing' | 'selecting' | 'confirming';

// ❌ 不好：使用多个布尔值
const [isSelecting, setIsSelecting] = useState(false);
const [isConfirming, setIsConfirming] = useState(false);
// ... 很容易冲突
```

### 2. 单一数据源

```tsx
// ✅ 好：单一状态决定行为
useInput((input, key) => {
  if (mode === 'selecting' && key.escape) {
    setMode('idle');
    return;
  }
  // ...
}, { isActive: true });

// ❌ 不好：多个地方判断
useInput((input, key) => {
  if (isSelecting && key.escape) setIsSelecting(false);
}, { isActive: isSelecting });

useInput((input, key) => {
  if (isSelecting && key.escape) setIsSelecting(false);
}, { isActive: !isTyping });  // 可能冲突！
```

### 3. 优先级清晰

```tsx
// 优先级从高到低
const HANDLER_PRIORITY = {
  GLOBAL: 0,        // Ctrl+C, Q - 始终有效
  MODAL: 10,        // 对话框、选择器
  NAVIGATION: 20,   // 导航
  INPUT: 30,        // 普通输入
};
```

### 4. 防止意外激活

```tsx
// 使用状态而不是直接判断
const isActive = mode === 'selecting' && !isLoading;

useInput(handler, { isActive });  // 明确控制
```

## 完整示例：聊天应用

```tsx
import React, { useState, createContext, useContext } from 'react';
import { Box, Text, useInput, useApp } from 'ink';

type AppMode = 'chat' | 'commandSelect' | 'exitConfirm';

const ModeContext = createContext<{
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}>(null);

const App = () => {
  const [mode, setMode] = useState<AppMode>('chat');
  const { exit } = useApp();

  // 全局键盘处理 - 最高优先级
  useInput((input, key) => {
    // Ctrl+C / Q - 始终退出
    if ((input === 'c' && key.ctrl) || input === 'q') {
      exit();
      return;
    }
  }, { isActive: true });

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      <Box flexDirection="column">
        <ChatHistory />
        <ChatInput />

        {mode === 'commandSelect' && (
          <CommandSelector />
        )}

        {mode === 'exitConfirm' && (
          <ExitConfirmDialog />
        )}

        <StatusBar mode={mode} />
      </Box>
    </ModeContext.Provider>
  );
};

const ChatInput = () => {
  const { mode, setMode } = useContext(ModeContext);
  const [input, setInput] = useState('');

  // 只在 chat 模式下激活
  useInput((inputChar, key) => {
    if (key.return && input.trim()) {
      if (input.startsWith('/')) {
        setMode('commandSelect');
      } else {
        sendMessage(input);
        setInput('');
      }
    }
  }, { isActive: mode === 'chat' });

  if (mode !== 'chat') return null;

  return (
    <Box>
      <Text>{'> '}</Text>
      <TextInput
        value={input}
        onChange={setInput}
        placeholder="Type a message..."
      />
    </Box>
  );
};

const CommandSelector = () => {
  const { mode, setMode } = useContext(ModeContext);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands = [
    { label: '/help', value: 'help' },
    { label: '/clear', value: 'clear' },
    { label: '/exit', value: 'exit' },
  ];

  // 只在 commandSelect 模式下激活
  useInput((input, key) => {
    if (key.escape) {
      setMode('chat');
    } else if (key.upArrow) {
      setSelectedIndex(i => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIndex(i => Math.min(commands.length - 1, i + 1));
    } else if (key.return) {
      executeCommand(commands[selectedIndex].value);
      setMode('chat');
    }
  }, { isActive: mode === 'commandSelect' });

  return (
    <Box flexDirection="column" borderStyle="round">
      <Text bold>Select a command:</Text>
      {commands.map((cmd, i) => (
        <Text key={cmd.value}>
          {i === selectedIndex ? '→ ' : '  '}
          {cmd.label}
        </Text>
      ))}
    </Box>
  );
};

const StatusBar = ({ mode }: { mode: AppMode }) => {
  const modeLabels = {
    chat: 'Chat',
    commandSelect: 'Command Select',
    exitConfirm: 'Exit Confirmation'
  };

  return (
    <Box borderStyle="single" paddingX={1}>
      <Text>Mode: {modeLabels[mode]}</Text>
      <Text dimColor> | Ctrl+C: Exit</Text>
    </Box>
  );
};
```

## 调试技巧

```tsx
// 添加键盘事件日志
const useKeyboardLogger = () => {
  useInput((input, key) => {
    console.log('🔑 Key pressed:', {
      input,
      ctrl: key.ctrl,
      escape: key.escape,
      return: key.return,
      upArrow: key.upArrow,
      downArrow: key.downArrow
    });
  }, { isActive: __DEV__ });  // 只在开发环境
};

// 在 App 中使用
const App = () => {
  useKeyboardLogger();
  // ...
};
```

## 总结

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **isActive** | 简单直接 | 需要手动管理 | 少量监听器 |
| **状态机** | 逻辑清晰 | 集中管理 | 复杂应用（推荐） |
| **事件上下文** | 灵活可扩展 | 较复杂 | 需要动态管理 |
| **优先级队列** | 精细控制 | 实现成本高 | 大型应用 |

**推荐**: 对于大多数应用，使用 **isActive + 状态机** 组合即可。
