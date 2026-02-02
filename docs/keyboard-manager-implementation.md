# 键盘管理器实现总结

## 已完成的工作

### 1. 核心文件

**文件**: `src/cli/context/keyboard.tsx`

完整的键盘管理器实现，包含：

#### 导出的组件和 Hook

| 导出 | 类型 | 说明 |
|------|------|------|
| `KeyboardManager` | 组件 | Provider 组件，包裹应用根部 |
| `useKeyboard` | Hook | 访问键盘管理器上下文 |
| `useGlobalKeyboard` | Hook | 注册键盘处理器 |
| `useGlobalShortcuts` | Hook | 注册全局快捷键（Ctrl+C/Q）|
| `useKeyboardLogger` | Hook | 开发调试用的键盘日志 |
| `isKeyMatch` | 函数 | 快捷键匹配辅助函数 |
| `HandlerPriority` | 枚举 | 优先级级别 |

#### 导出的类型

| 类型 | 说明 |
|------|------|
| `AppMode` | 应用模式类型 |
| `KeyboardEvent` | 键盘事件类型 |
| `KeyboardHandler` | 处理器函数类型 |

### 2. 统一导出

**文件**: `src/cli/context/index.ts`

提供便捷的导入方式：

```tsx
// ✅ 推荐：从 index 导入
import {
  KeyboardManager,
  useKeyboard,
  useGlobalKeyboard,
  HandlerPriority
} from './context';

// ✅ 也可以：直接从 keyboard.tsx 导入
import {
  KeyboardManager,
  useKeyboard,
  useGlobalKeyboard,
  HandlerPriority
} from './context/keyboard';
```

---

## 核心功能

### 1. KeyboardManager Provider

应用的根组件，提供键盘管理功能：

```tsx
import { KeyboardManager } from './context';

<KeyboardManager onExit={() => process.exit(0)}>
  <App />
</KeyboardManager>
```

### 2. 应用模式系统

```tsx
type AppMode =
  | 'idle'            // 空闲
  | 'typing'          // 输入
  | 'commandSelect'   // 选择命令
  | 'confirmExit';    // 确认退出
```

### 3. 优先级系统

```tsx
enum HandlerPriority {
  GLOBAL = 0,        // 全局快捷键
  CRITICAL = 10,      // 关键操作
  MODAL = 20,        // 模态框
  NAVIGATION = 30,    // 导航
  INPUT = 40,        // 普通输入
}
```

### 4. useGlobalKeyboard Hook

注册键盘处理器：

```tsx
useGlobalKeyboard({
  id: 'my-handler',
  priority: HandlerPriority.MODAL,
  activeModes: ['typing', 'selecting'],
  handler: ({ input, key }) => {
    if (key.escape) {
      closeModal();
      return true;  // 停止传播
    }
    return false;  // 继续传播
  }
});
```

---

## 工作原理

```
用户按键 → KeyboardManager.useInput (单一监听器)
              ↓
         构建 KeyboardEvent
              ↓
         获取当前模式 (mode)
              ↓
         筛选激活的处理器
         (activeModes 包含 mode)
              ↓
         按优先级排序
              ↓
         依次调用处理器
              ↓
         返回 true?
              ↓
         停止传播 ✅
```

---

## 使用示例

### 基础使用

```tsx
import {
  KeyboardManager,
  useKeyboard,
  useGlobalKeyboard,
  HandlerPriority
} from './context';

const App = () => {
  const [mode, setMode] = useState<AppMode>('typing');

  return (
    <KeyboardManager onExit={() => process.exit(0)}>
      <ChildComponent />
    </KeyboardManager>
  );
};

const ChildComponent = () => {
  const { mode } = useKeyboard();

  useGlobalKeyboard({
    id: 'child-handler',
    priority: HandlerPriority.INPUT,
    activeModes: ['typing'],
    handler: ({ input, key }) => {
      if (key.return) {
        console.log('Enter pressed');
        return true;
      }
    }
  });

  return <Text>Component</Text>;
};
```

### 全局快捷键

```tsx
import { useGlobalShortcuts } from './context';

const GlobalShortcuts = () => {
  useGlobalShortcuts(() => process.exit(0));
  return null;
};

<KeyboardManager>
  <GlobalShortcuts />
  <App />
</KeyboardManager>
```

---

## 集成到现有项目

### 步骤 1: 包裹应用

```tsx
// src/cli/index.tsx 或你的入口文件
import { KeyboardManager } from './context';

const CLI = () => {
  return (
    <KeyboardManager onExit={() => process.exit(0)}>
      <ChatApp />
    </KeyboardManager>
  );
};
```

### 步骤 2: 更新组件

```tsx
// src/cli/components/chat-input/index.tsx

// 旧代码
import { useInput } from 'ink';

useInput((input, key) => {
  if (key.escape) closeSelector();
});

// 新代码
import { useGlobalKeyboard, HandlerPriority } from '../context';

useGlobalKeyboard({
  id: 'chat-input',
  priority: HandlerPriority.INPUT,
  activeModes: ['typing'],
  handler: ({ key }) => {
    if (key.escape) {
      closeSelector();
      return true;
    }
  }
});
```

---

## 文件结构

```
src/cli/context/
├── keyboard.tsx    # 核心实现 ✅
├── index.ts        # 统一导出 ✅
└── types.ts        # 类型定义（可选）
```

---

## 测试清单

- [x] 文件编译通过
- [x] 导出类型正确
- [x] TypeScript 类型检查
- [ ] 单元测试
- [ ] 集成测试

---

## 相关文档

- **完整指南**: `docs/keyboard-manager-complete-guide.md`
- **问题解决**: `docs/multiple-useinput-handling.md`
- **快速参考**: `docs/keyboard-management-summary.md`

---

## 下一步

1. **集成到现有项目**
   - 在应用根部添加 `KeyboardManager`
   - 更新 `chat-input` 组件
   - 更新其他使用 `useInput` 的组件

2. **测试功能**
   - 验证键盘事件正常工作
   - 验证优先级系统
   - 验证模式切换

3. **完善文档**
   - 添加更多示例
   - 添加故障排除指南
   - 添加最佳实践

---

## 总结

键盘管理器已完整实现，提供了：

1. ✅ **统一的键盘事件管理** - 单一 useInput 监听器
2. ✅ **优先级系统** - 清晰的事件处理顺序
3. ✅ **模式控制** - 根据应用状态激活处理器
4. ✅ **事件传播控制** - 返回值控制是否继续传播
5. ✅ **完整类型支持** - TypeScript 类型定义
6. ✅ **便捷的 Hooks** - useGlobalKeyboard、useGlobalShortcuts 等
7. ✅ **调试工具** - useKeyboardLogger Hook

现在可以在项目中使用键盘管理器来解决多个 `useInput` 冲突的问题了！
