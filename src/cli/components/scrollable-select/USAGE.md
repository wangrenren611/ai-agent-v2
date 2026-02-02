# ScrollableSelect 组件使用指南

## 概述

重新实现的 `ScrollableSelect` 组件，集成了键盘管理器，提供更好的可维护性和扩展性。

## 主要特性

✅ **集成键盘管理器** - 使用 `useGlobalKeyboard` 统一管理键盘事件
✅ **固定高度滚动** - 在有限空间内显示大量选项
✅ **完整键盘导航** - ↑↓、Page Up/Down、Home/End
✅ **滚动指示器** - 显示当前位置和总数
✅ **搜索过滤** - 内置搜索支持
✅ **TypeScript 支持** - 完整的类型定义
✅ **可组合性** - 提供容器和专用组件

## 快速开始

### 基础用法

```tsx
import { ScrollableSelect } from './components/scrollable-select';

const items = [
  { label: '选项 1', value: 1 },
  { label: '选项 2', value: 2 },
  // ... 更多选项
];

<ScrollableSelect
  items={items}
  onSelect={(item) => console.log('选中:', item)}
  onCancel={() => console.log('取消')}
  visibleCount={8}
  height={10}
/>
```

### 命令选择器

```tsx
import { CommandSelector } from './components/scrollable-select';

const commands = [
  { label: '/help - 显示帮助', value: 'help' },
  { label: '/clear - 清屏', value: 'clear' },
  { label: '/exit - 退出', value: 'exit' },
];

<CommandSelector
  commands={commands}
  onSelect={(cmd) => console.log('执行命令:', cmd.value)}
  onCancel={() => console.log('取消')}
  searchQuery={input}  // 可选的搜索过滤
  visibleCount={6}
/>
```

### 带搜索的选择器

```tsx
import { SearchableScrollableSelect, defaultFilter } from './components/scrollable-select';

const [searchQuery, setSearchQuery] = useState('');

<SearchableScrollableSelect
  items={items}
  searchQuery={searchQuery}
  filterFunction={defaultFilter}  // 或自定义过滤函数
  onSelect={handleSelect}
/>
```

## API 参考

### ScrollableSelect

主组件，提供可滚动的选择功能。

```tsx
interface ScrollableSelectProps {
  items: SelectItem[];           // 必需：可选项列表
  onSelect: (item) => void;      // 必需：选中回调
  onCancel?: () => void;         // 可选：取消回调
  visibleCount?: number;         // 可选：可见数量（默认 5）
  height?: number;               // 可选：固定高度
  maxHeight?: number;            // 可选：最大高度（默认 10）
  enabled?: boolean;             // 可选：是否启用（默认 true）
  id?: string;                   // 可选：组件 ID
}
```

### SearchableScrollableSelect

带搜索过滤功能的选择器。

```tsx
interface SearchableScrollableSelectProps extends ScrollableSelectProps {
  searchQuery?: string;                              // 搜索关键词
  filterFunction?: (item, query) => boolean;        // 过滤函数
}
```

### CommandSelector

专门用于命令选择的高级组件。

```tsx
interface CommandSelectorProps {
  commands: SelectItem[];           // 命令列表
  onSelect: (command) => void;      // 选择回调
  onCancel?: () => void;            // 取消回调
  searchQuery?: string;             // 搜索关键词
  visibleCount?: number;            // 可见数量
}
```

### SelectContainer

带边框和标题的容器组件。

```tsx
interface SelectContainerProps {
  title?: string;         // 标题
  helpText?: string;      // 帮助文本
  children: ReactNode;    // 子组件
}
```

## 键盘快捷键

| 按键 | 功能 |
|------|------|
| `↑` / `↓` | 上下移动一行 |
| `Page Up` / `Page Down` | 上下翻页 |
| `Home` | 跳到第一项 |
| `End` | 跳到最后一项 |
| `Enter` | 确认选择 |
| `Esc` | 取消选择 |

## 完整示例

### 示例 1: 基础选择器

```tsx
import React, { useState } from 'react';
import { render, Box, Text } from 'ink';
import { ScrollableSelect, SelectContainer } from './components/scrollable-select';

const BasicExample = () => {
  const [selected, setSelected] = useState(null);

  const items = Array.from({ length: 50 }, (_, i) => ({
    label: `选项 ${i + 1}`,
    value: i + 1,
  }));

  return (
    <Box flexDirection="column">
      <SelectContainer
        title="选择一个选项"
        helpText="↑↓选择 Enter确认"
      >
        <ScrollableSelect
          items={items}
          onSelect={setSelected}
          visibleCount={8}
          height={10}
        />
      </SelectContainer>

      {selected && (
        <Box marginTop={1}>
          <Text color="green">✓ 已选择: {selected.label}</Text>
        </Box>
      )}
    </Box>
  );
};

render(<BasicExample />);
```

### 示例 2: 命令选择器集成

