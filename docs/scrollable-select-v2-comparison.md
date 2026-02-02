# ScrollableSelect 新旧实现对比

## 架构对比

### 旧实现 (index.tsx)

```tsx
// ❌ 问题：组件内部直接使用 useInput
const ScrollableSelect = () => {
  // 状态管理
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  // 在组件内部直接使用 useInput
  useInput((input, key) => {
    if (key.upArrow) {
      // 处理
    }
    if (key.escape) {
      // 处理
    }
    // ...
  });

  return <Box>...</Box>;
};
```

**问题**:
1. ❌ 每个实例都创建一个 useInput 监听器
2. ❌ 多个组件实例会冲突
3. ❌ 难以控制优先级
4. ❌ 无法统一管理键盘事件

### 新实现 (index-v2.tsx)

```tsx
// ✅ 解决方案：使用键盘管理器
import { useGlobalKeyboard, HandlerPriority } from '../../context/keyboard';

const ScrollableSelect = () => {
  // 状态管理
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  // 处理逻辑抽离为独立函数
  const handleKeyDown = useCallback(({ key }) => {
    if (key.upArrow) {
      scrollToIndex(selectedIndex - 1);
      return true;  // 返回 true 停止传播
    }
    // ...
    return false;
  }, [selectedIndex, scrollToIndex]);

  // 注册到键盘管理器
  useGlobalKeyboard({
    id: 'scrollable-select-navigation',
    priority: HandlerPriority.MODAL,  // 明确的优先级
    activeModes: enabled ? [mode] : [],  // 模式控制
    handler: handleKeyDown,
  });

  return <Box>...</Box>;
};
```

**优势**:
1. ✅ 单一全局 useInput 监听器
2. ✅ 多个组件不会冲突
3. ✅ 优先级清晰可控
4. ✅ 统一的键盘事件管理

---

## 功能对比

| 功能 | 旧实现 | 新实现 | 说明 |
|------|--------|--------|------|
| **基础滚动** | ✅ | ✅ | 上下键导航 |
| **Page Up/Down** | ✅ | ✅ | 快速翻页 |
| **Home/End** | ✅ | ✅ | 跳转首尾 |
| **滚动指示器** | ✅ | ✅ | 显示位置 |
| **固定高度** | ✅ | ✅ | height prop |
| **键盘管理** | ❌ useInput | ✅ useGlobalKeyboard | 核心差异 |
| **模式控制** | ❌ | ✅ activeModes | 新增功能 |
| **优先级系统** | ❌ | ✅ priority | 新增功能 |
| **事件传播** | ❌ | ✅ 返回值控制 | 新增功能 |
| **专用组件** | ❌ | ✅ CommandSelector | 新增组件 |
| **容器组件** | ❌ | ✅ SelectContainer | 新增组件 |

---

## 代码质量对比

### 1. 关注点分离

**旧实现**:
```tsx
// ❌ 所有逻辑混在一起
const ScrollableSelect = () => {
  const [state, setState] = useState();

  useInput((input, key) => {
    // 键盘处理逻辑
    if (key.upArrow) { /* ... */ }
    if (key.downArrow) { /* ... */ }
    if (key.pageUp) { /* ... */ }
    // ... 50+ 行处理逻辑
  });

  return <Box>{/* 渲染逻辑 */}</Box>;
};
```

**新实现**:
```tsx
// ✅ 逻辑分离，清晰明了
const ScrollableSelect = () => {
  const [state, setState] = useState();

  // 滚动逻辑独立
  const scrollToIndex = useCallback((index) => {
    // 滚动计算
  }, []);

  // 键盘处理独立
  const handleKeyDown = useCallback(({ key }) => {
    // 键盘处理
    return true/false;
  }, [scrollToIndex]);

  // 注册到管理器
  useGlobalKeyboard({
    id: 'scrollable-select',
    priority: HandlerPriority.MODAL,
    activeModes: [mode],
    handler: handleKeyDown,
  });

  return <Box>{/* 渲染逻辑 */}</Box>;
};
```

### 2. 可测试性

**旧实现**:
```tsx
// ❌ 难以测试，键盘处理耦合在组件内
test('up arrow moves selection', () => {
  // 如何模拟 useInput？
  // 如何验证键盘处理逻辑？
});
```

**新实现**:
```tsx
// ✅ 容易测试，处理逻辑独立
test('up arrow moves selection', () => {
  const handleKeyDown = createScrollableSelectHandler({
    selectedIndex: 5,
    scrollToIndex: mockFn,
  });

  const result = handleKeyDown({
    input: '',
    key: { upArrow: true, /* ... */ }
  });

  expect(result).toBe(true);
  expect(mockFn).toHaveBeenCalledWith(4);
});
```

### 3. 可维护性

**旧实现**:
```tsx
// ❌ 难以修改，键盘逻辑嵌入组件
// 要添加新快捷键？修改组件内部
// 要改变优先级？没有优先级概念
```

**新实现**:
```tsx
// ✅ 容易修改，配置化
// 要添加新快捷键？在 handler 中添加
// 要改变优先级？修改 priority prop
// 要改变激活模式？修改 activeModes

<ScrollableSelect
  items={items}
  priority={HandlerPriority.CRITICAL}  // 配置优先级
  activeModes={['typing', 'selecting']}  // 配置模式
  onSelect={handleSelect}
/>
```

