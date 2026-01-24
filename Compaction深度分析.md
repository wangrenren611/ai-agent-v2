# Compaction.ts 深度分析

## 一、概述

`Compaction` 类实现了**对话上下文压缩机制**，用于在 Token 使用量接近阈值时自动压缩历史消息，保持对话上下文的连续性同时控制 LLM 调用成本。

### 核心职责

1. 监控 Token 使用量
2. 智能压缩历史消息（保留关键上下文）
3. 处理工具调用的特殊消息结构
4. 生成结构化摘要

---

## 二、类结构分析

```
Compaction
├── 配置属性
│   ├── maxTokens: 最大 Token 限制
│   ├── maxOutputTokens: LLM 输出 Token 保留量
│   └── triggerRatio: 压缩触发阈值 (0.90)
│
├── 运行时状态
│   ├── logger: 日志记录器
│   ├── lastSummaryMessage: 最近一次摘要消息
│   └── llmProvider: LLM 服务提供者
│
└── 核心方法
    ├── getToken(): 计算 Token 使用情况
    ├── compact(): 主压缩流程
    ├── findMatchingAssistant(): 查找配对消息
    ├── summarizer(): 生成摘要
    ├── calculateTotalUsage(): Token 计算器
    └── estimate(): Token 估算器
```

### 代码位置

- **文件路径**: `src/session-v2/compaction.ts`
- **总行数**: 375 行
- **主要方法**: `compact()` (第 60-304 行)

---

## 三、核心算法流程（compact 方法）

### 3.1 阶段一：触发检查

```typescript
const totalUsed = this.calculateTotalUsage(history);
const usableLimit = this.maxTokens - this.maxOutputTokens;
const KEEP_RECENT_COUNT = 6;

// 触发条件：超过 90% 可用限制 且 消息数 > 6
if (totalUsed < usableLimit * 0.90 || history.length <= 6) {
  return { isCompacted: false, summaryMessage: null, list: history };
}
```

**设计亮点**：
- 保留 `maxOutputTokens` 作为输出缓冲，防止摘要生成本身超出限制
- 保留最近 6 条消息作为"保护区"，确保最近上下文完整

**代码位置**: `src/session-v2/compaction.ts:65-75`

---

### 3.2 阶段二：保护区扩展（处理工具调用）

这是最复杂的部分，处理以下场景：

#### 场景1：Assistant 在 pending 区，部分 Tool 回复在 active 区

```
┌─────────────────────────────────────────┐
│ Pending Messages (待压缩)                │
│ ├─ Assistant (tool_calls: [A, B, C])     │ ← 需要保留
│ └─ Tool Response (tool_call_id: A)       │
│                                         │
├─────────────────────────────────────────┤
│ Active Messages (保护区)                 │
│ ├─ Tool Response (tool_call_id: B)      │ ← 需要找回 A, C
│ └─ Tool Response (tool_call_id: C)      │
└─────────────────────────────────────────┘
```

#### 场景2：所有消息在 active 区，但顺序混乱

```
┌─────────────────────────────────────────┐
│ Active Messages (保护区)                 │
│ ├─ Tool Response (tool_call_id: C)       │ ← 顺序错误
│ ├─ Tool Response (tool_call_id: A)       │
│ ├─ Assistant (tool_calls: [A, B, C])     │ ← 需要重新排序
│ └─ Tool Response (tool_call_id: B)      │
└─────────────────────────────────────────┘
```

#### 算法步骤

##### 1. 查找匹配 (src/session-v2/compaction.ts:43-58)

```typescript
private findMatchingAssistant(messages, toolMessage) {
  const toolCallId = toolMessage.tool_call_id;
  if (!toolCallId) return -1;

  const toolIndex = messages.indexOf(toolMessage);

  // 从 tool 消息的位置向前查找 assistant 消息
  for (let i = toolIndex - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'assistant' && msg.tool_calls) {
      const hasMatchingCall = msg.tool_calls.some(call => call.id === toolCallId);
      if (hasMatchingCall) return i;
    }
  }
  return -1;
}
```

**特点**：
- 通过 `tool_call_id` 回溯查找对应的 assistant
- 从 tool 消息向前搜索，找到包含该 `tool_call_id` 的 assistant
- 时间复杂度: O(n)，n 为消息数

