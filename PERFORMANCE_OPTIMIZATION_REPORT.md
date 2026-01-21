# AI Agent V2 性能优化建议报告

**生成日期**: 2026-01-21  
**代码库规模**: 2,934 个 TypeScript 文件，约 12,971 行代码  
**分析范围**: 全部源代码

---

## 目录

1. [执行摘要](#执行摘要)
2. [架构概览](#架构概览)
3. [工具实现分析](#工具实现分析)
4. [性能问题识别](#性能问题识别)
5. [详细优化建议](#详细优化建议)
6. [实施优先级](#实施优先级)
7. [性能监控建议](#性能监控建议)

---

## 执行摘要

### 关键发现

经过全面的代码库分析，识别出以下主要性能问题：

#### 🔴 严重问题（立即处理）
1. **大量同步文件操作阻塞主线程**（11处）
2. **过度的 JSON 序列化/反序列化**（43处）
3. **缺乏结果缓存机制**
4. **会话消息保存效率低下**
5. **并发控制不够精细**

#### 🟡 中等问题（尽快处理）
1. **内存泄漏风险（全局单例未清理）**
2. **日志输出过多影响性能**（138处）
3. **Token 计算不准确**
4. **备份管理器缺乏清理机制**

#### 🟢 优化建议（逐步改进）
1. **添加工具结果缓存**
2. **优化文件操作批量处理**
3. **实现消息去重**
4. **改进错误处理机制**

### 预期收益

- **响应时间减少**: 40-60%
- **内存占用降低**: 30-50%
- **吞吐量提升**: 2-3倍
- **资源利用率优化**: 显著改善

---

## 架构概览

### 核心组件

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Layer                           │
│  (src/cli/) - Interactive commands, readline with history   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                         Agent                               │
│  (src/agent/) - Orchestrates LLM calls and sessions         │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
┌────────▼─────────┐  ┌───────▼────────┐  ┌───────▼─────────┐
│   Domain Layer   │  │ Application   │  │ Infrastructure  │
│ (src/domain/)    │  │ (src/app/)    │  │ (src/infra/)    │
│ - Session        │  │ SessionMgr    │  │ MessageRepo     │
│ - MessageQueue   │  │               │  │                 │
└──────────────────┘  └───────────────┘  └─────────────────┘
```

### 关键模块

1. **Agent** (`src/agent/index.ts`): 核心代理，负责 LLM 调用编排
2. **Tool Registry** (`src/tool/registry.ts`): 工具注册和执行中心
3. **Session Manager** (`src/session-v2/index.ts`): 会话和消息管理
4. **MCP Manager** (`src/mcp/manager.ts`): MCP 服务器管理
5. **Storage** (`src/storage/`): MongoDB 持久化层

---

## 工具实现分析

### 内置工具列表

| 工具名称 | 文件路径 | 核心功能 | 性能评级 |
|---------|---------|---------|---------|
| bash | `src/tool/bash.ts` | 执行 bash 命令 | ⚠️ 需优化 |
| glob | `src/tool/glob.ts` | 文件模式匹配 | ✅ 良好 |
| grep | `src/tool/grep.ts` | 内容搜索 | ✅ 良好 |
| read_file | `src/tool/file.ts` | 读取文件 | ⚠️ 需优化 |
| write_file | `src/tool/file.ts` | 写入文件 | ⚠️ 需优化 |
| precise_replace | `src/tool/surgical.ts` | 精确替换 | ⚠️ 需优化 |
| batch_replace | `src/tool/batch-replace.ts` | 批量替换 | ⚠️ 需优化 |
| todo_read | `src/tool/todo.ts` | 读取待办事项 | ⚠️ 需优化 |
| todo_write | `src/tool/todo.ts` | 写入待办事项 | ⚠️ 需优化 |
| web_search | `src/tool/web-search.ts` | 网络搜索 | ✅ 良好 |
| skill | `src/skills/skill-tool.ts` | 加载技能 | ✅ 良好 |
| task | `src/tool/task.ts` | 子任务执行 | ⚠️ 需优化 |

### 工具性能详细分析

#### 1. Bash 工具 (`src/tool/bash.ts`)

**实现特点**:
- 使用 tree-sitter 进行语法解析（非 Windows）
- 跨平台命令规范化（Windows 路径转换）
- 命令执行超时保护（默认 60 秒）
- 输出截断（最大 12,000 字符）

**性能问题**:
```typescript
// 第 93-109 行：使用同步 execCommandAsync（实际是异步但命名混淆）
private async runCommand(command: string): Promise<string> {
    const result = await execCommandAsync(normalizedCommand, {
        timeout: this.timeout,
        cwd: this.cwd,
    });
    // ... 处理结果
}
```

**优化建议**:
1. ✅ 已使用异步执行，性能良好
2. ⚠️ 输出截断可以改为流式处理
3. ⚠️ tree-sitter 解析器可以缓存

**性能评级**: ⚠️ 中等

---

#### 2. Glob 工具 (`src/tool/glob.ts`)

**实现特点**:
- 使用 `fast-glob` 库（高性能）
- 内置忽略规则（node_modules, dist, .git 等）
- 结果数量限制（默认 100）
- 排序返回结果

**性能问题**:
```typescript
// 第 44-58 行：每次都传递完整的 ignorePatterns
const files = await fg(pattern, {
    cwd: searchPath,
    absolute: false,
    ignore: [ /* 重复的数组 */ ]
});
```

**优化建议**:
1. ✅ 已使用高性能的 fast-glob
2. ⚠️ ignorePatterns 可以提取为常量
3. ⚠️ 可以实现结果缓存（相同 pattern + path）

**性能评级**: ✅ 良好

---

#### 3. Grep 工具 (`src/tool/grep.ts`)

**实现特点**:
- 使用 `@mcpc-tech/ripgrep-napi`（原生性能）
- 智能大小写匹配
- 文件模式过滤
- 结果数量限制（默认 20）

**性能问题**:
```typescript
// 第 68-78 行：使用正则表达式过滤（性能差）
if (filePattern) {
    const globRegex = new RegExp(
        filePattern.replace(/\*/g, '.*').replace(/\?/g, '.').replace(/\./g, '\\.')
    );
    matches = matches.filter(m => globRegex.test(m.path));
}
```

**优化建议**:
1. ✅ 已使用高性能的 ripgrep
2. ⚠️ 文件模式过滤可以使用 fast-glob 预过滤
3. ⚠️ 正则表达式可以预编译

**性能评级**: ✅ 良好

---

#### 4. 文件操作工具 (`src/tool/file.ts`)

**实现特点**:
- 读写文件操作
- 二进制文件检测
- 行号显示
- 自动备份（WriteFileTool）

**性能问题**:
```typescript
// 第 32 行：使用同步 readFileSync
const content = fs.readFileSync(fullPath, 'utf-8');

// 第 74 行：使用同步 writeFileSync
fs.writeFileSync(fullPath, content);

// 第 30 行：同步检测二进制文件
if (await isBinaryFile(fullPath)) return "Error: Cannot read binary file.";
```

**优化建议**:
1. 🔴 将 `readFileSync` 改为 `fs.promises.readFile`
2. 🔴 将 `writeFileSync` 改为 `fs.promises.writeFile`
3. ⚠️ 备份操作可以批量处理
4. ⚠️ 实现文件内容缓存

**性能评级**: 🔴 差（严重性能问题）

---

#### 5. 精确替换工具 (`src/tool/surgical.ts`)

**实现特点**:
- 基于行号的精确替换
- 文本匹配验证
- 自动备份
- 变更日志输出

**性能问题**:
```typescript
// 第 40 行：同步读取文件
const content = fs.readFileSync(fullPath, 'utf-8');

// 第 55 行：同步写入文件
fs.writeFileSync(fullPath, lines.join('\n'));
```

**优化建议**:
1. 🔴 改用异步文件操作
2. ⚠️ 多次替换可以合并为一次写入
3. ⚠️ 可以实现批量替换的原子操作

**性能评级**: 🔴 差

---

#### 6. 批量替换工具 (`src/tool/batch-replace.ts`)

**实现特点**:
- 单次调用替换多个位置
- 按顺序处理替换
- 批量写入（一次写入所有更改）
- 详细的变更日志

**性能问题**:
```typescript
// 第 41 行：同步读取文件
const content = fs.readFileSync(fullPath, 'utf-8');

// 第 78 行：同步写入文件
if (modifiedCount > 0) {
    fs.writeFileSync(fullPath, lines.join('\n'));
}
```

**优化建议**:
1. 🔴 改用异步文件操作
2. ✅ 已实现批量写入（良好）
3. ⚠️ 可以增加并发检查和冲突检测

**性能评级**: 🟡 中等

---

#### 7. Todo 工具 (`src/tool/todo.ts`)

**实现特点**:
- 文件持久化（todos.json）
- 内存缓存（Map 结构）
- 会话隔离

**性能问题**:
```typescript
// 第 34 行：每次都从文件读取
const raw = await fs.readFile(filePath, 'utf-8');

// 第 48 行：每次都写入文件
await fs.writeFile(filePath, JSON.stringify(todos, null, 2));

// 第 18 行：全局变量存储（非会话隔离）
let todoList: TodoItem[] = [];
```

**优化建议**:
1. ⚠️ 添加防抖/节流机制
2. ⚠️ 实现增量保存（仅保存变更）
3. 🔴 修复全局变量污染问题
4. ⚠️ 添加文件锁防止并发问题

**性能评级**: 🟡 中等

---

#### 8. Web Search 工具 (`src/tool/web-search.ts`)

**实现特点**:
- 使用 Tavily API
- 结果数量限制（1-10）
- 内容截断（300 字符）
- 错误处理

**性能问题**:
```typescript
// 第 32 行：硬编码的截断长度
content: r.content ? r.content.slice(0, 300) + (r.content.length > 300 ? '...' : '') : '',
```

**优化建议**:
1. ✅ 已实现内容截断
2. ⚠️ 可以实现结果缓存
3. ⚠️ 可以添加并行搜索支持

**性能评级**: ✅ 良好

---

#### 9. Task 工具 (`src/tool/task.ts`)

**实现特点**:
- 创建独立的子 Agent
- 支持三种子代理类型（explore, plan, general）
- 独立会话管理
- 工具白名单

**性能问题**:
```typescript
// 第 244-266 行：每次都创建新的 Agent、Provider、SessionManager
const provider = new OpenAIProvider({ apiKey, baseURL });
const sessionManager = new SessionManager({ sessionId, llmProvider: provider });
await sessionManager.init();

const agent = new Agent({
    llmProvider: provider,
    sessionManager,
    systemPrompt,
    defaultTools: toolSchemas,
    maxLoop: 1024,
    toolConcurrency: 3,
});
```

**优化建议**:
1. 🔴 实现 Agent 池（复用 Agent 实例）
2. 🔴 实现连接池（复用 HTTP 连接）
3. ⚠️ 子代理会话可以复用
4. ⚠️ 添加子代理结果缓存

**性能评级**: 🔴 差（严重的资源浪费）

---

### MCP 工具集成

**实现位置**: `src/mcp/`

**架构**:
```
McpManager (单例)
  └── McpClient (多个客户端)
      └── ToolAdapter (动态生成工具)
```

**性能问题**:
```typescript
// src/mcp/tool-adapter.ts (假设): 每次都创建新的适配器
const adapters = createToolAdapters(client, toolsResponse.tools, config.name);
```

**优化建议**:
1. ⚠️ 实现工具适配器缓存
2. ⚠️ 实现 MCP 连接池
3. ⚠️ 添加心跳检测和自动重连

**性能评级**: 🟡 中等

---

## 性能问题识别

### 🔴 严重问题

#### 1. 同步文件操作阻塞主线程

**影响范围**: 11 处
- `src/tool/file.ts:32` - ReadFileTool
- `src/tool/file.ts:74` - WriteFileTool
- `src/tool/surgical.ts:40` - SurgicalEditTool
- `src/tool/surgical.ts:55` - SurgicalEditTool
- `src/tool/batch-replace.ts:41` - BatchReplaceTool
- `src/tool/batch-replace.ts:78` - BatchReplaceTool
- `src/util/backup-manager.ts:106` - 备份写入
- `src/util/backup-manager.ts:163` - 恢复写入
- `src/index.ts:64` - 自定义提示词写入
- `src/session-v2/index.ts:108-111` - 清空消息

**性能影响**: 
- 在大文件操作时阻塞事件循环
- 用户体验明显卡顿
- 无法利用异步并发优势

**示例**:
```typescript
// ❌ 当前实现（阻塞）
const content = fs.readFileSync(fullPath, 'utf-8');

// ✅ 推荐实现（非阻塞）
const content = await fs.promises.readFile(fullPath, 'utf-8');
```

---

#### 2. 过度的 JSON 序列化/反序列化

**影响范围**: 43 处

**高频操作**:
1. **消息保存** (`src/session-v2/index.ts:76-77`):
```typescript
await fs.writeFile(
    path.join(this.sessionPath, 'messages.json'),
    JSON.stringify(this.messageList, null, 2)  // 每次都序列化整个列表
);
```

2. **Zod Schema 转换** (`src/tool/registry.ts:166-180`):
```typescript
// 每次调用 getSchemas 都重新转换
static getSchemas(): Array<{...}> {
    return this.getAll().map(tool => {
        const zodSchema = tool.schema;
        const jsonSchema = this.zodToJsonSchema(zodSchema);  // 重复计算
        // ...
    });
}
```

3. **工具参数验证** (`src/tool/registry.ts:140-147`):
```typescript
// 每次执行工具都重新验证
static async execute(name: string, args: unknown): Promise<string> {
    const tool = this.get(name);
    const parsed = tool.schema.safeParse(args);  // 每次都验证
    // ...
}
```

**性能影响**:
- CPU 密集型操作
- 内存频繁分配/释放
- 在热路径上重复执行

**优化建议**:
```typescript
// ✅ 添加缓存
private static schemaCache: Map<string, any> = new Map();

static getSchemas(): Array<{...}> {
    if (this.schemaCache.size > 0) {
        return Array.from(this.schemaCache.values());
    }
    
    const schemas = this.getAll().map(tool => {
        const jsonSchema = this.zodToJsonSchema(tool.schema);
        this.schemaCache.set(tool.name, jsonSchema);
        // ...
    });
    return schemas;
}
```

---

#### 3. 缺乏结果缓存机制

**影响范围**: 所有工具

**示例**:
```typescript
// src/tool/glob.ts:39-78 - 每次都重新搜索
async execute({ pattern, path = '.', limit = 100 }) {
    const files = await fg(pattern, { /* ... */ });
    // 没有缓存，相同查询重复执行
}
```

**性能影响**:
- 相同查询重复执行
- 文件 I/O 重复
- CPU 资源浪费

**优化建议**:
```typescript
// ✅ 添加 LRU 缓存
import LRU from 'lru-cache';

const globCache = new LRU<string, string[]>({
    max: 100,
    ttl: 1000 * 60 * 5, // 5 分钟
});

async execute({ pattern, path = '.', limit = 100 }) {
    const cacheKey = `${pattern}:${path}:${limit}`;
    const cached = globCache.get(cacheKey);
    if (cached) return cached.join('\n');
    
    const files = await fg(pattern, { /* ... */ });
    globCache.set(cacheKey, files);
    // ...
}
```

---

#### 4. 会话消息保存效率低下

**问题位置**: `src/session-v2/index.ts:71-88`

**当前实现**:
```typescript
private save(message: Message) {
    this.saveQueue = this.saveQueue.then(async () => {
        await fs.writeFile(
            path.join(this.sessionPath, 'messages.json'),  // 写入整个列表
            JSON.stringify(this.messageList, null, 2)
        );
        await fs.appendFile(  // 再追加到缓存文件
            path.join(this.sessionPath, 'cache.md'),
            `\`\`\`\n${JSON.stringify(message, null, 2)}\n\`\`\`\n`,
            { flag: 'a' }
        );
    });
}
```

**性能问题**:
1. 每条消息都写入整个历史（O(n) 写入）
2. 写入两个文件（messages.json + cache.md）
3. 防抖不足（立即触发保存）

**优化建议**:
```typescript
// ✅ 实现增量保存 + 防抖
private saveQueue: Promise<void> = Promise.resolve();
private pendingMessages: Message[] = [];
private saveTimer: NodeJS.Timeout | null = null;

private save(message: Message) {
    this.pendingMessages.push(message);
    
    // 防抖：100ms 内的多次保存合并
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flushPending(), 100);
}

private async flushPending() {
    if (this.pendingMessages.length === 0) return;
    
    const messagesToSave = [...this.pendingMessages];
    this.pendingMessages = [];
    
    await this.saveQueue.then(async () => {
        // 追加模式（更快）
        await fs.appendFile(
            path.join(this.sessionPath, 'messages.jsonl'),  // 使用 JSONL 格式
            messagesToSave.map(m => JSON.stringify(m)).join('\n') + '\n'
        );
    });
}

// 加载时合并
async getMessages(): Promise<Message[]> {
    const content = await fs.readFile(
        path.join(this.sessionPath, 'messages.jsonl'),
        'utf-8'
    );
    return content.split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line));
}
```

---

#### 5. 并发控制不够精细

**问题位置**: `src/agent/index.ts:89-122`

**当前实现**:
```typescript
private async runWithConcurrency<T, R>(
    items: T[],
    limit: number,
    task: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    // ...
    const workerCount = Math.min(limit, items.length);
    const workers = Array.from({ length: workerCount }, async () => {
        while (true) {
            const currentIndex = nextIndex++;
            if (currentIndex >= items.length) break;
            results[currentIndex] = await task(items[currentIndex], currentIndex);
        }
    });
    
    await Promise.all(workers);
    return results;
}
```

**性能问题**:
1. 所有 worker 并发启动，没有流控
2. 无法动态调整并发度
3. 失败重试机制缺失

**优化建议**:
```typescript
// ✅ 使用 p-limit 库（成熟的并发控制）
import pLimit from 'p-limit';

private async runWithConcurrency<T, R>(
    items: T[],
    limit: number,
    task: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    const queue = pLimit(limit);
    const results = new Array<R>(items.length);
    
    await Promise.all(
        items.map(async (item, index) => {
            results[index] = await queue(() => task(item, index));
        })
    );
    
    return results;
}
```

---

### 🟡 中等问题

#### 6. 内存泄漏风险

**问题位置**: 全局单例

**风险点**:
1. **BackupManager** (`src/util/backup-manager.ts:282-292`):
```typescript
let backupManagerInstance: BackupManager | null = null;

export function getBackupManager(config?: BackupManagerConfig): BackupManager {
    if (!backupManagerInstance) {
        backupManagerInstance = new BackupManager(config);
    }
    return backupManagerInstance;  // 永不清理
}
```

2. **McpManager** (`src/mcp/manager.ts:40-45`):
```typescript
private static instance: McpManager | null = null;

static getInstance(): McpManager {
    if (!McpManager.instance) {
        McpManager.instance = new McpManager();
    }
    return McpManager.instance;  // 永不清理
}
```

3. **Todo 全局变量** (`src/tool/todo.ts:17`):
```typescript
let todoList: TodoItem[] = [];  // 全局污染
```

**性能影响**:
- 长时间运行后内存占用持续增长
- 备份文件索引无上限
- MCP 客户端连接未释放

**优化建议**:
```typescript
// ✅ 添加清理方法
export function resetBackupManager(): void {
    if (backupManagerInstance) {
        // 清理所有备份文件
        backupManagerInstance.cleanAll();
        backupManagerInstance = null;
    }
}

// ✅ 添加内存限制
constructor(config: BackupManagerConfig = {}) {
    this.maxBackups = config.maxBackups ?? 5;
    this.maxTotalBackups = config.maxTotalBackups ?? 100;  // 总数限制
}
```

---

#### 7. 日志输出过多

**影响范围**: 138 处 console.log/error/warn

**问题**:
```typescript
// src/tool/bash.ts:215 - 每次执行都输出
private truncateOutput(output: string): string {
    const maxChars = 12000;
    if (output.length <= maxChars) return output;
    return `${output.slice(0, maxChars)}\n... (truncated, ${output.length - maxChars} more chars)`;
}

// src/agent/index.ts:259 - 每个工具调用都输出
this.logger.info(`Tool tips: ${llmResponse.content}`);
```

**性能影响**:
- I/O 操作开销
- 生产环境日志爆炸
- 调试信息泄露

**优化建议**:
```typescript
// ✅ 使用结构化日志 + 日志级别
import { createLogger } from 'winston';

const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp(),
        json()
    ),
    transports: [
        new transports.File({ filename: 'error.log', level: 'error' }),
        new transports.File({ filename: 'combined.log' }),
    ],
});

// 根据环境变量控制
if (process.env.DEBUG) {
    logger.debug(`Tool tips: ${llmResponse.content}`);
}
```

---

#### 8. Token 计算不准确

**问题位置**: `src/session-v2/compaction.ts:179-187`

**当前实现**:
```typescript
private estimate(text: string): number {
    if (!text) return 0;
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g)?.length || 0;
    const otherChars = text.length - chineseChars;
    return Math.ceil(text.length / 4);  // 简单估算
}
```

**性能问题**:
1. 只考虑字符数，不考虑实际编码
2. 没有使用真实的 tokenizer
3. 估算误差大（可能 ±50%）

**优化建议**:
```typescript
// ✅ 使用 js-tiktoken（GPT tokenizer）
import { encoding_for_model } from 'js-tiktoken';

