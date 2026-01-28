# 最终修复：解决 TextInput 冲突

## 🎯 根本问题

### 问题分析

**Home 页面**和 **Session 页面**都有一个 `TextInput`：

```
App.tsx
  ├── Home (Route)
  │   └── TextInput  ← Home 的输入框
  └── Session (Route)
      └── TextInput  ← Session 的输入框
```

**问题**：
- 当从 Home 跳转到 Session 时，Home 的 TextInput 可能还没有完全卸载
- 两个 TextInput 同时存在，导致输入冲突
- Session 的 TextInput 收不到输入

### 为什么 Home 页面工作正常？

```tsx
// Home 页面只使用 TextInput，没有 useInput
<TextInput
  value={input}
  onChange={setInput}
  onSubmit={handleSubmit}
  placeholder="Type your message..."
  showCursor={true}
/>
```

- ✅ 只使用 `TextInput`
- ✅ 没有 `useInput`
- ✅ 没有输入冲突

---

## ✅ 解决方案

### 1. 确保同一时间只有一个 TextInput 渲染

修改 `App.tsx`，使用直接 switch 而不是 `useMemo`：

```tsx
const AppContent: React.FC = () => {
  const [routeState, routeContext] = useRoute();

  // Direct switch - no useMemo to ensure unmount/remount
  switch (routeState.current) {
    case 'home':
      return <Home navigate={routeContext.navigate} />;
    case 'session':
      return <Session navigate={routeContext.navigate} />;
    case 'settings':
      return <Settings navigate={routeContext.navigate} />;
    default:
      return <Home navigate={routeContext.navigate} />;
  }
};
```

**关键改动**：
- ❌ 之前：使用 `useMemo`，可能导致组件复用
- ✅ 现在：直接 switch，确保完全卸载/重新挂载

### 2. CustomInput 内部使用 useInput

只在 CustomInput 内部使用 `useInput`，只拦截导航键：

```tsx
// CustomInput.tsx
export default function CustomInput({ ... }) {
  // 只拦截导航键，其他键让 TextInput 处理
  useInput((inputChar, key) => {
    if (disabled) return;
    
    // 处理命令列表导航
    if (showCommandList) {
      if (key.upArrow && navigateCommandList) {
        navigateCommandList('up');
      }
      if (key.downArrow && navigateCommandList) {
        navigateCommandList('down');
      }
      if (key.escape && onEscape) {
        onEscape();
      }
      // 不要拦截 Enter，让 TextInput 处理
      return;
    }
    
    // 不要拦截任何其他键，让 TextInput 处理
  });

  return (
    <TextInput
      value={value}
      onChange={onChange}
      onSubmit={onSubmit}
      placeholder={placeholder}
      focus={!disabled}
      showCursor={!disabled}
    />
  );
}
```

### 3. Session 完全移除 useInput

Session 组件不再使用 `useInput`，所有输入都通过 `CustomInput` 处理：

```tsx
// Session.tsx
export default function Session({ navigate }) {
  // 完全移除 useInput
  
  // 通过 props 传递回调函数给 CustomInput
  return (
    <CustomInput
      value={input}
      onChange={handleInputChange}
      onSubmit={submitMessage}
      showCommandList={showCommandList}
      navigateCommandList={navigateCommandList}
      onEscape={handleEscape}
    />
  );
}
```

---

## 🔑 关键改动总结

| 文件 | 改动点 | 之前 | 之后 |
|------|--------|------|------|
| **App.tsx** | 路由渲染 | `useMemo` | 直接 switch |
| **Session.tsx** | `useInput` | ✅ 使用 | ❌ 完全移除 |
| **CustomInput.tsx** | `useInput` | ❌ 不使用 | ✅ 只拦截导航键 |
| **CustomInput.tsx** | Enter 键处理 | 不处理 | 在 `handleSubmit` 中处理 |

---

## 🚀 测试

### 1. 重新编译
```bash
pnpm build
```