##### 2. 收集需要保留的消息 (src/session-v2/compaction.ts:89-204)

主要流程：

1. 遍历 active 区的所有 tool 消息
2. 查找它们对应的 assistant
3. 检查是否有缺失的 tool 回复
4. 收集所有需要保留的 assistant 和 tool 消息

关键代码：

```typescript
// 检查这个 assistant 有多少个 tool_calls
const toolCalls = assistantMessage.tool_calls?.filter(call => call.id) || [];
const toolCallCount = toolCalls.length;

// 检查 activeMessages 中有多少个对应的 tool 回复
const matchedToolReplies = toolMessagesInActive.filter(m =>
  toolCalls.some(call => call.id === m.tool_call_id)
);

// 场景1：有缺失的 tool 回复（在 pendingMessages 中）
if (toolCallCount > matchedToolReplies.length) {
  // 按 tool_calls 的原始顺序从 pendingMessages 中添加 tool 回复
  for (const toolCall of toolCalls) {
    if (missingToolCalls.some(c => c.id === toolCall.id)) {
      const toolIndex = pendingMessages.findIndex(m =>
        m.role === 'tool' && m.tool_call_id === toolCall.id
      );
      if (toolIndex >= 0) {
        toolsToKeep.push(pendingMessages[toolIndex]);
        pendingMessages = pendingMessages.filter((_, i) => i !== toolIndex);
      }
    }
  }
}
```

##### 3. 重构保护区 (src/session-v2/compaction.ts:224-228)

```typescript
// 构建新的 activeMessages：[assistants, tools, 原activeMessages]
// toolsToKeep 已经按 tool_calls 的顺序排列
let newActiveMessages: Message[] = [
  ...sortedAssistants,
  ...toolsToKeep,
  ...activeMessages,
];
```

**顺序保证**：
- assistants 按原始索引排序
- tools 按 `tool_calls` 数组的顺序排列
- 原始 active 消息在最后

##### 4. 防膨胀保护 (src/session-v2/compaction.ts:231-242)

```typescript
const MAX_ACTIVE_SIZE = KEEP_RECENT_COUNT * 2;  // 最大 12 条

if (newActiveMessages.length > MAX_ACTIVE_SIZE) {
  this.logger.warn(
    `[Compaction] 保护区膨胀：从 ${KEEP_RECENT_COUNT} 条增长到 ${newActiveMessages.length} 条` +
    `(超过最大限制 ${MAX_ACTIVE_SIZE})，将进行裁剪`
  );

  // 裁剪：保留前面的 assistants 和 tools，裁剪后面的原始 activeMessages
  const overflow = newActiveMessages.length - MAX_ACTIVE_SIZE;
  if (overflow > 0 && sortedAssistants.length + toolsToKeep.length < MAX_ACTIVE_SIZE) {
    newActiveMessages = newActiveMessages.slice(0, MAX_ACTIVE_SIZE);
  }
}
```

**保护策略**：
- 最大允许 12 条消息（6 条 × 2）
- 优先保留 assistants 和 tools
- 裁剪尾部的历史消息

---

### 3.3 阶段三：生成摘要

#### 1. 提取上次摘要（增量更新）

```typescript
// src/session-v2/compaction.ts:254-258
let previousSummary = "";
if (pendingMessages.length > 0 && pendingMessages[0].type === "summary") {
  previousSummary = pendingMessages[0].content;
  pendingMessages = pendingMessages.slice(1);
}
```

#### 2. 序列化待压缩消息

```typescript
// src/session-v2/compaction.ts:262-272
const textToSummarize = pendingMessages
  .map((m) => {
    const prefix = m.type ? `[${m.role}:${m.type}]` : `[${m.role}]`;
    // 如果内容过长（如巨大的代码输出），在摘要前进行初步截断
    const content =
      m.content.length > 2000
        ? m.content.slice(0, 1000) + "...(省略)..."
        : m.content;
    return `${prefix}: ${content}`;
  })
  .join("\n");
```

**特点**：
- 预截断：单条消息超过 2000 字符，截断到 1000
- 标记格式：`[role:type]: content`
- 保持消息的顺序和角色信息

