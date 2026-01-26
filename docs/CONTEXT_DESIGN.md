# Agent Context 架构设计

## 概述

Agent Context 是一个统一的上下文容器，用于管理 AI Agent 运行时的所有状态信息，包括缓存目录、会话 ID、危险操作确认等核心功能。

## 架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AgentContext (主容器)                             │
│  - 继承 EventEmitter，支持事件驱动                                         │
│  - 集中管理所有上下文配置                                                  │
└─────────────────────────────────────────────────────────────────────────┘
         │                          │                          │
    ┌────▼────┐                ┌────▼────┐                ┌────▼────┐
    │ Session │                │  Cache  │                │Security │
    │ Context │                │ Context │                │ Context │
    └─────────┘                └─────────┘                └─────────┘
         │                          │                          │
    ┌────▼────┐                ┌────▼────┐                ┌────▼────┐
    │.memory/ │                │.agent- │                │dangerous│
    │session_*│                │ cache/ │                │  ops    │
    └─────────┘                └─────────┘                └─────────┘
```

## 核心组件

### 1. Session Context（会话管理）

```typescript
interface SessionConfig {
    sessionId: string;      // 会话唯一标识
    userId: string;         // 用户标识
    sessionDir: string;     // 会话目录 (.memory/session_xxx)
    messagesFile: string;   // 消息历史文件
    stateFile: string;      // 状态文件
    maxHistorySize: number; // 最大历史消息数
}
```

**功能：**
- 切换会话：`context.switchSession(newSessionId)`
- 保存状态：`context.saveState({ ... })`
- 加载状态：`context.loadState()`

### 2. Cache Context（缓存管理）

```typescript
interface CacheConfig {
    rootDir: string;        // 缓存根目录 (.agent-cache)
    toolsDir: string;       // 工具缓存
    llmCacheDir: string;    // LLM 响应缓存
    tempDir: string;        // 临时文件目录
    maxCacheSize: number;   // 最大缓存大小 (1GB)
    cacheTtl: number;       // 缓存过期时间 (24h)
}
```

**功能：**
- `getCache(key)` - 读取缓存
- `setCache(key, value, ttl?)` - 写入缓存
- `clearCache(reason)` - 清理缓存
- `getCacheUsage()` - 获取缓存使用情况

**目录结构：**
```
.agent-cache/
├── tools/          # 工具缓存
├── llm/            # LLM 响应缓存
├── temp/           # 临时文件
└── sessions/
    └── session_xxx/
        ├── xxx.cache  # 缓存文件
        └── ...
```

### 3. Security Context（安全管理）

```typescript
interface SecurityConfig {
    enableConfirmation: boolean;       // 是否启用确认
    dangerousMode: 'prompt'|'block'|'allow'; // 危险操作模式
    dangerousOperations: DangerousOperationDef[];
    safePaths: string[];               // 白名单路径
    blockedPaths: string[];            // 黑名单路径
}
```

**危险操作类型：**
```typescript
type DangerousOperation =
    | 'delete_file'        // 删除文件
    | 'delete_directory'   // 删除目录
    | 'format_disk'        // 磁盘格式化
    | 'execute_sudo'       // 提权执行
    | 'modify_system_config' // 修改系统配置
    | 'network_modification' // 网络修改
    | 'bulk_operation';     // 批量操作
```

**三种安全模式：**
1. **`prompt`** - 询问用户确认（默认）
2. **`block`** - 直接阻止所有危险操作
3. **`allow`** - 允许所有操作（谨慎使用）

## 使用示例

### 1. 基础使用

```typescript
import { getAgentContext } from './context';

// 获取或创建 Context
const context = getAgentContext({
    session: { sessionId: 'my_session' },
    cache: { maxCacheSize: 512 * 1024 * 1024 }, // 512MB
    security: { dangerousMode: 'prompt' }
});

// 初始化
await context.initialize();
```

### 2. 工具执行与安全检查

```typescript
// ToolRegistry 会自动检查危险操作
const result = await ToolRegistry.execute('bash', { command: 'rm -rf /tmp/*' });

// 如果是危险操作，会自动请求确认
// 用户确认后才会执行
```

### 3. 自定义危险操作

```typescript
context.addDangerousOperation({
    type: 'custom_dangerous',
    patterns: [/dangerous_pattern/i],
    description: '自定义危险操作',
    confirmationMessage: '这是一个自定义危险操作'
});
```

### 4. 危险操作确认 UI

```typescript
import { PermissionCLI } from './context/permission-cli';

const permissionCLI = new PermissionCLI(context);
permissionCLI.start();

// 当有危险操作时，会自动弹出确认提示
```

## 与现有代码集成

### 更新 Agent

```typescript
// src/agent/index.ts
import { getAgentContext } from '../context';

class Agent extends EventEmitter {
    private context: AgentContext;

    constructor(config: AgentConfig) {
        // ...
        this.context = getAgentContext({
            session: { sessionId: config.sessionId }
        });
        this.context.initialize();

        // 设置 ToolRegistry 的 context
        ToolRegistry.setAgentContext(this.context);
    }
}
```

### 更新 CLI

```typescript
// src/cli/CLI.ts
import { PermissionCLI } from '../context/permission-cli';

class CLI {
    private permissionCLI: PermissionCLI;

    async start() {
        // ...
        this.permissionCLI = new PermissionCLI(getAgentContext());
        this.permissionCLI.start();
    }
}
```

## 事件系统

```typescript
// 监听缓存清理
context.on('cache:cleared', (reason) => {
    console.log(`Cache cleared: ${reason}`);
});

// 监听会话切换
context.on('session:changed', (oldSession, newSession) => {
    console.log(`Session changed: ${oldSession} -> ${newSession}`);
});

// 监听安全警告
context.on('security:warning', (request) => {
    console.log(`Security warning: ${request.operation}`);
});

// 监听确认结果
context.on('security:confirmed', (request) => {
    console.log(`Operation confirmed: ${request.command}`);
});

context.on('security:denied', (request) => {
    console.log(`Operation denied: ${request.command}`);
});
```

## 目录结构建议

```
src/
├── context/
│   ├── index.ts           # 主上下文容器
│   └── permission-cli.ts  # 危险操作确认界面
├── agent/
│   └── index.ts           # 已集成 AgentContext
├── tool/
│   └── registry.ts        # 已集成 AgentContext
└── cli/
    └── CLI.ts             # 已集成 PermissionCLI
```

## 安全建议

1. **默认使用 `prompt` 模式**，不自动执行危险操作
2. **敏感路径加入黑名单**，如 `/etc`, `/boot`, `/proc`
3. **实现超时机制**，30秒未确认自动拒绝
4. **记录所有危险操作日志**，便于审计
5. **备份重要文件**（已有 BackupManager）

## 性能考虑

1. **缓存自动过期**，防止无限增长
2. **支持缓存大小限制**，防止磁盘占满
3. **异步操作**，不阻塞主流程
4. **事件驱动**，松耦合设计
