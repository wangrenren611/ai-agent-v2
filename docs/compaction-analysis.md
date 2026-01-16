# OpenCode 上下文压缩机制深度分析

> 基于源码 `/Users/wrr/work/opencode/packages/opencode` 的完整技术解析

---

## 目录

1. [架构概览](#架构概览)
2. [压缩触发条件](#压缩触发条件)
3. [三层压缩策略](#三层压缩策略)
4. [核心实现代码](#核心实现代码)
5. [配置系统](#配置系统)
6. [与 Claude Code 对比](#与-claude-code-对比)

---

## 架构概览

### 整体流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          用户发送消息                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Token 计数 & 溢出检测                              │
│  total = input + cache_read + output                                    │
│  available = context - output_reserved                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                      ┌─────────────┴─────────────┐
                      │                           │
                    未溢出                        溢出
                      │                           │
                      ▼                           ▼
              ┌───────────────┐         ┌───────────────────┐
              │ 正常处理消息   │         │   触发压缩流程     │
              └───────────────┘         └───────────────────┘
                                                 │
                      ┌──────────────────────────┼──────────────────────────┐
                      │                          │                          │
                      ▼                          ▼                          ▼
            ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
            │  第一层: 截断   │     │  第二层: 剪枝   │     │  第三层: AI摘要  │
            │  (Truncation)   │     │  (Pruning)      │     │  (Summary)       │
            │                 │     │                 │     │                 │
            │ 50KB/2000行     │     │ 删除旧工具输出  │     │ 专用Agent生成    │
            │ 输出自动截断    │     │ 保护40K tokens  │     │ 会话摘要         │
            └─────────────────┘     └─────────────────┘     └─────────────────┘
                      │                          │                          │
                      └──────────────────────────┼──────────────────────────┘
                                                 │
                                                 ▼
                                    ┌───────────────────────┐
                                    │    压缩完成，继续处理   │
                                    └───────────────────────┘
```

### 文件结构

```
packages/opencode/
├── src/
│   ├── session/
│   │   ├── compaction.ts       # 核心压缩逻辑
│   │   ├── prompt.ts           # 压缩触发时机
│   │   └── summary.ts          # 会话摘要生成
│   ├── tool/
│   │   └── truncation.ts       # 输出截断工具
│   ├── util/
│   │   └── token.ts            # Token 估算工具
│   └── config/
│       └── config.ts           # 配置系统
```

---

## 压缩触发条件

### 溢出检测逻辑

**文件**: `src/session/compaction.ts`

```typescript
export async function isOverflow(input: {
  tokens: MessageV2.Assistant["tokens"]
  model: Provider.Model
}): Promise<boolean> {
  // 1. 检查配置是否禁用自动压缩
  const config = await Config.get()
  if (config.compaction?.auto === false) return false

  // 2. 获取模型上下文限制
  const context = input.model.limit.context

  // 3. 计算总 token 使用量
  const count = input.tokens.input + input.tokens.cache.read + input.tokens.output

  // 4. 计算输出预留 token (为模型响应预留空间)
  const output = Math.min(input.model.limit.output, SessionPrompt.OUTPUT_TOKEN_MAX)

  // 5. 判断是否溢出
  return count > (context - output)
}
```

### Token 计算公式

```
┌─────────────────────────────────────────────────────────────┐
│                      Token 计算公式                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  total_tokens = input + cache_read + output                 │
│                                                             │
│  available_tokens = model_context - output_reserved         │
│                                                             │
│  溢出条件: total_tokens > available_tokens                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 各类型 Token 说明

| 类型 | 说明 | 示例值 |
|------|------|--------|
| `input` | 输入消息的 token 数 | 对话历史的累计 |
| `cache_read` | 从缓存读取的 token 数 | 使用 prompt caching 时 |
| `output` | 模型输出的 token 数 | 当前响应的 token |
| `model.limit.context` | 模型上下文窗口大小 | Claude: 200K |
| `model.limit.output` | 模型最大输出 token | Claude: 8K |
| `OUTPUT_TOKEN_MAX` | 系统预设的最大输出预留 | 内部配置 |

---

## 三层压缩策略

### 策略层次图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        压缩策略金字塔                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                        ┌───────────────────┐                            │
│                        │   第三层: AI摘要   │  ← 终极手段                │
│                        │   生成会话摘要     │  保留核心上下文             │
│                        └───────────────────┘                            │
│                               ▲                                         │
│                        ┌───────────────────┐                            │
│                        │   第二层: 剪枝    │  ← 中等策略                 │
│                        │   删除旧工具输出   │  智能保护机制              │
│                        └───────────────────┘                            │
│                               ▲                                         │
│                        ┌───────────────────┐                            │
│                        │   第一层: 截断    │  ← 轻量级                   │
│                        │   截断过长输出    │  即时生效                   │
│                        └───────────────────┘                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1️⃣ 第一层: 输出截断 (Truncation)

**文件**: `src/tool/truncation.ts`

#### 触发条件

```typescript
export namespace Truncate {
  export const MAX_LINES = 2000      // 最大行数限制
  export const MAX_BYTES = 50 * 1024 // 最大字节限制 (50KB)
}
```

#### 实现逻辑

```typescript
export async function output(text: string, options: Options = {}) {
  const maxLines = options.maxLines ?? MAX_LINES
  const maxBytes = options.maxBytes ?? MAX_BYTES

  const lines = text.split("\n")
  const totalBytes = new TextEncoder().encode(text).length

  // 检查是否超过限制
  if (lines.length <= maxLines && totalBytes <= maxBytes) {
    return { content: text, truncated: false }
  }

  // 截断并保存完整输出到文件
  const id = crypto.randomUUID()
  const filepath = path.join(DIR, id)
  await Bun.write(Bun.file(filepath), text)

  // 计算预览行数
  const previewLines = lines.slice(0, Math.min(maxLines, 100))
  const removed = lines.length - previewLines.length

  const content = [
    ...previewLines,
    "",
    `... ${removed} lines truncated...`,
    "",
    `Full output saved to: ${filepath}`,
  ].join("\n")

  return {
    content,
    truncated: true,
    outputPath: filepath
  }
}
```

#### 截断策略

| 限制项 | 阈值 | 处理方式 |
|--------|------|----------|
| 行数 | 2000 行 | 超出部分截断 |
| 字节 | 50KB | 超出部分截断 |
| 完整输出 | - | 保存到临时文件 |
| 返回内容 | - | 预览 + 截断提示 + 文件路径 |

---

### 2️⃣ 第二层: 剪枝 (Pruning)

**文件**: `src/session/compaction.ts`

#### 核心参数

```typescript
const PRUNE_MINIMUM = 20_000         // 最少压缩 20,000 tokens 才执行
const PRUNE_PROTECT = 40_000         // 保护最近 40,000 tokens 不被压缩
const PRUNE_PROTECTED_TOOLS = ["skill"]  // 受保护的工具列表
const RECENT_TURNS = 2               // 保留最近 2 轮对话
```

#### 实现逻辑

```typescript
export async function prune(input: { sessionID: string }): Promise<void> {
  const { sessionID } = input

  // 1. 获取会话的所有消息
  const msgs = await Session.getMessages({ sessionID })

  // 2. 计算可压缩的 token 总数
  let total = 0
  let turns = 0

  // 3. 从后向前遍历消息
  loop:
  for (let msgIndex = msgs.length - 1; msgIndex >= 0; msgIndex--) {
    const msg = msgs[msgIndex]

    // 3.1 跳过非 assistant 消息
    if (msg.info.role !== "assistant") continue

    // 3.2 统计对话轮数
    if (msg.info.turn !== undefined) {
      turns = msg.info.turn + 1
    }

    // 3.3 保护最近 2 轮对话
    if (turns <= RECENT_TURNS) continue

    // 3.4 遇到摘要消息停止压缩
    if (msg.info.summary) break loop

    // 3.5 遍历消息的各个部分 (parts)
    for (const part of msg.parts) {
      // 3.6 只处理已完成的工具调用
      if (part.type === "tool" && part.state.status === "completed") {
        // 3.7 跳过受保护的工具
        if (PRUNE_PROTECTED_TOOLS.includes(part.tool)) continue

        // 3.8 估算工具输出的 token 数
        const estimate = Token.estimate(part.state.output)

        // 3.9 累计总 token
        total += estimate

        // 3.10 超过保护阈值则标记为已压缩
        if (total > PRUNE_PROTECT) {
          // 标记为已压缩 (清空输出内容)
          part.state.time.compacted = Date.now()
          await Session.updatePart(part)
        }
      }
    }
  }

  // 4. 至少需要压缩 20,000 tokens 才值得执行
  if (total < PRUNE_MINIMUM) {
    return
  }
}
```

#### 剪决策策表

| 保护规则 | 说明 | 阈值/条件 |
|----------|------|-----------|
| 对话轮数保护 | 保留最近 N 轮对话 | 2 轮 |
| Token 保护 | 保护最近的 token 数 | 40,000 tokens |
| 工具保护 | 保护特定工具的输出 | `skill` |
| 摘要边界 | 遇到摘要消息停止压缩 | `summary: true` |
| 最小压缩量 | 避免频繁无效压缩 | 20,000 tokens |
| 状态要求 | 只压缩已完成的工具 | `status: "completed"` |

#### 剪枝前后对比

```
┌─────────────────────────────────────────────────────────────┐
│                       剪枝前                                 │
├─────────────────────────────────────────────────────────────┤
│ Messages: [                                                 │
│   { role: "user", content: "..." },                         │
│   { role: "assistant", parts: [                             │
│       { type: "tool", tool: "bash", output: "50KB..." },    │
│       { type: "tool", tool: "read_file", output: "30KB..." }│
│     ]                                                       │
│   },                                                        │
│   ... (共 100KB 工具输出)                                    │
│ ]                                                           │
│ Total Tokens: ~150,000                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ 剪枝处理
                            │
┌─────────────────────────────────────────────────────────────┐
│                       剪枝后                                 │
├─────────────────────────────────────────────────────────────┤
│ Messages: [                                                 │
│   { role: "user", content: "..." },                         │
│   { role: "assistant", parts: [                             │
│       { type: "tool", tool: "bash",                         │
│         state: { time: { compacted: 1234567890 } },         │
│         output: "" }  ← 输出已清空                           │
│     ]                                                       │
│   },                                                        │
│   ... (最近 40K tokens 的输出被保留)                          │
│ ]                                                           │
│ Total Tokens: ~110,000  ← 减少 40K                          │
└─────────────────────────────────────────────────────────────┘
```

---

### 3️⃣ 第三层: AI 摘要 (Summary)

**文件**: `src/session/compaction.ts`

#### 实现逻辑

```typescript
export async function process(input: {
  parentID: string
  messages: MessageV2.WithParts[]
  sessionID: string
  abort: AbortSignal
  auto: boolean
}): Promise<void> {
  const { parentID, messages, sessionID, abort, auto } = input

  // 1. 获取压缩专用的 Agent
  const agent = await Agent.get("compaction")

  // 2. 创建摘要消息 (标记为 summary)
  const msg = await Session.updateMessage({
    role: "assistant",
    summary: true,        // 标记为摘要消息
    mode: "compaction",
    agent: "compaction",
    parentID,
    sessionID,
  })

  // 3. 构建摘要提示
  const compacting = await Session.getCompaction({ sessionID })
  const promptText = compacting.prompt ?? [
    "Provide a detailed prompt for continuing our conversation above.",
    "Focus on preserving:",
    "1. The current task and its status",
    "2. Important decisions made",
    "3. Code changes and their locations",
    "4. Outstanding issues or blockers",
    "5. Next steps to continue",
    "",
    "Context:",
    ...compacting.context
  ].join("\n")

  // 4. 转换消息为模型格式
  const modelMessages = MessageV2.toModelMessage(messages)

  // 5. 添加摘要提示
  modelMessages.push({
    role: "user",
    content: [{ type: "text", text: promptText }],
  })

  // 6. 使用处理器生成摘要
  const processor = await Processor.create({ agent })
  const result = await processor.process({
    messages: modelMessages,
    abort,
  })

  // 7. 更新摘要消息内容
  await Session.updateMessage({
    id: msg.id,
    content: result.content,
    status: "completed",
  })

  // 8. 删除原始消息 (可选，根据配置)
  if (auto) {
    // 可以选择是否删除压缩前的消息
  }
}
```

#### AI 摘要生成流程

```
┌─────────────────────────────────────────────────────────────┐
│                    AI 摘要生成流程                           │
└─────────────────────────────────────────────────────────────┘

1. 收集上下文
   ├── 获取当前会话的所有消息
   ├── 提取关键信息 (任务、决策、代码变更)
   └── 构建上下文提示

2. 创建摘要消息
   ├── role: "assistant"
   ├── summary: true  ← 关键标记
   ├── mode: "compaction"
   └── parentID: 上一条消息ID

3. 调用 LLM 生成摘要
   ├── 使用专用的 compaction Agent
   ├── 发送完整对话历史
   └── 附加摘要提示指令

4. 保存摘要结果
   ├── 更新消息内容
   ├── 标记状态为 completed
   └── 创建新的对话起点

5. 后续请求
   ├── 摘要消息作为新的起点
   ├── 保留核心上下文
   └── 大幅减少 token 使用
```

#### 摘要提示模板

```typescript
const DEFAULT_COMPACTION_PROMPT = [
  "Provide a detailed prompt for continuing our conversation above.",
  "",
  "Focus on preserving:",
  "1. The current task and its status",
  "2. Important decisions made",
  "3. Code changes and their locations",
  "4. Outstanding issues or blockers",
  "5. Next steps to continue",
  "",
  "Context:",
].join("\n")
```

---

## 核心实现代码

### 压缩触发点

**文件**: `src/session/prompt.ts`

#### 触发点 1: 检测到溢出时

```typescript
// 位置: ~274 行
if (await SessionCompaction.isOverflow({ tokens: usage.tokens, model: input.model })) {
  needsCompaction = true
}

if (needsCompaction) {
  await SessionCompaction.create({
    sessionID,
    agent: input.agent,
    model: input.model,
    auto: true,
  })
  continue  // 重新开始处理
}
```

#### 触发点 2: 处理器返回 "compact" 时

```typescript
// 位置: ~612-618 行
if (result === "compact") {
  await SessionCompaction.create({
    sessionID,
    agent: lastUser.agent,
    model: lastUser.model,
    auto: true,
  })
}
```

#### 触发点 3: 每次处理前检查

```typescript
// 位置: ~495-507 行
if (
  lastFinished &&
  lastFinished.summary !== true &&
  (await SessionCompaction.isOverflow({ tokens: lastFinished.tokens, model }))
) {
  await SessionCompaction.create({
    sessionID,
    agent: lastUser.agent,
    model: lastUser.model,
    auto: true,
  })
  continue  // 跳过当前处理，等待压缩完成
}
```

---

### Token 估算工具

**文件**: `src/util/token.ts`

```typescript
export namespace Token {
  // 假设: 1 token ≈ 4 个字符
  const CHARS_PER_TOKEN = 4

  /**
   * 估算文本的 token 数量
   * 注意: 这只是估算，实际 token 数由 tokenizer 决定
   */
  export function estimate(input: string): number {
    const text = input || ""
    return Math.max(0, Math.round(text.length / CHARS_PER_TOKEN))
  }

  /**
   * 估算消息列表的总 token 数
   */
  export function estimateMessages(messages: Array<{ content: string }>): number {
    return messages.reduce((sum, msg) => sum + estimate(msg.content), 0)
  }
}
```

#### 估算精度说明

| 文本类型 | 实际 token/字符 | 估算误差 |
|----------|----------------|----------|
| 英文代码 | ~4 字符/token | ±10-20% |
| 英文文本 | ~4 字符/token | ±15-25% |
| 中文文本 | ~1-2 字符/token | ±30-50% |
| 混合内容 | ~3 字符/token | ±20-30% |

> **注意**: 这是简化估算，生产环境建议使用准确的 tokenizer (如 `tiktoken`)

---

### 消息结构

```typescript
namespace MessageV2 {
  // 消息基础结构
  interface Base {
    id: string
    role: "user" | "assistant"
    content: string
    parts: Part[]
    createdAt: number
    updatedAt: number
  }

  // 消息信息
  interface Info {
    role: "user" | "assistant"
    summary?: boolean    // 是否为摘要消息
    turn?: number       // 对话轮次
    tokens?: {
      input: number
      cache_read: number
      cache_write: number
      output: number
    }
  }

  // 消息部分 (可以是文本、工具调用等)
  type Part =
    | { type: "text"; content: string }
    | {
        type: "tool"
        tool: string
        state: {
          status: "pending" | "completed" | "failed"
          output: string
          time: {
            started: number
            completed?: number
            compacted?: number  // 压缩时间戳
          }
        }
      }

  // 完整消息类型
  type WithParts = Base & {
    info: Info
    parts: Part[]
  }
}
```

---

## 配置系统

**文件**: `src/config/config.ts`

### 配置结构

```typescript
import { z } from "zod"

export const Info = z.object({
  // ... 其他配置

  compaction: z.object({
    /**
     * 是否启用自动压缩
     * - true: 当上下文窗口满时自动压缩
     * - false: 需要手动触发压缩
     */
    auto: z.boolean().optional()
      .describe("Enable automatic compaction when context is full (default: true)"),

    /**
     * 是否启用工具输出剪枝
     * - true: 删除旧工具调用的输出以节省 token
     * - false: 保留所有工具输出
     */
    prune: z.boolean().optional()
      .describe("Enable pruning of old tool outputs (default: true)"),

  }).optional(),
})
```

### 配置示例

```json
{
  "compaction": {
    "auto": true,
    "prune": true
  }
}
```

### 配置行为矩阵

| auto | prune | 行为 |
|------|-------|------|
| `true` | `true` | 自动溢出检测 → 截断 → 剪枝 → 摘要 |
| `true` | `false` | 自动溢出检测 → 截断 → 摘要 |
| `false` | `true` | 手动触发 → 剪枝 (不自动摘要) |
| `false` | `false` | 完全手动管理 |

---

## 与 Claude Code 对比

### 触发阈值对比

| 项目 | OpenCode | Claude Code |
|------|----------|-------------|
| 触发计算 | `total > context - output` | 百分比 (75-95%) |
| 检测时机 | 每次处理前 | 达到阈值时 |
| 自动压缩 | 可配置 (`auto` 开关) | 默认启用 |

### 压缩策略对比

| 策略层 | OpenCode | Claude Code |
|--------|----------|-------------|
| **第一层** | 输出截断 (50KB) | 未知 (可能类似) |
| **第二层** | 工具输出剪枝 | 直接跳到摘要 |
| **第三层** | AI 生成摘要 | AI 生成摘要 |

### 保护机制对比

| 保护项 | OpenCode | Claude Code |
|--------|----------|-------------|
| 最近对话 | 保留 2 轮 | 智能保留 |
| Token 保护 | 40,000 tokens | 动态计算 |
| 工具保护 | `skill` 等指定工具 | 未知 |
| 文件保护 | 无明确机制 | CLAUDE.md 等 |

### 摘要方式对比

| 特性 | OpenCode | Claude Code |
|------|----------|-------------|
| 摘要位置 | 作为消息存储 | 作为新会话起点 |
| 消息结构 | `summary: true` | 重新创建会话 |
| 指令支持 | 自定义 prompt | `/compact [instructions]` |

### 用户控制对比

| 控制项 | OpenCode | Claude Code |
|--------|----------|-------------|
| 手动触发 | 通过 API | `/compact` 命令 |
| 配置文件 | 支持开关 | 不支持 |
| 自定义指令 | 支持 prompt | 支持指令参数 |

---

## 最佳实践建议

### 1. 何时使用压缩

```
┌─────────────────────────────────────────────────────────────┐
│                    压缩使用建议                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✓ 完成一个功能模块后                                        │
│  ✓ 达到项目里程碑时                                          │
│  ✓ 对话轮次 > 10 轮                                         │
│  ✓ Token 使用 > 60%                                        │
│  ✓ 切换到不同任务前                                         │
│                                                             │
│  ✗ 正在调试关键问题时                                        │
│  ✗ 需要引用早期消息内容时                                    │
│  ✗ 对话刚开始 (< 5 轮)                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. 配置建议

```json
{
  "compaction": {
    "auto": true,    // 推荐启用
    "prune": true    // 推荐启用
  }
}
```

### 3. 监控指标

- **Token 使用率**: 定期检查 `/context` 或类似命令
- **压缩频率**: 避免过度压缩导致上下文丢失
- **摘要质量**: 确保摘要保留关键信息

---

## 总结

OpenCode 的上下文压缩机制采用了**三层渐进式策略**:

1. **轻量级截断**: 处理过长的工具输出
2. **智能剪枝**: 删除旧内容，保护重要信息
3. **AI 摘要**: 最终手段，生成精简的上下文摘要

这种设计在**保留上下文**和**节省 token**之间取得了良好的平衡，适合长时间运行的 AI 对话场景。

---

## 参考资料

- 源码路径: `/Users/wrr/work/opencode/packages/opencode`
- 核心文件:
  - `src/session/compaction.ts`
  - `src/tool/truncation.ts`
  - `src/util/token.ts`
  - `src/config/config.ts`

---

*文档生成时间: 2025-01-16*
*基于 OpenCode 源码分析*