#### 3. 调用 LLM 生成结构化摘要

**摘要结构** (src/session-v2/compaction.ts:334-342)：

1. **Primary Request and Intent**: 用户的核心目标是什么？
2. **Key Technical Concepts**: 涉及的框架、库、技术栈等
3. **Files and Code Sections**: 所有提及或修改的文件路径
4. **Errors and Fixes**: 遇到的错误消息和解决方案
5. **Problem Solving**: 解决问题的思路和决策路径
6. **All User Messages**: 保留用户的关键指令和反馈
7. **Pending Tasks**: 尚未完成的工作项
8. **Current Work**: 对话中断时的进度

**代码**：

```typescript
// src/session-v2/compaction.ts:326-373
async summarizer(textToSummarize: string, previousSummary?: string) {
  const spinner = this.logger.spinner("上下文压缩...");

  try {
    const llmResponse = await this.llmProvider.generate(
      [
        {
          role: "user",
          content: `You are an expert conversation compressor. Compress the conversation history into a structured summary organized in the following 8 sections:
1. **Primary Request and Intent**: What is the user's core goal?
2. **Key Technical Concepts**: Frameworks, libraries, tech stacks, etc., involved in the conversation.
3. **Files and Code Sections**: All file paths mentioned or modified.
4. **Errors and Fixes**: Record error messages encountered and their solutions.
5. **Problem Solving**: The thought process and decision path for solving the problem.
6. **All User Messages**: Preserve key instructions and feedback from the user.
7. **Pending Tasks**: Work items that remain unfinished.
8. **Current Work**: The progress at the point the conversation was interrupted.

<previous_summary>
 ${previousSummary}
</previous_summary>

<current_mesage_history>
${textToSummarize}
</current_mesage_history>

  ## Requirements:
  - Maintain high density and accuracy of information
  - Highlight key technical decisions and solutions
  - Ensure continuity of context
  - Retain all important file paths
  - Use concise English expression`,
        },
      ],
      {
        model: process.env.AI_MODEL,
        max_tokens: 8000,
        temperature: 0.3,
      },
    );
    spinner.succeed("上下文压缩成功");
    return llmResponse?.content || '';
  } catch (error: any) {
    this.logger.error(error.toString());
    spinner.fail("上下文压缩失败");
  }
}
```

**参数说明**：
- `max_tokens: 8000`: 摘要输出限制
- `temperature: 0.3`: 低温度确保摘要稳定性
- `previousSummary`: 增量更新，避免重复摘要

---

### 3.4 阶段四：重组历史

```typescript
// src/session-v2/compaction.ts:281-288
const summaryMessage: Message = {
  role: "system",
  type: "summary",
  content: `[Historical Memory Snapshot]:\n${newSummaryContent}`,
};

// 重组历史：摘要 + 保护区
const newHistory = [summaryMessage, ...activeMessages];

return {
  isCompacted: true,
  summaryMessage,
  list: newHistory
};
```

**最终结构**：

```
┌─────────────────────────────────────────┐
│ newHistory                               │
├─────────────────────────────────────────┤
│ 0. System: [Historical Memory Snapshot]  │ ← 摘要消息
│ 1. Assistant: ...                         │
│ 2. Tool: ...                              │
│ 3. User: ...                              │ ← 保护区（含扩展的 assistant/tool）
│ 4. ...                                    │
└─────────────────────────────────────────┘
```

---

## 四、关键技术设计

### 4.1 Token 估算

```typescript
// src/session-v2/compaction.ts:309-324
public calculateTotalUsage(messages: Message[]): number {
  return messages.reduce((acc, m) => {
    // 每条消息基础开销 4 tokens (role, name, newline)
    return acc + this.estimate(JSON.stringify(m)) + 4;
  }, 0);
}

private estimate(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
```

**算法**：
- 简单估算：4 字符 = 1 token
- 元数据开销：每条消息 +4 tokens

**问题**：
- 假设 4 字符 = 1 token 不准确（中文实际约 1.5-2 字符/token）
- 未考虑特殊 token（如 `role`、`name`）
- 建议使用 tiktoken 库精确计算

### 4.2 防御性编程

#### 1. 错误降级 (src/session-v2/compaction.ts:296-302)