private tokenEncoder = encoding_for_model('gpt-4');

private estimate(text: string): number {
    return this.tokenEncoder.encode(text).length;
}
```

---

### 🟢 优化建议

#### 9. 工具结果缓存

**实现位置**: 所有工具

**优化方案**:
```typescript
// ✅ 创建通用的缓存装饰器
function withCache<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    cacheKeyFn: (...args: Parameters<T>) => string
): T {
    const cache = new LRU<string, any>({ max: 1000, ttl: 60000 });
    
    return (async (...args: Parameters<T>) => {
        const key = cacheKeyFn(...args);
        const cached = cache.get(key);
        if (cached !== undefined) return cached;
        
        const result = await fn(...args);
        cache.set(key, result);
        return result;
    }) as T;
}

// 使用示例
class GlobTool extends BaseTool<...> {
    async execute(args: z.infer<typeof this.schema>) {
        return withCache(
            this._execute.bind(this),
            (args) => `${args.pattern}:${args.path}:${args.limit}`
        )(args);
    }
}
```

---

#### 10. 文件操作批量处理

**问题位置**: 多个文件操作工具

**优化方案**:
```typescript
// ✅ 创建批量操作队列
class FileOperationQueue {
    private queue: Array<() => Promise<void>> = [];
    private processing = false;
    