```tsx
import React, { useState } from 'react';
import { render, Box, Text } from 'ink';
import Input from 'ink-text-input';
import {
  CommandSelector,
  useKeyboard,
  HandlerPriority,
  useGlobalKeyboard,
  type AppMode
} from './components/scrollable-select';

const CommandInputExample = () => {
  const [mode, setMode] = useState<AppMode>('typing');
  const [input, setInput] = useState('');

  const commands = [
    { label: '/help - 帮助', value: 'help' },
    { label: '/clear - 清屏', value: 'clear' },
    { label: '/settings - 设置', value: 'settings' },
    { label: '/exit - 退出', value: 'exit' },
    { label: '/about - 关于', value: 'about' },
    { label: '/version - 版本', value: 'version' },
    { label: '/status - 状态', value: 'status' },
    { label: '/reset - 重置', value: 'reset' },
  ];

  const handleSelect = (command: any) => {
    setInput(command.label);
    setMode('typing');
    console.log('执行命令:', command.value);
  };

  const handleCancel = () => {
    setMode('typing');
  };

  // 输入处理
  useGlobalKeyboard({
    id: 'command-input',
    priority: HandlerPriority.INPUT,
    activeModes: ['typing'],
    handler: ({ input: char, key }) => {
      if (key.return && input.trim()) {
        if (input.startsWith('/')) {
          setMode('commandSelect');
        } else {
          console.log('发送消息:', input);
          setInput('');
        }
        return true;
      }

      if (char && !key.ctrl && char.length === 1) {
        setInput(input + char);
        return true;
      }

      if (key.backspace) {
        setInput(input.slice(0, -1));
        return true;
      }

      return false;
    },
  });

  return (
    <Box flexDirection="column">
      {/* 输入框 */}
      {mode === 'typing' && (
        <Box>
          <Text>{'> '}</Text>
          <Text>{input}</Text>
          <Text dimColor>█</Text>
        </Box>
      )}

      {/* 命令选择器 */}
      {mode === 'commandSelect' && (
        <CommandSelector
          commands={commands}
          searchQuery={input}
          onSelect={handleSelect}
          onCancel={handleCancel}
          visibleCount={6}
        />
      )}

      {/* 提示 */}
      <Box marginTop={1}>
        <Text dimColor>输入 / 显示命令，Ctrl+C 退出</Text>
      </Box>
    </Box>
  );
};

render(<CommandInputExample />);
```

### 示例 3: 带搜索的选择器

```tsx
import React, { useState } from 'react';
import { render, Box, Text, TextInput } from 'ink';
import {
  SearchableScrollableSelect,
  SelectContainer,
  defaultFilter,
} from './components/scrollable-select';

const SearchExample = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState(null);

  const items = [
    { label: 'Apple - 苹果', value: 'apple' },
    { label: 'Banana - 香蕉', value: 'banana' },
    { label: 'Cherry - 樱桃', value: 'cherry' },
    { label: 'Date - 枣', value: 'date' },
    { label: 'Elderberry - 接骨木', value: 'elderberry' },
    { label: 'Fig - 无花果', value: 'fig' },
    { label: 'Grape - 葡萄', value: 'grape' },
    // ... 更多水果
  ];

  return (
    <Box flexDirection="column" width={50}>
      {/* 搜索框 */}
      <Box marginBottom={1}>
        <Text>搜索: </Text>
        <TextInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="输入关键词..."
        />
      </Box>

      {/* 选择器 */}
      <SelectContainer
        title="选择水果"
        helpText={searchQuery ? `搜索: "${searchQuery}"` : '↑↓选择 Enter确认'}
      >
        <SearchableScrollableSelect
          items={items}
          searchQuery={searchQuery}
          filterFunction={defaultFilter}
          onSelect={setSelected}
          visibleCount={6}
          height={8}
        />
      </SelectContainer>

      {/* 选中结果 */}
      {selected && (
        <Box marginTop={1}>
          <Text color="green">✓ 已选择: {selected.label}</Text>
        </Box>
      )}
    </Box>
  );
};

render(<SearchExample />);
```

## 高级用法

### 自定义过滤函数

```tsx
const customFilter = (item: SelectItem, query: string): boolean => {
  // 不区分大小写的标签匹配
  const lowerQuery = query.toLowerCase();
  return item.label.toLowerCase().includes(lowerQuery);

  // 或者：同时匹配标签和值
  return (
    item.label.toLowerCase().includes(lowerQuery) ||
    String(item.value).toLowerCase().includes(lowerQuery)
  );

  // 或者：使用正则表达式
  try {
    const regex = new RegExp(query, 'i');
    return regex.test(item.label);
  } catch {
    return item.label.includes(query);
  }
};

<SearchableScrollableSelect
  items={items}
  searchQuery={searchQuery}
  filterFunction={customFilter}
  onSelect={handleSelect}
/>
```

### 动态更新选项

