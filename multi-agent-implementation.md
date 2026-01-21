# 多智能体实现方案

> **版本**: 2.0.0
> **作者**: OpenCode Team
> **更新日期**: 2026-01-21

## 目录

1. [系统概述](#1-系统概述)
2. [架构设计](#2-架构设计)
3. [智能体类型系统](#3-智能体类型系统)
4. [智能体管理](#4-智能体管理)
5. [权限系统](#5-权限系统)
6. [执行机制](#6-执行机制)
7. [实现细节](#7-实现细节)
8. [扩展机制](#8-扩展机制)
9. [最佳实践](#9-最佳实践)

---

## 1. 系统概述

### 1.1 项目背景

OpenCode 智能体系统是一个用于 AI 编程辅助的多智能体管理框架，位于 `packages/opencode/src/agent/`。

**核心特性**：
- **主智能体（Primary Agents）**：用户可直接选择的智能体，用于处理不同类型的任务
- **子智能体（Sub Agents）**：由主智能体调用的专用智能体，处理特定子任务
- **隐藏智能体（Hidden Agents）**：系统内部使用的智能体，不暴露给用户
- **权限系统集成**：每个智能体有独立的权限配置
- **AI 驱动生成**：支持使用 AI 自动生成新智能体配置

### 1.2 内置智能体

| 智能体 | 类型 | 描述 | 文件位置 |
|--------|------|------|----------|
| `build` | primary | 用于构建和开发的主智能体 | `agent.ts:195` |
| `plan` | primary | 用于规划和设计的主智能体 | `agent.ts:212` |
| `general` | subagent | 通用研究和多步骤任务 | `agent.ts:232` |
| `explore` | subagent | 快速代码库探索 | `agent.ts:250` |
| `compaction` | hidden | 会话压缩 | `agent.ts:280` |
| `title` | hidden | 生成会话标题 | `agent.ts:298` |
| `summary` | hidden | 生成会话摘要 | `agent.ts:316` |

### 1.3 设计目标

- **模块化**: 每个智能体职责单一，易于组合
- **可扩展**: 支持用户自定义智能体
- **安全**: 细粒度权限控制，默认拒绝策略
- **灵活**: 支持不同的执行模式和参数配置
- **可观测**: 完整的配置和状态管理

---

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户接口层                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │   CLI    │  │   Web    │  │  VSCode  │  │ Desktop  │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
└───────┼────────────┼────────────┼────────────┼──────────────────┘
        │            │            │            │
        └────────────┴────────────┴────────────┘
                             │
        ┌────────────────────────────────────────────────────────────┐
        │                    智能体管理层                             │
        │  ┌───────────────────────────────────────────────────┐     │
        │  │               Agent Namespace                     │     │
        │  │  • get(agent)           • list()                  │     │
        │  │  • defaultAgent()       • generate(input)         │     │
        │  └───────────────────────────────────────────────────┘     │
        │                                                             │
        │  ┌───────────────────────────────────────────────────┐     │
        │  │              Instance State                       │     │
        │  │  • 内置智能体配置    • 用户自定义智能体              │     │
        │  │  • 权限合并规则     • 模型配置                     │     │
        │  └───────────────────────────────────────────────────┘     │
        └────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────────────────────────────────────────────┐
        │                    配置与权限层                              │
        │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
        │  │    Config   │  │ Permission  │  │  Provider   │         │
        │  │    系统      │  │   Next      │  │   管理      │         │
        │  └─────────────┘  └─────────────┘  └─────────────┘         │
        └────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────────────────────────────────────────────┐
        │                    外部集成层                                │
        │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
        │  │   LLM       │  │    MCP      │  │  External   │         │
        │  │ Providers   │  │   Servers   │  │  Tools      │         │
        │  └─────────────┘  └─────────────┘  └─────────────┘         │
        └────────────────────────────────────────────────────────────┘
```

### 2.2 核心组件

#### 2.2.1 Agent Namespace

智能体管理的核心接口，位于 `packages/opencode/src/agent/agent.ts:112`

```typescript
export namespace Agent {
  // 获取指定智能体
  async function get(agent: string): Promise<Info>

  // 获取所有智能体（按默认智能体排序）
  async function list(): Promise<Info[]>

  // 获取默认智能体
  async function defaultAgent(): Promise<string>

  // 使用 AI 生成新智能体配置
  async function generate(input: {
    description: string
    model?: { providerID: string; modelID: string }
  }): Promise<{ identifier: string; whenToUse: string; systemPrompt: string }>
}
```

#### 2.2.2 智能体状态管理

使用 `Instance.state()` 创建响应式状态，自动合并：
- 默认权限配置
- 智能体特定权限
- 用户配置权限

---

## 3. 智能体类型系统

### 3.1 智能体模式

```typescript
// 文件: packages/opencode/src/agent/agent.ts:125
mode: z.enum(["subagent", "primary", "all"])

// subagent:  子智能体，由其他智能体调用
// primary:   主智能体，在 UI 中显示供用户选择
// all:       通用智能体，可作为主或子智能体
```

### 3.2 智能体配置结构

```typescript
// 文件: packages/opencode/src/agent/agent.ts:118
export const Info = z.object({
  // 基础信息
  name: z.string(),                    // 智能体名称（唯一标识符）
  description: z.string().optional(),  // 智能体描述
  mode: z.enum(["subagent", "primary", "all"]),  // 智能体模式
  native: z.boolean().optional(),       // 是否为内置智能体
  hidden: z.boolean().optional(),       // 是否在 UI 中隐藏

  // 模型参数
  topP: z.number().optional(),          // Top P 采样参数
  temperature: z.number().optional(),   // 温度参数

  // UI 配置
  color: z.string().optional(),         // UI 显示颜色

  // 权限配置
  permission: PermissionNext.Ruleset,  // 权限规则集

  // 模型配置
  model: z.object({
    modelID: z.string(),
    providerID: z.string(),
  }).optional(),

  // 提示词
  prompt: z.string().optional(),        // 自定义系统提示词

  // 执行选项
  options: z.record(z.string(), z.any()),  // 额外选项
  steps: z.number().int().positive().optional(),  // 最大步骤数
})

export type Info = z.infer<typeof Info>
```

### 3.3 权限规则集

```typescript
// 权限规则集结构
type Ruleset = Array<{
  permission: string          // 权限名称（如 "read", "edit", "bash"）
  pattern?: string | object   // 匹配模式（文件路径模式或嵌套规则）
  effect?: "allow" | "deny" | "ask"  // 效果
}>

// 示例：
const permission: Ruleset = [
  { permission: "*", effect: "allow" },              // 允许所有操作
  { permission: "doom_loop", effect: "ask" },        // 死循环检测需要询问
  {
    permission: "external_directory",
    pattern: {
      "*": "ask",                                    // 外部目录默认询问
      [Truncate.DIR]: "allow",                       // 截断工具目录允许
      [Truncate.GLOB]: "allow",
    }
  },
  {
    permission: "read",
    pattern: {
      "*": "allow",                                  // 默认允许读取
      "*.env": "ask",                                // .env 文件需要询问
      "*.env.*": "ask",
      "*.env.example": "allow",
    }
  },
]
```

---

## 4. 智能体管理

### 4.1 获取智能体

```typescript
// 文件: packages/opencode/src/agent/agent.ts:394
export async function get(agent: string) {
  return state().then((x) => x[agent])
}

// 使用示例
const buildAgent = await Agent.get("build")
console.log(buildAgent.name)        // "build"
console.log(buildAgent.mode)        // "primary"
console.log(buildAgent.permission)  // 权限规则集
```

### 4.2 列出所有智能体

```typescript
// 文件: packages/opencode/src/agent/agent.ts:409
export async function list() {
  const cfg = await Config.get()
  return pipe(
    await state(),
    values(),
    // 默认智能体排在最前
    sortBy([
      (x) => (cfg.default_agent ? x.name === cfg.default_agent : x.name === "build"),
      "desc"
    ])
  )
}

// 使用示例
const agents = await Agent.list()
// 返回: [build, plan, general, explore, compaction, title, summary, ...自定义智能体]
```

### 4.3 获取默认智能体

```typescript
// 文件: packages/opencode/src/agent/agent.ts:424
export async function defaultAgent() {
  return state().then((x) => Object.keys(x)[0])
}

// 使用示例
const defaultAgent = await Agent.defaultAgent()
// 返回: "build" 或用户配置的默认智能体
```

### 4.4 AI 生成智能体

```typescript
// 文件: packages/opencode/src/agent/agent.ts:444
export async function generate(input: {
  description: string
  model?: { providerID: string; modelID: string }
}) {
  const cfg = await Config.get()
  const defaultModel = input.model ?? (await Provider.defaultModel())
  const model = await Provider.getModel(defaultModel.providerID, defaultModel.modelID)

  // 构造系统提示词
  const system = SystemPrompt.header(defaultModel.providerID)
  system.push(PROMPT_GENERATE)  // 使用 generate.txt 提示词

  // 获取现有智能体列表（避免重复）
  const existing = await list()

  // 生成智能体配置
  const result = await generateObject({
    temperature: 0.3,
    messages: [
      ...system.map((item): ModelMessage => ({
        role: "system",
        content: item,
      })),
      {
        role: "user",
        content: `Create an agent configuration based on this request: "${input.description}".

IMPORTANT: The following identifiers already exist and must NOT be used: ${existing.map((i) => i.name).join(", ")}
Return ONLY the JSON object, no other text, do not wrap in backticks`,
      },
    ],
    model: language,
    schema: z.object({
      identifier: z.string(),
      whenToUse: z.string(),
      systemPrompt: z.string(),
    }),
  })

  return result.object
}

// 使用示例
const newAgent = await Agent.generate({
  description: "一个专门处理数据库迁移的智能体"
})
// 返回: { identifier, whenToUse, systemPrompt }
```

---

## 5. 权限系统

### 5.1 权限合并策略

智能体的权限是按以下顺序合并的：

```typescript
// 文件: packages/opencode/src/agent/agent.ts:199
permission: PermissionNext.merge(
  defaults,        // 1. 默认权限
  PermissionNext.fromConfig({
    // 2. 智能体特定权限
    question: "allow",
  }),
  user,            // 3. 用户配置权限
)
```

### 5.2 默认权限配置

```typescript
// 文件: packages/opencode/src/agent/agent.ts:167
const defaults = PermissionNext.fromConfig({
  "*": "allow",                    // 默认允许所有操作
  "doom_loop": "ask",              // 死循环检测需要询问
  "external_directory": {
    "*": "ask",                    // 外部目录需要询问
    [Truncate.DIR]: "allow",       // 除了截断工具目录
    [Truncate.GLOB]: "allow",
  },
  "question": "deny",              // 拒绝直接回答用户问题
  "read": {
    "*": "allow",                  // 默认允许读取
    "*.env": "ask",                // .env 文件需要询问
    "*.env.*": "ask",
    "*.env.example": "allow",
  },
})
```

### 5.3 各智能体的权限差异

| 智能体 | 特殊权限 | 说明 |
|--------|----------|------|
| `build` | `question: "allow"` | 允许回答用户问题 |
| `plan` | `edit: { ".opencode/plan/*.md": "allow" }` | 只允许编辑计划文件 |
| `general` | `todoread: "deny"`, `todowrite: "deny"` | 禁止读写待办事项 |
| `explore` | 只读操作 | 只允许 grep, glob, list, bash, read 等 |
| `compaction` | `*: "deny"` | 禁止所有操作 |

---

## 6. 执行机制

### 6.1 智能体执行流程

```
用户发送消息
    │
    ├─► 获取当前智能体配置
    │   └─► Agent.get(agentId)
    │
    ├─► 准备执行上下文
    │   ├─► 系统提示词
    │   ├─► 智能体特定提示词 (prompt 字段)
    │   ├─► 模型参数 (temperature, topP)
    │   └─► 权限规则
    │
    ├─► 判断是否需要调用子智能体
    │   │
    │   ├─► 是: 调用 Task Tool
    │   │   ├─► 获取子智能体配置
    │   │   ├─► 创建子智能体实例
    │   │   ├─► 执行子智能体
    │   │   └─► 返回结果
    │   │
    │   └─► 否: 直接执行
    │       ├─► 调用 LLM API
    │       ├─► 处理工具调用
    │       └─► 返回结果
    │
    └─► 返回最终结果
```

### 6.2 子智能体调用

主智能体通过 Task Tool 调用子智能体：

```typescript
// 主智能体决策调用子智能体
const subAgentResult = await task({
  subagent_type: "explore",  // 或 "general"
  prompt: "探索这个代码库的结构",
  description: "3-5行关于需要在代码库中查找什么内容的描述"
})

// 内部流程
// 1. Agent.get("explore") - 获取子智能体配置
// 2. 验证权限
// 3. 执行子智能体
// 4. 返回结果
```

### 6.3 提示词系统

每个智能体可以有专用提示词：

| 智能体 | 提示词文件 | 用途 |
|--------|-----------|------|
| `explore` | `prompt/explore.txt` | 代码探索专用指令 |
| `compaction` | `prompt/compaction.txt` | 会话压缩指令 |
| `summary` | `prompt/summary.txt` | 会话摘要生成 |
| `title` | `prompt/title.txt` | 会话标题生成 |

示例：explore.txt

```text
You are a file search specialist. You excel at thoroughly navigating and exploring codebases.

Your strengths:
- Rapidly finding files using glob patterns
- Searching code and text with powerful regex patterns
- Reading and analyzing file contents

Guidelines:
- Use Glob for broad file pattern matching
- Use Grep for searching file contents with regex
- Use Read when you know the specific file path
- Use Bash for file operations like copying, moving, or listing directory contents
- Adapt your search approach based on the thoroughness level specified by the caller
- Return file paths as absolute paths in your final response
- For clear communication, avoid using emojis
- Do not create files, or run bash commands that modify your user's system state in any way

Complete the user's search request efficiently and report your findings clearly.
```

---

## 7. 实现细节

### 7.1 状态初始化

```typescript
// 文件: packages/opencode/src/agent/agent.ts:162
const state = Instance.state(async () => {
  // 1. 获取用户配置
  const cfg = await Config.get()

  // 2. 定义默认权限
  const defaults = PermissionNext.fromConfig({ /* ... */ })

  // 3. 获取用户权限配置
  const user = PermissionNext.fromConfig(cfg.permission ?? {})

  // 4. 定义内置智能体
  const result: Record<string, Info> = {
    build: { /* ... */ },
    plan: { /* ... */ },
    general: { /* ... */ },
    explore: { /* ... */ },
    compaction: { /* ... */ },
    title: { /* ... */ },
    summary: { /* ... */ },
  }

  // 5. 处理用户自定义智能体
  for (const [key, value] of Object.entries(cfg.agent ?? {})) {
    if (value.disable) {
      delete result[key]
      continue
    }

    let item = result[key]
    if (!item) {
      item = result[key] = {
        name: key,
        mode: "all",
        permission: PermissionNext.merge(defaults, user),
        options: {},
        native: false,
      }
    }

    // 应用用户配置
    if (value.model) item.model = Provider.parseModel(value.model)
    item.prompt = value.prompt ?? item.prompt
    item.description = value.description ?? item.description
    item.temperature = value.temperature ?? item.temperature
    item.topP = value.top_p ?? item.topP
    item.mode = value.mode ?? item.mode
    item.color = value.color ?? item.color
    item.hidden = value.hidden ?? item.hidden
    item.name = value.name ?? item.name
    item.steps = value.steps ?? item.steps
    item.options = mergeDeep(item.options, value.options ?? {})
    item.permission = PermissionNext.merge(
      item.permission,
      PermissionNext.fromConfig(value.permission ?? {})
    )
  }

  // 6. 确保 Truncate 目录访问权限
  for (const name in result) {
    const agent = result[name]
    const explicit = agent.permission.some((r) => {
      if (r.permission !== "external_directory") return false
      if (r.action !== "deny") return false
      return r.pattern === Truncate.DIR || r.pattern === Truncate.GLOB
    })
    if (explicit) continue

    result[name].permission = PermissionNext.merge(
      result[name].permission,
      PermissionNext.fromConfig({
        external_directory: {
          [Truncate.DIR]: "allow",
          [Truncate.GLOB]: "allow",
        },
      })
    )
  }

  return result
})
```

### 7.2 权限合并实现

```typescript
// PermissionNext.merge() 合并多个权限规则集
// 后面的规则覆盖前面的规则（对于相同的权限和模式）

const merged = PermissionNext.merge(
  defaults,        // 基础权限
  specific,        // 智能体特定权限
  user             // 用户配置权限
)

// 合并策略：
// 1. 按 permission 分组
// 2. 对于相同的 permission 和 pattern，后者的 effect 覆盖前者
// 3. 保留所有唯一的规则
```

---

## 8. 扩展机制

### 8.1 用户自定义智能体

在配置文件中定义自定义智能体：

```json
{
  "agent": {
    "my-custom-agent": {
      "name": "My Custom Agent",
      "description": "A specialized agent for my use case",
      "mode": "primary",
      "model": "openai:gpt-4",
      "temperature": 0.7,
      "prompt": "You are a specialized assistant for...",
      "permission": {
        "read": "allow",
        "edit": {
          "*.ts": "allow",
          "*.json": "ask"
        }
      },
      "color": "#FF5733",
      "steps": 100
    },
    "disable-default-agent": {
      "disable": true
    }
  }
}
```

### 8.2 配置选项详解

| 选项 | 类型 | 说明 |
|------|------|------|
| `name` | string | 智能体显示名称 |
| `description` | string | 智能体描述 |
| `mode` | "primary" \| "subagent" \| "all" | 智能体模式 |
| `model` | string | 模型配置 (provider:model) |
| `temperature` | number | 温度参数 (0-2) |
| `top_p` | number | Top P 采样参数 |
| `prompt` | string | 自定义系统提示词 |
| `permission` | object | 权限规则 |
| `color` | string | UI 显示颜色 |
| `steps` | number | 最大步骤数 |
| `options` | object | 额外选项 |
| `hidden` | boolean | 是否在 UI 中隐藏 |
| `disable` | boolean | 是否禁用（用于覆盖内置智能体） |

### 8.3 禁用内置智能体

```json
{
  "agent": {
    "plan": {
      "disable": true
    }
  }
}
```

---

## 9. 最佳实践

### 9.1 智能体设计原则

1. **单一职责**: 每个智能体应专注于一个特定领域
2. **最小权限**: 只授予完成任务所需的权限
3. **明确边界**: 清确定义智能体的职责范围
4. **可组合性**: 设计为可被其他智能体调用的组件

### 9.2 提示词编写

1. **清晰指令**: 明确说明智能体的职责和限制
2. **工具使用**: 详细说明何时如何使用可用工具
3. **输出格式**: 指定期望的输出格式
4. **错误处理**: 说明如何处理错误和边界情况

### 9.3 权限配置

1. **默认拒绝**: 未明确允许的操作应被拒绝
2. **敏感操作**: 对敏感操作使用 "ask" 效果
3. **文件模式**: 使用 glob 模式精确控制文件访问
4. **测试验证**: 确保权限配置符合预期

### 9.4 性能优化

1. **步骤限制**: 使用 `steps` 限制防止无限循环
2. **温度控制**: 根据任务特点调整 temperature
3. **提示词长度**: 保持提示词简洁有效
4. **缓存策略**: 利用会话上下文避免重复计算

---

## 附录

### A. 类型定义参考

完整的类型定义请参考：
- `packages/opencode/src/agent/agent.ts` - 核心智能体系统

### B. 配置文件位置

| 文件 | 说明 |
|------|------|
| `.opencode/config.json` | 全局配置 |
| `packages/opencode/src/agent/generate.txt` | 智能体生成提示词 |
| `packages/opencode/src/agent/prompt/*.txt` | 各智能体的专用提示词 |

### C. API 参考

| 函数 | 文件位置 | 说明 |
|------|----------|------|
| `Agent.get()` | agent.ts:394 | 获取智能体配置 |
| `Agent.list()` | agent.ts:409 | 列出所有智能体 |
| `Agent.defaultAgent()` | agent.ts:424 | 获取默认智能体 |
| `Agent.generate()` | agent.ts:444 | AI 生成智能体 |

---

**文档版本**: 2.0.0
**最后更新**: 2026-01-21
