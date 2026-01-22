# AI Agent API 接口与使用示例（Node.js）

> 完整的 REST API 设计和前端使用示例

---

## 目录

- [一、API 接口](#一api-接口)
  - [1.1 会话相关 API](#11-会话相关-api)
  - [1.2 任务相关 API](#12-任务相关-api)
  - [1.3 系统相关 API](#13-系统相关-api)
- [二、使用示例](#二使用示例)
  - [2.1 断点续问示例](#21-断点续问示例)
  - [2.2 后台任务示例](#22-后台任务示例)
  - [2.3 批量处理示例](#23-批量处理示例)

---

## 一、API 接口

### 1.1 会话相关 API

#### 创建新会话

```typescript
/**
 * POST /api/sessions
 * 
 * 创建新的对话会话
 * 
 * 请求体：
 * {
 *   userId: string;        // 用户 ID（必填）
 *   initialMessage?: string; // 初始消息（可选）
 *   options?: {             // 聊天选项（可选）
 *     temperature?: number;  // 温度参数（0-2）
 *     maxTokens?: number;    // 最大 Token 数
 *     systemPrompt?: string; // 系统提示词
 *   }
 * }
 * 
 * 响应：
 * {
 *   success: true;
 *   sessionId: string;      // 会话 ID
 *   response?: string;       // 初始响应（如果有初始消息）
 * }
 */
router.post('/sessions', async (req, res) => {
  try {
    const { userId, initialMessage, options } = req.body;

    // 参数验证
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        error: 'userId is required' 
      });
    }

    // 调用会话管理器创建会话
    const result = await sessionManager.createSession(
      userId,
      initialMessage,
      options
    );

    // 返回成功响应
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    // 返回错误响应
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});
```

#### 发送消息（断点续问）

```typescript
/**
 * POST /api/sessions/:sessionId/chat
 * 
 * 向会话发送消息（断点续问核心接口）
 * 
 * 路径参数：
 * - sessionId: 会话 ID
 * 
 * 请求体：
 * {
 *   userId: string;        // 用户 ID（必填）
 *   message: string;       // 用户消息（必填）
 *   options?: {             // 聊天选项（可选）
 *     temperature?: number;  // 温度参数（0-2）
 *     maxTokens?: number;    // 最大 Token 数
 *   }
 * }
 * 
 * 响应：
 * {
 *   success: true;
 *   message: string;        // 助手回复
 *   tokensUsed: number;      // 消耗的 Token 数
 *   sessionId: string;       // 会话 ID
 *   isComplete: boolean;   // 生成是否完成
 * }
 */
router.post('/sessions/:sessionId/chat', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId, message, options } = req.body;

    // 参数验证
    if (!userId || !message) {
      return res.status(400).json({ 
        success: false,
        error: 'userId and message are required' 
      });
    }

    // 调用会话管理器发送消息
    const response = await sessionManager.chat(
      sessionId,
      message,
      options
    );

    // 返回成功响应
    res.json({
      success: true,
      ...response
    });
  } catch (error) {
    // 返回错误响应
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});
```

#### 恢复会话

```typescript
/**
 * GET /api/sessions/:sessionId
 * 
 * 恢复会话（断点续问）
 * 
 * 路径参数：
 * - sessionId: 会话 ID
 * 
 * 查询参数：
 * - userId: 用户 ID（必填）
 * 
 * 响应：
 * {
 *   success: true;
 *   session: {
 *     sessionId: string;
 *     userId: string;
 *     messages: Array<{
 *       role: 'user' | 'assistant' | 'system';
 *       content: string;
 *       tokens?: number;
 *       timestamp: string;
 *     }>;
 *     createdAt: string;
 *     lastActivityAt: string;
 *   }
 * }
 */
router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId } = req.query;

    // 参数验证
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        error: 'userId is required' 
      });
    }

    // 调用会话管理器恢复会话
    const session = await sessionManager.resumeSession(
      sessionId, 
      userId as string
    );

    // 返回成功响应
    res.json({
      success: true,
      session
    });
  } catch (error) {
    // 返回错误响应
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});
```

#### 获取用户的所有会话

```typescript
/**
 * GET /api/sessions
 * 
 * 获取用户的所有会话
 * 
 * 查询参数：
 * - userId: 用户 ID（必填）
 * - limit: 返回的最大会话数（可选，默认 20）
 * 
 * 响应：
 * {
 *   success: true;
 *   sessions: Array<{
 *     sessionId: string;
 *     createdAt: string;
 *     lastActivityAt: string;
 *     messagesCount: number;
 *   }>;
 * }
 */
router.get('/sessions', async (req, res) => {
  try {
    const { userId, limit } = req.query;

    // 参数验证
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        error: 'userId is required' 
      });
    }

    // 调用会话管理器获取用户会话
    const sessions = await sessionManager.getUserSessions(
      userId as string,
      limit ? parseInt(limit as string) : 20
    );

    // 返回成功响应
    res.json({
      success: true,
      sessions: sessions.map(s => ({
        sessionId: s.sessionId,
        createdAt: s.createdAt,
        lastActivityAt: s.lastActivityAt,
        messagesCount: s.messages.length
      }))
    });
  } catch (error) {
    // 返回错误响应
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});
```

---

### 1.2 任务相关 API

#### 创建任务

```typescript
/**
 * POST /api/tasks
 * 
 * 创建后台任务
 * 
 * 请求体：
 * {
 *   userId: string;        // 用户 ID（必填）
 *   type: string;          // 任务类型（必填）
 *   input: any;            // 任务输入（必填）
 *   options?: {             // 任务选项（可选）
 *     priority?: 'low' | 'normal' | 'high' | 'urgent';
 *     delay?: number;       // 延迟执行（毫秒）
 *     maxRetries?: number;  // 最大重试次数
 *     timeout?: number;     // 超时时间（毫秒）
 *   }
 * }
 * 
 * 响应：
 * {
 *   success: true;
 *   taskId: string;       // 任务 ID
 *   estimatedStart: number; // 预计开始位置（队列位置）
 * }
 */
router.post('/tasks', async (req, res) => {
  try {
    const { userId, type, input, options } = req.body;

    // 参数验证
    if (!userId || !type || !input) {
      return res.status(400).json({ 
        success: false,
        error: 'userId, type and input are required' 
      });
    }

    // 调用任务调度器添加任务
    const result = await taskScheduler.addTask(
      userId,
      type,
      input,
      options
    );

    // 返回成功响应
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    // 返回错误响应
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});
```

#### 创建批量任务

```typescript
/**
 * POST /api/tasks/batch
 * 
 * 创建批量后台任务
 * 
 * 请求体：
 * {
 *   userId: string;        // 用户 ID（必填）
 *   type: string;          // 任务类型（必填）
 *   inputs: any[];         // 任务输入数组（必填）
 *   options?: {             // 任务选项（可选）
 *     priority?: 'low' | 'normal' | 'high' | 'urgent';
 *     delay?: number;       // 延迟执行（毫秒）
 *     maxRetries?: number;  // 最大重试次数
 *   }
 * }
 * 
 * 响应：
 * {
 *   success: true;
 *   taskIds: string[];     // 任务 ID 数组
 *   total: number;         // 任务总数
 * }
 */
router.post('/tasks/batch', async (req, res) => {
  try {
    const { userId, type, inputs, options } = req.body;

    // 参数验证
    if (!userId || !type || !inputs) {
      return res.status(400).json({ 
        success: false,
        error: 'userId, type and inputs are required' 
      });
    }

    // 调用任务调度器添加批量任务
    const taskIds = await taskScheduler.addBatchTasks(
      userId,
      type,
      inputs,
      options
    );

    // 返回成功响应
    res.json({
      success: true,
      taskIds,
      total: taskIds.length
    });
  } catch (error) {
    // 返回错误响应
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});
```

#### 获取任务状态

```typescript
/**
 * GET /api/tasks/:taskId
 * 
 * 获取任务状态
 * 
 * 路径参数：
 * - taskId: 任务 ID
 * 
 * 查询参数：
 * - userId: 用户 ID（必填）
 * 
 * 响应：
 * {
 *   success: true;
 *   task: {
 *     taskId: string;
 *     userId: string;
 *     sessionId?: string;
 *     type: string;
 *     status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
 *     priority: 'low' | 'normal' | 'high' | 'urgent';
 *     input: any;
 *     output?: any;
 *     error?: string;
 *     progress: number;      // 0-100
 *     createdAt: string;
 *     updatedAt: string;
 *     startedAt?: string;
 *     completedAt?: string;
 *     retryCount: number;
 *     maxRetries: number;
 *   }
 * }
 */
router.get('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { userId } = req.query;

    // 参数验证
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        error: 'userId is required' 
      });
    }

    // 调用任务调度器获取任务状态
    const task = await taskScheduler.getTaskStatus(
      taskId, 
      userId as string
    );

    // 任务不存在
    if (!task) {
      return res.status(404).json({
        success: false,
        error: `Task ${taskId} not found`
      });
    }

    // 返回成功响应
    res.json({
      success: true,
      task
    });
  } catch (error) {
    // 返回错误响应
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});
```

#### 获取用户的所有任务

```typescript
/**
 * GET /api/tasks
 * 
 * 获取用户的所有任务
 * 
 * 查询参数：
 * - userId: 用户 ID（必填）
 * - status: 任务状态（可选）
 * - limit: 返回的最大任务数（可选，默认 20）
 * 
 * 响应：
 * {
 *   success: true;
 *   tasks: Array<{
 *     taskId: string;
 *     type: string;
 *     status: string;
 *     priority: string;
 *     progress: number;
 *     createdAt: string;
 *     completedAt?: string;
 *   }>;
 * }
 */
router.get('/tasks', async (req, res) => {
  try {
    const { userId, status, limit } = req.query;

    // 参数验证
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        error: 'userId is required' 
      });
    }

    // 调用任务调度器获取用户任务
    const tasks = await taskScheduler.getUserTasks(
      userId as string,
      status,
      limit ? parseInt(limit as string) : 20
    );

    // 返回成功响应
    res.json({
      success: true,
      tasks: tasks.map(t => ({
        taskId: t.taskId,
        type: t.type,
        status: t.status,
        priority: t.priority,
        progress: t.progress,
        createdAt: t.createdAt,
        completedAt: t.completedAt
      }))
    });
  } catch (error) {
    // 返回错误响应
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});
```

#### 取消任务

```typescript
/**
 * DELETE /api/tasks/:taskId
 * 
 * 取消任务
 * 
 * 路径参数：
 * - taskId: 任务 ID
 * 
 * 查询参数：
 * - userId: 用户 ID（必填）
 * 
 * 响应：
 * {
 *   success: true;
 *   message: string;
 * }
 */
router.delete('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { userId } = req.query;

    // 参数验证
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        error: 'userId is required' 
      });
    }

    // 调用任务调度器取消任务
    await taskScheduler.cancelTask(
      taskId, 
      userId as string
    );

    // 返回成功响应
    res.json({
      success: true,
      message: 'Task cancelled successfully'
    });
  } catch (error) {
    // 返回错误响应
    res.status(400).json({
      success: false,
      error: (error as Error).message
    });
  }
});
```

---

### 1.3 系统相关 API

#### 获取队列统计

```typescript
/**
 * GET /api/queue/stats
 * 
 * 获取任务队列的统计信息
 * 
 * 响应：
 * {
 *   success: true;
 *   stats: {
 *     waiting: number;     // 等待中的任务数
 *     active: number;      // 正在执行的任务数
 *     completed: number;   // 已完成的任务数
 *     failed: number;      // 失败的任务数
 *   }
 * }
 */
router.get('/queue/stats', async (req, res) => {
  try {
    // 调用任务调度器获取队列统计
    const stats = await taskScheduler.getQueueStats();

    // 返回成功响应
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    // 返回错误响应
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});
```

---

## 二、使用示例

### 2.1 断点续问完整示例

```javascript
/**
 * 断点续问完整示例
 * 
 * 演示如何：
 * 1. 创建新会话
 * 2. 发送多条消息
 * 3. 重新连接（恢复会话）
 * 4. 继续对话
 */

const BASE_URL = 'http://localhost:3000/api';

// 用户 ID
const userId = 'user-' + Date.now();

/**
 * 示例 1: 创建新会话并发送消息
 */
async function example1() {
  console.log('=== 示例 1: 创建新会话并发送消息 ===');

  // 1. 创建新会话
  const createResponse = await fetch(`${BASE_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      initialMessage: '你好，请介绍一下自己',
      options: {
        systemPrompt: '你是一个友好的 AI 助手',
        temperature: 0.7,
        maxTokens: 500
      }
    })
  }).then(r => r.json());

  console.log('创建会话响应:', createResponse);
  const sessionId = createResponse.sessionId;

  // 2. 发送第二条消息
  const chatResponse1 = await fetch(`${BASE_URL}/sessions/${sessionId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      message: '你能帮我写一个快速排序算法吗？',
      options: { temperature: 0.3, maxTokens: 2000 }
    })
  }).then(r => r.json());

  console.log('聊天响应 1:', chatResponse1);

  // 3. 发送第三条消息
  const chatResponse2 = await fetch(`${BASE_URL}/sessions/${sessionId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      message: '请解释一下时间复杂度',
      options: { temperature: 0.5, maxTokens: 1000 }
    })
  }).then(r => r.json());

  console.log('聊天响应 2:', chatResponse2);

  return sessionId;
}

/**
 * 示例 2: 恢复会话（断点续问）
 */
async function example2(sessionId) {
  console.log('\n=== 示例 2: 恢复会话（断点续问） ===');

  // 1. 恢复会话
  const sessionResponse = await fetch(`${BASE_URL}/sessions/${sessionId}?userId=${userId}`)
    .then(r => r.json());

  console.log('会话信息:', sessionResponse);
  console.log('历史消息数:', sessionResponse.session.messages.length);

  // 2. 继续对话
  const chatResponse = await fetch(`${BASE_URL}/sessions/${sessionId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      message: '我想再问一个问题，冒泡排序和快速排序有什么区别？'
    })
  }).then(r => r.json());

  console.log('聊天响应:', chatResponse);
}

/**
 * 示例 3: 获取用户的所有会话
 */
async function example3() {
  console.log('\n=== 示例 3: 获取所有会话 ===');

  const sessionsResponse = await fetch(`${BASE_URL}/sessions?userId=${userId}`)
    .then(r => r.json());

  console.log(`用户会话数:`, sessionsResponse.sessions.length);
  sessionsResponse.sessions.forEach((s, i) => {
    console.log(`[${i + 1}] ${s.sessionId}`);
    console.log(`    消息数: ${s.messagesCount}`);
    console.log(`    最后活动: ${new Date(s.lastActivityAt).toLocaleString()}`);
  });
}

// 执行所有示例
(async () => {
  try {
    const sessionId = await example1();
    await example2(sessionId);
    await example3();
  } catch (error) {
    console.error('示例执行失败:', error);
  }
})();
```

### 2.2 后台任务完整示例

```javascript
/**
 * 后台任务完整示例
 * 
 * 演示如何：
 * 1. 创建后台任务
 * 2. 查询任务状态
 * 3. 轮询任务进度
 * 4. 处理任务结果
 */

const BASE_URL = 'http://localhost:3000/api';

const userId = 'user-' + Date.now();

/**
 * 示例 1: 创建聊天任务
 */
async function example1() {
  console.log('=== 示例 1: 创建聊天任务 ===');

  // 首先创建一个会话
  const createSessionResponse = await fetch(`${BASE_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      initialMessage: '你好',
      options: { systemPrompt: '你是一个代码助手' }
    })
  }).then(r => r.json());

  const sessionId = createSessionResponse.sessionId;

  // 创建后台聊天任务
  const taskResponse = await fetch(`${BASE_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      type: 'chat',
      input: {
        sessionId,
        message: '帮我写一个 React 组件',
        options: { temperature: 0.3, maxTokens: 2000 }
      },
      options: {
        priority: 'high',
        timeout: 60000  // 60秒超时
      }
    })
  }).then(r => r.json());

  console.log('任务创建成功:', taskResponse);
  console.log('任务 ID:', taskResponse.taskId);
  console.log('队列位置:', taskResponse.estimatedStart);

  return taskResponse.taskId;
}

/**
 * 示例 2: 轮询任务进度
 */
async function example2(taskId) {
  console.log('\n=== 示例 2: 轮询任务进度 ===');

  const maxAttempts = 30; // 最多轮询 30 次
  const interval = 2000; // 每 2 秒轮询一次

  for (let i = 0; i < maxAttempts; i++) {
    // 获取任务状态
    const taskResponse = await fetch(`${BASE_URL}/tasks/${taskId}?userId=${userId}`)
      .then(r => r.json());

    const task = taskResponse.task;

    console.log(`[${i + 1}/${maxAttempts}] 任务状态:`, task.status);
    console.log(`    进度: ${task.progress}%`);

    // 任务完成或失败，退出轮询
    if (task.status === 'completed') {
      console.log('任务完成！');
      console.log('输出:', task.output);
      return task;
    } else if (task.status === 'failed') {
      console.log('任务失败！');
      console.log('错误:', task.error);
      throw new Error(task.error);
    }

    // 等待后继续轮询
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Task timeout');
}

/**
 * 示例 3: 创建批量任务
 */
async function example3() {
  console.log('\n=== 示例 3: 创建批量任务 ===');

  // 创建会话
  const createSessionResponse = await fetch(`${BASE_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      initialMessage: '你好',
      options: { systemPrompt: '你是一个代码助手' }
    })
  }).then(r => r.json());

  const sessionId = createSessionResponse.sessionId;

  // 批量任务输入
  const batchInputs = [
    { message: '写一个快速排序' },
    { message: '写一个冒泡排序' },
    { message: '写一个归并排序' },
    { message: '写一个堆排序' },
    { message: '写一个选择排序' }
  ];

  // 创建批量任务
  const batchResponse = await fetch(`${BASE_URL}/tasks/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      type: 'chat',
      inputs: batchInputs.map(input => ({
        sessionId,
        ...input
      })),
      options: {
        priority: 'normal'
      }
    })
  }).then(r => r.json());

  console.log('批量任务创建成功:', batchResponse);
  console.log('任务总数:', batchResponse.total);
  console.log('任务 IDs:', batchResponse.taskIds);

  return batchResponse.taskIds;
}

/**
 * 示例 4: 监控批量任务
 */
async function example4(taskIds) {
  console.log('\n=== 示例 4: 监控批量任务 ===');

  const maxAttempts = 60; // 最多轮询 60 次
  const interval = 3000; // 每 3 秒轮询一次

  for (let i = 0; i < maxAttempts; i++) {
    // 获取所有任务状态
    const tasksResponse = await fetch(`${BASE_URL}/tasks?userId=${userId}`)
      .then(r => r.json());

    const tasks = tasksResponse.tasks;

    // 统计任务状态
    const statusCount = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {});

    console.log(`[${i + 1}/${maxAttempts}] 批量任务状态:`);
    console.log('    total:', tasks.length);
    console.log('    pending:', statusCount.pending || 0);
    console.log('    processing:', statusCount.processing || 0);
    console.log('    completed:', statusCount.completed || 0);
    console.log('    failed:', statusCount.failed || 0);

    // 所有任务完成或失败，退出轮询
    const total = (statusCount.completed || 0) + (statusCount.failed || 0);
    if (total === taskIds.length) {
      console.log('批量任务全部完成！');
      console.log('成功:', statusCount.completed || 0);
      console.log('失败:', statusCount.failed || 0);
      return tasks;
    }

    // 等待后继续轮询
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Batch task timeout');
}

/**
 * 示例 5: 获取队列统计
 */
async function example5() {
  console.log('\n=== 示例 5: 获取队列统计 ===');

  const statsResponse = await fetch(`${BASE_URL}/queue/stats`)
    .then(r => r.json());

  const stats = statsResponse.stats;

  console.log('队列统计:');
  console.log('  等待中:', stats.waiting);
  console.log('  执行中:', stats.active);
  console.log('  已完成:', stats.completed);
  console.log('  失败:', stats.failed);
}

// 执行所有示例
(async () => {
  try {
    const taskId = await example1();
    await example2(taskId);
    const taskIds = await example3();
    await example4(taskIds);
    await example5();
  } catch (error) {
    console.error('示例执行失败:', error);
  }
})();
```

---

完整的 Worker 实现和更多高级特性请继续查看文档。
