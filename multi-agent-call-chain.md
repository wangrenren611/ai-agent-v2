# 多智能体协作调用链详解

> **版本**: 2.0.0
> **作者**: OpenCode Team
> **更新日期**: 2026-01-21

## 目录

1. [场景概述](#1-场景概述)
2. [架构组件](#2-架构组件)
3. [完整调用链](#3-完整调用链)
4. [详细步骤解析](#4-详细步骤解析)
5. [代码文件位置](#5-代码文件位置)

---

## 1. 场景概述

### 用户请求

```
"分析这个代码库的性能问题，找出所有 API 端点，并生成一份优化建议报告"
```

### 涉及的智能体

| 智能体 | 类型 | 描述 | 文件位置 |
|--------|------|------|----------|
| `build` | primary | 主智能体，接收用户请求，协调整体流程 | `agent.ts:195` |
| `explore` | subagent | 快速探索代码库，查找 API 端点 | `agent.ts:250` |
| `general` | subagent | 深度分析代码性能问题 | `agent.ts:232` |

### 协作模式

```
┌─────────────────────────────────────────────────────────────┐
│                     用户输入                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   build (主智能体)                            │
│  • 理解用户意图                                              │
│  • 决策需要调用哪些子智能体                                    │
│  • 协调执行流程                                              │
│  • 整合结果并返回                                            │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
┌───────────────────────┐   ┌───────────────────────┐
│   explore (子智能体)    │   │   general (子智能体)    │
│  • 快速查找 API 端点    │   │  • 深度性能分析         │
│  • Glob + Grep 搜索    │   │  • 代码审查            │
│  • 只读权限            │   │  • 完整权限            │
└───────────────────────┘   └───────────────────────┘
                │                       │
                └───────────┬───────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   build 整合结果                              │
│  • 汇总 explore 的 API 列表                                   │
│  • 汇总 general 的性能分析                                    │
│  • 生成优化建议报告                                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     返回给用户                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 架构组件

### 2.1 核心类和函数

```typescript
// 文件: packages/opencode/src/agent/agent.ts
export namespace Agent {
  // 获取智能体配置
  async function get(agent: string): Info

  // 列出所有智能体
  async function list(): Info[]

  // 获取默认智能体
  async function defaultAgent(): string

  // AI 生成新智能体
  async function generate(input: { description: string; model?: { ... } })
}

// 智能体配置结构
interface Info {
  name: string                      // 智能体名称
  mode: "primary" | "subagent" | "all"  // 模式
  description?: string              // 描述
  permission: Ruleset               // 权限规则
  prompt?: string                   // 专用提示词
  temperature?: number              // 温度参数
  topP?: number                     // Top P 参数
  steps?: number                    // 最大步骤数
  model?: {                         // 模型配置
    modelID: string
    providerID: string
  }
}
```

### 2.2 权限系统

```typescript
// 文件: packages/opencode/src/permission/next.ts
export namespace PermissionNext {
  // 从配置创建权限规则集
  function fromConfig(config: PermissionConfig): Ruleset

  // 合并多个权限规则集
  function merge(...rulesets: Ruleset[]): Ruleset
}

// 权限规则结构
type Ruleset = Array<{
  permission: string          // 权限名称
  pattern?: string | object   // 匹配模式
  effect?: "allow" | "deny" | "ask"  // 效果
}>
```

### 2.3 Task Tool

主智能体通过 Task Tool 调用子智能体：

```typescript
// Task Tool 调用签名
await task({
  subagent_type: "explore" | "general",
  prompt: string,           // 子智能体的任务描述
  description?: string      // 详细描述（3-5行）
})
```

---

## 3. 完整调用链

### 调用链流程图

```
用户输入 "分析这个代码库的性能问题，找出所有 API 端点，并生成一份优化建议报告"
│
└─► [1] Session 处理用户消息
    │   模块: packages/opencode/src/session/
    │   函数: handleUserMessage(message: string)
    │
    ├─► [2] 获取默认智能体
    │   │   文件: agent/agent.ts:424
    │   │   函数: Agent.defaultAgent()
    │   │   返回: "build"
    │   │
    ├─► [3] 获取智能体配置
    │   │   文件: agent/agent.ts:394
    │   │   函数: Agent.get("build")
    │   │   返回: { name: "build", mode: "primary", permission: [...], ... }
    │   │
    └─► [4] 构建执行上下文
        │   ├─► 系统提示词 (SystemPrompt.header())
        │   ├─► 智能体提示词 (build 没有专用提示词)
        │   ├─► 模型参数 (temperature, topP)
        │   └─► 权限规则 (permission 字段)
        │
        └─► [5] 调用 LLM API (build 智能体开始思考)
            │   LLM 分析用户请求，决定需要调用子智能体
            │
            ├─► [6] LLM 决策: 调用 explore 子智能体
            │   │   工具调用: task({ subagent_type: "explore", ... })
            │   │
            │   └─► [6.1] 获取 explore 配置
            │   │   文件: agent/agent.ts:394
            │   │   函数: Agent.get("explore")
            │   │   返回: { name: "explore", mode: "subagent", permission: [...], prompt: "..." }
            │   │
            │   └─► [6.2] 加载 explore 提示词
            │   │   文件: agent/prompt/explore.txt
            │   │   内容: "You are a file search specialist..."
            │   │
            │   └─► [6.3] 验证权限
            │   │   explore 权限: 只读操作 (grep, glob, list, bash, webfetch, websearch, read)
            │   │
            │   └─► [6.4] 执行 explore 智能体
            │   │   操作: Glob("src/api/**/*.ts") → 查找 API 文件
            │   │   操作: Grep("export.*router|@Post|@Get") → 搜索端点定义
            │   │   操作: Read("src/api/users.ts") → 读取具体文件
            │   │
            │   └─► [6.5] 返回 explore 结果
            │       返回: {
            │         apiFiles: ["src/api/users.ts", "src/api/auth.ts", ...],
            │         endpoints: [
            │           { method: "POST", path: "/api/users", file: "src/api/users.ts" },
            │           { method: "GET", path: "/api/users/:id", file: "src/api/users.ts" },
            │           ...
            │         ]
            │       }
            │
            ├─► [7] LLM 决策: 调用 general 子智能体
            │   │   工具调用: task({ subagent_type: "general", ... })
            │   │   输入: explore 的结果 + 性能分析任务
            │   │
            │   └─► [7.1] 获取 general 配置
            │   │   文件: agent/agent.ts:394
            │   │   函数: Agent.get("general")
            │   │   返回: { name: "general", mode: "subagent", permission: [...], ... }
            │   │
            │   └─► [7.2] 验证权限
            │   │   general 权限: 完整权限 (除了 todoread/todowrite)
            │   │
            │   └─► [7.3] 执行 general 智能体
            │   │   操作: Read() → 读取 explore 找到的 API 文件
            │   │   操作: Grep("TODO|FIXME|XXX") → 搜索代码标记
            │   │   操作: Grep("console\\.log") → 搜索调试代码
            │   │   操作: 分析代码结构和性能问题
            │   │
            │   └─► [7.4] 返回 general 结果
            │       返回: {
            │         performanceIssues: [
            │           {
            │             file: "src/api/users.ts",
            │             issue: "N+1 查询问题",
            │             line: 45,
            │             severity: "high"
            │           },
            │           {
            │             file: "src/api/auth.ts",
            │             issue: "缺少错误处理",
            │             line: 78,
            │             severity: "medium"
            │           },
            │           ...
            │         ],
            │         recommendations: [...]
            │       }
            │
            └─► [8] build 智能体整合结果
                │   汇总 explore 和 general 的结果
                │   生成最终报告
                │
                └─► [9] 返回给用户
                    输出: 完整的分析报告
```

---

## 4. 详细步骤解析

### 步骤 1-3: 会话初始化和智能体获取

```typescript
// 文件: packages/opencode/src/session/session.ts
// 函数: handleUserMessage(message: string)

async function handleUserMessage(message: string): Promise<void> {
  // [1] 处理用户消息

  // [2] 获取默认智能体
  const agentId = await Agent.defaultAgent()  // → agent.ts:424
  // 返回: "build"

  // [3] 获取智能体配置
  const agentConfig = await Agent.get(agentId)  // → agent.ts:394
  // 返回: {
  //   name: "build",
  //   mode: "primary",
  //   permission: [...],
  //   options: {},
  //   native: true
  // }

  // 继续处理...
}
```

### 步骤 4: 构建执行上下文

```typescript
// [4] 构建执行上下文

const context = {
  // 系统提示词
  systemPrompt: [
    ...SystemPrompt.header(providerID),
    // build 没有专用 prompt，所以不添加
  ],

  // 模型参数
  model: {
    temperature: agentConfig.temperature ?? undefined,
    topP: agentConfig.topP ?? undefined,
  },

  // 权限规则
  permissions: agentConfig.permission,

  // 最大步骤数
  maxSteps: agentConfig.steps ?? undefined,
}

// build 的权限 (来自 agent.ts:199)
// PermissionNext.merge(
//   defaults,              // 默认权限
//   { question: "allow" }, // build 特定: 允许回答问题
//   user                   // 用户配置
// )
```

### 步骤 5-6: 调用 explore 子智能体

```typescript
// [5] build 智能体调用 LLM，分析后决定调用 explore

// LLM 返回的工具调用:
const toolCall = {
  name: "task",
  arguments: {
    subagent_type: "explore",
    prompt: "找出这个代码库中所有的 API 端点定义",
    description: `
      搜索代码库中的 API 端点，查找:
      1. Express/koa/Fastify 等框架的路由定义
      2. @Post, @Get, @Put, @Delete 等装饰器
      3. router.post, router.get 等方法调用
      4. API 文件通常在 src/api/, routes/, controllers/ 等目录
      返回所有找到的端点列表，包括文件位置和行号
    `
  }
}

// [6] 执行 Task Tool，调用 explore 子智能体

// [6.1] 获取 explore 配置
const exploreConfig = await Agent.get("explore")  // → agent.ts:394
// 返回: {
//   name: "explore",
//   mode: "subagent",
//   permission: [
//     { permission: "*", effect: "deny" },  // 默认拒绝
//     { permission: "grep", effect: "allow" },
//     { permission: "glob", effect: "allow" },
//     { permission: "list", effect: "allow" },
//     { permission: "bash", effect: "allow" },
//     { permission: "webfetch", effect: "allow" },
//     { permission: "websearch", effect: "allow" },
//     { permission: "codesearch", effect: "allow" },
//     { permission: "read", effect: "allow" },
//   ],
//   prompt: "...explore.txt 的内容...",
//   native: true
// }

// [6.2] 加载 explore 提示词
// 文件: packages/opencode/src/agent/prompt/explore.txt
const explorePrompt = `
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
`

// [6.3] 验证权限
// explore 只读权限，不允许写操作

// [6.4] 执行 explore 智能体
const exploreResult = await executeAgent(exploreConfig, {
  prompt: "找出这个代码库中所有的 API 端点定义",
  description: "..."
})

// explore 内部操作:
// 1. Glob("src/**/*.ts") → 查找所有 TypeScript 文件
// 2. Grep("@Post|@Get|@Put|@Delete|router\\.(get|post|put|delete)", "src/**/*.ts")
//    → 搜索端点定义模式
// 3. Read("src/api/users.ts") → 读取具体文件内容
// 4. Read("src/api/auth.ts") → 读取具体文件内容

// [6.5] 返回 explore 结果
const exploreOutput = {
  summary: "在代码库中找到 15 个 API 端点",
  apiFiles: [
    "/Users/wrr/work/opencode/src/api/users.ts",
    "/Users/wrr/work/opencode/src/api/auth.ts",
    "/Users/wrr/work/opencode/src/api/products.ts"
  ],
  endpoints: [
    {
      file: "/Users/wrr/work/opencode/src/api/users.ts",
      method: "POST",
      path: "/api/users",
      line: 23
    },
    {
      file: "/Users/wrr/work/opencode/src/api/users.ts",
      method: "GET",
      path: "/api/users/:id",
      line: 45
    },
    {
      file: "/Users/wrr/work/opencode/src/api/auth.ts",
      method: "POST",
      path: "/api/auth/login",
      line: 12
    },
    // ... 更多端点
  ]
}
```

### 步骤 7: 调用 general 子智能体

```typescript
// [7] build 智能体收到 explore 结果，决定调用 general 进行深度分析

// LLM 返回的工具调用:
const toolCall = {
  name: "task",
  arguments: {
    subagent_type: "general",
    prompt: `
      分析以下 API 端点的性能问题:
      ${exploreOutput}

      重点关注:
      1. N+1 查询问题
      2. 缺少错误处理
      3. 未优化的数据库查询
      4. 内存泄漏风险
      5. 并发处理问题
    `,
    description: "深度分析 API 性能问题，给出具体的代码位置和改进建议"
  }
}

// [7.1] 获取 general 配置
const generalConfig = await Agent.get("general")  // → agent.ts:394
// 返回: {
//   name: "general",
//   mode: "subagent",
//   permission: [
//     // 默认权限
//     // 但 todoread: "deny", todowrite: "deny"
//   ],
//   native: true
// }

// [7.2] 验证权限
// general 有完整权限（除了待办事项）

// [7.3] 执行 general 智能体
const generalResult = await executeAgent(generalConfig, {
  prompt: "...",
  context: {
    exploreResult: exploreOutput
  }
})

// general 内部操作:
// 1. Read(exploreOutput.apiFiles[0]) → 读取 API 文件
// 2. Grep("await.*find.*map|forEach.*await", exploreOutput.apiFiles)
//    → 搜索可能的 N+1 查询模式
// 3. Grep("try|catch", exploreOutput.apiFiles)
//    → 检查错误处理
// 4. 分析代码逻辑，识别性能问题

// [7.4] 返回 general 结果
const generalOutput = {
  summary: "发现 5 个性能问题",
  performanceIssues: [
    {
      file: "/Users/wrr/work/opencode/src/api/users.ts",
      line: 45,
      issue: "N+1 查询问题",
      severity: "high",
      code: "const users = await User.find(); const results = users.map(u => getUserDetails(u.id))",
      recommendation: "使用 JOIN 或批量查询代替循环查询"
    },
    {
      file: "/Users/wrr/work/opencode/src/api/auth.ts",
      line: 78,
      issue: "缺少错误处理",
      severity: "medium",
      code: "const token = jwt.sign(payload, secret)",
      recommendation: "添加 try-catch 处理签名失败的情况"
    },
    // ... 更多问题
  ],
  recommendations: [
    "使用数据库索引优化查询性能",
    "实现请求限流防止 API 滥用",
    "添加缓存层减少数据库负载"
  ]
}
```

### 步骤 8-9: 整合结果并返回

```typescript
// [8] build 智能体整合结果

// LLM 收集所有子智能体的结果，生成最终报告
const finalReport = `
# API 性能分析报告

## 概览
- 发现 API 端点: ${exploreOutput.endpoints.length} 个
- 性能问题: ${generalOutput.performanceIssues.length} 个
- 高危问题: ${generalOutput.performanceIssues.filter(i => i.severity === 'high').length} 个

## API 端点列表
${exploreOutput.endpoints.map(ep =>
  `- ${ep.method} ${ep.path} (${ep.file}:${ep.line})`
).join('\n')}

## 性能问题详情
${generalOutput.performanceIssues.map(issue => `
### ${issue.issue} (${issue.severity})
- 文件: ${issue.file}:${issue.line}
- 代码: \`${issue.code}\`
- 建议: ${issue.recommendation}
`).join('\n')}

## 优化建议
${generalOutput.recommendations.map(rec => `- ${rec}`).join('\n')}
`

// [9] 返回给用户
return finalReport
```

---

## 5. 代码文件位置

### 核心文件

| 文件路径 | 主要内容 | 关键函数 |
|----------|----------|----------|
| `packages/opencode/src/agent/agent.ts` | 核心智能体系统 | `get()`, `list()`, `defaultAgent()`, `generate()` |
| `packages/opencode/src/agent/prompt/explore.txt` | explore 智能体提示词 | - |
| `packages/opencode/src/permission/next.ts` | 权限系统 | `fromConfig()`, `merge()` |
| `packages/opencode/src/config/config.ts` | 配置管理 | `get()` |

### 智能体配置位置

```typescript
// 文件: packages/opencode/src/agent/agent.ts:162
const state = Instance.state(async () => {
  const result: Record<string, Info> = {
    // build: 第 195 行
    build: {
      name: "build",
      permission: PermissionNext.merge(
        defaults,
        { question: "allow" },  // 允许回答用户问题
        user
      ),
      mode: "primary",
      native: true,
    },

    // explore: 第 250 行
    explore: {
      name: "explore",
      permission: PermissionNext.merge(
        defaults,
        {
          "*": "deny",      // 默认拒绝
          "grep": "allow",
          "glob": "allow",
          "list": "allow",
          "bash": "allow",
          "webfetch": "allow",
          "websearch": "allow",
          "codesearch": "allow",
          "read": "allow",
        },
        user
      ),
      description: "Fast agent specialized for exploring codebases...",
      prompt: PROMPT_EXPLORE,  // 加载 explore.txt
      mode: "subagent",
      native: true,
    },

    // general: 第 232 行
    general: {
      name: "general",
      description: "General-purpose agent for researching complex questions...",
      permission: PermissionNext.merge(
        defaults,
        {
          "todoread": "deny",   // 禁止读待办事项
          "todowrite": "deny",  // 禁止写待办事项
        },
        user
      ),
      mode: "subagent",
      native: true,
    },
  }
  return result
})
```

### 类型定义

```typescript
// 文件: packages/opencode/src/agent/agent.ts:118
export const Info = z.object({
  name: z.string(),
  description: z.string().optional(),
  mode: z.enum(["subagent", "primary", "all"]),
  native: z.boolean().optional(),
  hidden: z.boolean().optional(),
  topP: z.number().optional(),
  temperature: z.number().optional(),
  color: z.string().optional(),
  permission: PermissionNext.Ruleset,
  model: z.object({
    modelID: z.string(),
    providerID: z.string(),
  }).optional(),
  prompt: z.string().optional(),
  options: z.record(z.string(), z.any()),
  steps: z.number().int().positive().optional(),
})
```

---

## 调用链总结

```
用户输入
  │
  ├─► Agent.defaultAgent()          [获取默认智能体 "build"]
  │   └─► state()                   [获取所有智能体配置]
  │
  ├─► Agent.get("build")             [获取 build 配置]
  │
  ├─► 构建执行上下文
  │   ├─► 系统提示词
  │   ├─► 权限规则
  │   └─► 模型参数
  │
  ├─► Task Tool 调用 explore
  │   ├─► Agent.get("explore")
  │   ├─► 加载 explore.txt 提示词
  │   ├─► 验证只读权限
  │   ├─► Glob/Grep/Read 操作
  │   └─► 返回 API 端点列表
  │
  ├─► Task Tool 调用 general
  │   ├─► Agent.get("general")
  │   ├─► 验证完整权限
  │   ├─► Read/Grep 分析代码
  │   └─► 返回性能问题列表
  │
  ├─► build 整合结果
  │   └─► 生成最终报告
  │
  └─► 返回给用户
```

### 关键调用函数

| 步骤 | 函数调用 | 文件位置 |
|------|----------|----------|
| 获取智能体 | `Agent.get(agentId)` | agent.ts:394 |
| 获取默认智能体 | `Agent.defaultAgent()` | agent.ts:424 |
| 列出智能体 | `Agent.list()` | agent.ts:409 |
| 生成智能体 | `Agent.generate(input)` | agent.ts:444 |
| 权限合并 | `PermissionNext.merge()` | permission/next.ts |
| 权限创建 | `PermissionNext.fromConfig()` | permission/next.ts |

---

**文档版本**: 2.0.0
**最后更新**: 2026-01-21
