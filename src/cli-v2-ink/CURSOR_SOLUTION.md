# 光标编辑功能实现总结

## 问题分析

用户反馈：光标问题还是没有解决，前后按钮没有任何反应。

## 根本原因

经过深入研究，发现了以下问题：

1. **自定义实现的局限性**：我们自己实现的 CustomInput 组件虽然逻辑正确，但可能存在以下问题：
   - 箭头键事件处理不完善
   - 光标显示可能不正确
   - 边缘情况处理不足
   - 与 Ink 的事件系统集成不够好

2. **Ink 生态系统**：Ink 官方推荐使用专门的库来处理输入，而不是自己实现。

3. **版本兼容性**：Ink 6.6.0 与 React 19 存在兼容性问题，需要降级到稳定版本。

## 解决方案

### 1. 使用 `ink-text-input` 库

这是由 Ink 作者 Vadim Demedes 开发的官方推荐库，专门用于处理 Ink 应用中的文本输入。

**安装依赖：**
```bash
pnpm add ink-text-input ink@^5.2.1 react@^18.3.1 react-dom@^18.3.1
```

**依赖版本（稳定组合）：**
- `ink`: ^5.2.1
- `react`: ^18.3.1
- `react-dom`: ^18.3.1
- `ink-text-input`: ^6.0.0

### 2. 简化 CustomInput 组件

使用 `ink-text-input` 后，CustomInput 组件变得非常简单：

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

**关键属性：**
- `showCursor={true}`: 显示光标并允许导航
- `focus={!disabled}`: 控制组件是否获得焦点

### 3. Session 组件的事件处理

保持 Session 组件的 `useInput` hook 来处理全局快捷键：

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

## 支持的功能

### 基础导航
- ← / → : 左右移动光标
- Home / Ctrl + A : 跳到行首
- End / Ctrl + E : 跳到行末
- Ctrl + ← / → : 单词级导航

### 编辑操作
- 在任意位置插入字符
- Backspace / Delete : 删除字符
- Ctrl + U / K : 删除到行首/行尾
- Ctrl + W / Alt + Backspace : 删除到单词开头
- Ctrl + Delete / Alt + Delete : 删除到单词末尾

### 高级特性
- 光标实时显示
- 焦点管理
- 禁用状态支持
- 占位符显示

## 文件修改清单

### 1. `src/cli-v2-ink/components/CustomInput.tsx`
- 完全重写，使用 `ink-text-input` 库
- 从约 150 行代码简化到约 20 行

### 2. `src/cli-v2-ink/components/Session.tsx`
- 恢复 `useInput` hook 处理全局快捷键
- 过滤编辑键，让它们传递给 TextInput

### 3. `package.json`
- 升级依赖：
  - `ink`: 4.4.1 → 5.2.1
  - `react`: 18.3.1（保持）
  - `react-dom`: 18.3.1（保持）
  - 新增 `ink-text-input`: 6.0.0

### 4. `tsconfig.json`
- 添加 `jsxFragmentFactory` 配置

### 5. 文档
- `src/cli-v2-ink/CURSOR_EDITING.md`: 更新为使用 `ink-text-input` 的说明
- `src/cli-v2-ink/CURSOR_SOLUTION.md`: 本文档

## 优势

相比自定义实现，使用 `ink-text-input` 的优势：

1. **成熟稳定**：经过充分测试，处理各种边缘情况
2. **功能完整**：支持丰富的编辑快捷键
3. **自动处理焦点**：内置焦点管理系统
4. **跨终端兼容**：在大多数终端上都能正常工作
5. **维护活跃**：持续更新和修复
6. **代码简洁**：减少自定义代码，降低维护成本
7. **官方推荐**：由 Ink 作者维护

## 测试方法

运行 CLI v2 Ink：

```bash
pnpm dev:cli-v2-ink
```

**测试步骤：**
1. 输入一些字符，例如 "hello world"
2. 按左箭头键多次，观察光标是否向左移动
3. 按右箭头键，观察光标是否向右移动
4. 使用 Ctrl + A / Ctrl + E 跳到开头/末尾
5. 在光标位于中间位置时输入字符，观察是否在光标位置插入
6. 按 Backspace 或 Delete，观察是否正确删除字符
7. 测试高级编辑：Ctrl + U、Ctrl + K 等

## 注意事项

1. **版本兼容性**：确保 Ink、React 和 ink-text-input 版本兼容
2. **焦点管理**：在有多个输入组件时，注意焦点切换
3. **禁用状态**：当 `disabled` 为 true 时，`focus` 应设为 `false`
4. **事件过滤**：确保全局快捷键不干扰编辑键
5. **TTY 要求**：必须在交互式终端中运行

## 故障排除

### 如果遇到 "Cannot read properties of undefined (reading 'create')" 错误

这是 Ink 6.6.0 与 React 19 的兼容性问题。解决方案：

```bash
pnpm add ink@^5.2.1 react@^18.3.1 react-dom@^18.3.1
```

### 如果光标或编辑功能不工作

请检查：

1. **依赖版本**：确认 `ink`、`react` 和 `ink-text-input` 版本兼容
2. **焦点状态**：检查 `focus` 属性是否为 `true`
3. **终端支持**：确认终端支持完整的键盘输入
4. **事件冲突**：确保没有其他组件在拦截编辑键事件
5. **禁用状态**：检查 `disabled` 属性是否为 `false`
6. **TTY 模式**：必须在交互式终端中运行，不能通过管道或后台进程

### 运行环境要求

```bash
# ✅ 正确：在终端中直接运行
pnpm dev:cli-v2-ink

# ❌ 错误：通过管道
echo "test" | pnpm dev:cli-v2-ink

# ❌ 错误：后台运行
pnpm dev:cli-v2-ink &
```

## 参考资源

- [ink-text-input GitHub](https://github.com/vadimdemedes/ink-text-input)
- [Ink 官方文档](https://github.com/vadimdemedes/ink)
- [useInput Hook 文档](https://github.com/vadimdemedes/ink/blob/master/src/hooks/use-input.ts)
- [Ink 版本说明](https://github.com/vadimdemedes/ink/releases)

## 更新日期

2026-01-28
