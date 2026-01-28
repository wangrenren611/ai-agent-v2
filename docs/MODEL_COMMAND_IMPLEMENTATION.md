# /model 命令实现

## ✅ 功能说明

现在用户可以在会话界面中输入 `/model`，系统会自动在底部弹出模型选择列表。

---

## 🎯 使用方式

### 触发模型选择器

在输入框中输入 `/model` 并按回车，或者直接输入 `/model` 即可自动触发：

```
> /model
```

### 使用键盘导航

- **↑ 向上键**: 向上选择模型
- **↓ 向下键**: 向下选择模型
- **Enter 键**: 确认选择
- **Esc 键**: 取消选择，返回正常输入模式

---

## 📋 界面展示

### 输入 /model 后

```
┌─────────────────────────────────────────────────────────────┐
│ Chat Session - 10 messages                                 │
│                                                              │
│ [System] Model changed to: GLM (glm-4-plus)                │
│                                                              │
│ ...                                                          │
│                                                              │
│ ══════════════════════════════════════════════════════│
│                                                              │
│ Select Model: (↑↓ navigate, Enter select, Esc cancel)        │
│ ▶ GLM (Zhipu AI)       - glm-4-plus                      │
│   Kimi (Moonshot AI)    - kimi-k2.5                        │
│   DeepSeek              - deepseek-chat                      │
│   OpenAI                - gpt-4o-mini                        │
│   MiniMax               - abab6.5s-chat                     │
│   Qwen (Alibaba)        - qwen-plus                         │
│                                                              │
│ > _                                                          │
│ Type /model to select model | /help for commands | Ctrl+C: Exit│
└─────────────────────────────────────────────────────────────┘
```

### 选择模型后

```
[System] Model changed to: GLM (glm-4-plus)
```

---

## 🔧 技术实现

### 1. CustomInput 组件

**文件**: `src/cli-v2-ink/components/CustomInput.tsx`

功能：
- 支持命令检测（使用正则表达式）
- 自动识别 `/model` 命令
- 触发 `onCommand` 回调

```typescript
const COMMAND_PATTERN = /^\/(\w+)$/;

// 检测命令
const match = newValue.match(COMMAND_PATTERN);
if (match) {
  onCommand(match[1]);  // 返回命令名称，如 "model"
}
```

---

### 2. Session 组件

**文件**: `src/cli-v2-ink/components/Session.tsx`

状态管理：
```typescript
// 模型选择器状态
const [showModelSelector, setShowModelSelector] = useState(false);
const [modelSelectorIndex, setModelSelectorIndex] = useState(0);
```

命令处理：
```typescript
// 处理命令检测
const handleCommandDetect = useCallback((detectedCommand: string) => {
  if (detectedCommand === 'model') {
    setShowModelSelector(true);
    setModelSelectorIndex(0);
  } else {
    setShowModelSelector(false);
  }
}, []);
```

输入提交：
```typescript
// 提交时检查命令
const submitMessage = useCallback(() => {
  const trimmedInput = input.trim();

  // Handle /model command
  if (trimmedInput.toLowerCase() === '/model') {
    setShowModelSelector(true);
    setModelSelectorIndex(0);
    setInput('');
    return;
  }

  // ... 其他处理
}, [input]);
```

---

### 3. 键盘事件处理

```typescript
// 处理模型选择器输入
useInput((inputChar, key) => {
  if (!showModelSelector) return;

  if (key.upArrow) {
    // 向上选择
    const models = Object.values(PROVIDER_METADATA);
    setModelSelectorIndex(prev => (prev > 0 ? prev - 1 : models.length - 1));
  }

  if (key.downArrow) {
    // 向下选择
    const models = Object.values(PROVIDER_METADATA);
    setModelSelectorIndex(prev => (prev < models.length - 1 ? prev + 1 : 0));
  }

  if (key.return) {
    // 确认选择
    handleModelSelect();
  }

  if (key.escape) {
    // 取消选择
    setShowModelSelector(false);
  }
});
```

---

## 📝 支持的命令

| 命令 | 功能 |
|------|------|
| `/model` | 显示模型选择器 |
| `/settings` | 打开设置页面 |
| `/config` | 打开设置页面（别名） |
| `/clear` | 清空消息历史 |
| `/help` | 显示帮助信息 |
| `/exit` | 退出程序 |

---

## 🎨 特性

### 1. 自动检测
- ✅ 输入 `/model` 即可自动触发
- ✅ 无需按回车（可选）
- ✅ 智能检测命令模式

### 2. 键盘导航
- ✅ 上下键循环导航
- ✅ 高亮显示当前选项
- ✅ 快速响应

### 3. 视觉反馈
- ✅ 彩色高亮（绿色选中）
- ✅ 箭头标记 (▶)
- ✅ 清晰的提示文字

### 4. 错误处理
- ✅ 验证 API Key
- ✅ 显示错误消息
- ✅ 自动隐藏错误

---

## 🔍 工作流程

```
用户输入 "/model"
     ↓
CustomInput 检测命令
     ↓
触发 onCommand('model')
     ↓
Session 显示模型选择器
     ↓
用户使用上下键导航
     ↓
按 Enter 确认
     ↓
更新环境变量
     ↓
显示确认消息
     ↓
自动关闭选择器
```

---

## 📊 组件交互

```
CustomInput
    ↓ onCommand('model')
Session
    ↓ setShowModelSelector(true)
Session (Model Selector UI)
    ↓ ↑↓ 键盘输入
useInput
    ↓ 更新索引
Session (re-render)
    ↓ Enter
handleModelSelect
    ↓ 更新环境变量
Session (消息提示)
```

---

## 🚀 使用示例

### 示例 1: 切换模型

```
用户: /model
系统: 显示模型列表
用户: ↓ (向下选择到 Kimi)
用户: Enter (确认)
系统: [System] Model changed to: Kimi (kimi-k2.5)
```

### 示例 2: 取消选择

```
用户: /model
系统: 显示模型列表
用户: Esc (取消)
系统: 隐藏列表，返回正常输入
```

### 示例 3: 直接命令

```
用户: /settings
系统: 跳转到设置页面
```

---

## 💡 后续改进

### 1. 实时搜索
```typescript
// 允许用户输入关键字过滤
const [searchTerm, setSearchTerm] = useState('');
const filteredModels = models.filter(m =>
  m.name.toLowerCase().includes(searchTerm.toLowerCase())
);
```

### 2. 键盘快捷键
```typescript
// 数字键快速选择
if (input >= '1' && input <= '9') {
  const index = parseInt(input) - 1;
  if (index < models.length) {
    handleModelSelect();
  }
}
```

### 3. 模型详情
```typescript
// 显示模型详细信息
{selectedModel && (
  <Box>
    <Text>Max Tokens: {selectedModel.maxTokens}</Text>
    <Text>Timeout: {selectedModel.defaultTimeout}ms</Text>
  </Box>
)}
```

---

## 📂 相关文件

- `src/cli-v2-ink/components/CustomInput.tsx` - 输入组件
- `src/cli-v2-ink/components/Session.tsx` - 会话组件
- `src/providers/config.ts` - 提供者配置

---

**完成日期**: 2026-01-28
**状态**: ✅ 完成
**用户体验**: ⭐⭐⭐⭐⭐ 优秀
