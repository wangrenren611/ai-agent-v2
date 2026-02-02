# 多页面 AppMode 设计指南

## 问题

如果有多页面需要跳转页面，AppMode 需要新增类型吗？

---

## 结论

**不一定要新增类型**，取决于页面复杂度。选择合适的方案。

---

## 三种方案对比

### 方案 1: 扩展 AppMode（页面少）

```tsx
export type AppMode =
  | 'idle'              // 空闲/主页
  | 'typing'            // 输入消息
  | 'commandSelect'     // 命令选择
  | 'page-settings'     // 设置页 ✨ 新增
  | 'page-help'         // 帮助页 ✨ 新增
  | 'page-about';        // 关于页 ✨ 新增
```

**优点**:
- ✅ 简单直接
- ✅ 类型安全
- ✅ 模式即页面

**缺点**:
- ❌ AppMode 会变得很长
- ❌ 每加一个页面都要修改类型
- ❌ 页面多时类型定义冗长

**适用**: 3-5 个固定页面

---

### 方案 2: 导航模式 + 页面状态（推荐）⭐

```tsx
export type AppMode =
  | 'idle'
  | 'typing'
  | 'commandSelect'
  | 'navigation';      // 新增：导航模式

// 页面名独立定义
type PageName = 'home' | 'settings' | 'help' | 'about';
```

**优点**:
- ✅ AppMode 简洁，只控制 UI 状态
- ✅ 页面路由独立管理
- ✅ 易于扩展新页面
- ✅ 支持页面历史记录

**缺点**:
- ⚠️ 需要额外的状态管理

**适用**: 5+ 个页面

---

### 方案 3: 完全独立的路由系统

```tsx
// AppMode 只控制 UI 状态
export type AppMode =
  | 'idle' | 'typing' | 'commandSelect';

// 路由完全独立
interface RouterState {
  currentPage: PageName;
  history: PageName[];
}
```

**优点**:
- ✅ 关注点完全分离
- ✅ 支持复杂路由功能
- ✅ 可扩展为真正的路由器

**缺点**:
- ⚠️ 实现复杂
- ⚠️ 需要额外的学习成本

**适用**: 复杂应用，多层级导航

---

## 推荐方案：方案 2（导航模式）

### 实现

```tsx
// 1. 定义 AppMode
export type AppMode =
  | 'idle'
  | 'typing'
  | 'commandSelect'
  | 'navigation';  // 新增

// 2. 定义页面名
type PageName = 'home' | 'settings' | 'help' | 'about';

// 3. 应用组件
const App = () => {
  const [mode, setMode] = useState<AppMode>('typing');
  const [currentPage, setCurrentPage] = useState<PageName>('home');

  return (
    <KeyboardManager>
      {mode === 'navigation' ? (
        <Router currentPage={currentPage} navigateTo={setCurrentPage} />
      ) : (
        <ChatInput />
      )}
    </KeyboardManager>
  );
};
```

### 页面导航

```tsx
const Router = ({ currentPage, navigateTo }) => {
  const pages = {
    home: <HomePage />,
    settings: <SettingsPage />,
    help: <HelpPage />,
    about: <AboutPage />
  };

  return (
    <>
      {pages[currentPage]}
      <NavigationMenu navigateTo={navigateTo} />
    </>
  );
};
```

### 全局快捷键

```tsx
useGlobalKeyboard({
  id: 'page-navigation',
  priority: HandlerPriority.NAVIGATION,
  activeModes: ['navigation'],
  handler: ({ input, key }) => {
    if (input === '1') navigateTo('settings');
    if (input === '2') navigateTo('help');
    if (input === '3') navigateTo('about');
    if (key.escape) navigateTo('home');
    return true;
  }
});
```

---

## 迁移步骤

### 从现有系统迁移

#### 1. 扩展 AppMode

```tsx
// 当前
type AppMode = 'typing' | 'commandSelect';

// 新增导航模式
type AppMode = 'typing' | 'commandSelect' | 'navigation';
```