```typescript
catch (error) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  this.logger.error(`[Compaction] 摘要生成失败: ${errorMsg}`);

  // 摘要生成失败时，直接丢弃 pending 区（不使用摘要）
  return {
    isCompacted: true,
    summaryMessage: null,
    list: history.slice(0, history.length - KEEP_RECENT_COUNT)
  };
}
```

**降级策略**：
- 摘要失败时，直接丢弃 pending 区
- 保留 active 区（最近 6 条）
- 保证不会因摘要失败而崩溃

#### 2. 多重检查

```typescript
// 过滤无效 tool_call_id
toolMessagesInActive.filter(m => m.role === 'tool' && m.tool_call_id)

// 检查空数组
if (!assistantMessage || !assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
  continue;
}

// 边界检查
const toolIndex = pendingMessages.findIndex(m =>
  m.role === 'tool' && m.tool_call_id === toolCall.id
);
if (toolIndex >= 0) { ... }

// 类型守卫
if (m === assistantMessage) return false;
```

#### 3. 防止无限循环

```typescript
// 标记已处理的 assistant，避免重复处理
if (!assistantsToKeep.has(assistantKey)) {
  // 处理逻辑
  assistantsToKeep.set(assistantKey, {
    message: assistantMessage,
    index: assistantIndex,
  });
}
```

---

## 五、潜在问题与改进建议

### 问题1：硬编码的魔法数字

**代码**：

```typescript
private readonly triggerRatio = 0.90;  // 应该可配置
const KEEP_RECENT_COUNT = 6;           // 应该作为构造函数参数
const MAX_ACTIVE_SIZE = KEEP_RECENT_COUNT * 2;  // 应该可配置
```

**影响**：
- 不适应不同场景（长对话 vs 短对话）
- 难以调优压缩策略

**建议**：

```typescript
interface CompactionConfig {
  maxTokens: number;
  maxOutputTokens: number;
  llmProvider: LLMProvider;
  keepRecentCount?: number;        // 默认 6
  triggerRatio?: number;           // 默认 0.90
  maxActiveSizeMultiple?: number;  // 默认 2
  maxContentLengthForTruncate?: number;  // 默认 2000
}

constructor(config: CompactionConfig) {
  this.maxTokens = config.maxTokens;
  this.maxOutputTokens = config.maxOutputTokens;
  this.llmProvider = config.llmProvider;
  this.triggerRatio = config.triggerRatio ?? 0.90;
  this.keepRecentCount = config.keepRecentCount ?? 6;
  this.maxActiveSize = (config.keepRecentCount ?? 6) * (config.maxActiveSizeMultiple ?? 2);
  this.maxContentLengthForTruncate = config.maxContentLengthForTruncate ?? 2000;
  this.logger = new ScopedLogger("Compaction");
  this.lastSummaryMessage = null;
}
```

---

### 问题2：性能问题

**代码**：

```typescript
// O(n²) 复杂度：每次都从 pendingMessages 中过滤
pendingMessages = pendingMessages.filter((_, i) => i !== toolIndex);

// 多次重复过滤 activeMessages
activeMessages = activeMessages.filter(m => {
  if (m === assistantMessage) return false;
  if (m.role === 'tool' && toolCallIds.includes(m.tool_call_id || '')) return false;
  return true;
});
```

**影响**：
- 在循环中频繁修改数组，性能差
- 时间复杂度 O(n²)

**建议**：

```typescript
// 使用 Set 或 Map 记录需要移除的索引
private filterMessages(
  messages: Message[],
  indicesToRemove: Set<number>
): Message[] {
  return messages.filter((_, index) => !indicesToRemove.has(index));
}

// 使用示例
const indicesToRemove = new Set<number>();

// 在循环中收集索引，而不是立即过滤
for (const toolCall of toolCalls) {
  const toolIndex = pendingMessages.findIndex(m =>
    m.role === 'tool' && m.tool_call_id === toolCall.id
  );
  if (toolIndex >= 0) {
    toolsToKeep.push(pendingMessages[toolIndex]);
    indicesToRemove.add(toolIndex);  // 收集索引
  }
}

// 一次性过滤
pendingMessages = this.filterMessages(pendingMessages, indicesToRemove);
```