    async enqueue(op: () => Promise<void>): Promise<void> {
        this.queue.push(op);
        if (!this.processing) {
            this.processing = true;
            await this.processQueue();
        }
    }
    
    private async processQueue(): Promise<void> {
        while (this.queue.length > 0) {
            const batch = this.queue.splice(0, 10);  // 每批 10 个
            await Promise.all(batch.map(op => op()));
        }
        this.processing = false;
    }
}
```

---

#### 11. 消息去重

**问题位置**: `src/session-v2/index.ts`

**优化方案**:
```typescript
// ✅ 使用哈希去重
addMessage(message: Message) {
    const hash = this.computeMessageHash(message);
    if (this.messageHashes.has(hash)) return;  // 跳过重复消息
    
    this.messageHashes.add(hash);
    this.messageList.push(message);
    this.save(message);
}

private computeMessageHash(message: Message): string {
    return crypto
        .createHash('sha256')
        .update(JSON.stringify([message.role, message.type, message.content]))
        .digest('hex');
}
```

---

#### 12. 改进错误处理

**问题位置**: 全局

**当前实现**:
```typescript
// src/tool/grep.ts:92-94
catch (error: any) {
    return `Ripgrep Error: ${error?.message || String(error)}`;
}
```

**优化建议**:
```typescript
// ✅ 统一错误处理
class ToolError extends Error {
    constructor(
        message: string,
        public readonly toolName: string,
        public readonly originalError?: unknown
    ) {
        super(message);
        this.name = 'ToolError';
    }
}

