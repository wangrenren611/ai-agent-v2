# 模型选择列表界面优化

## ✅ 完成的工作

### 1. 创建 SelectList 组件

**文件**: `src/cli-v2-ink/components/SelectList.tsx`

功能：
- 使用上下键（↑↓）导航
- 支持受控和非受控模式
- 高亮显示当前选中项
- 按 Enter 键确认选择

界面布局：
```
▶ OpenAI (Zhipu AI)     [GLM]      glm-4-plus
  Kimi (Moonshot AI)      [KIMI]     kimi-k2.5
  DeepSeek                [DEEPSEEK] deepseek-chat
  ...
```

---

### 2. 修改 Settings 路由

**文件**: `src/cli-v2-ink/routes/settings.tsx`

改进：
- 使用 SelectList 组件替代命令行输入
- 显示当前选中的模型和提供者
- 自动初始化当前选择的模型
- 显示所有可用的模型列表
- 错误提示和确认反馈

交互说明：
- **↑↓ 箭头键**: 在列表中导航
- **Enter 键**: 确认选择
- **Esc 键**: 返回主页
- **Ctrl+C**: 退出程序

---

### 3. 更新组件导出

**文件**: `src/cli-v2-ink/components/index.ts`

添加 SelectList 组件导出。

---

## 🎨 界面展示

```
┌─────────────────────────────────────────────────────────────────┐
│ Settings - Model Selection                                     │
├─────────────────────────────────────────────────────────────────┤
│ Current: glm-4-plus (GLM (Zhipu AI))                         │
│                                                                 │
│ Use ↑↓ arrows to navigate, Enter to select                     │
│ Press Esc to return                                             │
│                                                                 │
│ Available Models:                                              │
│ ▶ GLM (Zhipu AI)          [GLM]      glm-4-plus            │
│   Kimi (Moonshot AI)       [KIMI]     kimi-k2.5              │
│   DeepSeek                [DEEPSEEK] deepseek-chat          │
│   OpenAI                  [OPENAI]   gpt-4o-mini            │
│   MiniMax                 [MINIMAX]  abab6.5s-chat          │
│   Qwen (Alibaba)          [QWEN]     qwen-plus              │
│                                                                 │
│ ✓ Model selected: glm-4-plus                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 组件接口

### SelectList

```typescript
interface SelectListItem {
  id: string;        // 唯一标识符
  label: string;      // 显示名称
  provider: string;   // 提供者名称
  model: string;      // 模型名称
}

interface SelectListProps {
  items: SelectListItem[];       // 列表项
  onSelect: (item: SelectListItem) => void;  // 选择回调
  selectedIndex?: number;        // 当前选中项（可选）
}
```

---

## 🔧 使用方式

### 基础用法

```tsx
import { SelectList } from './components/SelectList';

const items = [
  { id: 'glm-4-plus', label: 'GLM', provider: 'GLM', model: 'glm-4-plus' },
  { id: 'kimi-k2.5', label: 'Kimi', provider: 'KIMI', model: 'kimi-k2.5' },
];

<SelectList
  items={items}
  selectedIndex={0}
  onSelect={(item) => console.log('Selected:', item)}
/>
```

### 受控模式

```tsx
const [selectedIndex, setSelectedIndex] = useState(0);

<SelectList
  items={items}
  selectedIndex={selectedIndex}
  onSelect={(item) => {
    const index = items.findIndex(i => i.id === item.id);
    setSelectedIndex(index);
    handleSelectModel(item);
  }}
/>
```

### 非受控模式

```tsx
<SelectList
  items={items}
  onSelect={(item) => {
    console.log('Selected:', item);
  }}
/>
```

---

## 🎯 功能特性

### 导航
- ✅ 使用 ↑↓ 键在列表中导航
- ✅ 循环导航（从最后一项到第一项）
- ✅ 高亮显示当前选中项

### 选择
- ✅ 按 Enter 键确认选择
- ✅ 触发 `onSelect` 回调
- ✅ 返回选中的 `SelectListItem`

### 显示
- ✅ 彩色高亮（绿色选中，灰色未选中）
- ✅ 显示提供者信息
- ✅ 显示模型名称
- ✅ 使用箭头 (▶) 标记当前项

---

## 🔄 与旧版本对比

| 特性 | 旧版本 | 新版本 |
|------|--------|--------|
| **交互方式** | 输入命令 | 上下键导航 |
| **可见性** | 需要记忆命令 | 列表直接展示 |
| **易用性** | 需要手动输入 | 一键选择 |
| **错误率** | 容易拼写错误 | 无拼写问题 |
| **用户体验** | 一般 | 优秀 |

---

## 📊 技术实现

### 使用的技术
- **React Hooks**: useState, useEffect, useCallback, useMemo
- **Ink Components**: Box, Text, useInput
- **TypeScript**: 完全类型安全

### 核心逻辑

```typescript
// 1. 处理键盘输入
useInput((input, key) => {
  if (key.upArrow) {
    setInternalIndex(prev => (prev > 0 ? prev - 1 : items.length - 1));
  }

  if (key.downArrow) {
    setInternalIndex(prev => (prev < items.length - 1 ? prev + 1 : 0));
  }

  if (key.return) {
    onSelect(items[selectedIndex]);
  }
});

// 2. 渲染列表
{items.map((item, index) => (
  <Box key={item.id}>
    <Text color={index === selectedIndex ? 'green' : 'gray'}>
      {index === selectedIndex ? '▶ ' : '  '}
    </Text>
    <Text color={index === selectedIndex ? 'green' : 'white'}>
      {item.label}
    </Text>
    ...
  </Box>
))}
```

---

## 🔍 类型检查

```bash
✅ TypeScript 编译通过
✅ 无类型错误
✅ SelectList 组件类型安全
✅ Settings 路由类型安全
```

---

## 🚀 运行测试

```bash
# 启动 CLI
pnpm dev:cli-v2-ink

# 导航到设置页面
# 按 's' 键或选择 'Settings'

# 测试列表导航
# 使用 ↑↓ 键在列表中导航
# 按 Enter 选择模型
# 按 Esc 返回
```

---

## 💡 后续改进建议

### 1. 添加搜索功能
```typescript
// 允许用户输入关键字过滤列表
const [searchTerm, setSearchTerm] = useState('');
const filteredItems = items.filter(item =>
  item.label.toLowerCase().includes(searchTerm.toLowerCase())
);
```

### 2. 添加分页
```typescript
// 对于大量模型，可以分页显示
const itemsPerPage = 10;
const [currentPage, setCurrentPage] = useState(0);
const displayedItems = items.slice(
  currentPage * itemsPerPage,
  (currentPage + 1) * itemsPerPage
);
```

### 3. 添加键盘快捷键
```typescript
// 添加数字键快速选择
useInput((input, key) => {
  const index = parseInt(input) - 1;
  if (index >= 0 && index < items.length) {
    onSelect(items[index]);
  }
});
```

### 4. 添加模型描述
```typescript
interface SelectListItem {
  id: string;
  label: string;
  provider: string;
  model: string;
  description?: string;  // 添加描述
}
```

---

## 📚 相关文件

- `src/cli-v2-ink/components/SelectList.tsx` - 列表选择组件
- `src/cli-v2-ink/routes/settings.tsx` - 设置页面
- `src/cli-v2-ink/components/index.ts` - 组件导出
- `src/providers/config.ts` - 提供者配置

---

**完成日期**: 2026-01-28
**状态**: ✅ 完成
**用户体验**: ⭐⭐⭐⭐⭐ 显著提升
