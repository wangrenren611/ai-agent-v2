# 多个 useInput 监听问题 - 快速解决方案

## 问题

```tsx
// ❌ 问题代码
const Parent = () => {
  useInput((input, key) => {
    if (key.escape) exit();  // 父组件处理
  });
  return <Child />;
};

const Child = () => {
  useInput((input, key) => {
    if (key.escape) close();  // 子组件也处理！
  });
  return <Text>Child</Text>;
};

// 结果：按 Esc 会同时触发 exit() 和 close()
```

## 快速解决方案

### 方案 1: 使用 `isActive` 选项（最简单）

```tsx
const Parent = () => {
  const [childOpen, setChildOpen] = useState(false);

  useInput((input, key) => {
    if (key.escape) exit();
  }, {
    isActive: !childOpen  // 子组件打开时不激活
  });

  return (
    <>
      <Child open={childOpen} onClose={() => setChildOpen(false)} />
    </>
  );
};

const Child = ({ open, onClose }) => {
  useInput((input, key) => {
    if (key.escape) onClose();
  }, {
    isActive: open  // 只在打开时激活
  });

  return open ? <Text>Child</Text> : null;
};
```

### 方案 2: 使用键盘管理上下文（推荐用于复杂应用）

```tsx
// 1. 创建上下文
const KeyboardContext = createContext<{
  mode: string;
  setMode: (mode: string) => void;
}>(null);

// 2. 创建 Provider
const KeyboardProvider = ({ children }) => {
  const [mode, setMode] = useState('normal');

  // 单一全局监听
  useInput((input, key) => {
    // Ctrl+C - 始终退出
    if ((input === 'c' && key.ctrl) || input === 'q') {
      exit();
      return;
    }

    // 根据模式分发
    if (mode === 'selector') {
      // 选择器模式的处理逻辑
    } else if (mode === 'normal') {
      // 普通模式的处理逻辑
    }
  });

  return (
    <KeyboardContext.Provider value={{ mode, setMode }}>
      {children}
    </KeyboardContext.Provider>
  );
};

// 3. 在组件中使用
const Selector = () => {
  const { mode, setMode } = useContext(KeyboardContext);

  useInput((input, key) => {
    if (key.escape) {
      setMode('normal');  // 切换模式
    }
    // ... 其他处理
  }, {
    isActive: mode === 'selector'  // 只在选择器模式激活
  });

  return mode === 'selector' ? <Text>Selector</Text> : null;
};
```

## 实际项目推荐

```tsx
// chat-input/index.tsx
const ChatInput = () => {
  const { mode, setMode } = useKeyboard();  // 从上下文获取

  // 全局退出快捷键（始终有效）
  useGlobalKeyboard({
    id: 'global-exit',
    priority: HandlerPriority.GLOBAL,
    activeModes: ['typing', 'commandSelect'],
    handler: ({ input, key }) => {
      if ((input === 'c' && key.ctrl) || input === 'q') {
        exit();
        return true;  // 已处理，停止传播
      }
    }
  });

  // 输入处理（只在 typing 模式）
  useGlobalKeyboard({
    id: 'chat-input',
    priority: HandlerPriority.INPUT,
    activeModes: ['typing'],
    handler: ({ input, key }) => {
      if (key.return && input.startsWith('/')) {
        setMode('commandSelect');
        return true;
      }
      // ... 其他处理
    }
  });

  // 选择器处理（只在 commandSelect 模式）
  useGlobalKeyboard({
    id: 'command-selector',
    priority: HandlerPriority.MODAL,
    activeModes: ['commandSelect'],
    handler: ({ key }) => {
      if (key.escape) {
        setMode('typing');
        return true;
      }
      // ... 方向键等处理
    }
  });

  return (
    <>
      {mode === 'typing' && <TextInput />}
      {mode === 'commandSelect' && <CommandSelector />}
    </>
  );
};
```

## 关键要点

1. **单一全局监听** - 只在一个地方使用 `useInput`，不要在多个组件中分散使用
2. **状态驱动** - 使用状态（mode）决定谁应该处理键盘事件
3. **isActive 控制** - 使用 `isActive` 选项控制每个处理器是否激活
4. **优先级清晰** - 全局快捷键（Ctrl+C）优先级最高

## 完整示例文件

- **键盘管理上下文**: `src/cli/context/keyboard.tsx`
- **演示程序**: `src/cli/examples/keyboard-manager-demo.tsx`
- **详细文档**: `docs/multiple-useinput-handling.md`