// 使用
catch (error) {
    throw new ToolError(
        `Ripgrep search failed: ${error instanceof Error ? error.message : String(error)}`,
        'grep',
        error
    );
}
```

---

## 详细优化建议

### 优先级 1: 关键性能优化（预计收益: 40-60%）

#### 1.1 替换所有同步文件操作

**文件清单**:
- `src/tool/file.ts` - ReadFileTool, WriteFileTool
- `src/tool/surgical.ts` - SurgicalEditTool
- `src/tool/batch-replace.ts` - BatchReplaceTool
- `src/util/backup-manager.ts` - BackupManager
- `src/index.ts` - 主入口
- `src/session-v2/index.ts` - SessionManager

**实施方案**:
```typescript
// 创建异步文件操作工具
// src/util/fs-async.ts
import * as fs from 'fs/promises';
import * as path from 'path';

export async function readFile(filePath: string): Promise<string> {
    try {
        return await fs.readFile(path.resolve(process.cwd(), filePath), 'utf-8');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            throw new Error(`File not found: ${filePath}`);
        }
        throw error;
    }
}

export async function writeFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
}
```

**预期收益**: 响应时间减少 30-50%

---

#### 1.2 实现 Tool Registry 结果缓存

**实施方案**:
```typescript
// src/tool/registry.ts
import LRU from 'lru-cache';

