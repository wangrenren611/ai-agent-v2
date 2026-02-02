# ChatInput 命令页面实现总结

## ✅ 完成的修改

### 1. 更新 AppMode 类型 (`src/cli/context/keyboard.tsx`)

添加了所有命令页面的模式：

```tsx
export type AppMode =
  | 'idle'            // 空闲状态
  | 'typing'          // 输入消息
  | 'commandSelect'   // 选择命令
  | 'confirmExit'     // 确认退出
  | 'page-init'       // /init 命令页
  | 'page-help'       // /help 命令页
  | 'page-model-select' // /model-select 命令页
  | 'page-settings'   // /settings 命令页
  | 'page-memory'     // /memory 命令页
  | 'page-history'    // /history 命令页
  | 'page-session'    // /session 命令页
  | 'page-new-session' // /new-session 命令页
  | 'page-delete-session' // /delete-session 命令页
  | 'page-list-sessions' // /list-sessions 命令页
  | 'page-export'     // /export 命令页
  | 'page-import'     // /import 命令页
  | 'page-config'     // /config 命令页
  | 'page-version'    // /version 命令页
  | 'page-about'      // /about 命令页
  | 'page-debug'      // /debug 命令页
  | 'page-status'     // /status 命令页
  | 'page-reset';     // /reset 命令页
```

---

### 2. 修改 ChatInput 组件 (`src/cli/components/chat-input/index.tsx`)

#### 主要改动：

1. **移除了不需要的导入**
   - 移除了 `useApp` 的导入（不再需要 exit 功能）
   - 移除了 `useRef` 的导入（不再需要 ref 同步）
   - 移除了 `marked` 的导入（错误的导入）

2. **添加了新的导入**
   - 添加了 `useState`, `useCallback`, `useEffect`
   - 添加了 `useGlobalKeyboard`, `HandlerPriority`, `AppMode`

3. **移除了 `isCommandSelect` ref**
   - 之前使用 `useRef` 同步命令选择状态
   - 现在通过模式系统自动管理

4. **添加了命令到页面模式的映射**

```tsx
const commandToPageMode: Record<string, AppMode> = {
  '/init': 'page-init',
  '/help': 'page-help',
  '/model-select': 'page-model-select',
  '/settings': 'page-settings',
  // ... 其他命令
  // /exit 和 /clear 不需要页面，直接执行
};
```

5. **修改了 `handleSelectCommand` 函数**

```tsx
const handleSelectCommand = (item: SelectItem) => {
  const commandValue = item.value;

  // 特殊命令：/exit 直接退出，/clear 清空输入
  if (commandValue === '/exit') {
    setMode('typing');
    if (externalOnSubmit) {
      externalOnSubmit('/exit');
    }
    return;
  }

  if (commandValue === '/clear') {
    setMode('typing');
    // 清空输入...
    return;
  }

  // 其他命令：切换到对应的页面模式
  const pageMode = commandToPageMode[commandValue];
  if (pageMode) {
    setMode(pageMode);  // ✅ 打开命令详情页
  } else {
    setMode('typing');
  }
};
```

6. **添加了条件渲染**

```tsx
// 渲染命令页面或输入界面
if (mode.startsWith('page-')) {
  return <CommandDetailPage mode={mode} onBack={() => setMode('typing')} />;
}
```

---

### 3. 新增 CommandDetailPage 组件

创建了完整的命令详情页面组件，包含：

- **18 个命令详情页面**，每个都有：
  - 标题
  - 描述
  - 使用说明
  - 示例

- **键盘支持**
  - 使用 `useGlobalKeyboard` 注册 Esc 键返回
  - 优先级：`HandlerPriority.NAVIGATION`

- **命令详情配置**

```tsx
const commandDetails: Record<string, {
  title: string;
  description: string;
  content: string;
}> = {
  'page-help': {
    title: 'Help',
    description: 'Display help information for commands',
    content: `...`
  },
  // ... 其他命令
};
```

---

## 工作流程

### 用户交互流程

