# React 时间分片思想在多智能体架构中的应用（续2）

> 继续完善最佳实践和总结章节

---

## 九、最佳实践（续）

### 9.3 监控与调试

```typescript
/**
 * 监控与调试工具
 */

/**
 * 监控器
 */
class SchedulerMonitor {
  private scheduler: AgentScheduler;
  private metrics: Map<string, Metric> = new Map();

  constructor(scheduler: AgentScheduler) {
    this.scheduler = scheduler;
  }

  /**
   * 记录指标
   */
  recordMetric(name: string, value: number, labels?: Record<string, string>) {
    const key = this.getMetricKey(name, labels);
    const metric = this.metrics.get(key) || {
      name,
      labels: labels || {},
      values: [],
    };

    metric.values.push({
      value,
      timestamp: Date.now(),
    });

    // 保留最近 1000 个数据点
    if (metric.values.length > 1000) {
      metric.values.shift();
    }

    this.metrics.set(key, metric);
  }

  /**
   * 获取指标
   */
  getMetric(name: string, labels?: Record<string, string>): Metric | undefined {
    const key = this.getMetricKey(name, labels);
    return this.metrics.get(key);
  }

  /**
   * 获取指标统计
   */
  getMetricStats(
    name: string,
    labels?: Record<string, string>
  ): MetricStats | undefined {
    const metric = this.getMetric(name, labels);
    if (!metric) {
      return undefined;
    }

    const values = metric.values.map(v => v.value);

    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, v) => sum + v, 0) / values.length,
      p50: this.percentile(values, 50),
      p95: this.percentile(values, 95),
      p99: this.percentile(values, 99),
    };
  }

  /**
   * 生成监控报告
   */
  generateReport(): MonitoringReport {
    const report: MonitoringReport = {
      timestamp: Date.now(),
      metrics: [],
    };

    for (const metric of this.metrics.values()) {
      const stats = this.getMetricStats(metric.name, metric.labels);
      if (stats) {
        report.metrics.push({
          name: metric.name,
          labels: metric.labels,
          stats,
        });
      }
    }

    return report;
  }

  /**
   * 获取指标键
   */
  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels) {
      return name;
    }

    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  /**
   * 计算百分位数
   */
  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor((p / 100) * (sorted.length - 1));
    return sorted[index];
  }
}

/**
 * 指标
 */
interface Metric {
  name: string;
  labels: Record<string, string>;
  values: Array<{
    value: number;
    timestamp: number;
  }>;
}

/**
 * 指标统计
 */
interface MetricStats {
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

/**
 * 监控报告
 */
interface MonitoringReport {
  timestamp: number;
  metrics: Array<{
    name: string;
    labels: Record<string, string>;
    stats: MetricStats;
  }>;
}

/**
 * 调试器
 */
class SchedulerDebugger {
  private scheduler: AgentScheduler;
  private breakpoints: Set<string> = new Set();
  private logs: DebugLog[] = [];

  constructor(scheduler: AgentScheduler) {
    this.scheduler = scheduler;
  }

  /**
   * 设置断点
   */
  setBreakpoint(taskId: string): void {
    this.breakpoints.add(taskId);
  }

  /**
   * 移除断点
   */
  removeBreakpoint(taskId: string): void {
    this.breakpoints.delete(taskId);
  }

  /**
   * 记录日志
   */
  log(message: string, data?: any): void {
    this.logs.push({
      timestamp: Date.now(),
      message,
      data,
    });

    // 保留最近 1000 条日志
    if (this.logs.length > 1000) {
      this.logs.shift();
    }
  }

  /**
   * 获取日志
   */
  getLogs(filter?: (log: DebugLog) => boolean): DebugLog[] {
    if (!filter) {
      return [...this.logs];
    }

    return this.logs.filter(filter);
  }

  /**
   * 调试任务
   */
  debugTask(taskId: string): TaskDebugInfo {
    const task = this.findTaskById(taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const logs = this.getLogs(
      log => log.data && log.data.taskId === taskId
    );

    return {
      task,
      logs,
      metrics: this.calculateTaskMetrics(task),
    };
  }

  /**
   * 计算任务指标
   */
  private calculateTaskMetrics(task: AgentTask): TaskMetrics {
    const now = Date.now();
    const duration = task.completedAt
      ? task.completedAt - (task.startedAt || now)
      : now - (task.startedAt || now);

    const tokensPerSecond = task.tokensUsed / (duration / 1000);

    return {
      duration,
      tokensPerSecond,
      progress: task.tokensUsed / task.tokenBudget,
    };
  }

  /**
   * 根据ID查找任务
   */
  private findTaskById(taskId: string): AgentTask | undefined {
    for (const queue of (this.scheduler as any).taskQueues.values()) {
      const task = queue.find((t: AgentTask) => t.id === taskId);
      if (task) {
        return task;
      }
    }
    return undefined;
  }
}

/**
 * 调试日志
 */
interface DebugLog {
  timestamp: number;
  message: string;
  data?: any;
}

/**
 * 任务调试信息
 */
interface TaskDebugInfo {
  task: AgentTask;
  logs: DebugLog[];
  metrics: TaskMetrics;
}

/**
 * 任务指标
 */
interface TaskMetrics {
  duration: number;
  tokensPerSecond: number;
  progress: number;
}
```