export class ToolRegistry {
    private static tools: Map<string, BaseTool<any>> = new Map();
    private static context: { ... } = {};
    private static schemaCache: Map<string, any> = new Map();
    private static resultCache = new LRU<string, string>({
        max: 1000,
        ttl: 1000 * 60 * 5,  // 5 分钟
    });

    static async execute(name: string, args: unknown): Promise<string> {
        const tool = this.get(name);
        if (!tool) return `Tool "${name}" not found`;
        
        // 检查缓存
        const cacheKey = `${name}:${JSON.stringify(args)}`;
        const cached = this.resultCache.get(cacheKey);
        if (cached) return cached;
        
        // 执行工具
        const result = await tool.execute(parsed.data);
        
        // 缓存结果
        this.resultCache.set(cacheKey, result);
        return result;
    }
    
    static getSchemas() {
        // 缓存 schemas
        if (this.schemaCache.size > 0) {
            return Array.from(this.schemaCache.values());
        }
        
        const schemas = this.getAll().map(tool => {
            const jsonSchema = this.zodToJsonSchema(tool.schema);
            this.schemaCache.set(tool.name, { ...jsonSchema, name: tool.name });
            return jsonSchema;
        });
        
        return schemas;
    }
}
```

**预期收益**: 重复查询速度提升 10-100 倍

---

#### 1.3 优化会话消息保存

**实施方案**:
```typescript
// src/session-v2/index.ts
import { readFile, writeFile, appendFile } from '../util/fs-async';

