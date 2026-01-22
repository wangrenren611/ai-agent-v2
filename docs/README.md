# AI Agent 完整实现指南

基于 Node.js + TypeScript 的完整多智能体系统实现，包含断点续问和后台任务处理能力。

---

## 📚 文档目录

### 核心文档

| 文档 | 描述 |
|------|------|
| **[agent-breakpoint-continuation.md](./agent-breakpoint-continuation.md)** | 断点续问完整实现，包含会话模型、会话管理器、LLM 服务 |
| **[agent-background-tasks.md](./agent-background-tasks.md)** | 后台任务完整实现，包含任务模型、任务调度器、Worker 处理器 |
| **[agent-api-routes.md](./agent-api-routes.md)** | REST API 接口设计和前端使用示例 |

### 架构设计文档

| 文档 | 描述 |
|------|------|
| **[agent-scheduler-architecture.md](../agent-scheduler-architecture.md)** | 基于 React Fiber 思想的多智能体调度架构设计 |
| **[agent-scheduler-architecture-continued.md](../agent-scheduler-architecture-continued.md)** | 分布式扩展、性能优化和完整实现 |

---

## 🚀 快速开始

### 1. 环境要求

- **Node.js**: 18.0 或更高版本
- **MongoDB**: 6.0 或更高版本
- **Redis**: 7.0 或更高版本

### 2. 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd ai-agent-v2

# 安装依赖
npm install
```

### 3. 配置环境变量

创建 `.env` 文件：

```env
# 应用配置
NODE_ENV=development
PORT=3000

# MongoDB 配置
MONGODB_URI=mongodb://localhost:27017/agent-app
MONGODB_DB_NAME=agent-app

# Redis 配置
REDIS_URL=redis://localhost:6379
REDIS_DB=0

# OpenAI API 配置
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-3.5-turbo

# Bull 队列配置
BULL_REDIS_URL=redis://localhost:6379
BULL_DEFAULT_JOB_TIMEOUT=30000
```

### 4. 启动数据库

```bash
# 启动 MongoDB
mongod --dbpath /path/to/data

# 启动 Redis
redis-server
```

### 5. 编译并运行

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm run build
npm start

# 启动 Worker
npm run start:worker
```

---

## 📖 功能特性

### 断点续问

- ✅ **会话持久化**：对话历史自动保存到 MongoDB
- ✅ **Redis 缓存**：热点会话缓存提升访问速度
- ✅ **上下文连续性**：完整对话历史传递给 LLM
- ✅ **会话管理**：创建、恢复、归档、删除会话

### 后台任务

- ✅ **异步执行**：使用 Bull 队列实现任务异步处理
- ✅ **优先级调度**：支持多级优先级任务（URGENT/HIGH/NORMAL/LOW）
- ✅ **任务重试**：失败任务自动重试，支持指数退避
- ✅ **进度追踪**：实时更新任务进度（0-100%）
- ✅ **批量处理**：支持批量任务提交和监控

---

## 🎯 API 使用示例

### 创建会话并发送消息

```javascript
// 1. 创建会话
const response = await fetch('http://localhost:3000/api/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    initialMessage: '你好，请介绍一下自己',
    options: {
      systemPrompt: '你是一个友好的 AI 助手',
      temperature: 0.7,
      maxTokens: 500
    }
  })
}).then(r => r.json());

const sessionId = response.sessionId;

// 2. 发送消息
const chatResponse = await fetch(`http://localhost:3000/api/sessions/${sessionId}/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    message: '你能帮我写一个快速排序算法吗？',
    options: { temperature: 0.3, maxTokens: 2000 }
  })
}).then(r => r.json());

console.log('助手回复:', chatResponse.message);
```

### 创建后台任务

```javascript
// 创建后台任务
const taskResponse = await fetch('http://localhost:3000/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    type: 'chat',
    input: {
      sessionId: 'session-456',
      message: '帮我生成一段代码',
      options: { temperature: 0.3 }
    },
    options: {
      priority: 'high',
      timeout: 60000
    }
  })
}).then(r => r.json());

