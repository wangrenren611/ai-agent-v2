# 输入历史功能指南

## 功能概述

ChatInput 组件现在支持使用 **上下箭头键** 切换用户之前输入过的消息，类似于 bash/zsh 的命令历史功能。

## 使用方法

### 基本操作

| 按键 | 功能 |
|------|------|
| `↑` (上箭头) | 切换到上一条历史输入 |
| `↓` (下箭头) | 切换到下一条历史输入（或恢复草稿） |
| `Enter` | 提交当前输入并添加到历史 |

### 使用示例

```
> 帮我写代码          ← 用户输入并提交
... 助手回复 ...

> 优化这段代码        ← 用户输入并提交
... 助手回复 ...

> ↑                   ← 按上箭头
> 优化这段代码        ← 显示上一条输入

> ↑                   ← 再按上箭头
> 帮我写代码          ← 显示更早的输入

> ↓                   ← 按下箭头
> 优化这段代码        ← 显示较新的输入

> ↓                   ← 再按下箭头
>                     ← 恢复草稿（清空）
```

## 实现细节

### Hook 接口

```typescript
const {
  inputValue,           // 当前输入值
  setInputValue,        // 设置输入值
  submitInput,          // 提交到历史
  hasPrevious,          // 是否有上一条历史
  hasNext,              // 是否有下一条历史
  navigatePrevious,     // 切换到上一条（↑）
  navigateNext,         // 切换到下一条（↓）
  resetNavigation,      // 重置导航状态
  clearHistory,         // 清空历史
  getHistory,           // 获取历史列表
} = useInputHistory({
  maxHistory: 100,      // 最大历史记录数
  persist: false,       // 是否持久化到 localStorage
});
```

### 核心逻辑

```
用户输入 → 按 Enter
    ↓
submitInput(value) 添加到历史
    ↓
历史列表更新: [新输入, ...旧历史]

按 ↑ 键
    ↓
navigatePrevious() 
    ↓
显示最新历史 (history[0])

再按 ↑ 键
    ↓
显示更旧的历史 (history[1])

按 ↓ 键
    ↓
navigateNext()
    ↓
如果当前是最新的 → 恢复草稿
否则 → 显示较新的历史
```

## 特性说明

### 1. 草稿保存
当用户开始导航历史时，当前正在输入的内容会被保存为"草稿"：

```
> 我正在输入...       ← 用户输入中

> ↑                   ← 按上箭头
> 帮我写代码          ← 显示历史，草稿被保存

> ↓                   ← 按下箭头
> 我正在输入...       ← 恢复草稿
```

### 2. 自动去重
连续的重复输入不会添加到历史：

```
> hello
> hello              ← 不添加到历史（与上一条重复）
> world              ← 添加到历史
```

### 3. 空输入过滤
空字符串不会添加到历史。

### 4. 导航状态
- `navIndex = -1`: 不在导航中，使用当前输入
- `navIndex = 0`: 显示最新的历史
- `navIndex = n`: 显示第 n 条历史（越大的数字越旧）

## 视觉反馈

在输入框右侧会显示历史导航提示：

```
> _ (↑ history)       ← 表示有上一条历史
> _ (↓ history)       ← 表示有草稿可恢复
> _ (↑↓ history)      ← 表示上下都有
```

## 使用场景

### 场景 1：快速重发相同消息
```
> 解释一下这段代码
... 助手回复 ...
> ↑ Enter            ← 快速重发
```

### 场景 2：修改之前的输入
```
> 写一个简单的排序算法
... 助手回复 ...
> ↑                  ← 调出历史
> 写一个简单的快速排序算法  ← 修改后发送
```

### 场景 3：对比不同问法
```
> 什么是 TypeScript
... 回复 1 ...
> 什么是 TypeScript 和 JavaScript 的区别
... 回复 2 ...
> ↑↑                 ← 快速切换查看之前的问法
```

## 技术实现

### 组件结构

```tsx
function ChatInput() {
  const { inputValue, setInputValue, submitInput, ... } = useInputHistory();
  
  // 处理提交
  const handleSubmit = (value: string) => {
    externalOnSubmit?.(value);
    submitInput(value);  // 添加到历史
    setInputValue('');
  };
  
  // 键盘事件
  useInput((input, key) => {
    if (key.upArrow && hasPrevious) {
      navigatePrevious();
    }
    if (key.downArrow && hasNext) {
      navigateNext();
    }
  });
  
  return (
    <Box>
      <Text>{'> '}</Text>
      <Input 
        value={inputValue} 
        onChange={setInputValue}
        onSubmit={handleSubmit}
      />
      <Text dimColor>{historyHint}</Text>
    </Box>
  );
}
```

### 状态管理

```
history: string[]      // 历史记录列表
navIndex: number       // 当前导航索引（-1 = 不在导航中）
draft: string          // 临时草稿
isNavigating: boolean  // 是否正在导航中
```

## 配置选项

```tsx
useInputHistory({
  maxHistory: 100,   // 最多保留 100 条历史
  persist: false,    // 是否持久化（默认不持久化）
});
```

### 持久化（浏览器环境）

```tsx
const history = useInputHistory({ 
  maxHistory: 100, 
  persist: true  // 启用 localStorage 持久化
});

// 历史会在页面刷新后保留
```

## 注意事项

1. **历史顺序**：最新的历史在最前面（索引 0）
2. **草稿恢复**：只有在导航历史后按 ↓ 才会恢复草稿
3. **提交后重置**：提交输入后会自动重置导航状态
4. **模式限制**：只在 `typing` 模式下响应上下键

## 故障排除

### 上下键不工作
- 检查是否在命令选择模式（按 Esc 退出）
- 检查是否有历史记录

### 草稿没有恢复
- 确认是先按了 ↑ 进入历史导航
- 确认 draft 不为空

### 历史没有保存
- 确认输入不为空
- 确认不是连续重复的输入