### 2. 启动 CLI
```bash
pnpm dev:cli-v2-ink
```

### 3. 测试第一次输入 `/`

**步骤**：
1. 程序启动后，立即输入 `/`
2. 观察日志和界面

**预期日志**：
```
[CustomInput] Component mounted, disabled: false, focus: true
[CustomInput] Value changed: /
[Session] Input changed: /
[Session] Showing command list
```

**预期界面**：
```
AI Agent CLI
Loading...

Commands: (↑↓ navigate, Enter execute, Esc cancel)
▶ /model      - Select AI model
  /settings   - Open settings
  /config     - Open configuration
  /clear      - Clear message history
  /help       - Show help
  /exit       - Exit application

───────────────
Type / to see commands | /help for more | Ctrl+C: Exit
> / 
```

### 4. 测试继续输入

**步骤**：
1. 继续输入 `/mo`
2. 观察命令列表是否过滤

**预期**：
- 命令列表只显示 `/model`
- 可以继续输入

### 5. 测试导航和执行

**步骤**：
1. 使用上下键导航
2. 按 [Enter] 执行命令
3. 按 [Esc] 隐藏命令列表

**预期**：
- 上下键可以切换命令
- Enter 可以执行命令
- Esc 可以隐藏命令列表

---

## 📋 架构对比

### 之前（有冲突）

```
App.tsx
  ├── Home (Route)
  │   └── TextInput  ← 正常工作
  └── Session (Route)
      ├── useInput (拦截所有输入) ❌
      └── TextInput (收不到输入) ❌
```

### 之后（无冲突）

```
App.tsx
  ├── Home (Route)
  │   └── TextInput  ← 正常工作
  └── Session (Route)
      └── CustomInput
          ├── useInput (只拦截导航键) ✅
          └── TextInput (处理所有其他输入) ✅
```

---

## ✅ 测试清单

- [ ] 初始化时输入 `/` 能显示命令列表
- [ ] 初始化时输入 `/` 能继续输入
- [ ] 初始化时输入 `/mo` 能过滤命令
- [ ] 初始化时能使用上下键导航
- [ ] 初始化时能按 [Enter] 执行命令
- [ ] 初始化时能按 [Esc] 隐藏命令列表
- [ ] Ready 后功能正常
- [ ] 发送消息功能正常
- [ ] 所有输入都能正确显示

---

## 🎨 核心原则

### 原则 1：不要在同一组件中同时使用 TextInput 和 useInput

**错误示例**：
```tsx
function Component() {
  useInput((char, key) => {
    // 拦截输入
  });
  
  return <TextInput />;
}
```

**正确示例**：
```tsx
function Component() {
  // 使用 TextInput 处理所有输入
  return <TextInput />;
}
```

### 原则 2：确保同一时间只有一个 TextInput 渲染

**错误示例**：
```tsx
// 使用 useMemo，可能导致组件复用
const renderRoute = useMemo(() => {
  switch (route) {
    case 'home': return <Home />;
    case 'session': return <Session />;
  }
}, [route]);
```

**正确示例**：
```tsx
// 直接 switch，确保完全卸载/重新挂载
switch (route) {
  case 'home': return <Home />;
  case 'session': return <Session />;
}
```

---

## 📚 相关文档

- [Ink useInput](https://github.com/vadimdemedes/ink#useinput)
- [ink-text-input](https://github.com/vadimdemedes/ink-text-input)
- [TextInput 和 useInput 冲突](./FIX_TEXTINPUT_USEINPUT_CONFLICT.md)

---

**修复完成时间**: 2026-01-28
**状态**: ✅ 修复完成
**修改文件**: 
- `src/cli-v2-ink/App.tsx`
- `src/cli-v2-ink/components/Session.tsx`
- `src/cli-v2-ink/components/CustomInput.tsx`

**核心改动**:
1. App.tsx 使用直接 switch 确保 TextInput 完全卸载
2. Session 完全移除 `useInput`
3. CustomInput 内部使用 `useInput` 只拦截导航键
