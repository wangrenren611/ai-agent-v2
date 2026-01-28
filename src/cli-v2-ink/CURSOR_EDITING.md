# 光标编辑功能说明

## 概述

`CustomInput` 组件使用 `ink-text-input` 库实现了光标移动和编辑功能，提供了类似原生终端输入框的编辑体验。

## 功能特性

### 1. 光标移动

- **左箭头键 (←)**：将光标向左移动一个字符
- **右箭头键 (→)**：将光标向右移动一个字符
- **Ctrl + ←**：将光标移动到字符串开头
- **Ctrl + →**：将光标移动到字符串末尾
- **Ctrl + A**：移动到开头
- **Ctrl + E**：移动到末尾

### 2. 字符插入

- 在任意光标位置输入字符都会在当前位置插入
- 光标会自动跟随到插入字符的后面

### 3. 字符删除

- **Backspace 键**：删除光标前一个字符，光标向左移动
- **Ctrl + H**：删除光标前一个字符（同 Backspace）
- **Delete 键**：删除光标当前位置字符，光标位置不变
- **Ctrl + D**：删除光标当前位置字符（同 Delete）

### 4. 高级编辑

- **Ctrl + U**：删除到行首
- **Ctrl + K**：删除到行尾
- **Ctrl + W**：删除到单词开头
- **Alt + Backspace**：删除到单词开头
- **Ctrl + Delete**：删除到单词末尾
- **Alt + Delete**：删除到单词末尾

### 5. 光标显示

- 光标使用反色块显示
- 实时反映当前光标位置
- 当输入框失焦时，光标隐藏

## 技术实现

### 使用 ink-text-input 库

`CustomInput` 组件基于 `ink-text-input` 库构建，这是一个专门为 Ink 设计的文本输入组件。

```typescript
import TextInput from 'ink-text-input';

const CustomInput: React.FC<CustomInputProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = '',
}) => {
  return (
    <TextInput
      value={value}
      onChange={onChange}
      onSubmit={onSubmit}
      placeholder={placeholder}
      showCursor={true}
      focus={!disabled}
    />
  );
};
```

### 关键属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `value` | `string` | 输入框的值（受控组件） |
| `onChange` | `(value: string) => void` | 值变化时的回调函数 |
| `onSubmit` | `(value: string) => void` | 按回车时的回调函数 |
| `placeholder` | `string` | 占位符文本 |
| `showCursor` | `boolean` | 是否显示光标并允许导航 |
| `focus` | `boolean` | 组件是否获得焦点 |

### 焦点管理

`ink-text-input` 使用内置的焦点管理系统。当 `focus` 为 `true` 时，组件接收键盘输入；当为 `false` 时，输入被忽略。

```typescript
focus={!disabled}
```

这样可以在处理消息时禁用输入框。

## 使用示例

在 Session 组件中使用：

```typescript
const [input, setInput] = useState('');

<CustomInput
  value={input}
  onChange={setInput}
  onSubmit={submitMessage}
  placeholder="Type your message..."
  disabled={isProcessing}
/>
```

### 处理全局快捷键

在 Session 组件中，我们使用 `useInput` hook 处理全局快捷键，同时让 `TextInput` 处理编辑键：

```typescript
useInput((inputChar: string, key: any) => {
  // 让 TextInput 处理编辑键
  if (key.leftArrow || key.rightArrow || key.backspace || key.delete || ...) {
    return; // 传递给 TextInput
  }

  // 处理全局快捷键
  if (key.ctrl && inputChar === 'c') {
    exit();
    return;
  }

  if (key.escape) {
    navigate('home');
    return;
  }
});
```

## 键盘快捷键参考

| 按键 | 功能 |
|------|------|
| ← | 向左移动光标 |
| → | 向右移动光标 |
| ↑ / ↓ | 在历史记录中导航（如果支持） |
| Ctrl + ← | 跳到单词开头 |
| Ctrl + → | 跳到单词末尾 |
| Home / Ctrl + A | 跳到行首 |
| End / Ctrl + E | 跳到行尾 |
| Backspace / Ctrl + H | 删除光标前一个字符 |
| Delete / Ctrl + D | 删除光标当前字符 |
| Ctrl + U | 删除到行首 |
| Ctrl + K | 删除到行尾 |
| Ctrl + W | 删除到单词开头 |
| Alt + Backspace | 删除到单词开头 |
| Ctrl + Delete | 删除到单词末尾 |
| Alt + Delete | 删除到单词末尾 |
| Enter | 提交输入 |
| 任意字符键 | 在光标位置插入字符 |

## 依赖版本

为了使用 `ink-text-input`，需要以下依赖版本：

```json
{
  "dependencies": {
    "ink": "^6.6.0",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "ink-text-input": "^6.0.0"
  }
}
```

## 优势

使用 `ink-text-input` 相比自定义实现的优势：

1. **成熟稳定**：经过充分测试，处理各种边缘情况
2. **功能完整**：支持丰富的编辑快捷键
3. **自动处理焦点**：内置焦点管理系统
4. **跨终端兼容**：在大多数终端上都能正常工作
5. **无障碍支持**：考虑了可访问性
6. **维护活跃**：持续更新和修复

## 注意事项

1. **焦点管理**：确保 `focus` 属性正确设置，特别是在有多个输入组件时
2. **禁用状态**：当 `disabled` 为 `true` 时，`focus` 应设为 `false`
3. **受控组件**：必须通过 `value` 和 `onChange` 来控制输入值
4. **onSubmit 可选**：`onSubmit` 是可选的，如果不提供，按回车不会触发提交

## 故障排除

如果光标或编辑功能不工作，请检查：

1. **依赖版本**：确认 `ink`、`react` 和 `ink-text-input` 版本兼容
2. **焦点状态**：检查 `focus` 属性是否为 `true`
3. **终端支持**：确认终端支持完整的键盘输入
4. **事件冲突**：确保没有其他组件在拦截编辑键事件
5. **禁用状态**：检查 `disabled` 属性是否为 `false`

## 文件位置

- 组件实现：`src/cli-v2-ink/components/CustomInput.tsx`
- 使用示例：`src/cli-v2-ink/components/Session.tsx`
- 库文档：https://github.com/vadimdemedes/ink-text-input

## 更新日期

2026-01-28
