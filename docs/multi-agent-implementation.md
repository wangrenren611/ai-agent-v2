# 多智能体实现方案

> **版本**: 1.0.0
> **作者**: OpenCode Team
> **更新日期**: 2026-01-21

## 目录

1. [系统概述](#1-系统概述)
2. [架构设计](#2-架构设计)
3. [智能体类型系统](#3-智能体类型系统)
4. [工作流引擎](#4-工作流引擎)
5. [通信与协作机制](#5-通信与协作机制)
6. [权限系统](#6-权限系统)
7. [事件系统](#7-事件系统)
8. [实现细节](#8-实现细节)
9. [扩展机制](#9-扩展机制)
10. [最佳实践](#10-最佳实践)

---

## 1. 系统概述

### 1.1 项目背景

OpenCode 项目包含两个多智能体系统：

1. **核心智能体系统** (`packages/opencode/src/agent/`)
   - 用于 AI 编程辅助的智能体管理
   - 支持主智能体和子智能体
   - 集成权限系统和配置管理

2. **工作流智能体系统** (`workflow-agent/`)
   - 企业级工作流自动化
   - 支持编排器、工作器、审核器等多种智能体类型
   - 完整的工作流引擎和事件系统

### 1.2 设计目标

- **模块化**: 每个智能体职责单一，易于组合
- **可扩展**: 支持动态添加新智能体和工作流
- **安全**: 细粒度权限控制
- **可观测**: 完整的事件追踪和日志记录
- **高可用**: 支持重试、故障转移和恢复

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
        │  │              AgentManager                         │     │
        │  │  • register(config)    • get(id)                  │     │
        │  │  • list(filters)       • update(id, updates)      │     │
        │  │  • delete(id)          • generate(description)    │     │
        │  └───────────────────────────────────────────────────┘     │
        └────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────────────────────────────────────────────┐
        │                    执行层                                    │
        │  ┌─────────────────┐  ┌─────────────────┐                  │
        │  │  AgentExecutor  │  │ WorkflowExecutor│                  │
        │  │  • createInstance│  │  • execute()    │                  │
        │  │  • execute()     │  │  • pause()      │                  │
        │  │  • getResult()   │  │  • resume()     │                  │
        │  └─────────────────┘  │  • cancel()     │                  │
        │                       └─────────────────┘                  │
        └────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────────────────────────────────────────────┐
        │                    基础设施层                                │
        │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
        │  │ Permission  │  │  EventBus  │  │  Storage    │         │
        │  │ Evaluator   │  │             │  │  Backend    │         │
        │  └─────────────┘  └─────────────┘  └─────────────┘         │
        └────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────────────────────────────────────────────┐
        │                    外部集成层                                │
        │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
        │  │   LLM       │  │    MCP      │  │  External   │         │
        │  │ Providers   │  │   Servers   │  │  Services   │         │
        │  └─────────────┘  └─────────────┘  └─────────────┘         │
        └────────────────────────────────────────────────────────────┘
```

### 2.2 核心组件

#### 2.2.1 AgentManager

智能体管理器负责智能体的生命周期管理：

```typescript
class AgentManager {
  // 智能体注册表
  private readonly agents: Map<string, AgentConfig>
  // 实例管理
  private readonly instances: Map<string, AgentInstance>
  // 存储后端
  private readonly storage?: AgentStorage

  // 注册新智能体
  async register(config: AgentConfig): Promise<void>

  // 获取智能体配置
  async get(id: string): Promise<AgentConfig | undefined>

  // 列出智能体
  async list(filters?: AgentFilters): Promise<AgentConfig[]>

  // 更新智能体
  async update(id: string, updates: Partial<AgentConfig>): Promise<void>

  // 删除智能体
  async delete(id: string): Promise<void>

  // 创建执行实例
  async createInstance(agentId: string, input?: Record<string, any>): Promise<AgentInstance>

  // AI 生成智能体
  async generate(description: string, context?: GenerationContext): Promise<AgentConfig>
}
```

#### 2.2.2 WorkflowExecutor

工作流执行器负责工作流的编排和执行：

```typescript
class WorkflowExecutor {
  private readonly agentManager: AgentManager
  private readonly permissionEvaluator: PermissionEvaluator
  private readonly eventBus: EventBus
  private readonly storage?: WorkflowStorage

  // 执行工作流
  async execute(
    workflow: WorkflowDefinition,
    input?: Record<string, any>,
    context?: ExecutionContext,
    options?: Partial<WorkflowOptions>
  ): Promise<WorkflowExecutionResult>

  // 暂停工作流
  async pause(instanceId: string): Promise<void>

  // 恢复工作流
  async resume(instanceId: string): Promise<void>

  // 取消工作流
  async cancel(instanceId: string): Promise<void>

  // 获取状态
  async getStatus(instanceId: string): Promise<WorkflowInstance | undefined>
}
```

---

## 3. 智能体类型系统

### 3.1 智能体类型

```typescript
enum AgentType {
  // 编排器：协调其他智能体，管理工作流执行
  orchestrator = "orchestrator",

  // 工作器：执行特定任务和操作
  worker = "worker",

  // 审核器：审核和验证其他智能体的输出
  reviewer = "reviewer",

  // 隐藏：内部智能体，不暴露给用户
  hidden = "hidden"
}
```

### 3.2 执行模式

```typescript
enum AgentMode {
  // 手动：需要人工批准
  manual = "manual",

  // 自动：自主执行
  auto = "auto",

  // 混合：可手动也可自动
  hybrid = "hybrid"
}
```

### 3.3 智能体配置

完整的智能体配置结构：

```typescript
interface AgentConfig {
  // 基础信息
  id: string                      // 唯一标识符
  name: string                    // 可读名称
  description?: string            // 描述
  version: string                 // 版本号 (semver)

  // 类型配置
  type: AgentType                 // 智能体类型
  mode: AgentMode                 // 执行模式

  // 模型配置
  model: ModelConfig              // LLM 配置

  // 权限配置
  permissions: PermissionRule[]   // 权限规则

  // 提示词
  systemPrompt?: string           // 系统提示词
  instructions?: string           // 额外指令

  // 执行限制
  maxSteps: number                // 最大步骤数
  timeout: number                 // 超时时间 (ms)

  // 重试策略
  retryPolicy?: RetryPolicy       // 重试配置

  // 分类
  tags: string[]                  // 标签

  // 扩展
  metadata?: Record<string, any>  // 元数据
}
```

### 3.4 内置智能体

#### 3.4.1 核心智能体系统

| 智能体 | 类型 | 描述 |
|--------|------|------|
| `build` | primary | 用于构建和开发的主智能体 |
| `plan` | primary | 用于规划和设计的主智能体 |
| `general` | subagent | 通用研究和多步骤任务 |
| `explore` | subagent | 快速代码库探索 |
| `compaction` | hidden | 会话压缩 |
| `title` | hidden | 生成会话标题 |
| `summary` | hidden | 生成会话摘要 |

#### 3.4.2 工作流智能体系统

| 智能体 | 类型 | 描述 |
|--------|------|------|
| `orchestrator` | orchestrator | 工作流编排器 |
| `analyzer` | worker | 数据分析专家 |
| `executor` | worker | 任务执行器 |
| `reviewer` | reviewer | 结果审核器 |
| `data-processor` | worker | 数据处理专家 |
| `integrator` | worker | 系统集成专家 |
| `reporter` | worker | 报告生成器 |

---

## 4. 工作流引擎

### 4.1 工作流结构

```typescript
interface WorkflowDefinition {
  // 基础信息
  id: string                      // 唯一标识符
  name: string                    // 名称
  description?: string            // 描述
  version: string                 // 版本

  // 图结构
  nodes: WorkflowNode[]           // 节点列表
  edges: WorkflowEdge[]           // 边（连接）

  // 执行配置
  startNode: string               // 起始节点
  endNodes?: string[]             // 结束节点
  timeout?: number                // 全局超时
  retryPolicy?: RetryPolicy       // 重试策略

  // 数据模式
  inputSchema?: Record<string, any>   // 输入模式
  outputSchema?: Record<string, any>  // 输出模式

  // 分类
  tags: string[]                  // 标签
  metadata?: Record<string, any>  // 元数据
}
```

### 4.2 节点类型

```typescript
enum NodeType {
  agent      = "agent",       // 执行智能体
  tool       = "tool",        // 执行工具
  condition  = "condition",   // 条件分支
  parallel   = "parallel",    // 并行执行
  sequential = "sequential",  // 顺序执行
  delay      = "delay",       // 时间延迟
  input      = "input",       // 用户输入
  output     = "output",      // 输出结果
  loop       = "loop"         // 循环执行
}
```

### 4.3 节点配置

```typescript
interface WorkflowNode {
  id: string                      // 节点 ID
  type: NodeType                  // 节点类型
  name?: string                   // 可读名称
  description?: string            // 描述

  // 特定配置
  agentId?: string                // 智能体 ID (agent 节点)
  toolId?: string                 // 工具 ID (tool 节点)
  config?: Record<string, any>    // 节点配置

  // 数据映射
  inputMapping?: Record<string, string>   // 输入映射表达式
  outputMapping?: Record<string, string>  // 输出映射表达式

  // 执行策略
  retryPolicy?: {
    maxRetries: number
    backoffMs: number
  }
  timeout?: number                // 节点超时
  continueOnError: boolean        // 错误时继续
}
```

### 4.4 工作流状态

```typescript
enum WorkflowStatus {
  pending    = "pending",     // 未开始
  running    = "running",     // 执行中
  paused     = "paused",      // 已暂停
  completed  = "completed",   // 已完成
  failed     = "failed",      // 失败
  cancelled  = "cancelled"    // 已取消
}

enum NodeStatus {
  pending    = "pending",     // 待执行
  running    = "running",     // 执行中
  completed  = "completed",   // 已完成
  failed     = "failed",      // 失败
  skipped    = "skipped",     // 已跳过
  cancelled  = "cancelled"    // 已取消
}
```

### 4.5 执行流程

```
┌──────────────┐
│   开始       │
└──────┬───────┘
       │
       ▼
┌──────────────┐    是    ┌──────────────┐
│ 权限检查     │─────────►│    抛错      │
└──────┬───────┘           └──────────────┘
       │ 否
       ▼
┌──────────────┐
│ 创建实例     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 构建执行顺序 │ (拓扑排序)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 遍历节点     │◄────────────┐
└──────┬───────┘             │
       │                     │
       ▼                     │
┌──────────────┐             │
│ 条件判断     │             │
└──────┬───────┘             │
       │                     │
       ▼                     │
┌──────────────┐    是       │
│ 已取消?      │─────────►   │
└──────┬───────┘             │
       │ 否                  │
       ▼                     │
┌──────────────┐             │
│ 执行节点     │             │
└──────┬───────┘             │
       │                     │
       ▼                     │
┌──────────────┐    是       │
│ 失败?        │─────────►   │
└──────┬───────┘             │
       │ 否                  │
       ▼                     │
┌──────────────┐             │
│ 继续下一节点 │─────────────┘
└──────────────┘
       │
       ▼
┌──────────────┐
│   完成       │
└──────────────┘
```

---

## 5. 通信与协作机制

### 5.1 智能体间通信

智能体通过以下方式通信：

1. **直接调用**: 通过 AgentManager 调用子智能体
2. **工作流编排**: 通过 WorkflowExecutor 协调多个智能体
3. **事件总线**: 通过发布/订阅模式异步通信

### 5.2 上下文传递

```typescript
interface ExecutionContext {
  // 用户标识
  userId?: string

  // 分布式追踪
  traceId?: string
  correlationId?: string

  // 上下文数据
  [key: string]: any
}
```

### 5.3 表达式求值

支持在节点配置中使用表达式访问上下文：

```
语法: {{path.to.value}}

示例:
{{nodes.previous.output}}      // 上一个节点的输出
{{workflow.input.userId}}      // 工作流输入
{{instance.context.custom}}    // 自定义上下文
```

### 5.4 数据映射

```typescript
interface WorkflowNode {
  // 输入映射：从上下文提取数据
  inputMapping?: {
    userId: "{{workflow.input.userId}}"
    previousResult: "{{nodes.analysis.output}}"
  }

  // 输出映射：将结果存入上下文
  outputMapping?: {
    finalResult: "{{node.output}}"
    status: "{{node.status}}"
  }
}
```

---

## 6. 权限系统

### 6.1 权限效果

```typescript
enum PermissionEffect {
  allow = "allow",    // 允许
  deny = "deny",      // 拒绝
  ask = "ask"         // 询问用户
}
```

### 6.2 权限规则

```typescript
interface PermissionRule {
  resource: string | string[]        // 资源类型
  action: string | string[]          // 操作类型
  effect: PermissionEffect           // 效果
  conditions?: PermissionCondition[] // 条件
}

interface PermissionCondition {
  field: string                      // 字段名
  operator: ComparisonOperator       // 比较操作符
  value: any                         // 值
}

type ComparisonOperator =
  | "eq"      // 等于
  | "ne"      // 不等于
  | "in"      // 包含于
  | "contains"// 包含
  | "matches" // 正则匹配
  | "gt"      // 大于
  | "lt"      // 小于
  | "gte"     // 大于等于
  | "lte"     // 小于等于
```

### 6.3 资源类型

| 资源 | 描述 | 操作 |
|------|------|------|
| `workflow` | 工作流 | create, read, update, delete, execute |
| `agent` | 智能体 | create, read, update, delete, execute |
| `tool` | 工具 | execute |
| `data` | 数据 | create, read, update, delete |
| `integration` | 集成 | connect, disconnect, use |

### 6.4 权限评估

```typescript
interface PermissionEvaluator {
  // 检查权限
  check(
    subject: string,        // 主体（用户/智能体）
    resource: string,       // 资源
    action: string,         // 操作
    context?: Record<string, any>
  ): Promise<boolean>

  // 批量检查
  checkAll(
    subject: string,
    requests: PermissionRequest[]
  ): Promise<boolean[]>

  // 获取允许的操作
  getAllowedActions(
    subject: string,
    resource: string
  ): Promise<string[]>
}
```

---

## 7. 事件系统

### 7.1 事件类型

```typescript
enum WorkflowEventType {
  // 工作流事件
  WORKFLOW_STARTED = "workflow.started",
  WORKFLOW_COMPLETED = "workflow.completed",
  WORKFLOW_FAILED = "workflow.failed",
  WORKFLOW_PAUSED = "workflow.paused",
  WORKFLOW_RESUMED = "workflow.resumed",
  WORKFLOW_CANCELLED = "workflow.cancelled",

  // 节点事件
  NODE_STARTED = "node.started",
  NODE_COMPLETED = "node.completed",
  NODE_FAILED = "node.failed",
  NODE_SKIPPED = "node.skipped",

  // 智能体事件
 _AGENT_CREATED = "agent.created",
  AGENT_UPDATED = "agent.updated",
  AGENT_DELETED = "agent.deleted",
  AGENT_EXECUTED = "agent.executed",
}
```

### 7.2 事件总线

```typescript
interface EventBus {
  // 发布事件
  publish(
    type: string,
    data: any,
    context?: EventContext
  ): Promise<void>

  // 订阅事件
  subscribe(
    type: string,
    handler: EventHandler
  ): Unsubscribe

  // 订阅多个事件
  subscribeMany(
    types: string[],
    handler: EventHandler
  ): Unsubscribe

  // 取消订阅
  unsubscribe(type: string, handler: EventHandler): void
}

interface EventContext {
  correlationId?: string
  source?: string
  timestamp?: Date
  [key: string]: any
}
```

### 7.3 事件传播

事件通过事件总线在系统组件间传播：

```
┌─────────────┐         ┌─────────────┐
│ Workflow    │         │ Agent       │
│ Executor    │         │ Manager     │
└──────┬──────┘         └──────┬──────┘
       │                       │
       └───────────┬───────────┘
                   │
                   ▼
          ┌────────────────┐
          │   EventBus     │
          └────────┬───────┘
                   │
       ┌───────────┼───────────┐
       │           │           │
       ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Storage  │ │ Logger   │ │ Monitor  │
│ Backend  │ │          │ │          │
└──────────┘ └──────────┘ └──────────┘
```

---

## 8. 实现细节

### 8.1 智能体生成

使用 AI 生成新的智能体配置：

```typescript
async generate(
  description: string,
  context?: GenerationContext
): Promise<AgentConfig> {
  // 1. 获取现有智能体列表（避免 ID 冲突）
  const existing = await this.list()

  // 2. 构建生成提示词
  const prompt = this.buildGeneratePrompt(description, context, existing)

  // 3. 调用 LLM 生成配置
  const result = await generateObject({
    model: openai("gpt-4-turbo-preview"),
    schema: AgentConfigSchema.partial(),
    messages: [
      { role: "system", content: this.getSystemPrompt() },
      { role: "user", content: prompt }
    ]
  })

  // 4. 验证并补全配置
  return AgentConfigSchema.parse({
    ...result.object,
    id: result.object.id || this.generateId(description),
    version: result.object.version || "1.0.0"
  })
}
```

### 8.2 重试策略

```typescript
interface RetryPolicy {
  maxRetries: number              // 最大重试次数
  backoffMs: number              // 初始退避时间
  backoffMultiplier?: number     // 退避乘数
  maxBackoffMs?: number          // 最大退避时间
  retryOn?: string[]             // 可重试的错误类型
}

async function executeWithRetry<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy
): Promise<T> {
  let lastError: Error
  let delay = policy.backoffMs

  for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // 检查是否可重试
      if (attempt === policy.maxRetries) break
      if (policy.retryOn && !policy.retryOn.includes(error.name)) break

      // 退避等待
      await sleep(delay)
      delay = Math.min(
        delay * (policy.backoffMultiplier || 2),
        policy.maxBackoffMs || Infinity
      )
    }
  }

  throw lastError
}
```

### 8.3 拓扑排序

用于确定工作流节点的执行顺序：

```typescript
function topologicalSort(workflow: WorkflowDefinition): string[] {
  const order: string[] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()

  const visit = (nodeId: string): void => {
    if (visited.has(nodeId)) return

    if (visiting.has(nodeId)) {
      throw new Error(`Cycle detected: node "${nodeId}"`)
    }

    visiting.add(nodeId)

    // 先访问依赖节点
    const incomingEdges = workflow.edges.filter(e => e.to === nodeId)
    for (const edge of incomingEdges) {
      visit(edge.from)
    }

    visiting.delete(nodeId)
    visited.add(nodeId)
    order.push(nodeId)
  }

  // 从起始节点开始
  visit(workflow.startNode)

  // 访问剩余节点（处理不连通图）
  for (const node of workflow.nodes) {
    visit(node.id)
  }

  return order
}
```

---

## 9. 扩展机制

### 9.1 自定义智能体

用户可以通过配置文件定义自定义智能体：

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
    }
  }
}
```

### 9.2 自定义工具

通过 MCP 协议集成外部工具：

```typescript
interface MCPTool {
  name: string
  description: string
  inputSchema: JSONSchema
  handler: (input: any) => Promise<any>
}

// 注册工具
await mcpServer.registerTool({
  name: "custom-analysis",
  description: "Performs custom analysis",
  inputSchema: {
    type: "object",
    properties: {
      data: { type: "string" }
    }
  },
  handler: async (input) => {
    // 工具逻辑
    return { result: "analysis result" }
  }
})
```

### 9.3 存储后端

实现自定义存储后端：

```typescript
interface StorageBackend {
  // 智能体存储
  getAgent(id: string): Promise<AgentConfig | undefined>
  saveAgent(config: AgentConfig): Promise<void>
  deleteAgent(id: string): Promise<void>
  listAgents(filters?: AgentFilters): Promise<AgentConfig[]>

  // 工作流存储
  getWorkflow(id: string): Promise<WorkflowDefinition | undefined>
  saveWorkflow(workflow: WorkflowDefinition): Promise<void>
  deleteWorkflow(id: string): Promise<void>
  listWorkflows(filters?: WorkflowFilters): Promise<WorkflowDefinition[]>

  // 实例存储
  getInstance(id: string): Promise<WorkflowInstance | undefined>
  saveInstance(instance: WorkflowInstance): Promise<void>
  updateInstance(id: string, updates: Partial<WorkflowInstance>): Promise<void>
}
```

---

## 10. 最佳实践

### 10.1 智能体设计原则

1. **单一职责**: 每个智能体应专注于一个特定领域
2. **最小权限**: 只授予完成任务所需的权限
3. **明确边界**: 清确定义智能体的职责范围
4. **可验证性**: 确保配置有效且可执行

### 10.2 工作流设计

1. **幂等性**: 节点操作应支持重复执行
2. **超时控制**: 为每个节点设置合理的超时
3. **错误处理**: 使用 continueOnError 或条件分支处理失败
4. **资源清理**: 确保工作流失败时正确清理资源

### 10.3 性能优化

1. **并行执行**: 使用 parallel 节点并行执行独立任务
2. **缓存结果**: 在节点间传递时缓存中间结果
3. **批处理**: 合并相似操作减少调用次数
4. **资源限制**: 设置 maxSteps 防止无限循环

### 10.4 监控和调试

1. **事件追踪**: 使用 traceId 和 correlationId 追踪请求
2. **日志记录**: 记录关键操作和决策点
3. **性能指标**: 监控执行时间、Token 使用量
4. **错误报告**: 收集和聚合错误信息

---

## 附录

### A. 类型定义参考

完整的类型定义请参考：
- `packages/opencode/src/agent/agent.ts` - 核心智能体系统
- `workflow-agent/packages/core/src/agent/types.ts` - 工作流智能体类型
- `workflow-agent/packages/core/src/workflow/types.ts` - 工作流类型

### B. API 参考

| 模块 | 文件 | 描述 |
|------|------|------|
| 智能体管理 | `agent/manager.ts` | AgentManager 类 |
| 工作流执行 | `workflow/executor.ts` | WorkflowExecutor 类 |
| 权限评估 | `permission/evaluator.ts` | PermissionEvaluator 类 |
| 事件总线 | `event/index.ts` | EventBus 类 |

### C. 配置示例

详细的配置示例请参考：
- `packages/opencode/src/agent/generate.txt` - 智能体生成提示词
- `packages/opencode/src/agent/prompt/` - 各智能体的专用提示词
- `.opencode/config.json` - 全局配置示例

---

**文档版本**: 1.0.0
**最后更新**: 2026-01-21
