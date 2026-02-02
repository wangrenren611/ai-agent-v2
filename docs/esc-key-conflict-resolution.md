# Esc 键冲突处理实现总结

## 问题

Esc 键有两个冲突的功能：
- **局部**: 取消命令选择器
- **全局**: 退出整个程序

## 解决方案

**方案**: 状态隔离 + 不同快捷键

### 核心思路

1. 使用 `useRef` 跟踪选择器状态
2. 在全局 `useInput` 中检查状态
3. 选择器打开时，Esc 只触发取消操作
4. 使用 `Ctrl+C` 和 `Q` 作为退出程序的快捷键

### 实现代码

```tsx
export const ChatInput: React.FC<any> = (props) => {
  const [showCommandSelector, setShowCommandSelector] = useState(false);
  const isCommandRef = useRef(showCommandSelector);

  // 同步状态到 ref
  useEffect(() => {
    isCommandRef.current = showCommandSelector;
  }, [showCommandSelector]);

  // 获取 exit 函数
  const { exit } = useApp();

  // 全局键盘处理
  useInput((inputChar, key) => {
    // Ctrl+C 或 Q - 始终可以退出程序
    if ((inputChar === 'c' && key.ctrl) || inputChar === 'q') {
      exit();
    }

    // Esc 键处理
    if (key.escape) {
      if (isCommandRef.current) {
        // 选择器打开时，什么都不做（让 ScrollableSelect 处理）
        return;
      }
      // 选择器关闭时，Esc 也可以退出（可选）
      // exit();
    }
  });

  // ... 其余代码
};
```

### ScrollableSelect 组件中的处理

```tsx
// 在 ScrollableSelect 组件内部
useInput((input, key) => {
  // ... 其他键盘处理

  if (key.escape && onCancel) {
    onCancel();  // 触发取消回调
  }
});
```

## 键盘快捷键说明

| 按键 | 功能 | 作用范围 |
|------|------|----------|
| **Esc** | 取消命令选择器 | 仅在选择器打开时 |
| **Ctrl+C** | 退出程序 | 始终有效 |
| **Q** | 退出程序 | 始终有效 |
| **↑↓** | 上下移动选择 | 选择器内 |
| **Enter** | 确认选择 | 选择器内 |

## 用户界面提示

```tsx
<Text dimColor>
  (↑↓ navigate, Enter select, Esc cancel, Ctrl+C exit)
</Text>
```

## 行为说明

### 场景 1: 选择器打开

```
用户按键    → 期望行为                → 实际行为
─────────────────────────────────────────────
Esc        → 关闭选择器              → ✅ 关闭选择器，不退出
Ctrl+C     → 退出程序                → ✅ 退出程序
Q          → 退出程序                → ✅ 退出程序
↑/↓        → 移动选择                → ✅ 移动选择
Enter      → 确认选择                → ✅ 确认选择并关闭选择器
```

### 场景 2: 选择器关闭

```
用户按键    → 期望行为                → 实际行为
─────────────────────────────────────────────
Esc        → (可选) 退出程序         → ✅ 根据配置决定
Ctrl+C     → 退出程序                → ✅ 退出程序
Q          → 退出程序                → ✅ 退出程序
```

## 优点

1. **清晰分离**: Esc 用于取消，Ctrl+C/Q 用于退出
2. **符合预期**: Ctrl+C 是标准的终端退出快捷键
3. **安全**: 不会意外退出程序
4. **灵活**: 可以根据需要让 Esc 在关闭选择器后也退出

## 扩展选项

### 选项 1: Esc 也用于退出

取消注释以下代码：

```tsx
if (key.escape) {
  if (isCommandRef.current) {
    return;  // 让选择器处理
  }
  exit();    // 选择器关闭时，Esc 也退出
}
```

### 选项 2: 双击 Esc 退出

```tsx
const escPressTimeRef = useRef(0);
const ESC_DOUBLE_PRESS_THRESHOLD = 500;

useInput((inputChar, key) => {
  if (key.escape) {
    const now = Date.now();
    const timeSinceLastPress = now - escPressTimeRef.current;

    if (isCommandRef.current) {
      setShowCommandSelector(false);
      escPressTimeRef.current = now;
    } else if (timeSinceLastPress < ESC_DOUBLE_PRESS_THRESHOLD) {
      exit();  // 快速按两次 Esc 退出
    } else {
      escPressTimeRef.current = now;
    }
  }
});
```

### 选项 3: 确认对话框

```tsx
const [showExitConfirm, setShowExitConfirm] = useState(false);

useInput((inputChar, key) => {
  if (key.escape) {
    if (isCommandRef.current) {
      setShowCommandSelector(false);
    } else if (!showExitConfirm) {
      setShowExitConfirm(true);  // 显示退出确认
    } else {
      setShowExitConfirm(false);  // 取消确认
    }
  }

  if (showExitConfirm) {
    if (inputChar.toLowerCase() === 'y') exit();
    if (inputChar.toLowerCase() === 'n') setShowExitConfirm(false);
  }
});
```

## 文件位置

- **实现**: `src/cli/components/chat-input/index.tsx`
- **选择器组件**: `src/cli/components/scrollable-select/index.tsx`
- **详细说明**: `src/cli/components/scrollable-select/esc-handling-guide.md`

## 测试建议

1. 打开命令选择器，按 Esc 确保关闭选择器但不退出
2. 在选择器打开时按 Ctrl+C 确保直接退出
3. 关闭选择器后按 Q 确保退出
4. 测试所有导航快捷键正常工作

## 总结

通过使用 `useRef` 跟踪状态并在全局 `useInput` 中进行条件判断，我们成功解决了 Esc 键的冲突问题。用户现在可以：
- 使用 **Esc** 取消命令选择器
- 使用 **Ctrl+C** 或 **Q** 退出程序
- 享受清晰、一致的键盘交互体验