---

### 问题3：代码重复

**问题**：`toolsToKeep` 的填充逻辑在两个分支中重复（场景1和场景2）

**代码**：

```typescript
// 场景1：从 pendingMessages 提取
for (const toolCall of toolCalls) {
  if (missingToolCalls.some(c => c.id === toolCall.id)) {
    const toolIndex = pendingMessages.findIndex(m =>
      m.role === 'tool' && m.tool_call_id === toolCall.id
    );
    if (toolIndex >= 0) {
      toolsToKeep.push(pendingMessages[toolIndex]);
    }
  }
}

// 场景2：从 activeMessages 提取（逻辑类似）
for (const toolCall of toolCalls) {
  const toolReply = activeMessages.find(m =>
    m.role === 'tool' && m.tool_call_id === toolCall.id
  );
  if (toolReply) {
    toolsToKeep.push(toolReply);
  }
}
```

**建议**：提取为独立方法

```typescript
private extractToolsInOrder(
  toolCalls: ToolCall[],
  sourceMessages: Message[],
  filterFn?: (toolCall: ToolCall) => boolean
): Message[] {
  return toolCalls
    .filter(tc => !filterFn || filterFn(tc))
    .map(call => sourceMessages.find(m =>
      m.role === 'tool' && m.tool_call_id === call.id
    ))
    .filter((m): m is Message => m !== undefined);
}

// 使用示例
// 场景1
const toolsToKeep = this.extractToolsInOrder(
  toolCalls,
  pendingMessages,
  tc => missingToolCalls.some(c => c.id === tc.id)
);

// 场景2
const toolsToKeep = this.extractToolsInOrder(
  toolCalls,
  activeMessages
);
```

---

### 问题4：日志调试代码遗留

**代码**：

```typescript
// src/session-v2/compaction.ts:25
getToken(history: Message[]){
  const totalUsed = this.calculateTotalUsage(history);
  const usableLimit = this.maxTokens - this.maxOutputTokens;
  console.log(totalUsed)  // ← 调试代码，应该使用 logger
  return {
    totalUsed,
    usableLimit: usableLimit * this.triggerRatio
  }
}
```

**建议**：

```typescript
getToken(history: Message[]){
  const totalUsed = this.calculateTotalUsage(history);
  const usableLimit = this.maxTokens - this.maxOutputTokens;
  this.logger.debug(`Token 使用量: ${totalUsed}, 可用限制: ${usableLimit}`);
  return {
    totalUsed,
    usableLimit: usableLimit * this.triggerRatio
  }
}
```

---

### 问题5：摘要质量依赖 LLM

**问题**：
- 摘要生成失败时会丢失 pending 区内容
- 无重试机制
- LLM 输出质量不稳定

**建议**：

```typescript
async summarizer(textToSummarize: string, previousSummary?: string, retryCount = 3): Promise<string> {
  const spinner = this.logger.spinner("上下文压缩...");

  for (let attempt = 0; attempt < retryCount; attempt++) {
    try {
      const llmResponse = await this.llmProvider.generate(
        [/* ... */],
        {
          model: process.env.AI_MODEL,
          max_tokens: 8000,
          temperature: 0.3,
        },
      );
      spinner.succeed("上下文压缩成功");
      return llmResponse?.content || '';
    } catch (error: any) {
      this.logger.warn(`摘要生成失败（尝试 ${attempt + 1}/${retryCount}）: ${error.message}`);
      if (attempt === retryCount - 1) {
        // 最后一次失败，使用降级方案
        spinner.fail("上下文压缩失败，使用降级方案");
        return this.fallbackSummary(textToSummarize, previousSummary);
      }
    }
  }
  throw new Error("摘要生成失败");
}

private fallbackSummary(textToSummarize: string, previousSummary?: string): string {
  // 降级方案：简单截断保留关键信息
  const lines = textToSummarize.split('\n');
  const recentLines = lines.slice(-50);  // 保留最近 50 行
  return `${previousSummary || ''}\n\n[Recent Context (Fallback)]\n${recentLines.join('\n')}`;
}
```

---

### 问题6：类型安全

**代码**：