#### 2. 添加页面状态

```tsx
const [currentPage, setCurrentPage] = useState('home');
```

#### 3. 实现导航

```tsx
const navigateTo = (page: PageName) => {
  setCurrentPage(page);
  setMode('navigation');
};

const goBack = () => {
  setMode('typing');
};
```

#### 4. 渲染不同页面

```tsx
return (
  <>
    {mode === 'navigation' && <Router />}
    {mode === 'typing' && <ChatInput />}
    {mode === 'commandSelect' && <CommandSelector />}
  </>
);
```

---

## 完整示例

### 使用方案 2 的完整应用

```tsx
import { useState } from 'react';
import { Box, Text } from 'ink';
import {
  KeyboardManager,
  useKeyboard,
  useGlobalKeyboard,
  HandlerPriority,
  type AppMode
} from './context';

type PageName = 'home' | 'settings' | 'help' | 'about';

const App = () => {
  const [mode, setMode] = useState<AppMode>('typing');
  const [currentPage, setCurrentPage] = useState<PageName>('home');

  return (
    <KeyboardManager onExit={() => process.exit(0)}>
      {mode === 'navigation' ? (
        <Router
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          setMode={setMode}
        />
      ) : (
        <ChatInput />
      )}
    </KeyboardManager>
  );
};

const Router = ({ currentPage, setCurrentPage, setMode }) => {
  const pages = {
    home: <HomePage setMode={setMode} />,
    settings: <SettingsPage setMode={setMode} />,
    help: <HelpPage setMode={setMode} />,
    about: <AboutPage setMode={setMode} />,
  };

  return (
    <>
      {pages[currentPage]}
      <NavigationMenu setCurrentPage={setCurrentPage} />
    </>
  );
};
```

---

## 决策树

```
你的应用有几个页面？
│
├─ 1-3 个页面
│  └─→ 使用方案 1：扩展 AppMode
│     type AppMode = 'typing' | 'page-settings' | 'page-help'
│
├─ 3-10 个页面
│  └─→ 使用方案 2：导航模式 ⭐ 推荐
│     type AppMode = 'typing' | 'navigation'
│     type PageName = 'home' | 'settings' | ...
│
└─ 10+ 个页面
   └─→ 使用方案 3：独立路由系统
│     interface RouterState { ... }
```

---

## 快速实现

### 最简单的方式（方案 1）

```tsx
// 1. 修改 context/keyboard.tsx
export type AppMode =
  | 'idle' | 'typing' | 'commandSelect'
  | 'page-settings' | 'page-help' | 'page-about';

// 2. 在组件中使用
const App = () => {
  const [mode, setMode] = useState<AppMode>('idle');

  return (
    <>
      {mode === 'page-settings' && <SettingsPage />}
      {mode === 'page-help' && <HelpPage />}
      {mode === 'page-about' && <AboutPage />}
    </>
  );
};
```

### 最灵活的方式（方案 2）⭐

```tsx
// 1. AppMode 只新增 navigation
export type AppMode =
  | 'idle' | 'typing' | 'commandSelect' | 'navigation';

// 2. 独立定义页面名
const pages = ['home', 'settings', 'help', 'about'] as const;
type PageName = typeof pages[number];

// 3. 独立管理页面状态
const [currentPage, setCurrentPage] = useState<PageName>('home');

// 4. 根据模式渲染
{mode === 'navigation' ? (
  <Router currentPage={currentPage} />
) : (
  <ChatInput />
)}
```

---

## 总结

| 页面数量 | 推荐方案 | AppMode 变化 |
|---------|---------|--------------|
| 1-3 个 | 方案 1 | 扩展 AppMode |
| 3-10 个 | 方案 2 ⭐ | 新增 'navigation' |
| 10+ 个 | 方案 3 | 独立路由系统 |

**推荐**: 使用方案 2（导航模式），AppMode 新增 `'navigation'`，页面名独立定义。