```tsx
const DynamicOptions = () => {
  const [items, setItems] = useState(initialItems);

  // 添加新选项
  const addItem = () => {
    setItems(prev => [
      ...prev,
      {
        label: `新选项 ${prev.length + 1}`,
        value: prev.length + 1,
      },
    ]);
  };

  // 删除选项
  const removeItem = (value: number) => {
    setItems(prev => prev.filter(item => item.value !== value));
  };

  return (
    <>
      <Button onClick={addItem}>添加选项</Button>
      <ScrollableSelect
        items={items}
        onSelect={(item) => {
          console.log('选中:', item);
          removeItem(item.value);
        }}
      />
    </>
  );
};
```

### 组合使用多个选择器

```tsx
const MultiSelector = () => {
  const [mode, setMode] = useState<'main' | 'category' | 'item'>('main');

  const categories = [
    { label: '水果', value: 'fruit' },
    { label: '蔬菜', value: 'vegetable' },
    { label: '肉类', value: 'meat' },
  ];

  const fruits = [
    { label: '苹果', value: 'apple' },
    { label: '香蕉', value: 'banana' },
    { label: '橙子', value: 'orange' },
  ];

  return (
    <Box flexDirection="column">
      {mode === 'main' && (
        <ScrollableSelect
          items={categories}
          onSelect={() => setMode('category')}
        />
      )}

      {mode === 'category' && (
        <ScrollableSelect
          items={fruits}
          onSelect={(item) => {
            console.log('选择了:', item);
            setMode('main');
          }}
          onCancel={() => setMode('main')}
        />
      )}
    </Box>
  );
};
```

## 最佳实践

### 1. 使用专用组件

```tsx
// ✅ 好：使用 CommandSelector
<CommandSelector
  commands={commands}
  onSelect={handleSelect}
/>

// ⚠️ 可接受：使用 ScrollableSelect
<ScrollableSelect
  items={commands}
  onSelect={handleSelect}
/>
```

### 2. 提供搜索功能

```tsx
// ✅ 好：带搜索
const [search, setSearch] = useState('');

<SearchableScrollableSelect
  items={items}
  searchQuery={search}
  filterFunction={defaultFilter}
/>

// ⚠️ 可接受：不带搜索（选项少时）
<ScrollableSelect items={items} />
```

### 3. 处理空状态

```tsx
// ✅ 好：处理空选项
const NoItems = () => (
  <Box padding={1}>
    <Text dimColor>暂无可用选项</Text>
  </Box>
);

{items.length === 0 ? (
  <NoItems />
) : (
  <ScrollableSelect items={items} />
)}
```

### 4. 提供清晰的反馈

```tsx
// ✅ 好：显示选中项
<Box>
  <Text>当前选择: </Text>
  <Text color="cyan">{selected?.label || '无'}</Text>
</Box>

// ✅ 好：显示帮助文本
<SelectContainer
  title="命令"
  helpText="↑↓选择 Page翻页 Enter确认 Esc取消"
>
  <ScrollableSelect items={commands} />
</SelectContainer>
```

## 迁移指南

### 从旧版本迁移

```tsx
// 旧版本
import SelectInput from 'ink-select-input';

<SelectInput
  items={items}
  onSelect={handleSelect}
/>

// 新版本
import { ScrollableSelect } from './components/scrollable-select';

<ScrollableSelect
  items={items}
  onSelect={handleSelect}
  onCancel={handleCancel}  // 新增：支持取消
  visibleCount={5}         // 新增：控制可见数量
  height={7}               // 新增：固定高度
/>
```

### 从 ink-select-input 迁移

| 功能 | ink-select-input | ScrollableSelect |
|------|------------------|------------------|
| 固定高度 | ❌ | ✅ `height` prop |
| 滚动导航 | ✅ 基础 | ✅ 完整（Page Up/Down 等）|
| 搜索过滤 | ❌ 需自行实现 | ✅ `SearchableScrollableSelect` |
| 取消操作 | ❌ | ✅ `onCancel` + Esc |
| 滚动指示器 | ❌ | ✅ 自动显示 |
| 键盘管理 | 分散管理 | ✅ 统一管理 |

## 故障排除

### 问题：按键没有反应

**原因**: 可能没有在键盘管理器范围内

**解决**:
```tsx
// ✅ 确保在 KeyboardManager 内
<KeyboardManager>
  <App>
    <ScrollableSelect items={items} />
  </App>
</KeyboardManager>
```

### 问题：选择器不显示

**原因**: `enabled` 或 activeModes 配置问题

**解决**:
```tsx
// ✅ 检查启用状态
<ScrollableSelect
  items={items}
  enabled={true}  // 确保启用
/>
```

### 问题：滚动不流畅

**原因**: `visibleCount` 或 `height` 设置不当

**解决**:
```tsx
// ✅ 合理设置高度
<ScrollableSelect
  items={items}
  height={10}         // 固定高度
  visibleCount={8}    // 小于高度
/>
```

## 相关文档

- **键盘管理器**: `docs/keyboard-manager-complete-guide.md`
- **源代码**: `src/cli/components/scrollable-select/index-v2.tsx`
- **演示程序**: `src/cli/examples/scrollable-select-demo.tsx`
