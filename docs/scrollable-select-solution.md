# 可滚动选择器解决方案

## 问题描述

在使用 `ink-select-input` 构建命令选择界面时，当选项列表（items）很多时，在有限高度内无法滚动查看和选择超出显示范围的选项。

## 问题代码

```tsx
// 原始代码 - 使用 ink-select-input
<SelectInput
  items={commandList}  // 20+ 个命令
  onSelect={onSelect}
/>
```

**问题**:
- `ink-select-input` 会渲染所有选项
- 无法限制显示高度
- 超出终端高度的选项无法访问

## 解决方案

创建自定义的 **ScrollableSelect** 组件，支持：

1. **固定高度显示** - 只显示可见数量的选项
2. **虚拟滚动** - 只渲染可见范围内的项目
3. **完整导航** - 上下键、Page Up/Down、Home/End
4. **视觉指示器** - 显示当前位置和总数
5. **取消操作** - Esc 键关闭选择器

## 实现文件

### 1. 组件实现

**文件**: `src/cli/components/scrollable-select/index.tsx`

**核心特性**:
- 计算可见范围 (`visibleRange`)
- 滚动到指定索引 (`scrollToIndex`)
- 只渲染可见项目 (`visibleItems`)
- 滚动指示器 (▲/▼ + 位置)

### 2. 使用示例

**文件**: `src/cli/components/chat-input/index.tsx`

```tsx
// 更新后的代码
<ScrollableSelect
  items={commandList}
  onSelect={onSelect}
  onCancel={onCancel}
  visibleCount={6}
  height={7}
/>
```

### 3. 演示程序

**文件**: `src/cli/examples/scrollable-select-demo.tsx`

运行演示:
```bash
pnpm dev:cli scrollable-select-demo
```

## 功能对比

| 特性 | ink-select-input | ScrollableSelect |
|------|------------------|------------------|
| 显示所有选项 | ✅ | ❌ 按需渲染 |
| 固定高度 | ❌ | ✅ |
| 滚动导航 | ✅ 上下键 | ✅ 全套快捷键 |
| 位置指示 | ❌ | ✅ (1/20) |
| 虚拟滚动 | ❌ | ✅ |
| 取消操作 | ❌ | ✅ Esc |
| 搜索过滤 | ❌ | ✅ 可扩展 |

## 键盘快捷键

```
↑ / ↓           - 上下移动一行
Page Up / Down  - 上下翻页
Home            - 跳到第一项
End             - 跳到最后一项
Enter           - 确认选择
Esc             - 取消选择
```

## 使用方法

### 基础用法

```tsx
import ScrollableSelect, { SelectItem } from './components/scrollable-select';

const items: SelectItem[] = [
  { label: 'Option 1', value: 1 },
  { label: 'Option 2', value: 2 },
  // ... 更多选项
];

<ScrollableSelect
  items={items}
  onSelect={(item) => console.log(item)}
  visibleCount={5}
/>
```

### 带命令过滤

```tsx
import Input from 'ink-text-input';
import { useState } from 'react';

const CommandInput = () => {
  const [input, setInput] = useState('');
  const [showSelector, setShowSelector] = useState(false);

  const commands = [
    { label: '/init', value: 'init' },
    { label: '/help', value: 'help' },
    // ... 20+ commands
  ];

  return (
    <Box flexDirection="column">
      <Input
        value={input}
        onChange={(v) => {
          setInput(v);
          setShowSelector(v.startsWith('/'));
        }}
      />
      {showSelector && (
        <ScrollableSelect
          items={commands.filter(c => c.label.includes(input))}
          onSelect={(item) => setInput(item.label)}
          onCancel={() => setShowSelector(false)}
          height={8}
        />
      )}
    </Box>
  );
};
```

## 相关文档

- **组件文档**: `src/cli/components/scrollable-select/README.md`
- **Ink 深度解析**: `docs/ink-deep-dive.md` (第 11.3 节)

## 总结

通过创建自定义的 ScrollableSelect 组件，我们解决了 `ink-select-input` 在处理大量选项时的限制问题。新组件：

- ✅ 支持在固定高度内显示和选择大量选项
- ✅ 提供完整的键盘导航
- ✅ 显示当前位置和总数
- ✅ 支持取消操作
- ✅ 可扩展搜索过滤功能

这个解决方案已集成到项目的 `chat-input` 组件中，可以处理任意数量的命令选项。