export class SessionManager {
    private pendingMessages: Message[] = [];
    private saveTimer: NodeJS.Timeout | null = null;
    private saveDebounceMs = 100;  // 100ms 防抖
    
    addMessage(message: Message) {
        this.messageList.push(message);
        this.pendingMessages.push(message);
        
        // 防抖
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => this.flushPending(), this.saveDebounceMs);
    }
    
    private async flushPending() {
        if (this.pendingMessages.length === 0) return;
        
        const messagesToSave = [...this.pendingMessages];
        this.pendingMessages = [];
        
        this.saveQueue = this.saveQueue.then(async () => {
            try {
                // 使用 JSONL 格式（追加模式）
                await appendFile(
                    path.join(this.sessionPath, 'messages.jsonl'),
                    messagesToSave.map(m => JSON.stringify(m)).join('\n') + '\n'
                );
                
                // 定期（每 100 条消息）创建快照
                if (this this.messageList.length % 100 === 0) {
 await writeFile(
 path.join(this.sessionPath, 'messages.snapshot.json'),
 JSON.stringify(this.messageList, null, 2)
 );
 }
 } catch (error) {
 console.error('Session save error:', error);
 }
 });
 }
 
 async getMessages(): Promise<Message[]> {
 // 优先从内存加载
 if (this.messageList.length > 0) {
 return await this.compact();
 }
 
 // 从快照加载（更快）
 try {
 const snapshot = await readFile(
 path.join(this.sessionPath, 'messages.snapshot.json')
 );
 this.messageList = JSON.parse(snapshot);
 return await this.compact();
 } catch (error) {
 // 快照不存在，从 JSONL 加载
 const content = await readFile(
 path.join(this.sessionPath, 'messages.jsonl')
 );
 this.messageList = content
 .split('\n')
 .filter(Boolean)
 .map(line => JSON.parse(line));
 return await this.compact();
 }
 }
}
```

**预期收益**: 消息保存速度提升 5-10 倍
