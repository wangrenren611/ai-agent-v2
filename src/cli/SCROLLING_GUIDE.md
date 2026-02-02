# MessageList 滚动功能指南

## 功能概述

MessageList 使用 Ink 的 `Static` 组件实现了**真正的终端滚动**。

## 滚动方式

### 终端原生滚动（推荐）
由于使用了 `Static` 组件，所有消息都会被写入终端的历史记录中：

| 方式 | 操作 |
|------|------|
| 鼠标滚轮 | 直接滚动查看历史 |
| 终端滚动条 | 拖动滚动条查看 |
| Shift+PageUp | 向上翻页 |
| Shift+PageDown | 向下翻页 |
| Ctrl+Shift+C | 复制历史内容（选中后）|

### 特性
- **所有消息都被保留**：可以滚动查看完整的对话历史
- **真正的终端体验**：与日常使用终端的感觉一致
- **支持复制**：可以选中并复制历史消息
- **性能优化**：Static 组件只渲染增量内容

## 自动滚动行为

### 新消息到达
```
新消息写入终端
    ↓
终端自动向下滚动（显示新内容）
    ↓
输入框保持在底部
```

### 加载状态
```
用户输入消息
    ↓
显示加载指示器 "Thinking..."
    ↓
助手回复生成
    ↓
回复内容显示在底部
```

## 界面结构

```
┌─────────────────────────────────────┐
│  历史消息（可滚动查看）               │
│  ❯ 用户消息 1                       │
│  ● 助手回复 1                       │
│  ...                                │
│  ❯ 用户消息 N                       │
│  ● 助手回复 N                       │
├─────────────────────────────────────┤
│  Thinking...          ← 活跃状态区   │
│  Tokens: 1,234 / 8,000              │
├─────────────────────────────────────┤
│  > _                                │ ← 输入框（固定）
└─────────────────────────────────────┘
```

## 使用示例

### 基础使用
```tsx
<MessageList
  messages={messages}
  isLoading={isLoading}
  usedTokens={usedTokens}
  error={error}
/>
```

### 限制消息数量（性能考虑）
```tsx
<MessageList
  messages={messages}
  maxMessages={100}  // 最多保留 100 条消息
/>
```

### 不限制消息数量
```tsx
<MessageList
  messages={messages}
  maxMessages={0}  // 0 表示不限制
/>
```

## 技术实现

### Static 组件的工作原理

```tsx
// Static 组件会将内容写入终端历史，不会被清除
<Static items={messages}>
  {(message) => (
    <Box key={message.id}>
      <MessageItem message={message} />
    </Box>
  )}
</Static>
```

**优势：**
1. **真正的终端滚动**：用户可以用鼠标滚轮或终端滚动条查看历史
2. **性能优化**：只渲染新增内容，不重新渲染历史消息
3. **保留格式**：所有 ANSI 格式和样式都被保留

### 动态状态区

Static 组件之外的内容（如加载指示器、错误信息、Token 统计）会动态更新：

```tsx
<Box>
  {/* Static 区域 - 历史消息 */}
  <Static items={items}>
    {...}
  </Static>
  
  {/* 动态区域 - 活跃状态 */}
  <Box>
    {isLoading && <LoadingIndicator />}
    {error && <SystemMessage ... />}
    {usedTokens && <TokenUsage ... />}
  </Box>
</Box>
```

## 配置选项

```tsx
interface MessageListProps {
  /** 消息列表 */
  messages: UIMessage[];
  
  /** 是否正在加载 */
  isLoading?: boolean;
  
  /** 当前步骤 */
  currentStep?: number;
  
  /** 已使用 token 数 */
  usedTokens?: { usedTokens: number; totalTokens: number };
  
  /** 错误信息 */
  error?: { message: string; phase: string } | null;
  
  /** 最大显示消息数量（默认 100，0 表示无限制） */
  maxMessages?: number;
}
```

## 最佳实践

### 1. 消息数量限制
对于长对话，建议设置 `maxMessages`：
```tsx
// 保留最近 200 条消息
<MessageList messages={messages} maxMessages={200} />
```

### 2. 性能优化
- Static 组件会自动优化，只渲染新增内容
- 消息数量过多时（>1000），建议限制或清空历史

### 3. 清空历史
```tsx
const { clearMessages } = useAgent({ model });

// 用户输入 /clear 时
if (input === '/clear') {
  clearMessages();
}
```

## 故障排除

### 无法滚动
- 检查终端是否支持滚动（某些 IDE 集成终端有限制）
- 尝试使用鼠标滚轮或终端滚动条
- 使用 `Shift+PageUp/PageDown` 键盘滚动

### 消息显示不全
- 增加 `maxMessages` 值或设为 0
- 检查终端缓冲区大小设置

### 性能问题
- 减少 `maxMessages` 值
- 清空历史消息
- 检查是否有大段内容的消息

## 与其他终端应用的对比

| 应用 | 滚动方式 |
|------|----------|
| Claude Code | 终端原生滚动 |
| ChatGPT CLI | 虚拟滚动 |
| 本实现 | 终端原生滚动（Static 组件）|

**终端原生滚动的优势：**
- 符合用户习惯
- 支持鼠标滚轮
- 可以复制历史内容
- 性能更好（不需要虚拟化）