---

## 十、总结

### 10.1 核心设计原则

```typescript
/**
 * 1. 任务单元化
 * - 每个智能体任务分解为可中断的单元
 * - 支持任务的暂停、恢复、重试
 */

interface AgentTask {
  id: string;
  agentId: string;
  priority: AgentPriority;
  tokenBudget: number;
  tokensUsed: number;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  snapshot?: TaskSnapshot; // 支持中断恢复
}

/**
 * 2. 优先级调度
 * - 基于任务紧急程度动态调整执行顺序
 * - 支持优先级提升和动态调整
 */

class AgentScheduler {
  private taskQueues: Map<AgentPriority, AgentTask[]> = new Map();

  private pickNextTask(): AgentTask | null {
    // 按优先级从高到低遍历
    for (const priority of [
      AgentPriority.CRITICAL,
      AgentPriority.HIGH,
      AgentPriority.NORMAL,
      AgentPriority.LOW,
    ]) {
      const queue = this.taskQueues.get(priority);
      if (queue && queue.length > 0) {
        return queue.shift()!;
      }
    }
    return null;
  }
}

/**
 * 3. 资源配额
 * - 为每个智能体分配 Token/CPU 时间预算
 * - 支持 Token 池管理和动态调整
 */

class TokenPoolManager {
  private pool: number;
  private maxPoolSize: number;

  acquire(amount: number): boolean {
    if (this.pool >= amount) {
      this.pool -= amount;
      return true;
    }
    return false;
  }

  release(amount: number): void {
    this.pool = Math.min(this.pool + amount, this.maxPoolSize);
  }
}

/**
 * 4. 状态快照
 * - 保存执行状态，支持中断恢复
 * - 支持增量保存和复用
 */

interface TaskSnapshot {
  tokensUsed: number;
  intermediateState: any;
  partialResult?: any;
  checkpoint: number;
  metadata?: Record<string, any>;
}

/**
 * 5. 任务合并
 * - 复用已完成工作，避免重复计算
 * - 支持批处理和预测性调度
 */

class BatchScheduler {
  private batchTasks: Map<string, AgentTask[]> = new Map();

  private mergeTasks(tasks: AgentTask[]): AgentTask {
    // 合并相似任务，减少开销
    return {
      ...tasks[0],
      metadata: {
        batch: true,
        batchSize: tasks.length,
      },
    };
  }
}
```

### 10.2 架构对比

| 特性 | React Fiber | 多智能体架构 |
|------|-------------|--------------|
| **任务单元** | Fiber 节点 | Agent 任务单元 |
| **调度器** | Scheduler | Agent Coordinator |
| **时间片** | 5ms | Token 预算 |
| **优先级** | Lane 模型 | 任务优先级 |
| **双缓存** | current/workInProgress | 状态快照 |
| **中断恢复** | 链表遍历中断 | 智能体任务中断 |
| **适用场景** | UI 渲染 | 多会话、自动驾驶、游戏 AI |

### 10.3 适用场景