```
用户输入 "/"
       ↓
handleChange() 检查到命令前缀
       ↓
setMode('commandSelect')
       ↓
CommandSelector 显示（带 ↑↓ 导航）
       ↓
用户选择命令并按 Enter
       ↓
handleSelectCommand() 被调用
       ↓
根据 commandToPageMode 映射找到对应的页面模式
       ↓
setMode('page-xxx')
       ↓
CommandDetailPage 渲染（显示命令详情）
       ↓
用户按 Esc
       ↓
onBack() 调用 setMode('typing')
       ↓
返回输入模式
```

---

## 使用示例

### 测试流程

1. **输入 `/`**
   - 应该显示命令选择器

2. **使用 ↑↓ 导航命令**
   - 应该可以上下移动高亮

3. **选择 `/help` 并按 Enter**
   - 应该打开 Help 命令详情页

4. **查看详情页内容**
   - 显示标题、描述、使用说明、示例

5. **按 Esc**
   - 应该返回输入模式

6. **选择 `/exit` 并按 Enter**
   - 直接触发退出回调，不打开详情页

7. **选择 `/clear` 并按 Enter**
   - 清空输入，不打开详情页

---

## 命令详情页列表

| 命令 | 页面模式 | 标题 | 描述 |
|------|---------|------|------|
| `/init` | `page-init` | Initialize | Initialize a new session or configuration |
| `/help` | `page-help` | Help | Display help information for commands |
| `/model-select` | `page-model-select` | Model Selection | Select and configure AI model |
| `/settings` | `page-settings` | Settings | Configure application settings |
| `/memory` | `page-memory` | Memory Management | View and manage conversation memory |
| `/history` | `page-history` | History | View conversation history |
| `/session` | `page-session` | Session | Manage current session |
| `/new-session` | `page-new-session` | New Session | Create a new session |
| `/delete-session` | `page-delete-session` | Delete Session | Delete an existing session |
| `/list-sessions` | `page-list-sessions` | List Sessions | List all available sessions |
| `/export` | `page-export` | Export | Export data to various formats |
| `/import` | `page-import` | Import | Import data from files |
| `/config` | `page-config` | Configuration | Manage application configuration |
| `/version` | `page-version` | Version | Display version information |
| `/about` | `page-about` | About | About this application |
| `/debug` | `page-debug` | Debug | Debug and diagnostics tools |
| `/status` | `page-status` | Status | Display current status |
| `/reset` | `page-reset` | Reset | Reset application state |
| `/exit` | - | - | 直接执行退出 |
| `/clear` | - | - | 直接清空输入 |

---

## 技术要点

### 1. 模式驱动的 UI

使用 `mode.startsWith('page-')` 来判断是否显示命令页面：

```tsx
if (mode.startsWith('page-')) {
  return <CommandDetailPage mode={mode} onBack={() => setMode('typing')} />;
}
```

### 2. 动态模式注册

CommandDetailPage 使用动态模式注册：

```tsx
useGlobalKeyboard({
  id: 'command-detail-page',
  priority: HandlerPriority.NAVIGATION,
  activeModes: [mode],  // 动态传入当前模式
  handler: ({ key }) => {
    if (key.escape) {
      onBack();
      return true;
    }
    return false;
  }
});
```

### 3. 命令映射分离

命令到页面模式的映射独立管理，易于扩展：

```tsx
const commandToPageMode: Record<string, AppMode> = {
  '/init': 'page-init',
  '/help': 'page-help',
  // ...
};
```

---

## 下一步

### 测试命令

```bash
pnpm dev:cli
```

### 验证功能

1. [ ] 输入 `/` 显示命令选择器
2. [ ] 选择 `/help` 按 Enter 显示帮助页
3. [ ] 按 Esc 返回输入模式
4. [ ] 选择 `/settings` 按 Enter 显示设置页
5. [ ] 选择 `/exit` 按 Enter 直接触发退出
6. [ ] 选择 `/clear` 按 Enter 清空输入

---

## 文件变更总结

| 文件 | 变更类型 | 描述 |
|------|---------|------|
| `src/cli/context/keyboard.tsx` | 修改 | 添加了 18 个命令页面模式到 AppMode |
| `src/cli/components/chat-input/index.tsx` | 修改 | 添加了命令页面功能，移除了不需要的代码 |

---

**总结**: ChatInput 组件现在支持在选择命令后打开对应的详情页面，每个命令都有详细的使用说明和示例。用户可以通过 Esc 键返回输入模式。
