# AI Agent 断点续问与后台任务实现指南（Node.js）

> 基于 Node.js + TypeScript 的完整实现方案，包含详细代码注释

---

## 目录

- [一、项目概述](#一项目概述)
  - [1.1 功能特性](#11-功能特性)
  - [1.2 技术栈](#12-技术栈)
  - [1.3 架构设计](#13-架构设计)
- [二、项目初始化](#二项目初始化)
- [三、断点续问实现](#三断点续问实现)
- [四、后台任务实现](#四后台任务实现)
- [五、API 接口](#五api-接口)
- [六、使用示例](#六使用示例)

---

## 一、项目概述

### 1.1 功能特性

#### 断点续问
- ✅ **会话持久化**：将对话历史保存到 MongoDB
- ✅ **Redis 缓存**：热点会话缓存到 Redis，提升访问速度
- ✅ **上下文连续性**：自动传递完整对话历史给 LLM
- ✅ **会话管理**：创建、恢复、归档、删除会话

#### 后台任务
- ✅ **异步执行**：使用 Bull 队列实现任务异步处理
- ✅ **优先级调度**：支持多级优先级任务（URGENT/HIGH/NORMAL/LOW）
- ✅ **任务重试**：失败任务自动重试，支持指数退避
- ✅ **进度追踪**：实时更新任务进度（0-100%）
- ✅ **批量处理**：支持批量任务提交

### 1.2 技术栈

| 技术 | 用途 | 版本 |
|------|------|------|
| **Node.js** | 运行时 | 18+ |
| **TypeScript** | 类型安全 | 5.0+ |
| **Express** | Web 框架 | 4.18+ |
| **MongoDB** | 数据持久化 | 6.0+ |
| **Mongoose** | ODM | 8.0+ |
| **Redis** | 缓存/队列 | 7.0+ |
| **Bull** | 任务队列 | 4.12+ |
| **OpenAI** | LLM API | 4.20+ |

### 1.3 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
│                   (Web / Mobile / CLI)                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                            │
│                   (Express / Fastify)                      │
│                                                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │ Session API │    │  Task API   │    │  Status API │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                          │
│                                                               │
│  ┌──────────────────────┐      ┌─────────────────────┐   │
│  │   SessionManager     │      │   TaskScheduler     │   │
│  │                       │      │                     │   │
│  │  • createSession()   │      │  • addTask()        │   │
│  │  • chat()            │      │  • cancelTask()     │   │
│  │  • resumeSession()   │      │  • retryTask()      │   │
│  │  • getUserSessions() │      │  • getUserTasks()    │   │
│  └──────────────────────┘      └─────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              LLMService                              │  │
│  │                                                       │  │
│  │  • generate()    - 同步生成                           │  │
│  │  • generateStream() - 流式生成                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
            ↓                              ↓
┌─────────────────────┐    ┌─────────────────────┐
│   MongoDB          │    │   Redis (Bull)      │
│  (持久化会话）       │    │  (任务队列）         │
│                     │    │                     │
│  Session Collection │    │  - agent-tasks      │
│  Task Collection    │    │  - task:results    │
│                     │    │  - task:progress   │
└─────────────────────┘    └─────────────────────┘
                                      ↓
                         ┌─────────────────────┐
                         │   Background Worker │
                         │   (异步执行）       │
                         │                     │
                         │  • Chat Processor   │
                         │  • Code Generator   │
                         │  • Doc Summarizer   │
                         │  • Data Analyzer    │
                         └─────────────────────┘
```

---

## 二、项目初始化

### 2.1 目录结构

```
agent-app/
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
├── dist/                       # 编译输出
├── tests/                      # 测试文件
├── .env                        # 环境变量
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

### 2.2 安装依赖

```bash
# 1. 创建项目目录
mkdir agent-app
cd agent-app

# 2. 初始化 package.json
npm init -y

# 3. 安装生产依赖
npm install express mongoose redis ioredis bull uuid dotenv openai

# 4. 安装开发依赖
npm install -D typescript @types/node @types/express @types/bull @types/mongoose @types/uuid ts-node nodemon

# 5. 配置 TypeScript
npx tsc --init
```

### 2.3 配置文件

```typescript
/**
 * tsconfig.json
 * TypeScript 编译配置
 */
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

```json
{
  "name": "agent-app",
  "version": "1.0.0",
  "description": "AI Agent with breakpoint continuation and background tasks",
  "main": "dist/index.js",
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "start:worker": "node dist/workers/TaskWorker.js"
  },
  "keywords": ["agent", "ai", "llm", "bull"],
  "author": "",
  "license": "MIT"
}
```

```env
# .env - 环境变量配置

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

---

## 三、断点续问实现

### 3.1 数据模型

```typescript
/**
 * src/models/Session.ts
 * 
 * 会话数据模型
 * 
 * 功能：
 * - 定义会话的数据结构
 * - 存储对话历史消息
 * - 支持会话的元数据和归档
 * 
 * 字段说明：
 * - sessionId: 会话唯一标识
 * - userId: 用户 ID
 * - messages: 对话消息数组
 * - metadata: 会话元数据（可选）
 * - createdAt: 创建时间
 * - updatedAt: 更新时间
 * - lastActivityAt: 最后活动时间
 * - isArchived: 是否已归档
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * 消息接口
 * 
 * 定义对话消息的基本结构
 */
export interface IMessage {
  /** 消息角色：user/assistant/system */
  role: 'user' | 'assistant' | 'system';
  /** 消息内容 */
  content: string;
  /** 消息消耗的 Token 数量（可选） */
  tokens?: number;
  /** 消息元数据（可选） */
  metadata?: Record<string, any>;
  /** 消息时间戳 */
  timestamp: Date;
}

/**
 * 会话文档接口
 * 
 * 定义会话的完整数据结构
 */
export interface ISession extends Document {
  /** 会话唯一标识 */
  sessionId: string;
  /** 用户 ID */
  userId: string;
  /** 对话消息数组 */
  messages: IMessage[];
  /** 会话元数据（可选） */
  metadata?: Record<string, any>;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 最后活动时间 */
  lastActivityAt: Date;
  /** 是否已归档 */
  isArchived: boolean;
}

/**
 * 消息 Schema
 * 
 * 定义消息的数据结构和验证规则
 */
const MessageSchema: Schema = new Schema({
  // 消息角色，必须是 user/assistant/system 之一
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  // 消息内容，必填
  content: {
    type: String,
    required: true
  },
  // Token 消耗量（可选）
  tokens: Number,
  // 元数据，使用 Map 类型存储键值对
  metadata: {
    type: Map,
    of: Schema.Types.Mixed
  },
  // 时间戳，默认为当前时间
  timestamp: {
    type: Date,
    default: Date.now
  }
});

/**
 * 会话 Schema
 * 
 * 定义会话的数据结构和验证规则
 */
const SessionSchema: Schema = new Schema({
  // 会话 ID，唯一索引
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // 用户 ID，建立索引以加速查询
  userId: {
    type: String,
    required: true,
    index: true
  },
  // 消息数组
  messages: [MessageSchema],
  // 元数据
  metadata: {
    type: Map,
    of: Schema.Types.Mixed
  },
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  },
  // 更新时间
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // 最后活动时间，用于排序和清理
  lastActivityAt: {
    type: Date,
    default: Date.now
  },
  // 归档标记
  isArchived: {
    type: Boolean,
    default: false
  }
});

/**
 * 更新时间中间件
 * 
 * 在每次保存前自动更新 updatedAt 字段
 */
SessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

/**
 * 复合索引
 * 
 * 创建复合索引以优化常见查询
 */
SessionSchema.index({ userId: 1, lastActivityAt: -1 });
SessionSchema.index({ userId: 1, isArchived: 1 });

/**
 * 导出 Session 模型
 * 
 * @example
 * const session = new Session({
 *   sessionId: 'session-123',
 *   userId: 'user-456',
 *   messages: [...]
 * });
 * await session.save();
 */
export default mongoose.model<ISession>('Session', SessionSchema);
```

---

### 3.2 会话管理器

```typescript
/**
 * src/services/SessionManager.ts
 * 
 * 会话管理器
 * 
 * 核心功能：
 * - 创建新会话
 * - 发送消息（断点续问）
 * - 恢复会话
 * - 会话管理（归档、删除）
 * - 会话缓存（Redis）
 * 
 * 断点续问原理：
 * 1. 保存完整对话历史到 MongoDB
 * 2. 使用 Redis 缓存热点会话
 * 3. 每次请求时加载完整上下文
 * 4. 传递给 LLM 生成响应
 */

import { v4 as uuidv4 } from 'uuid';
import Session, { ISession, IMessage } from '../models/Session';
import { LLMService } from './LLMService';
import Redis from 'ioredis';

/**
 * 聊天选项接口
 * 
 * 定义聊天请求的可选参数
 */
export interface ChatOptions {
  /** 温度参数，控制生成随机性（0-2），默认 0.7 */
  temperature?: number;
  /** 最大生成 Token 数 */
  maxTokens?: number;
  /** 系统提示词 */
  systemPrompt?: string;
}

/**
 * 聊天响应接口
 * 
 * 定义聊天请求的返回结果
 */
export interface ChatResponse {
  /** 助手回复的消息内容 */
  message: string;
  /** 消息消耗的 Token 数量 */
  tokensUsed: number;
  /** 会话 ID */
  sessionId: string;
  /** 生成是否完成（可能被截断） */
  isComplete: boolean;
}

/**
 * 会话管理器类
 * 
 * 负责管理所有会话的生命周期
 */
export class SessionManager {
  /** Redis 客户端实例 */
  private redis: Redis;
  /** LLM 服务实例 */
  private llmService: LLMService;

  /**
   * 构造函数
   * 
   * @param redisUrl - Redis 连接 URL
   */
  constructor(redisUrl: string) {
    // 初始化 Redis 客户端
    this.redis = new Redis(redisUrl);
    // 初始化 LLM 服务
    this.llmService = new LLMService();
  }

  /**
   * 创建新会话
   * 
   * 步骤：
   * 1. 生成唯一的会话 ID
   * 2. 初始化消息数组（包含系统提示和初始消息）
   * 3. 创建会话文档并保存到 MongoDB
   * 4. 缓存会话到 Redis
   * 5. 如果有初始消息，立即调用 LLM 生成响应
   * 
   * @param userId - 用户 ID
   * @param initialMessage - 初始用户消息（可选）
   * @param options - 聊天选项（可选）
   * @returns 包含会话 ID 和初始响应（如果有）的对象
   * 
   * @example
   * const { sessionId, response } = await sessionManager.createSession(
   *   'user-123',
   *   '你好，请介绍一下自己',
   *   { systemPrompt: '你是一个友好的助手' }
   * );
   */
  async createSession(
    userId: string,
    initialMessage?: string,
    options?: ChatOptions
  ): Promise<{ sessionId: string; response?: string }> {
    // 生成 UUID 作为会话 ID
    const sessionId = uuidv4();
    
    // 初始化消息数组
    const messages: IMessage[] = [];

    // 如果提供了系统提示，添加到消息数组
    if (options?.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt,
        timestamp: new Date()
      });
    }

    // 如果提供了初始消息，添加到消息数组
    if (initialMessage) {
      messages.push({
        role: 'user',
        content: initialMessage,
        timestamp: new Date()
      });
    }

    // 创建会话文档
    const session = new Session({
      sessionId,
      userId,
      messages,
      lastActivityAt: new Date()
    });

    // 保存到 MongoDB
    await session.save();

    // 缓存会话到 Redis（1小时过期）
    await this.cacheSession(sessionId, session);

    // 如果有初始消息，立即调用 LLM 生成响应
    let response: string | undefined;
    if (initialMessage) {
      const chatResponse = await this.chat(sessionId, initialMessage, options);
      response = chatResponse.message;
    }

    return { sessionId, response };
  }

  /**
   * 发送消息（断点续问核心方法）
   * 
   * 步骤：
   * 1. 尝试从 Redis 缓存获取会话
   * 2. 如果缓存未命中，从 MongoDB 加载会话
   * 3. 将用户消息添加到会话
   * 4. 调用 LLM 生成响应（传递完整上下文）
   * 5. 将助手回复添加到会话
   * 6. 更新会话的 lastActivityAt
   * 7. 保存到 MongoDB 并更新 Redis 缓存
   * 
   * @param sessionId - 会话 ID
   * @param userMessage - 用户消息
   * @param options - 聊天选项（可选）
   * @returns 聊天响应
   * 
   * @example
   * const response = await sessionManager.chat(
   *   'session-123',
   *   '帮我写一个快速排序算法',
   *   { temperature: 0.3, maxTokens: 2000 }
   * );
   */
  async chat(
    sessionId: string,
    userMessage: string,
    options?: ChatOptions
  ): Promise<ChatResponse> {
    // 步骤 1：尝试从 Redis 缓存获取会话
    let session = await this.getCachedSession(sessionId);

    // 步骤 2：如果缓存未命中，从 MongoDB 加载会话
    if (!session) {
      session = await Session.findOne({ sessionId, isArchived: false });
      
      // 会话不存在，抛出错误
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }
      
      // 加载后缓存到 Redis
      await this.cacheSession(sessionId, session);
    }

    // 步骤 3：添加用户消息到会话
    const userMsg: IMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    session.messages.push(userMsg);

    // 步骤 4：调用 LLM 生成响应（传递完整的消息历史）
    const llmResponse = await this.llmService.generate(
      session.messages,
      options
    );

    // 步骤 5：添加助手回复到会话
    const assistantMsg: IMessage = {
      role: 'assistant',
      content: llmResponse.content,
      tokens: llmResponse.tokensUsed,
      timestamp: new Date()
    };
    session.messages.push(assistantMsg);

    // 步骤 6：更新最后活动时间
    session.lastActivityAt = new Date();
    
    // 保存到 MongoDB
    await session.save();

    // 步骤 7：更新 Redis 缓存
    await this.cacheSession(sessionId, session);

    return {
      message: llmResponse.content,
      tokensUsed: llmResponse.tokensUsed,
      sessionId,
      isComplete: llmResponse.isComplete
    };
  }

  /**
   * 恢复会话（断点续问）
   * 
   * 用于用户重新连接到已有会话的场景
   * 
   * @param sessionId - 会话 ID
   * @param userId - 用户 ID（用于权限验证）
   * @returns 会话对象
   * 
   * @example
   * const session = await sessionManager.resumeSession('session-123', 'user-456');
   * console.log('历史消息数:', session.messages.length);
   */
  async resumeSession(sessionId: string, userId: string): Promise<ISession> {
    // 首先尝试从缓存获取
    let session = await this.getCachedSession(sessionId);

    // 缓存未命中，从数据库加载
    if (!session) {
      session = await Session.findOne({ sessionId, userId, isArchived: false });
      
      // 会话不存在或无权访问
      if (!session) {
        throw new Error(`Session ${sessionId} not found for user ${userId}`);
      }
      
      // 加载后缓存
      await this.cacheSession(sessionId, session);
    }

    return session;
  }

  /**
   * 获取会话历史
   * 
   * @param sessionId - 会话 ID
   * @param limit - 返回的最大消息数（可选）
   * @returns 消息数组
   * 
   * @example
   * const messages = await sessionManager.getSessionHistory('session-123', 10);
   * // 返回最近 10 条消息
   */
  async getSessionHistory(
    sessionId: string,
    limit?: number
  ): Promise<IMessage[]> {
    // 先恢复会话（确保有权限）
    const session = await this.resumeSession(sessionId, '');
    
    // 如果指定了 limit，返回最后的 N 条消息
    if (limit) {
      return session.messages.slice(-limit);
    }
    
    // 返回所有消息
    return session.messages;
  }

  /**
   * 归档会话
   * 
   * 归档后的会话不会被查询到，但数据仍然保留
   * 
   * @param sessionId - 会话 ID
   * @param userId - 用户 ID（用于权限验证）
   * 
   * @example
   * await sessionManager.archiveSession('session-123', 'user-456');
   */
  async archiveSession(sessionId: string, userId: string): Promise<void> {
    // 查找并更新会话
    const session = await Session.findOneAndUpdate(
      { sessionId, userId, isArchived: false },
      { isArchived: true },
      { new: true }
    );

    // 会话不存在
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // 清除 Redis 缓存
    await this.uncacheSession(sessionId);
  }

  /**
   * 删除会话
   * 
   * 彻底删除会话数据（软删除）
   * 
   * @param sessionId - 会话 ID
   * @param userId - 用户 ID（用于权限验证）
   * 
   * @example
   * await sessionManager.deleteSession('session-123', 'user-456');
   */
  async deleteSession(sessionId: string, userId: string): Promise<void> {
    // 从数据库删除
    const result = await Session.deleteOne({ sessionId, userId });

    // 删除失败（会话不存在）
    if (result.deletedCount === 0) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // 清除 Redis 缓存
    await this.uncacheSession(sessionId);
  }

  /**
   * 获取用户的所有会话
   * 
   * @param userId - 用户 ID
   * @param limit - 返回的最大会话数（默认 20）
   * @returns 会话数组
   * 
   * @example
   * const sessions = await sessionManager.getUserSessions('user-456', 10);
   * // 返回用户最近 10 个会话
   */
  async getUserSessions(userId: string, limit: number = 20): Promise<ISession[]> {
    return Session.find(
      { userId, isArchived: false },
      null,
      // 按最后活动时间降序排序
      { sort: { lastActivityAt: -1 }, limit }
    ).select('sessionId createdAt lastActivityAt messages');
  }

  /**
   * 缓存会话到 Redis
   * 
   * @param sessionId - 会话 ID
   * @param session - 会话对象
   * @private
   */
  private async cacheSession(sessionId: string, session: ISession): Promise<void> {
    // 生成缓存 key
    const key = `session:${sessionId}`;
    
    // 设置 TTL 为 1 小时
    const ttl = 3600;

    // 序列化并保存到 Redis
    await this.redis.setex(
      key,
      ttl,
      JSON.stringify(session)
    );
  }

  /**
   * 从 Redis 获取缓存的会话
   * 
   * @param sessionId - 会话 ID
   * @returns 会话对象或 null
   * @private
   */
  private async getCachedSession(sessionId: string): Promise<ISession | null> {
    // 生成缓存 key
    const key = `session:${sessionId}`;
    
    // 从 Redis 获取
    const cached = await this.redis.get(key);

    // 缓存未命中
    if (!cached) {
      return null;
    }

    // 反序列化
    try {
      return JSON.parse(cached) as ISession;
    } catch (error) {
      // 解析失败，记录错误并返回 null
      console.error('Failed to parse cached session:', error);
      return null;
    }
  }

  /**
   * 清除会话缓存
   * 
   * @param sessionId - 会话 ID
   * @private
   */
  private async uncacheSession(sessionId: string): Promise<void> {
    // 生成缓存 key
    const key = `session:${sessionId}`;
    
    // 从 Redis 删除
    await this.redis.del(key);
  }

  /**
   * 清理过期缓存
   * 
   * 注意：Redis 会自动清理 TTL 过期的 key
   * 此方法可用于额外的清理逻辑
   * 
   * @private
   */
  async cleanupExpiredCache(): Promise<void> {
    // Redis 会自动清理 TTL 过期的 key
    // 这里可以添加额外的清理逻辑
    console.log('Cache cleanup completed');
  }
}
```

---

## 四、后台任务实现

由于篇幅限制，后续内容请参考：
- `/docs/agent-background-tasks.md` - 后台任务实现详解
- `/docs/agent-api-routes.md` - API 接口实现
- `/docs/agent-usage-examples.md` - 使用示例
