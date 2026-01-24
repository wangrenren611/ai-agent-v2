# AI Agent 项目深度分析文档

## 目录

1. [项目概述](#项目概述)
2. [架构设计](#架构设计)
3. [核心技术能力](#核心技术能力)
4. [工作原理](#工作原理)
5. [流程图](#流程图)
6. [技术栈详解](#技术栈详解)
7. [设计模式](#设计模式)
8. [扩展性设计](#扩展性设计)

---

## 项目概述

### 项目定位

这是一个基于 **Domain-Driven Design (DDD)** 和 **Repository Pattern** 构建的企业级多会话 AI Agent 系统。项目采用 TypeScript 开发，使用分层架构设计，支持 CLI 交互模式和非交互的 Demo 模式。

### 核心特性

| 特性 | 说明 |
|------|------|
| **多会话管理** | 支持多个独立会话，每个会话可独立管理消息历史 |
| **三层存储架构** | 创新的分层存储设计，平衡性能和内存使用 |
| **智能会话压缩** | 使用 LLM 自动压缩长对话，保留关键上下文 |
| **工具生态系统** | 内置 12+ 工具，支持 MCP 协议扩展 |
| **CLI 命令系统** | 完整的命令行交互界面，支持历史记录 |
| **类型安全** | 完整的 TypeScript 类型定义 |

### 项目统计

```bash
# 技术栈版本
TypeScript: 5.9.3
Node.js: 现代版本支持
MongoDB: 9.1.3
```

---

## 架构设计

### 整体架构图

```mermaid
graph TB
    subgraph "CLI 层"
        CLI[CLI.ts<br/>交互式命令行]
        Commands[commands/<br/>命令处理器]
        InputHistory[InputHistory<br/>输入历史]
    end

    subgraph "Agent 层"
        Agent[Agent<br/>AI 代理核心]
        Events[EventEmitter<br/>事件系统]
    end

    subgraph "Application 层"
        SessionMgr[SessionManager<br/>会话管理器]
    end

    subgraph "Domain 层 - 三层存储"
        CurrentSession[CurrentSession<br/>当前会话层]
        ShortTermStore[ShortTermStore<br/>短期存储层]
        LongTermStore[LongTermStore<br/>长期存储接口]
    end

    subgraph "Infrastructure 层"
        MessageRepo[MessageRepository<br/>MongoDB 持久化]
    end

    subgraph "工具系统"
        ToolRegistry[ToolRegistry<br/>工具注册中心]
        BuiltInTools[内置工具<br/>12+]
        MCP[MCP 协议<br/>第三方工具]
    end

    subgraph "Provider 层"
        LLMProvider[LLMProvider<br/>LLM 抽象接口]
        DeepSeek[DeepSeek/OpenAI<br/>实现]
    end

    CLI --> Agent
    Commands --> CLI
    InputHistory --> CLI
    Agent --> SessionMgr
    Agent --> ToolRegistry
    Agent --> LLMProvider
    Events --> Agent
    SessionMgr --> CurrentSession
    SessionMgr --> ShortTermStore
    SessionMgr --> LongTermStore
    LongTermStore --> MessageRepo
    ToolRegistry --> BuiltInTools
    ToolRegistry --> MCP
    LLMProvider --> DeepSeek
```

### 分层职责

#### 1. CLI 层 (src/cli/)

**职责**: 用户交互和命令处理

```mermaid
classDiagram
    class CLI {
        +readline: Interface
        +inputHistory: InputHistory
        +commands: Map
        +start() void
        +handleInput() Promise
        +executeCommand() void
    }

    class CommandHandler {
        <<interface>>
        +execute(context) Promise
    }

    class CommandContext {
        sessionId: Value
        exit: Value
        args: string
    }

    class InputHistory {
        +history: string[]
        +add() void
        +getAll() string[]
    }

    CLI --> CommandHandler
    CLI --> CommandContext
    CLI --> InputHistory
```

#### 2. Agent 层 (src/agent/)

**职责**: LLM 调用编排和工具执行循环

```mermaid
classDiagram
    class Agent {
        <<EventEmitter>>
        -llmProvider: LLMProvider
        -sessionManager: SessionManager
        -maxLoop: number
        -maxTokens: number
        +run() Promise~AgentResponse~
        +getHistory() Promise~Message[]
        +clearSession() Promise~void~
    }

    class AgentConfig {
        +llmProvider: LLMProvider
        +sessionManager: SessionManager
        +systemPrompt: string
        +defaultTools: ToolSchema[]
        +maxLoop: number
    }

    class AgentResponse {
        +content: string
        +sessionId: string
        +role: assistant
    }

    Agent --> AgentConfig
    Agent --> AgentResponse
    EventEmitter --|> Agent
```

#### 3. Domain 层 (src/domain/)

**职责**: 核心业务领域模型

```mermaid
classDiagram
    class Session {
        +id: string
        +userId: string
        +createdAt: Date
        +updatedAt: Date
    }

    class CurrentSession {
        -messages: Message[]
        -maxMessages: number
        +add() void
        +getAll() Message[]
        +keepRecent() void
        +calculateTokenCount() number
    }

    class ShortTermStore {
        -summaries: Map
        +addSummary() void
        +getAllSummaries() Message[]
    }

    class ILongTermStore {
        <<interface>>
        +save() Promise
        +load() Promise~Message[]
        +deleteSession() Promise
    }

    Session --> CurrentSession
    Session --> ShortTermStore
    CurrentSession --> ILongTermStore
```

---

## 核心技术能力

### 1. 三层存储架构

这是项目最核心的技术创新，解决了长对话上下文管理的难题。

```mermaid
graph TB
    subgraph "三层存储架构"
        direction TB
        A[CurrentSession<br/>当前会话层<br/>用户可见的原始消息] -->|压缩触发| B[ShortTermStore<br/>短期存储层<br/>LLM 生成的摘要]
        B -->|持久化| C[LongTermStore<br/>长期存储层<br/>MongoDB 数据库]
    end

    D[用户输入] --> A
    A -->|92% Token 阈值| E[Compaction<br/>压缩引擎]
    E --> B
    C -.懒加载.-> A
```

#### 工作原理

| 层级 | 存储内容 | 触发条件 | 保留策略 |
|------|----------|----------|----------|
| **CurrentSession** | 用户可见的原始消息 | - | 最长 100 条 |
| **ShortTermStore** | 压缩后的摘要 | Token 使用率达 92% | 累积摘要 |
| **LongTermStore** | 所有持久化数据 | 每次消息变更 | 永久存储 |

#### 压缩算法

```mermaid
flowchart TD
    A[计算 Token 使用量] --> B{>= 92% 阈值?}
    B -->|否| C[不压缩]
    B -->|是| D[提取系统消息]
    D --> E[保护区: 最近 6 条消息]
    E --> F[待压缩区: 历史消息]
    F --> G[调用 LLM 生成结构化摘要]
    G --> H[摘要存入 ShortTermStore]
    H --> I[从 CurrentSession 移除已压缩消息]
    I --> J[保留最近 6 条原始消息]
```

**结构化摘要模板** (8 个维度):

1. **Primary Request and Intent** - 用户核心目标
2. **Key Technical Concepts** - 涉及的技术栈
3. **Files and Code Sections** - 相关文件路径
4. **Errors and Fixes** - 错误和解决方案
5. **Problem Solving** - 问题解决思路
6. **All User Messages** - 用户关键指令
7. **Pending Tasks** - 未完成任务
8. **Current Work** - 当前进度

### 2. Token 精确估算

```typescript
// 经验系数算法
private estimate(text: string): number {
    // CJK 字符: 1:1
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g)?.length || 0;
    // 其他字符: 4:1
    const otherChars = text.length - chineseChars;
    let tokenCount = Math.ceil(chineseChars * 1.0 + otherChars * 0.25);

    // JSON/代码增加 30% 开销
    if (isJson || isCode) {
        tokenCount = Math.ceil(tokenCount * 1.3);
    }

    // 特殊字符额外计算
    const specialChars = text.match(/[\d\{\}\[\]:,\.\(\)]/g)?.length || 0;
    tokenCount += Math.ceil(specialChars * 0.5);

    return tokenCount;
}
```

### 3. 工具系统

#### 工具架构

```mermaid
classDiagram
    class BaseTool~T~ {
        <<abstract>>
        +name: string
        +description: string
        +schema: ZodSchema
        +execute() Promise~string~
    }

    class ToolRegistry {
        -tools: Map
        +register() void
        +get() BaseTool
        +execute() Promise~string~
        +getSchemas() ToolSchema[]
    }

    class BashTool {
        +execute() Promise~string~
    }

    class GrepTool {
        +execute() Promise~string~
    }

    class MCPTool {
        +serverName: string
        +execute() Promise~string~
    }

    BaseTool <|-- BashTool
    BaseTool <|-- GrepTool
    BaseTool <|-- MCPTool
    ToolRegistry --> BaseTool
```

#### 内置工具清单

| 工具名称 | 功能描述 | 输入 |
|---------|----------|-----|
| `bash` | 执行 Shell 命令 | command?: string, language?: "node"|"python"|"python3", code?: string, args?: string[], stdin?: string |
| `glob` | 文件模式匹配 | pattern: string |
| `grep` | 代码内容搜索 | pattern, path, glob |
| `read_file` | 读取文件内容 | file_path: string |
| `write_file` | 写入文件 | file_path, content |
| `surgical_edit` | 精确文本替换 | file_path, old_str, new_str |
| `batch_replace` | 批量替换 | file_path, replacements |
| `todo_read` | 读取任务列表 | - |
| `todo_write` | 写入任务列表 | todos: array |
| `list_backups` | 列出备份 | - |
| `clean_backups` | 清理备份 | - |
| `web_search` | 网络搜索 | query: string |

Note: `bash` supports inline node/python via `language` + `code`. Use `stdin` to pipe data when using `command`.

#### MCP 协议集成

```mermaid
sequenceDiagram
    participant App as 应用
    participant Manager as MCPManager
    participant Server as MCP Server
    participant Tool as MCP Tool

    App->>Manager: initializeMcp()
    Manager->>Server: 连接配置的服务器
    Server-->>Manager: 返回可用工具列表
    Manager->>Tool: 注册工具到 ToolRegistry
    App->>ToolRegistry: execute(toolName, args)
    ToolRegistry->>Tool: 执行工具
    Tool-->>App: 返回结果
```

### 4. CLI 命令系统

#### 命令模式实现

```mermaid
flowchart LR
    A[用户输入] --> B{是命令吗?}
    B -->|是 (以 / 开头)| C[解析命令]
    B -->|否| D[作为用户消息]
    C --> E[命令路由]
    E --> F[执行处理器]
    F --> G[更新 CommandContext]
    G --> H{需要退出?}
    H -->|是| I[退出程序]
    H -->|否| J[继续等待输入]
```

#### 可用命令

| 命令 | 别名 | 功能 |
|------|------|------|
| `/exit` | `/quit`, `/q` | 退出程序 |
| `/clear` | - | 清除屏幕 |
| `/history` | - | 显示会话历史 |
| `/session` | `/sess` | 切换/创建会话 |
| `/help` | `/?`, `/h` | 显示帮助 |

---

## 工作原理

### Agent 运行循环

```mermaid
stateDiagram-v2
    [*] --> 接收用户查询
    接收用户查询 --> 确保会话存在
    确保会话存在 --> 添加用户消息
    添加用户消息 --> 检查压缩需求
    检查压缩需求 --> 需要压缩: 执行压缩
    检查压缩需求 --> 无需压缩: 构建 LLM 上下文
    执行压缩 --> 构建 LLM 上下文
    构建 LLM 上下文 --> 调用 LLM
    调用 LLM --> 有工具调用: 解析工具调用
    调用 LLM --> 无工具调用: 保存助手响应
    解析工具调用 --> 并行执行工具
    并行执行工具 --> 添加工具结果消息
    添加工具结果消息 --> 检查循环次数
    检查循环次数 --> 未达上限: 构建 LLM 上下文
    检查循环次数 --> 达到上限: 返回错误
    保存助手响应 --> [*]
```

### 详细执行流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant CLI as CLI
    participant Agent as Agent
    participant SessionMgr as SessionManager
    participant LLM as LLM Provider
    participant Tools as ToolRegistry
    participant DB as MongoDB

    User->>CLI: 输入查询
    CLI->>Agent: run(sessionId, userId, query)
    Agent->>SessionMgr: getOrCreateSession()
    SessionMgr->>DB: 查询/创建会话
    DB-->>SessionMgr: 返回会话
    SessionMgr-->>Agent: 返回会话

    Agent->>SessionMgr: addMessage(用户消息)
    SessionMgr->>CurrentSession: 添加消息
    SessionMgr->>DB: 持久化消息

    Agent->>SessionMgr: needsCompaction()
    SessionMgr-->>Agent: 返回是否需要压缩

    alt 需要压缩
        Agent->>Compaction: compact(messages)
        Compaction->>LLM: 请求生成摘要
        LLM-->>Compaction: 返回摘要
        Compaction-->>Agent: 返回压缩结果
        Agent->>SessionMgr: compact(summary)
    end

    Agent->>SessionMgr: buildLLMContext()
    SessionMgr-->>Agent: 返回上下文消息

    Agent->>LLM: generate(context, tools)
    LLM-->>Agent: 返回响应

    alt 有工具调用
        Agent->>Tools: execute(toolName, args)
        Tools-->>Agent: 返回工具结果
        Agent->>SessionMgr: addMessage(工具结果)
        Agent->>Agent: 继续下一轮循环
    else 无工具调用
        Agent->>SessionMgr: addMessage(助手响应)
        Agent-->>CLI: 返回最终响应
        CLI-->>User: 显示响应
    end
```

---

## 流程图

### 完整请求处理流程

```mermaid
flowchart TD
    A[用户输入] --> B{命令或消息?}

    B -->|以 / 开头| C[命令处理]
    C --> D[命令路由]
    D --> E[执行处理器]
    E --> F[更新状态]
    F --> G[返回 CLI]

    B -->|普通文本| H[Agent.run]

    H --> I[getOrCreateSession]
    I --> J[会话已存在?]
    J -->|否| K[创建新会话]
    J -->|是| L[加载会话]
    K --> M[持久化到 DB]
    L --> M

    M --> N[添加用户消息]
    N --> O[CurrentSession.add]
    N --> P[DB.save]

    O --> Q{需要压缩?}
    P --> Q

    Q -->|Token >= 92%| R[执行压缩]
    Q -->|Token < 92%| S[构建上下文]

    R --> T[Compaction.compact]
    T --> U[LLM 生成摘要]
    U --> V[摘要存入 ShortTermStore]
    V --> W[CurrentSession.keepRecent 6]

    W --> S
    S --> X[buildLLMContext]

    X --> Y[调用 LLM]
    Y --> Z{有工具调用?}

    Z -->|是| AA[解析工具参数]
    AA --> AB[并行执行工具]
    AB --> AC[添加工具结果消息]
    AC --> AD{循环次数 < 10?}
    AD -->|是| Q
    AD -->|否| AE[返回错误]

    Z -->|否| AF[保存助手响应]
    AF --> AG[返回响应]
    AE --> AG
    AG --> AH[CLI 显示结果]
```

### 会话压缩流程

```mermaid
flowchart TD
    A[触发压缩] --> B[计算 Token 使用量]
    B --> C{>= 92% 阈值?}
    C -->|否| D[不处理]
    C -->|是| E[分离系统消息]

    E --> F[提取最近 6 条 - 保护区]
    E --> G[提取历史消息 - 待压缩区]

    G --> H[有旧摘要?]
    H -->|是| I[提取旧摘要]
    H -->|否| J[无旧摘要]

    I --> K[序列化待压缩消息]
    J --> K

    K --> L[调用 LLM 生成新摘要]
    L --> M{摘要成功?}
    M -->|失败| N[降级: 返回原消息]
    M -->|成功| O[创建摘要消息]

    O --> P[存入 ShortTermStore]
    P --> Q[持久化到 DB]
    Q --> R[CurrentSession.keepRecent 6]
    R --> S[完成压缩]
```

### 工具执行流程

```mermaid
flowchart TD
    A[LLM 返回工具调用] --> B[解析 tool_calls]
    B --> C[遍历每个工具调用]

    C --> D[提取 tool name 和 arguments]
    D --> E[JSON.parse arguments]

    E --> F{解析成功?}
    F -->|失败| G[返回 JSON 错误]
    F -->|成功| H[ToolRegistry.execute]

    H --> I[Zod 参数验证]
    I --> J{验证通过?}
    J -->|否| K[返回参数错误]
    J -->|是| L[执行工具逻辑]

    L --> M{工具类型}
    M -->|bash| N[执行 Shell 命令]
    M -->|grep| O[ripgrep 搜索]
    M -->|read_file| P[读取文件]
    M -->|MCP| Q[MCP 客户端调用]

    N --> R[返回结果]
    O --> R
    P --> R
    Q --> R

    R --> S[添加 tool 消息到会话]
    G --> S
    K --> S

    S --> T{更多工具?}
    T -->|是| C
    T -->|否| U[所有工具完成]
```

### 会话恢复流程

```mermaid
sequenceDiagram
    participant CLI as CLI
    participant SM as SessionManager
    participant Repo as MessageRepository
    participant DB as MongoDB
    participant CS as CurrentSession
    participant STS as ShortTermStore

    CLI->>SM: getOrCreateSession(sessionId)
    SM->>Repo: loadSession(sessionId)
    Repo->>DB: 查询会话元数据
    DB-->>Repo: 返回会话
    Repo-->>SM: 返回会话

    alt 会话存在
        SM->>SM: 创建空的 CurrentSession
        SM->>SM: 创建空的 ShortTermStore
        SM->>SM: 标记未加载

        CLI->>SM: getMessages(sessionId)
        SM->>SM: 检查 loadedSessions
        alt 未加载
            SM->>Repo: loadOriginalMessages()
            Repo->>DB: 查询原始消息
            DB-->>Repo: 原始消息数组
            Repo-->>SM: 返回原始消息
            SM->>CS: setMessages(原始消息)

            SM->>Repo: loadSummaries()
            Repo->>DB: 查询摘要消息
            DB-->>Repo: 摘要消息数组
            Repo-->>SM: 返回摘要消息
            SM->>STS: addSummary(摘要)

            SM->>SM: loadedSessions.add(sessionId)
        end

        SM-->>CLI: 返回合并后的消息
    end
```

---

## 技术栈详解

### 核心依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| `typescript` | 5.9.3 | 类型系统 |
| `mongoose` | 9.1.3 | MongoDB ODM |
| `zod` | 最新 | 运行时类型验证 |
| `ora` | 最新 | CLI 加载动画 |
| `prompts` | 最新 | CLI 交互 |
| `@mcpc-tech/ripgrep-napi` | 最新 | 代码搜索 |
| `openai` | 最新 | LLM SDK |

### 环境配置

```bash
# .env.development / .env.production
DEEPSEEK_API_KEY=your_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
MONGODB_URI=mongodb://localhost:27017/ai-agent
```

---

## 设计模式

### 1. Repository Pattern

```mermaid
classDiagram
    class ILongTermStore {
        <<interface>>
        +save() Promise
        +load() Promise~Message[]
        +loadSession() Promise~Session~
        +deleteSession() Promise
    }

    class MessageRepository {
        +MessageModel: Model
        +SessionModel: Model
        +save() Promise
        +load() Promise~Message[]
    }

    ILongTermStore <|.. MessageRepository
```

**优势**: 解耦业务逻辑与数据存储，易于切换数据库实现。

### 2. Strategy Pattern (LLM Provider)

```mermaid
classDiagram
    class LLMProvider {
        <<abstract>>
        +generate() Promise~LLMResponse~
    }

    class DeepSeekProvider {
        +generate() Promise~LLMResponse~
    }

    class OpenAIProvider {
        +generate() Promise~LLMResponse~
    }

    LLMProvider <|-- DeepSeekProvider
    LLMProvider <|-- OpenAIProvider
```

**优势**: 运行时切换不同的 LLM 提供商，无需修改 Agent 代码。

### 3. Command Pattern (CLI 命令)

```mermaid
classDiagram
    class CommandHandler {
        <<interface>>
        +execute() Promise~void~
    }

    class ExitCommand {
        +execute() Promise~void~
    }

    class ClearCommand {
        +execute() Promise~void~
    }

    class SessionCommand {
        +execute() Promise~void~
    }

    CommandHandler <|.. ExitCommand
    CommandHandler <|.. ClearCommand
    CommandHandler <|.. SessionCommand
```

**优势**: 新增命令无需修改主 CLI 类，符合开闭原则。

### 4. Singleton Pattern (ToolRegistry)

```typescript
export class ToolRegistry {
    private static tools: Map<string, BaseTool<any>> = new Map();

    private constructor() {}

    static register<T>(tool: T | T[]): void { ... }
    static get<T>(name: string): T | undefined { ... }
}
```

**优势**: 全局唯一的工具注册表，避免重复初始化。

### 5. Event-Driven (Agent)

```typescript
class Agent extends EventEmitter {
    async run(...) {
        this.emit('start', { sessionId });
        // ... 执行逻辑
        this.emit('success', { sessionId, response });
        this.emit('end', { sessionId });
    }
}
```

**优势**: 解耦 Agent 执行过程与监控、日志等横切关注点。

---

## 扩展性设计

### 添加新的 LLM Provider

```typescript
// 1. 继承 LLMProvider
class CustomProvider extends LLMProvider {
    async generate(messages: Message[], options?: LLMOptions): Promise<LLMResponse> {
        // 自定义实现
    }
}

// 2. 使用
const agent = new Agent({
    llmProvider: new CustomProvider({ apiKey: 'xxx' }),
    // ...
});
```

### 添加新的工具

```typescript
// 1. 继承 BaseTool
class MyTool extends BaseTool<{ input: string }> {
    name = 'my_tool';
    description = 'My custom tool';
    schema = z.object({ input: z.string() });

    async execute(args): Promise<string> {
        return `Result: ${args.input}`;
    }
}

// 2. 注册
ToolRegistry.register(new MyTool());
```

### 添加新的 CLI 命令

```typescript
// 1. 创建命令处理器
const myCommand: CommandHandler = {
    name: 'mycommand',
    description: 'My command',
    execute: async (context) => {
        console.log('My command executed');
    }
};

// 2. 注册到 commands/index.ts
export function registerCommands(commands: CommandMap) {
    commands.set('mycommand', myCommand);
}
```

### 连接 MCP 服务器

```json
// mcp.config.json
{
  "servers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"]
    }
  }
}
```

---

## 性能优化

### 1. 并行工具执行

```typescript
// 所有工具调用并行执行
const toolPromises = llmResponse.tool_calls.map(async (toolCall) => {
    return await ToolRegistry.execute(fn.name, args);
});
const results = await Promise.all(toolPromises);
```

### 2. 懒加载历史记录

```typescript
// 只在需要时从 DB 加载
async getMessages(sessionId: string): Promise<Message[]> {
    if (!this.loadedSessions.has(sessionId)) {
        await this.loadFullHistory(sessionId);
    }
    return this.getMessagesFromMemory(sessionId);
}
```

### 3. 数据库索引优化

```javascript
// 复合索引优化查询
MessageSchema.index({ sessionId: 1, createdAt: 1 });
```

---

## 总结

### 项目亮点

1. **三层存储架构** - 创新的会话管理方案
2. **智能压缩** - 使用 LLM 生成结构化摘要
3. **完整工具生态** - 内置工具 + MCP 扩展
4. **类型安全** - 完整的 TypeScript 类型系统
5. **清晰分层** - DDD 架构，职责明确
6. **高扩展性** - 多种设计模式支持扩展

### 适用场景

- 智能编程助手
- 知识库问答系统
- 自动化运维工具
- 对话式数据分析
- 多轮任务编排系统