```typescript
/**
 * 场景 1: 多会话对话系统
 * - 特点：多个并发会话，需要公平分配资源
 * - 优先级：用户输入 HIGH，后台分析 LOW
 * - 挑战：会话数量动态变化，需要公平调度
 */

class MultiSessionManager {
  private scheduler: FairScheduler;

  async handleUserMessage(sessionId: string, message: string) {
    const task: AgentTask = {
      id: `chat_${sessionId}_${Date.now()}`,
      agentId: 'chat-agent',
      priority: AgentPriority.HIGH,
      tokenBudget: 2000,
      status: 'pending',
      sessionId,
    };

    this.scheduler.enqueue(task);
  }
}

/**
 * 场景 2: 自动驾驶多模块
 * - 特点：实时性要求高，紧急事件优先
 * - 优先级：安全事件 CRITICAL，感知/决策 HIGH，规划 NORMAL
 * - 挑战：硬实时要求，需要快速响应
 */

class AutonomousDrivingScheduler {
  private scheduler: ResponsiveScheduler;

  async handleEmergency(event: EmergencyEvent) {
    const task: AgentTask = {
      id: `emergency_${event.id}_${Date.now()}`,
      agentId: 'decision-agent',
      priority: AgentPriority.CRITICAL,
      tokenBudget: 500,
      status: 'pending',
    };

    this.scheduler.enqueue(task);
  }
}

/**
 * 场景 3: 游戏 AI
 * - 特点：多个 NPC 智能体，帧率要求
 * - 优先级：战斗 HIGH，闲置 LOW
 * - 挑战：需要在有限时间内完成所有 NPC 的决策
 */

class GameAIScheduler {
  private scheduler: AgentScheduler;

  updateAllNPCs() {
    for (const npc of this.npcs) {
      const priority = npc.isInCombat
        ? AgentPriority.HIGH
        : AgentPriority.NORMAL;

      const task: AgentTask = {
        id: `npc_${npc.id}_${Date.now()}`,
        agentId: `npc-agent-${npc.id}`,
        priority,
        tokenBudget: 200,
        status: 'pending',
      };

      this.scheduler.enqueue(task);
    }
  }
}
```

### 10.4 性能指标

```typescript
/**
 * 关键性能指标（KPI）
 */

interface SchedulerKPI {
  /**
   * 任务吞吐量
   * 单位：任务/秒
   */
  throughput: number;

  /**
   * 平均任务延迟
   * 单位：毫秒
   */
  avgLatency: number;

  /**
   * P95 延迟
   * 单位：毫秒
   */
  p95Latency: number;

  /**
   * 任务成功率
   * 单位：百分比
   */
  successRate: number;

  /**
   * Token 利用率
   * 单位：百分比
   */
  tokenUtilization: number;

  /**
   * 调度公平性（方差）
   * 越小越公平
   */
  fairnessVariance: number;
}

/**
 * 性能监控示例
 */
class SchedulerPerformanceMonitor {
  private monitor: SchedulerMonitor;

  calculateKPI(): SchedulerKPI {
    // 1. 任务吞吐量
    const completedTasks = this.monitor.getMetric('tasks_completed');
    const throughput = this.calculateRate(completedTasks);

    // 2. 平均延迟
    const latency = this.monitor.getMetricStats('task_latency');
    const avgLatency = latency?.avg || 0;

    // 3. P95 延迟
    const p95Latency = latency?.p95 || 0;

    // 4. 成功率
    const totalTasks = this.monitor.getMetric('tasks_total');
    const successRate =
      (completedTasks?.values[completedTasks.values.length - 1]?.value || 0) /
      (totalTasks?.values[totalTasks.values.length - 1]?.value || 1);

    // 5. Token 利用率
    const tokenUsage = this.monitor.getMetric('tokens_used');
    const tokenCapacity = this.monitor.getMetric('tokens_capacity');
    const tokenUtilization =
      (tokenUsage?.values[tokenUsage.values.length - 1]?.value || 0) /
      (tokenCapacity?.values[tokenCapacity.values.length - 1]?.value || 1);

    // 6. 公平性方差
    const fairness = this.monitor.getMetricStats('agent_executions');
    const fairnessVariance = fairness?.variance || 0;

    return {
      throughput,
      avgLatency,
      p95Latency,
      successRate: successRate * 100,
      tokenUtilization: tokenUtilization * 100,
      fairnessVariance,
    };
  }

  private calculateRate(metric?: Metric): number {
    if (!metric || metric.values.length < 2) {
      return 0;
    }

    const recent = metric.values.slice(-10); // 最近10个数据点
    const timeSpan = recent[recent.length - 1].timestamp - recent[0].timestamp;
    const count = recent.reduce((sum, v) => sum + v.value, 0);

    return count / (timeSpan / 1000);
  }
}
```