const taskId = taskResponse.taskId;

// 轮询任务状态
setInterval(async () => {
  const task = await fetch(`http://localhost:3000/api/tasks/${taskId}?userId=user-123`)
    .then(r => r.json())
    .then(r => r.task);

  console.log(`任务状态: ${task.status}, 进度: ${task.progress}%`);

  if (task.status === 'completed') {
    console.log('任务完成:', task.output);
    clearInterval(interval);
  }
}, 2000);
```

更多 API 使用示例请查看 [agent-api-routes.md](./agent-api-routes.md)。

---

## 📦 项目结构

```
ai-agent-v2/
├── src/
│   ├── models/                 # 数据模型
│   │   ├── Session.ts          # 会话模型
│   │   └── Task.ts             # 任务模型
│   │
│   ├── services/               # 业务服务
│   │   ├── SessionManager.ts   # 会话管理器
│   │   ├── TaskScheduler.ts    # 任务调度器
│   │   └── LLMService.ts       # LLM 服务
│   │
│   ├── workers/                # 后台 Worker
│   │   └── TaskWorker.ts       # 任务处理器
│   │
│   ├── api/                    # API 路由
│   │   ├── routes.ts           # 路由定义
│   │   └── index.ts            # API 入口
│   │
│   ├── types/                  # TypeScript 类型
│   │   └── index.ts
│   │
│   ├── config/                 # 配置文件
│   │   └── database.ts
│   │
│   └── index.ts                # 应用入口
│
├── docs/                       # 文档
│   ├── agent-breakpoint-continuation.md
│   ├── agent-background-tasks.md
│   ├── agent-api-routes.md
│   └── README.md              # 本文件
│
├── dist/                       # 编译输出
├── tests/                      # 测试文件
├── .env                        # 环境变量
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔧 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **Node.js** | 18+ | 运行时 |
| **TypeScript** | 5.0+ | 类型安全 |
| **Express** | 4.18+ | Web 框架 |
| **MongoDB** | 6.0+ | 数据持久化 |
| **Mongoose** | 8.0+ | ODM |
| **Redis** | 7.0+ | 缓存/队列 |
| **Bull** | 4.12+ | 任务队列 |
| **OpenAI** | 4.20+ | LLM API |

---

## 🎓 学习路径

### 初学者路径

1. 阅读架构设计文档了解整体概念
   - [agent-scheduler-architecture.md](../agent-scheduler-architecture.md)
   
2. 学习断点续问实现
   - [agent-breakpoint-continuation.md](./agent-breakpoint-continuation.md)
   
3. 学习后台任务实现
   - [agent-background-tasks.md](./agent-background-tasks.md)
   
4. 实践 API 调用
   - [agent-api-routes.md](./agent-api-routes.md)

### 进阶开发者路径

1. 理解 React Fiber 到多智能体架构的映射
2. 深入研究任务调度算法
3. 扩展自定义任务类型
4. 实现分布式架构

---

## 📊 架构设计

本项目的架构设计灵感来源于 React 19 的 Fiber 架构和调度系统：

### 核心概念映射

| React 概念 | Agent 系统实现 |
|------------|----------------|
| Fiber 节点 | AgentTask |
| 时间分片 | Token Budgeting |
| Priority Lanes | TaskPriority |
| Scheduler | TaskScheduler |
| Reconciliation | Task Execution |

### 设计原则

1. **可中断性**：任务可以被随时中断和恢复
2. **优先级调度**：高优先级任务优先执行
3. **批量处理**：多个任务可以批量提交和执行
4. **状态快照**：支持任务状态持久化和恢复

详细架构设计请查看 [agent-scheduler-architecture.md](../agent-scheduler-architecture.md)。

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

MIT License

---

## 📮 联系方式

如有问题，请提交 Issue。