```typescript
// 可能 push undefined
for (const toolCall of toolCalls) {
  const toolReply = activeMessages.find(m =>
    m.role === 'tool' && m.tool_call_id === toolCall.id
  );
  if (toolReply) {
    toolsToKeep.push(toolReply);  // ← 类型守卫已添加，但 find 可能返回 undefined
  }
}
```

**问题**：虽然使用了 `if (toolReply)`，但 TypeScript 类型系统可能无法正确推断

**建议**：使用类型守卫

```typescript
private isToolMessage(message: Message): message is Message & { tool_call_id: string } {
  return message.role === 'tool' && typeof message.tool_call_id === 'string';
}

// 使用
const toolReply = activeMessages.find(m =>
  m.role === 'tool' && m.tool_call_id === toolCall.id
);
if (toolReply && this.isToolMessage(toolReply)) {
  toolsToKeep.push(toolReply);
}
```

---

## 六、设计模式应用

### 1. 策略模式

`summarizer` 作为注入的 LLM 执行器，可替换不同的摘要策略：

```typescript
// 当前使用 LLM 摘要策略
const compactor = new Compaction({
  llmProvider: deepseekProvider,
  // ...
});

// 可以扩展为不同的摘要策略
interface SummarizationStrategy {
  summarize(text: string, previousSummary?: string): Promise<string>;
}

class LLMBasedSummarizer implements SummarizationStrategy { /* ... */ }
class KeywordExtractionSummarizer implements SummarizationStrategy { /* ... */ }
class HybridSummarizer implements SummarizationStrategy { /* ... */ }
```

### 2. 模板方法模式

`compact` 定义主流程，`summarizer` 由外部注入或子类覆盖：

```typescript
abstract class BaseCompaction {
  async compact(history: Message[]): Promise<CompactionResult> {
    // 1. 触发检查
    if (!this.shouldCompact(history)) return { /* ... */ };

    // 2. 扩展保护区
    const { activeMessages, pendingMessages } = this.extendActiveZone(history);

    // 3. 提取上次摘要
    const previousSummary = this.extractPreviousSummary(pendingMessages);

    // 4. 序列化
    const textToSummarize = this.serializeMessages(pendingMessages);

    // 5. 摘要（由子类实现）
    const newSummary = await this.generateSummary(textToSummarize, previousSummary);

    // 6. 重组
    return this.reconstructHistory(newSummary, activeMessages);
  }

  protected abstract generateSummary(
    text: string,
    previousSummary?: string
  ): Promise<string>;
}
```

### 3. 责任链模式

多阶段处理（检查→扩展→摘要→重组），每个阶段可以独立扩展：

```typescript
interface CompactionStage {
  process(input: CompactionContext): Promise<CompactionContext>;
}

class TriggerCheckStage implements CompactionStage { /* ... */ }
class ActiveZoneExtensionStage implements CompactionStage { /* ... */ }
class SummaryGenerationStage implements CompactionStage { /* ... */ }
class HistoryReconstructionStage implements CompactionStage { /* ... */ }

class CompactionPipeline {
  private stages: CompactionStage[] = [
    new TriggerCheckStage(),
    new ActiveZoneExtensionStage(),
    new SummaryGenerationStage(),
    new HistoryReconstructionStage(),
  ];

  async execute(history: Message[]): Promise<CompactionResult> {
    let context = new CompactionContext(history);
    for (const stage of this.stages) {
      context = await stage.process(context);
    }
    return context.toResult();
  }
}
```

---

## 七、使用场景示例

### 基础用法

```typescript
import { Compaction } from './session-v2/compaction';
import { DeepSeekProvider } from './providers/deepseek';

const compactor = new Compaction({
  maxTokens: 128000,          // 总 Token 限制
  maxOutputTokens: 4096,      // 保留给 LLM 输出
  llmProvider: new DeepSeekProvider(process.env.DEEPSEEK_API_KEY),
});

// Token 使用量接近阈值时
const result = await compactor.compact(history);

if (result.isCompacted) {
  console.log('压缩成功');
  console.log('压缩后的消息数:', result.list.length);
  console.log('摘要:', result.summaryMessage?.content);
} else {
  console.log('无需压缩');
}
```

### 检查 Token 使用量