### 10.5 未来发展方向

```typescript
/**
 * 1. 自适应调度
 * - 基于机器学习预测任务资源需求
 * - 动态调整优先级和资源分配
 */

class AdaptiveScheduler extends AgentScheduler {
  private mlModel: MLModel;

  async predictTaskResources(task: AgentTask): Promise<TaskPrediction> {
    const features = this.extractFeatures(task);
    const prediction = await this.mlModel.predict(features);

    return {
      tokensRequired: prediction.tokens,
      estimatedDuration: prediction.duration,
      recommendedPriority: prediction.priority,
    };
  }
}

/**
 * 2. 跨节点协同调度
 * - 多个调度器实例协同工作
 * - 任务可以跨节点迁移
 */

class DistributedCollaborativeScheduler {
  private schedulers: Map<string, AgentScheduler> = new Map();

  async distributeTask(task: AgentTask): Promise<void> {
    // 选择最优节点
    const optimalNode = this.selectOptimalNode(task);

    // 将任务调度到最优节点
    await schedulers.get(optimalNode)!.enqueue(task);
  }
}

/**
 * 3. 实时监控与告警
 * - 监控调度器性能指标
 * - 自动告警和调整
 */

class SchedulerAlertManager {
  private thresholds: AlertThresholds = {
    p95Latency: 5000,
    tokenUtilization: 0.9,
    successRate: 0.95,
  };

  checkAlerts(kpi: SchedulerKPI): Alert[] {
    const alerts: Alert[] = [];

    if (kpi.p95Latency > this.thresholds.p95Latency) {
      alerts.push({
        type: 'high_latency',
        message: `P95 latency ${kpi.p95Latency}ms exceeds threshold`,
      });
    }

    if (kpi.tokenUtilization > this.thresholds.tokenUtilization) {
      alerts.push({
        type: 'high_utilization',
        message: `Token utilization ${kpi.tokenUtilization}% exceeds threshold`,
      });
    }

    if (kpi.successRate < this.thresholds.successRate) {
      alerts.push({
        type: 'low_success_rate',
        message: `Success rate ${kpi.successRate}% below threshold`,
      });
    }

    return alerts;
  }
}

/**
 * 4. 可视化与调试
 * - 实时可视化调度器状态
 * - 提供调试工具和性能分析
 */

class SchedulerVisualizer {
  visualizeState(scheduler: AgentScheduler): Visualization {
    return {
      queues: this.getQueueStates(scheduler),
      activeTask: this.getActiveTask(scheduler),
      metrics: this.getMetrics(scheduler),
    };
  }
}
```

### 10.6 最佳实践总结

```typescript
/**
 * ✅ 推荐做法
 */

// 1. 使用清晰的优先级定义
enum Priority {
  CRITICAL,
  HIGH,
  NORMAL,
  LOW,
}

// 2. 合理设置 Token 预算
function budgetForTask(taskType: string): number {
  switch (taskType) {
    case 'chat': return 1000;
    case 'code': return 2000;
    default: return 500;
  }
}

// 3. 实现任务依赖管理
async executeTask(task: AgentTask) {
  if (task.dependencies) {
    await Promise.all(
      task.dependencies.map(dep => waitForCompletion(dep))
    );
  }
  // 执行任务
}

// 4. 监控关键指标
monitor.recordMetric('task_latency', duration, { taskType });

// 5. 实现故障恢复
try {
  await executeTask(task);
} catch (error) {
  if (retryCount < maxRetries) {
    await retryTask(task);
  }
}

/**
 * ❌ 避免的做法
 */

// 1. 不要使用过多优先级级别
enum BadPriority {
  URGENT_1, URGENT_2, ..., LOW_10  // ❌ 太多级别
}

// 2. 不要固定 Token 预算
const fixedBudget = 1000;  // ❌ 不适应不同任务

// 3. 不要忽略任务失败
executeTask(task);  // ❌ 没有错误处理

// 4. 不要过度批处理
// ❌ 将所有任务都批处理，影响实时性

// 5. 不要忽视资源限制
// ❌ 不设置最大并发数，可能导致系统过载
```

---

## 十一、参考文献