---

## 性能对比

### 场景 1: 单个选择器

| 指标 | 旧实现 | 新实现 |
|------|--------|--------|
| useInput 实例 | 1 | 1 (全局) |
| 内存占用 | 基准 | 略低 (共享管理器) |
| 响应速度 | 基准 | 基准 |

**结论**: 单个选择器时性能相近

### 场景 2: 多个选择器

| 指标 | 旧实现 | 新实现 |
|------|--------|--------|
| useInput 实例 | N (每个组件一个) | 1 (全局共享) |
| 事件处理次数 | N × 按键 | 1 × 按键 (优先级队列) |
| 冲突风险 | 高 | 无 |
| 内存占用 | N × 基准 | 基准 + 管理器开销 |

**结论**: 多个选择器时新实现明显更优

### 场景 3: 动态创建/销毁

| 指标 | 旧实现 | 新实现 |
|------|--------|--------|
| 注册/注销 | 每次 create/destroy | 每次调用 registerHandler |
| 开销 | 高 (创建监听器) | 低 (更新 Map) |
| 内存泄漏风险 | 高 (需手动清理) | 低 (自动管理) |

**结论**: 动态场景下新实现更安全

---

## 使用复杂度对比

### 旧实现使用方式

```tsx
// 简单场景：可以用
<ScrollableSelect
  items={items}
  onSelect={handleSelect}
/>

// 复杂场景：难以处理
// ❌ 如何避免多个选择器冲突？
// ❌ 如何控制优先级？
// ❌ 如何在不同模式下启用/禁用？
```

### 新实现使用方式

```tsx
// 简单场景：一样简单
<ScrollableSelect
  items={items}
  onSelect={handleSelect}
/>

// 复杂场景：轻松处理
// ✅ 自动避免冲突（单一 useInput）
// ✅ 配置优先级
<ScrollableSelect
  items={items}
  priority={HandlerPriority.CRITICAL}
  onSelect={handleSelect}
/>

// ✅ 模式控制
<ScrollableSelect
  items={items}
  enabled={mode === 'selecting'}
  onSelect={handleSelect}
/>

// ✅ 使用专用组件
<CommandSelector
  commands={commands}
  searchQuery={input}
  onSelect={handleSelect}
/>
```

---

## 迁移步骤

### 步骤 1: 更新导入

```tsx
// 旧版本
import ScrollableSelect from './components/scrollable-select';

// 新版本
import { ScrollableSelect } from './components/scrollable-select';
```

### 步骤 2: 添加键盘管理器

```tsx
// 在应用根部添加
import { KeyboardManager } from './context/keyboard';

<KeyboardManager onExit={() => process.exit(0)}>
  <App>
    {/* 你的组件 */}
  </App>
</KeyboardManager>
```

### 步骤 3: 更新组件使用

```tsx
// 旧版本
<ScrollableSelect
  items={items}
  onSelect={handleSelect}
/>

// 新版本（如果需要取消功能）
<ScrollableSelect
  items={items}
  onSelect={handleSelect}
  onCancel={handleCancel}  // 新增
/>

// 或者使用专用组件
<CommandSelector
  commands={commands}
  onSelect={handleSelect}
  onCancel={handleCancel}
/>
```

### 步骤 4: 测试功能

1. ✅ 基本导航（上下键）
2. ✅ 快速翻页（Page Up/Down）
3. ✅ 跳转首尾（Home/End）
4. ✅ 确认选择（Enter）
5. ✅ 取消选择（Esc）
6. ✅ 多个选择器不冲突

---

## 推荐使用场景

### 使用新实现 (index-v2.tsx)

✅ **推荐用于**:
- 需要多个选择器的应用
- 需要明确优先级控制
- 需要模式切换
- 复杂的键盘交互
- 需要与其他键盘功能集成

### 使用旧实现 (index.tsx)

⚠️ **仅用于**:
- 简单的独立原型
- 不需要与其他组件协作
- 快速验证想法
- 学习参考

---

## 总结

### 新实现的核心优势

1. **统一管理** - 所有键盘事件由键盘管理器统一处理
2. **无冲突** - 多个组件不会产生键盘事件冲突
3. **可扩展** - 易于添加新功能和快捷键
4. **可测试** - 处理逻辑独立，易于单元测试
5. **可维护** - 清晰的架构和关注点分离

### 迁移建议

**立即迁移** 如果你:
- 有多个选择器组件
- 需要模式切换功能
- 遇到键盘冲突问题
- 计划添加更多键盘交互

**逐步迁移** 如果你:
- 已有稳定的应用
- 只使用单个选择器
- 没有冲突问题
- 资源有限

**保持旧版本** 如果你:
- 只是在做原型验证
- 不需要扩展功能
- 应用即将废弃

---

## 相关文档

- **新实现源码**: `src/cli/components/scrollable-select/index-v2.tsx`
- **使用指南**: `src/cli/components/scrollable-select/USAGE.md`
- **键盘管理器**: `docs/keyboard-manager-complete-guide.md`
- **问题解决**: `docs/multiple-useinput-handling.md`
