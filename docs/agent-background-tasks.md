# AI Agent 后台任务实现详解（Node.js）

> 基于 Bull 队列的异步任务系统，包含详细代码注释

---

## 目录

- [一、任务模型](#一任务模型)
- [二、任务调度器](#二任务调度器)
- [三、后台 Worker](#三后台-worker)
- [四、任务类型实现](#四任务类型实现)

---

## 一、任务模型

```typescript
/**
 * src/models/Task.ts
 * 
 * 任务数据模型
 * 
 * 功能：
 * - 定义任务的数据结构
 * - 支持任务状态跟踪（PENDING/PROCESSING/COMPLETED/FAILED/CANCELLED）
 * - 支持优先级调度（URGENT/HIGH/NORMAL/LOW）
 * - 支持重试机制
 * - 支持进度追踪
 * 
 * 字段说明：
 * - taskId: 任务唯一标识
 * - userId: 用户 ID
 * - sessionId: 关联的会话 ID（可选）
 * - type: 任务类型（chat/code-generation/document-summary/data-analysis）
 * - status: 任务状态
 * - priority: 任务优先级
 * - input: 任务输入数据
 * - output: 任务输出结果
 * - error: 错误信息（如果有）
 * - progress: 进度（0-100）
 * - retryCount: 重试次数
 * - maxRetries: 最大重试次数
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * 任务状态枚举
 * 
 * 定义任务的生命周期状态
 */
export enum TaskStatus {
  /** 等待执行 */
  PENDING = 'pending',
  /** 正在执行 */
  PROCESSING = 'processing',
  /** 执行完成 */
  COMPLETED = 'completed',
  /** 执行失败 */
  FAILED = 'failed',
  /** 已取消 */
  CANCELLED = 'cancelled'
}

/**
 * 任务优先级枚举
 * 
 * 定义任务的优先级
 */
export enum TaskPriority {
  /** 低优先级 */
  LOW = 'low',
  /** 普通优先级 */
  NORMAL = 'normal',
  /** 高优先级 */
  HIGH = 'high',
  /** 紧急优先级 */
  URGENT = 'urgent'
}

/**
 * 任务文档接口
 * 
 * 定义任务的完整数据结构
 */
export interface ITask extends Document {
  /** 任务唯一标识 */
  taskId: string;
  /** 用户 ID */
  userId: string;
  /** 关联的会话 ID（可选） */
  sessionId?: string;
  /** 任务类型 */
  type: string;
  /** 任务状态 */
  status: TaskStatus;
  /** 任务优先级 */
  priority: TaskPriority;
  /** 任务输入数据 */
  input: any;
  /** 任务输出结果 */
  output?: any;
  /** 错误信息（如果有） */
  error?: string;
  /** 进度（0-100） */
  progress: number;
  /** 元数据 */
  metadata?: Record<string, any>;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 开始时间 */
  startedAt?: Date;
  /** 完成时间 */
  completedAt?: Date;
  /** 重试次数 */
  retryCount: number;
  /** 最大重试次数 */
  maxRetries: number;
}

/**
 * 任务 Schema
 * 
 * 定义任务的数据结构和验证规则
 */
const TaskSchema: Schema = new Schema({
  // 任务 ID，唯一索引
  taskId: {
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
  
  // 关联的会话 ID（可选）
  sessionId: {
    type: String,
    index: true
  },
  
  // 任务类型
  type: {
    type: String,
    required: true,
    index: true
  },
  
  // 任务状态，建立索引以加速查询
  status: {
    type: String,
    enum: Object.values(TaskStatus),
    default: TaskStatus.PENDING,
    index: true
  },
  
  // 任务优先级
  priority: {
    type: String,
    enum: Object.values(TaskPriority),
    default: TaskPriority.NORMAL
  },
  
  // 任务输入数据，使用 Mixed 类型支持任意结构
  input: {
    type: Schema.Types.Mixed,
    required: true
  },
  
  // 任务输出结果
  output: Schema.Types.Mixed,
  
  // 错误信息
  error: String,
  
  // 进度（0-100）
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
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
  
  // 开始时间
  startedAt: Date,
  
  // 完成时间
  completedAt: Date,
  
  // 重试次数
  retryCount: {
    type: Number,
    default: 0
  },
  
  // 最大重试次数
  maxRetries: {
    type: Number,
    default: 3
  }
});

/**
 * 更新时间中间件
 * 
 * 在每次保存前自动更新 updatedAt 字段
 */
TaskSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

/**
 * 复合索引
 * 
 * 创建复合索引以优化常见查询
 */
TaskSchema.index({ userId: 1, status: 1, createdAt: -1 });
TaskSchema.index({ status: 1, priority: 1, createdAt: 1 });

/**
 * 导出 Task 模型
 * 
 * @example
 * const task = new Task({
 *   taskId: 'task-123',
 *   userId: 'user-456',
 *   type: 'chat',
 *   input: { sessionId: 'session-789', message: 'Hello' }
 * });
 * await task.save();
 */
export default mongoose.model<ITask>('Task', TaskSchema);
```

---

## 二、任务调度器

```typescript
/**
 * src/services/TaskScheduler.ts
 * 
 * 任务调度器
 * 
 * 核心功能：
 * - 添加任务到队列
 * - 管理任务生命周期（创建、开始、完成、失败、取消）
 * - 任务优先级管理
 * - 任务重试机制（支持指数退避）
 * - 进度追踪
 * - 批量任务处理
 * - 队列统计和清理
 */

import Queue from 'bull';
import { v4 as uuidv4 } from 'uuid';
import Task, { ITask, TaskStatus, TaskPriority } from '../models/Task';
import Redis from 'ioredis';

/**
 * 任务选项接口
 * 
 * 定义添加任务时的可选参数
 */
export interface TaskOptions {
  /** 任务优先级 */
  priority?: TaskPriority;
  /** 延迟执行（毫秒） */
  delay?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * 任务结果接口
 * 
 * 定义任务执行的结果
 */
export interface TaskResult {
  /** 任务 ID */
  taskId: string;
  /** 任务状态 */
  status: TaskStatus;
  /** 任务输出 */
  output?: any;
  /** 错误信息 */
  error?: string;
}

/**
 * 任务调度器类
 * 
 * 负责管理所有任务的生命周期和调度
 */
export class TaskScheduler {
  /** Bull 队列实例 */
  private queue: Queue.Queue;
  /** Redis 客户端 */
  private redis: Redis;

  /**
   * 构造函数
   * 
   * @param redisUrl - Redis 连接 URL
   * 
   * 创建 Bull 队列并设置默认选项：
   * - removeOnComplete: 7天后删除已完成任务
   * - removeOnFail: 30天后删除失败任务
   * - attempts: 默认重试3次
   * - backoff: 指数退避策略
   */
  constructor(redisUrl: string) {
    // 初始化 Redis 客户端
    this.redis = new Redis(redisUrl);
    
    // 创建 Bull 队列
    this.queue = new Queue('agent-tasks', {
      redis: redisUrl,
      defaultJobOptions: {
        removeOnComplete: 7, // 7天后删除已完成任务
        removeOnFail: 30,    // 30天后删除失败任务
        attempts: 3,       // 默认重试3次
        backoff: {
          type: 'exponential', // 指数退避
          delay: 2000           // 初始延迟2秒
        }
      }
    });

    // 监听任务事件
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   * 
   * 监听以下事件：
   * - active: 任务开始执行
   * - completed: 任务执行完成
   * - failed: 任务执行失败
   * - progress: 任务进度更新
   * 
   * @private
   */
  private setupEventListeners(): void {
    // 监听任务开始事件
    this.queue.on('active', async (job) => {
      console.log(`Task ${job.id} started processing`);
      
      // 更新任务状态为 PROCESSING
      await Task.findByIdAndUpdate(job.id, {
        status: TaskStatus.PROCESSING,
        startedAt: new Date()
      });
    });

    // 监听任务完成事件
    this.queue.on('completed', async (job, result) => {
      console.log(`Task ${job.id} completed`);
      
      // 更新任务状态为 COMPLETED
      await Task.findByIdAndUpdate(job.id, {
        status: TaskStatus.COMPLETED,
        output: result,
        progress: 100,
        completedAt: new Date()
      });
    });

    // 监听任务失败事件
    this.queue.on('failed', async (job, error) => {
      console.error(`Task ${job.id} failed:`, error);
      
      // 更新任务状态为 FAILED
      if (job) {
        await Task.findByIdAndUpdate(job.id, {
          status: TaskStatus.FAILED,
          error: error.message,
          retryCount: job.attemptsMade
        });
      }
    });

    // 监听任务进度事件
    this.queue.on('progress', async (job, progress) => {
      // 更新任务进度
      if (job) {
        await Task.findByIdAndUpdate(job.id, {
          progress: progress
        });
      }
    });
  }

  /**
   * 添加任务
   * 
   * 步骤：
   * 1. 生成唯一的任务 ID
   * 2. 创建任务文档并保存到 MongoDB
   * 3. 将任务添加到 Bull 队列
   * 4. 返回任务 ID 和预计开始位置
   * 
   * @param userId - 用户 ID
   * @param type - 任务类型
   * @param input - 任务输入数据
   * @param options - 任务选项（可选）
   * @returns 包含 taskId 和 estimatedStart 的对象
   * 
   * @example
   * const { taskId } = await taskScheduler.addTask(
   *   'user-123',
   *   'chat',
   *   { sessionId: 'session-456', message: '你好' },
   *   { priority: TaskPriority.HIGH }
   * );
   */
  async addTask(
    userId: string,
    type: string,
    input: any,
    options?: TaskOptions
  ): Promise<{ taskId: string; estimatedStart: number }> {
    // 生成 UUID 作为任务 ID
    const taskId = uuidv4();
    
    // 创建任务文档
    const task = new Task({
      taskId,
      userId,
      type,
      input,
      status: TaskStatus.PENDING,
      priority: options?.priority || TaskPriority.NORMAL,
      maxRetries: options?.maxRetries || 3,
      metadata: {
        options
      }
    });

    // 保存到 MongoDB
    await task.save();

    // 添加到 Bull 队列
    const job = await this.queue.add(
      type,
      { taskId, userId, input },
      {
        jobId: taskId,
        priority: this.getPriorityWeight(options?.priority),
        delay: options?.delay,
        timeout: options?.timeout || 30000 // 默认30秒超时
      }
    );

    // 获取当前等待中的任务数量（估计任务何时开始）
    const estimatedStart = await this.queue.getWaitingCount();

    return {
      taskId,
      estimatedStart
    };
  }

  /**
   * 添加批量任务
   * 
   * @param userId - 用户 ID
   * @param type - 任务类型
   * @param inputs - 输入数据数组
   * @param options - 任务选项（可选）
   * @returns 任务 ID 数组
   * 
   * @example
   * const taskIds = await taskScheduler.addBatchTasks(
   *   'user-123',
   *   'chat',
   *   [{ message: '你好' }, { message: '你好' }],
   *   { priority: TaskPriority.NORMAL }
   * );
   */
  async addBatchTasks(
    userId: string,
    type: string,
    inputs: any[],
    options?: TaskOptions
  ): Promise<string[]> {
    const taskIds: string[] = [];

    // 循环添加每个任务
    for (const input of inputs) {
      const { taskId } = await this.addTask(userId, type, input, options);
      taskIds.push(taskId);
    }

    return taskIds;
  }

  /**
   * 取消任务
   * 
   * @param taskId - 任务 ID
   * @param userId - 用户 ID（用于权限验证）
   * @throws Error 如果任务不存在或状态不允许取消
   * 
   * @example
   * await taskScheduler.cancelTask('task-123', 'user-456');
   */
  async cancelTask(taskId: string, userId: string): Promise<void> {
    // 查找任务
    const task = await Task.findOne({ taskId, userId });
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // 只有 PENDING 状态的任务可以取消
    if (task.status !== TaskStatus.PENDING) {
      throw new Error(`Task ${taskId} is not pending, cannot cancel`);
    }

    // 从队列中移除任务
    const job = await this.queue.getJob(taskId);
    if (job) {
      await job.remove();
    }

    // 更新任务状态为 CANCELLED
    await Task.findByIdAndUpdate(taskId, {
      status: TaskStatus.CANCELLED
    });
  }

  /**
   * 重试失败任务
   * 
   * @param taskId - 任务 ID
   * @param userId - 用户 ID
   * @throws Error 如果任务未失败或已达到最大重试次数
   * 
   * @example
   * await taskScheduler.retryTask('task-123', 'user-456');
   */
  async retryTask(taskId: string, userId: string): Promise<void> {
    // 查找任务
    const task = await Task.findOne({ taskId, userId });
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // 只有 FAILED 状态的任务可以重试
    if (task.status !== TaskStatus.FAILED) {
      throw new Error(`Task ${taskId} is not failed`);
    }

    // 检查是否已达到最大重试次数
    if (task.retryCount >= task.maxRetries) {
      throw new Error(`Task ${taskId} has reached max retries`);
    }

    // 重置任务状态为 PENDING
    await Task.findByIdAndUpdate(taskId, {
      status: TaskStatus.PENDING,
      error: undefined,
      progress: 0
    });

    // 重新加入队列
    await this.queue.add(
      task.type,
      { taskId, userId: task.userId, input: task.input },
      {
        jobId: taskId,
        priority: this.getPriorityWeight(task.priority as TaskPriority)
      }
    );
  }

  /**
   * 获取任务状态
   * 
   * @param taskId - 任务 ID
   * @param userId - 用户 ID
   * @returns 任务对象或 null
   * 
   * @example
   * const task = await taskScheduler.getTaskStatus('task-123', 'user-456');
   * console.log('任务状态:', task.status);
   */
  async getTaskStatus(taskId: string, userId: string): Promise<ITask | null> {
    return Task.findOne({ taskId, userId });
  }

  /**
   * 获取用户的所有任务
   * 
   * @param userId - 用户 ID
   * @param status - 任务状态（可选）
   * @param limit - 返回的最大任务数（默认 20）
   * @returns 任务数组
   * 
   * @example
   * const tasks = await taskScheduler.getUserTasks('user-456', TaskStatus.COMPLETED, 10);
   * // 返回用户最近 10 个已完成的任务
   */
  async getUserTasks(
    userId: string,
    status?: TaskStatus,
    limit: number = 20
  ): Promise<ITask[]> {
    // 构建查询条件
    const query: any = { userId };
    
    // 如果指定了状态，添加到查询条件
    if (status) {
      query.status = status;
    }

    // 执行查询
    return Task.find(query, null, {
      sort: { createdAt: -1 }, // 按创建时间降序排序
      limit
    });
  }

  /**
   * 更新任务进度
   * 
   * @param taskId - 任务 ID
   * @param progress - 进度（0-100）
   * @param data - 中间结果（可选）
   * 
   * @example
   * await taskScheduler.updateTaskProgress('task-123', 50, { partialResult: '...' });
   */
  async updateTaskProgress(
    taskId: string,
    progress: number,
    data?: any
  ): Promise<void> {
    // 构建更新对象
    const update: any = { progress };
    
    // 如果有中间结果，添加到更新对象
    if (data) {
      update.output = data;
    }

    // 更新任务
    await Task.findByIdAndUpdate(taskId, update);
  }

  /**
   * 获取队列统计
   * 
   * @returns 包含等待中、执行中、已完成、失败任务数量的对象
   * 
   * @example
   * const stats = await taskScheduler.getQueueStats();
   * console.log('等待中:', stats.waiting);
   * console.log('执行中:', stats.active);
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    // 并行获取各类任务数量
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed
    };
  }

  /**
   * 清理队列
   * 
   * 删除旧的已完成和失败任务
   * 
   * @example
   * await taskScheduler.cleanQueue();
   */
  async cleanQueue(): Promise<void> {
    // 删除1天前的已完成任务
    await this.queue.clean(86400000, 'completed');
    // 删除30天前的失败任务
    await this.queue.clean(2592000000, 'failed');
  }

  /**
   * 关闭队列
   * 
   * 优雅关闭队列，等待所有任务完成
   * 
   * @example
   * await taskScheduler.close();
   */
  async close(): Promise<void> {
    await this.queue.close();
  }

  /**
   * 获取优先级权重
   * 
   * Bull 使用数值表示优先级，数值越小优先级越高
   * 
   * @param priority - 任务优先级
   * @returns Bull 优先级权重
   * @private
   */
  private getPriorityWeight(priority?: TaskPriority): number {
    switch (priority) {
      case TaskPriority.URGENT:
        return 1;
      case TaskPriority.HIGH:
        return 3;
      case TaskPriority.NORMAL:
        return 5;
      case TaskPriority.LOW:
        return 10;
      default:
        return 5;
    }
  }
}
```

---

## 三、后台 Worker

由于篇幅限制，Worker 实现请参考完整文档。

---

## 四、任务类型实现

### 4.1 聊天任务

```typescript
/**
 * 聊天任务处理器
 * 
 * 处理异步的聊天任务
 */
async function processChatTask(job: Queue.Job): Promise<any> {
  const { taskId, userId, input } = job.data;
  const { sessionId, message, options } = input;

  try {
    // 更新进度 10%
    job.progress(10);

    // 获取 SessionManager 实例
    const sessionManager = getSessionManager();

    // 调用 LLM 生成响应
    const response = await sessionManager.chat(
      sessionId,
      message,
      options
    );

    // 更新进度 100%
    job.progress(100);

    return {
      message: response.message,
      tokensUsed: response.tokensUsed,
      sessionId: response.sessionId
    };
  } catch (error) {
    console.error('Chat task error:', error);
    throw error;
  }
}
```

### 4.2 代码生成任务

```typescript
/**
 * 代码生成任务处理器
 * 
 * 处理异步的代码生成任务
 */
async function processCodeGenerationTask(job: Queue.Job): Promise<any> {
  const { taskId, input } = job.data;
  const { prompt, language, sessionId } = input;

  try {
    // 更新进度 20%
    job.progress(20);

    // 构造代码生成 prompt
    const codePrompt = `
Generate ${language} code for following requirement:

${prompt}

Please provide only code without explanations.
`.trim();

    // 如果有 sessionId，使用会话上下文
    let response: string;
    if (sessionId) {
      const sessionManager = getSessionManager();
      const chatResponse = await sessionManager.chat(
        sessionId,
        codePrompt,
        { temperature: 0.3, maxTokens: 2000 }
      );
      response = chatResponse.message;
    } else {
      const llmService = getLLMService();
      const llmResponse = await llmService.generate(
        [{ role: 'user', content: codePrompt }],
        { temperature: 0.3, maxTokens: 2000 }
      );
      response = llmResponse.content;
    }

    // 更新进度 100%
    job.progress(100);

    return {
      code: response,
      language
    };
  } catch (error) {
    console.error('Code generation task error:', error);
    throw error;
  }
}
```

---

完整的 Worker 实现和更多示例请参考后续文档。