### React Fiber 相关
- [React Fiber Architecture](https://github.com/acdlite/react-fiber-architecture)
- [React 18 Release Notes](https://react.dev/blog/2022/03/29/react-v18)
- [Lane Model in React](https://github.com/facebook/react/pull/18764)

### 调度算法相关
- [CFS (Completely Fair Scheduler) in Linux](https://www.kernel.org/doc/html/latest/scheduler/sched-design-CFS.html)
- [Multiprocessor Scheduling](https://www.usenix.org/conference/osdi16/technical-sessions/presentation/ocaml)
- [Borg: Google's Cluster Management System](https://research.google/pubs/pub43438/)

### 多智能体系统相关
- [Multi-Agent Reinforcement Learning](https://arxiv.org/abs/2107.05399)
- [Autonomous Driving Planning](https://arxiv.org/abs/2005.03427)
- [Game AI and NPC Behavior](https://www.gdcvault.com/browse/gdc-22)

---

## 十二、附录

### A. 完整类型定义

```typescript
/**
 * 智能体任务
 */
interface AgentTask {
  id: string;
  agentId: string;
  userId?: string;
  sessionId?: string;
  priority: AgentPriority;
  tokenBudget: number;
  tokensUsed: number;
  maxTokens?: number;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  error?: Error;
  snapshot?: TaskSnapshot;
  nextTask?: AgentTask;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
  dependencies?: string[];
  dependents?: string[];
  onProgress?: (progress: number) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

/**
 * 智能体
 */
interface Agent {
  readonly id: string;
  readonly name: string;
  readonly type: AgentType;
  execute(
    task: AgentTask,
    onStop?: () => void
  ): Promise<AgentExecutionResult>;
  estimateTokens(task: AgentTask): number;
  healthCheck(): Promise<boolean>;
  initialize?(): Promise<void>;
  destroy?(): Promise<void>;
}

/**
 * 智能体类型
 */
enum AgentType {
  CHAT = 'chat',
  CODE = 'code',
  ANALYSIS = 'analysis',
  PERCEPTION = 'perception',
  DECISION = 'decision',
  CONTROL = 'control',
}

/**
 * 优先级
 */
enum AgentPriority {
  CRITICAL = 1,
  HIGH = 2,
  NORMAL = 4,
  LOW = 8,
}

/**
 * 任务快照
 */
interface TaskSnapshot {
  tokensUsed: number;
  intermediateState: any;
  partialResult?: any;
  checkpoint: number;
  metadata?: Record<string, any>;
}

/**
 * 执行结果
 */
interface AgentExecutionResult {
  isComplete: boolean;
  tokensConsumed: number;
  result?: any;
  canPause: boolean;
  progress?: number;
}
```

### B. 配置示例

```typescript
/**
 * 调度器配置示例
 */
const schedulerConfig: SchedulerConfig = {
  maxConcurrentTasks: 5,
  totalTokenBudget: 10000,
  timeSliceMs: 1000,
  enableFairness: true,
};

/**
 * Token 池配置示例
 */
const tokenPoolConfig = {
  initialPoolSize: 5000,
  maxPoolSize: 20000,
  refillRate: 1000, // 每秒补充 1000 Token
  refillInterval: 1000, // 每秒补充一次
};

/**
 * 分布式配置示例
 */
const distributedConfig = {
  redis: {
    host: 'localhost',
    port: 6379,
    db: 0,
  },
  nodeId: 'node-1',
  heartbeatInterval: 5000,
  lockTTL: 10000,
};

/**
 * 监控配置示例
 */
const monitoringConfig = {
  metricsRetention: 86400000, // 24小时
  metricsResolution: 1000, // 1秒采样一次
  alertThresholds: {
    p95Latency: 5000,
    tokenUtilization: 0.9,
    successRate: 0.95,
  },
};
```

---

## 结语

React 的时间分片与任务调度思想为多智能体架构提供了宝贵的设计灵感。通过将**任务单元化、优先级调度、资源配额、状态快照、任务合并**等核心原则应用到智能体系统，我们可以构建出**高效、公平、可扩展**的多智能体调度架构。

本文档从理论到实践，详细阐述了如何将 React Fiber 的设计思想迁移到多智能体场景，并提供了完整的实现示例和最佳实践。希望这份文档能够帮助你在实际项目中构建出优秀的多智能体系统。

---

**文档版本**: 1.0.0
**最后更新**: 2026-01-22
**作者**: QPSCode