```typescript
const { totalUsed, usableLimit } = compactor.getToken(history);
console.log(`已使用: ${totalUsed} tokens`);
console.log(`可用限制: ${usableLimit} tokens`);
console.log(`使用率: ${(totalUsed / usableLimit * 100).toFixed(2)}%`);
```

### 自定义配置

```typescript
const compactor = new Compaction({
  maxTokens: 128000,
  maxOutputTokens: 4096,
  llmProvider: myCustomProvider,
  // 可选配置（需要先修改构造函数支持）
  keepRecentCount: 8,           // 保留最近 8 条消息
  triggerRatio: 0.85,          // 85% 时触发压缩
  maxActiveSizeMultiple: 3,    // 最大保护区扩展倍数
});
```

---

## 八、性能分析

### 时间复杂度

| 方法 | 复杂度 | 说明 |
|------|--------|------|
| `getToken()` | O(n) | 遍历所有消息计算 Token |
| `calculateTotalUsage()` | O(n) | 遍历 + JSON 序列化 |
| `findMatchingAssistant()` | O(n) | 回溯查找配对消息 |
| `compact()` | O(n²) | 包含循环中的过滤操作 |

### 空间复杂度

| 方法 | 复杂度 | 说明 |
|------|--------|------|
| `compact()` | O(n) | 创建多个数组副本 |
| `summarizer()` | O(n) | 序列化消息 |

### 优化方向

1. **避免循环中修改数组**
   ```typescript
   // 优化前（O(n²)）
   for (...) {
     pendingMessages = pendingMessages.filter(...);
   }

   // 优化后（O(n)）
   const indicesToRemove = new Set<number>();
   for (...) {
     indicesToRemove.add(index);
   }
   pendingMessages = pendingMessages.filter((_, i) => !indicesToRemove.has(i));
   ```

2. **使用 Map 替代数组查找**
   ```typescript
   // 优化前（O(n) 查找）
   const toolIndex = pendingMessages.findIndex(m => m.tool_call_id === toolCall.id);

   // 优化后（O(1) 查找）
   const toolMap = new Map<string, { message: Message, index: number }>();
   pendingMessages.forEach((m, i) => {
     if (m.tool_call_id) {
       toolMap.set(m.tool_call_id, { message: m, index: i });
     }
   });
   const tool = toolMap.get(toolCall.id);
   ```

3. **减少数组复制**
   ```typescript
   // 优化前（多次 slice）
   let activeMessages = history.slice(-KEEP_RECENT_COUNT);
   let pendingMessages = history.slice(0, -KEEP_RECENT_COUNT);

   // 优化后（使用索引）
   const keepStartIndex = Math.max(0, history.length - KEEP_RECENT_COUNT);
   // 直接使用索引引用，避免复制
   ```

---

## 九、测试建议

### 单元测试

```typescript
describe('Compaction', () => {
  describe('shouldCompact', () => {
    it('应该在小消息量时不触发', () => {
      const history = createMockMessages(5);
      const result = await compactor.compact(history);
      expect(result.isCompacted).toBe(false);
    });

    it('应该在 Token 使用量低时不触发', () => {
      const history = createShortMessages(10);
      const result = await compactor.compact(history);
      expect(result.isCompacted).toBe(false);
    });

    it('应该在达到阈值时触发', () => {
      const history = createLongMessages(10);
      const result = await compactor.compact(history);
      expect(result.isCompacted).toBe(true);
    });
  });

  describe('findMatchingAssistant', () => {
    it('应该找到匹配的 assistant', () => {
      const assistant = createAssistantMessage(['call_1', 'call_2']);
      const tool = createToolMessage('call_1');
      const messages = [assistant, tool];

      const index = compactor['findMatchingAssistant'](messages, tool);
      expect(index).toBe(0);
    });

    it('应该处理多个 tool_calls', () => {
      const assistant1 = createAssistantMessage(['call_1']);
      const tool1 = createToolMessage('call_1');
      const assistant2 = createAssistantMessage(['call_2']);
      const tool2 = createToolMessage('call_2');
      const messages = [assistant1, tool1, assistant2, tool2];

      const index = compactor['findMatchingAssistant'](messages, tool2);
      expect(index).toBe(2);
    });
  });

  describe('active zone extension', () => {
    it('应该保留 assistant 及其所有 tool 回复', async () => {
      const history = [
        createAssistantMessage(['call_1', 'call_2']),
        createToolMessage('call_1'),  // 在 pending 区
        createToolMessage('call_2'),  // 在 active 区
        ...createMockMessages(6),
      ];

      const result = await compactor.compact(history);
      expect(result.list).toContainEqual(expect.objectContaining({
        role: 'assistant',
        tool_calls: expect.any(Array),
      }));
    });

    it('应该按 tool_calls 顺序重新排序 tool 回复', async () => {
      // ... 测试代码
    });
  });
});
```

