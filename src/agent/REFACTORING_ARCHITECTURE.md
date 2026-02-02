# Agent & Session 架构重构总结

## 重构目标

1. **单一职责**：每个类只负责一个职责
2. **依赖注入**：通过接口抽象，便于测试和扩展
3. **消除重复**：提取公共逻辑到独立组件
4. **清晰分层**：明确的层次结构

## 新架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Application Layer                               │
│                              (Agent Facade)                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                           Agent                                         │ │
│  │  - 初始化组件                                                            │ │
│  │  - 对外接口                                                              │ │
│  │  - 事件转发                                                              │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Core Layer                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  AgentRunner    │  │  ErrorHandler   │  │      ToolExecutor           │  │
│  │  (协调器)        │  │  (错误处理)      │  │      (工具执行)             │  │
│  │                 │  │                 │  │                             │  │
│  │  - 主循环        │  │  - 错误分类      │  │  - 批量执行工具              │  │
│  │  - 状态机        │  │  - 退避计算      │  │  - 错误处理                │  │
│  │  - 协调组件      │  │  - 重试决策      │  │  - 结果格式化              │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Session Layer                                      │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      SessionManager                                     │ │
│  │  - 消息生命周期管理                                                       │ │
│  │  - 协调压缩策略                                                          │ │
│  │  - 统计信息提供                                                          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌──────────────────────────┐    ┌──────────────────────────────────────┐  │
│  │  IMessageRepository      │    │   ICompactionStrategy                │  │
│  │  (仓储接口)               │◄───┤   (压缩策略接口)                      │  │
│  │                          │    │                                      │  │
│  │  - 抽象存储层             │    │   - 策略模式                         │  │
│  │  - 支持不同后端           │    │   - 可替换算法                       │  │
│  └──────────────────────────┘    └──────────────────────────────────────┘  │
│           │                                    │                            │
│           ▼                                    ▼                            │
│  ┌──────────────────────────┐    ┌──────────────────────────────────────┐  │
│  │ FileSystemMessageRepository│   │   SmartCompactionStrategy           │  │
│  │ (文件系统实现)            │    │   (智能压缩算法)                      │  │
│  └──────────────────────────┘    └──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 文件结构

```
src/
├── agent/
│   ├── Agent.ts                    # 重构后的 Agent（门面模式）
│   ├── core/                       # 核心模块
│   │   ├── index.ts                # 导出
│   │   ├── ErrorHandler.ts         # 错误处理器
│   │   ├── ToolExecutor.ts         # 工具执行器
│   │   └── AgentRunner.ts          # 运行协调器
│   └── ...                         # 其他文件
│
├── session-v2/
│   ├── index.ts                    # 导出
│   ├── SessionManager.ts           # 重构后的会话管理器
│   ├── repository.ts               # 文件系统仓储
│   ├── compaction-strategy.ts      # 智能压缩策略
│   └── types.ts                    # 类型定义
```

## 核心改进

### 1. Agent.ts（526行 -> 150行）

**重构前：**
- 526行代码
- run 方法250行，包含嵌套辅助函数
- 职责混杂：错误处理、日志、流式输出、工具调用、主循环

**重构后：**
- 150行代码
- 只负责初始化和协调
- 核心逻辑移至 AgentRunner

```typescript
// 重构前：庞大的 run 方法
async run(query: string, options?: AgentRunOptions): Promise<AgentResponse | null> {
    // 250行代码，包含：
    // - 嵌套的错误处理函数
    // - 嵌套的工具调用函数
    // - 复杂的主循环
}

// 重构后：简洁的协调
async run(query: string, options: AgentRunOptions = {}): Promise<AgentResponse | null> {
    return this.runner.run(query, options, { /* 事件处理器 */ });
}
```

### 2. SessionManager（108行 -> 200行）

**重构前：**
- 直接操作文件系统
- 与 Compaction 耦合
- 缺少抽象接口

**重构后：**
- 依赖 IMessageRepository 接口
- 依赖 ICompactionStrategy 接口
- 通过依赖注入支持测试

```typescript
// 重构前
class SessionManager {
    private saveQueue: Promise<void> = Promise.resolve();
    // 直接文件操作...
}

// 重构后
class SessionManager {
    private repository: IMessageRepository;
    private compactionStrategy: ICompactionStrategy;
    // 通过接口操作...
}
```

### 3. Compaction（381行 -> 300行）

**重构前：**
- 复杂的索引操作
- 200多行连续代码
- 难以理解的分区逻辑

**重构后：**
- 两阶段算法：分区 + 摘要
- 清晰的辅助方法
- 简化的完整性检查

```typescript
// 重构前：连续的复杂逻辑
async compact(history: Message[], tools: any[]): Promise<...> {
    // 200+ 行连续代码...
}

// 重构后：清晰的分阶段
async compact(context: CompactionContext): Promise<CompactionResult> {
    // 1. 分区
    const partition = this.partitionMessages(messages);
    
    // 2. 摘要
    const summaryMessage = await this.generateSummary(partition);
    
    // 3. 重组
    return this.rebuildMessages(summaryMessage, partition.protected);
}
```

## 新增组件

### 1. ErrorHandler

**职责：** 错误分类和重试决策

```typescript
class ErrorHandler {
    classify(error: unknown): ErrorClassification;
    handle(error: unknown): ErrorDecision;
    // 支持：abort | retry | stop | continue
}
```

### 2. ToolExecutor

**职责：** 批量执行工具调用

```typescript
class ToolExecutor {
    async executeBatch(
        toolCalls: ToolCall[],
        context: ToolExecutionContext
    ): Promise<ToolExecutionResult>;
}
```

### 3. AgentRunner

**职责：** 运行协调和状态机管理

```typescript
class AgentRunner {
    async run(
        query: string,
        options: AgentRunOptions,
        eventHandlers: { ... }
    ): Promise<AgentResponse | null>;
}
```

## 依赖注入示例

```typescript
// 使用默认实现
const agent = new Agent({
    llmProvider,
    systemPrompt,
});

// 使用自定义仓储（如内存存储用于测试）
const customRepository: IMessageRepository = {
    init: async () => {},
    getAll: async () => messages,
    save: async (msg) => messages.push(msg),
    // ...
};

const sessionManager = new SessionManager({
    sessionId: 'test',
    llmProvider,
    repository: customRepository,
});
```

## 好处

1. **可测试性**
   - 每个组件可独立测试
   - 依赖注入支持 Mock

2. **可扩展性**
   - 新的存储后端：实现 IMessageRepository
   - 新的压缩算法：实现 ICompactionStrategy

3. **可维护性**
   - 单一职责，代码更少
   - 清晰的层次结构

4. **性能**
   - SmartCompactionStrategy 优化了查找算法
   - 减少不必要的数组遍历