### 集成测试

```typescript
describe('Compaction Integration', () => {
  it('应该在长对话中正确压缩', async () => {
    // 模拟真实的对话流程
    const history = simulateLongConversation(100);

    const result = await compactor.compact(history);

    expect(result.isCompacted).toBe(true);
    expect(result.summaryMessage).toBeDefined();
    expect(result.list.length).toBeLessThan(history.length);
  });

  it('应该保留关键的文件路径和错误信息', async () => {
    const history = [
      createUserMessage('修复 src/app.ts 中的错误'),
      createAssistantMessage('我看到了 TypeError: Cannot read property'),
      // ... 更多对话
    ];

    const result = await compactor.compact(history);

    const summary = result.summaryMessage?.content || '';
    expect(summary).toContain('src/app.ts');
    expect(summary).toContain('TypeError');
  });
});
```

### 性能测试

```typescript
describe('Compaction Performance', () => {
  it('应该在 1 秒内完成 1000 条消息的压缩', async () => {
    const history = createMockMessages(1000);

    const start = Date.now();
    await compactor.compact(history);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(1000);
  });

  it('应该优化重复工具调用的处理', async () => {
    const history = createMessageWithManyToolCalls(100);

    const start = Date.now();
    await compactor.compact(history);
    const duration = Date.now() - start;

    console.log(`100 个工具调用处理时间: ${duration}ms`);
  });
});
```

---

## 十、总结

### 优点

1. **智能处理工具调用**
   - 自动识别 assistant/tool 配对关系
   - 正确处理复杂的消息顺序
   - 防膨胀保护机制

2. **合理的保护区设计**
   - 保留最近 6 条消息，确保连续性
   - 动态扩展保护区以包含必要上下文
   - 最大限制防止无限膨胀

3. **结构化摘要**
   - 8 个部分的详细分类
   - 增量更新机制（previousSummary）
   - 保持对话上下文完整性

4. **完善的错误处理**
   - 多重检查机制
   - 降级策略（摘要失败时不崩溃）
   - 详细的日志记录

5. **灵活的 LLM 集成**
   - 通过 `llmProvider` 注入，支持多种 LLM
   - 摘要生成可替换

---

### 缺点

1. **性能问题**
   - O(n²) 复杂度（循环中的过滤操作）
   - 多次数组复制
   - 可以使用 Map/Set 优化

2. **硬编码配置**
   - 魔法数字（`triggerRatio = 0.90`，`KEEP_RECENT_COUNT = 6`）
   - 缺乏可配置性
   - 难以适应不同场景

3. **Token 估算不精确**
   - 简单假设 4 字符 = 1 token
   - 中文实际约 1.5-2 字符/token
   - 建议使用 tiktoken 库

4. **代码质量问题**
   - 调试代码遗留（console.log）
   - 代码重复（toolsToKeep 填充逻辑）

 - 类型安全可以改进

---

## 结论

`Compaction.ts` 是一个设计良好的上下文压缩模块，核心逻辑合理，特别是在处理工具调用的复杂消息结构方面表现出色。但存在性能优化空间、配置硬编码和代码质量等问题。

**建议重构优先级**：
1. **高优先级**：清理调试代码（console.log）
2. **中优先级**：提取魔法数字为可配置参数
3. **中优先级**：优化循环中的数组操作（O(n²) → O(n)）
4. **低优先级**：改进 Token 估算精度
5. **低优先级**：添加重试机制

总体而言，这是一个**可用但需要优化**的实现，适合作为生产环境的基础版本，但建议根据实际使用情况进行针对性优化。
