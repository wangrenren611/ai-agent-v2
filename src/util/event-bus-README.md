# EventBus 工具类

一个功能强大、类型安全的事件总线工具类，支持异步事件处理、中间件、作用域、性能监控等高级特性。

## 特性

- ✅ **类型安全**：支持 TypeScript 泛型，编译时类型检查
- ✅ **异步支持**：支持异步事件处理器，带超时控制
- ✅ **中间件系统**：全局和事件特定的中间件支持
- ✅ **作用域事件**：创建隔离的事件作用域
- ✅ **性能监控**：内置事件执行指标统计
- ✅ **错误处理**：完善的错误处理和重试机制
- ✅ **单例模式**：提供默认单例实例
- ✅ **链式订阅**：支持一次性订阅和 Promise 等待

## 安装

```typescript
import { EventBus, eventBus, typedEventBus } from './util/event-bus';
```

## 快速开始

### 基本使用

```typescript
import { eventBus } from './util/event-bus';

// 订阅事件
const subscription = eventBus.on('user.login', (data) => {
  console.log(`用户登录: ${data.username}`);
});

// 发布事件
eventBus.emit('user.login', { username: '张三', userId: '123' });

// 取消订阅
subscription.unsubscribe();
```

### 异步事件

```typescript
// 异步订阅
eventBus.onAsync('data.processed', async (data) => {
  await processData(data);
  console.log('数据处理完成');
});

// 发布异步事件
await eventBus.emit('data.processed', { items: [1, 2, 3] });
```

### 类型安全使用

```typescript
import { TypedEventBus } from './util/event-bus';

// 定义事件类型
interface AppEvents {
  'user.created': { id: string; name: string };
  'order.placed': { orderId: string; amount: number };
}

// 创建类型安全总线
const bus = new TypedEventBus<AppEvents>();

// 类型安全的订阅和发布
bus.on('user.created', (user) => {
  console.log(`新用户: ${user.name}`);
});

bus.emit('user.created', {
  id: '123',
  name: '李四'  // 类型检查
});
```

## 核心 API

### EventBus 类

#### 构造函数
```typescript
const bus = new EventBus({
  maxListeners: 100,      // 最大监听器数
  enableAsync: true,      // 启用异步支持
  defaultTimeout: 5000,   // 异步处理器超时时间(ms)
  enableMetrics: true     // 启用性能监控
});
```

#### 主要方法
- `on(event, handler, handlerId?)`: 订阅事件
- `onAsync(event, handler, handlerId?)`: 订阅异步事件
- `once(event, handler)`: 一次性订阅
- `onceAsync(event, handler)`: 一次性异步订阅
- `emit(event, data, metadata?)`: 发布事件
- `off(event, handlerId)`: 取消订阅
- `offAll(event?)`: 取消所有订阅
- `use(middleware)`: 添加全局中间件
- `useForEvent(event, middleware)`: 添加事件特定中间件
- `waitFor(event, timeout?)`: 等待事件（Promise）
- `createScopedBus(scope)`: 创建作用域总线

### TypedEventBus 类（类型安全）

泛型版本，提供编译时类型检查：
```typescript
const typedBus = new TypedEventBus<YourEventTypes>();
// 方法与 EventBus 相同，但类型安全
```

### 预定义单例

```typescript
import { eventBus, typedEventBus } from './util/event-bus';

// 默认 EventBus 实例
eventBus.on('app.start', () => console.log('应用启动'));

// 预定义类型的 EventBus（包含 Session 和 Agent 事件）
typedEventBus.on('session.message.added', (data) => {
  console.log(`会话 ${data.sessionId} 收到消息`);
});
```

## 高级功能

### 中间件系统

```typescript
import { createLoggingMiddleware } from './util/event-bus';

// 添加全局日志中间件
eventBus.use(createLoggingMiddleware('MyApp'));

// 添加自定义中间件
eventBus.use(async (context, next) => {
  console.log(`事件开始: ${context.event}`);
  await next();
  console.log(`事件结束: ${context.event}`);
});

// 事件特定中间件
eventBus.useForEvent('user.register', async (context, next) => {
  if (!validateUser(context.data)) {
    throw new Error('用户数据无效');
  }
  await next();
});
```

### 作用域事件总线

```typescript
// 创建作用域总线
const sessionBus = eventBus.createScopedBus('session');
const paymentBus = eventBus.createScopedBus('payment');

// 在作用域内订阅和发布
sessionBus.on('created', (data) => {
  console.log(`会话创建: ${data.sessionId}`);
});

sessionBus.emit('created', { sessionId: 'sess-001' });
// 实际事件名: 'session.created'
```

### 性能监控

```typescript
// 启用监控
const bus = new EventBus({ enableMetrics: true });

// 执行一些事件...
bus.emit('test.event', { data: 'test' });

// 获取指标
const metrics = bus.getMetrics('test.event');
console.log(metrics);
// {
//   totalEvents: 1,
//   totalHandlers: 2,
//   avgExecutionTime: 15.5,
//   errors: 0,
//   lastEventTime: 1634567890123
// }
```

### 错误处理

```typescript
// 错误处理中间件
eventBus.use(createErrorHandlingMiddleware((error, context) => {
  console.error(`事件错误: ${context.event}`, error);
  // 可以上报到监控系统
}));

// 事件处理器中的错误会被捕获
eventBus.on('dangerous.operation', () => {
  throw new Error('操作失败');
});

eventBus.emit('dangerous.operation', {}).catch(err => {
  console.log('错误已被中间件处理');
});
```

## 内置中间件

### 日志中间件
```typescript
import { createLoggingMiddleware } from './util/event-bus';
eventBus.use(createLoggingMiddleware('AppName'));
```

### 错误处理中间件
```typescript
import { createErrorHandlingMiddleware } from './util/event-bus';
eventBus.use(createErrorHandlingMiddleware((error, context) => {
  // 自定义错误处理逻辑
}));
```

### 验证中间件
```typescript
import { createValidationMiddleware } from './util/event-bus';
eventBus.useForEvent('user.create', createValidationMiddleware(
  (data) => data.email.includes('@'),
  '邮箱格式无效'
));
```

## 在 SessionManager 中的使用示例

```typescript
import { typedEventBus } from './util/event-bus';

class SessionManager {
  constructor(private sessionId: string) {
    // 订阅相关事件
    typedEventBus.on('session.message.added', this.onMessageAdded.bind(this));
    typedEventBus.on('session.compaction.triggered', this.onCompaction.bind(this));
  }

  addMessage(message: any) {
    // 业务逻辑...
    
    // 发布事件
    typedEventBus.emit('session.message.added', {
      sessionId: this.sessionId,
      message
    });
  }

  compact() {
    const tokenCount = this.calculateTokens();
    
    typedEventBus.emit('session.compaction.triggered', {
      sessionId: this.sessionId,
      tokenCount
    });

    // 压缩逻辑...
    
    typedEventBus.emit('session.compaction.completed', {
      sessionId: this.sessionId,
      summary: compressedSummary,
      compressedCount: compressedMessages
    });
  }

  private onMessageAdded(data: any) {
    if (data.sessionId === this.sessionId) {
      // 处理自己的消息事件
    }
  }
}
```

## 预定义事件类型

EventBus 预定义了一些常用事件类型：

### Session 事件
```typescript
interface SessionEvents {
  'session.created': { sessionId: string; userId: string };
  'session.message.added': { sessionId: string; message: any };
  'session.compaction.triggered': { sessionId: string; tokenCount: number };
  'session.compaction.completed': { sessionId: string; summary: any; compressedCount: number };
  'session.error': { sessionId: string; error: Error };
}
```

### Agent 事件
```typescript
interface AgentEvents {
  'agent.tool.called': { toolName: string; params: any };
  'agent.tool.result': { toolName: string; result: any; duration: number };
  'agent.llm.called': { prompt: string; model: string };
  'agent.llm.response': { response: string; duration: number; tokenUsage: any };
}
```

## 最佳实践

### 1. 使用类型安全版本
```typescript
// 推荐：使用 TypedEventBus
interface YourEvents { /* 事件定义 */ }
const bus = new TypedEventBus<YourEvents>();

// 避免：使用字符串事件名
bus.on('unknown.event', () => {}); // 类型错误
```

### 2. 合理使用中间件
```typescript
// 添加顺序：验证 → 业务逻辑 → 日志
bus.use(createValidationMiddleware(validateData));
bus.use(yourBusinessMiddleware);
bus.use(createLoggingMiddleware('App'));
```

### 3. 管理订阅生命周期
```typescript
class Component {
  private subscriptions: Subscription[] = [];

  constructor() {
    this.subscriptions.push(
      bus.on('event1', this.handleEvent1.bind(this)),
      bus.on('event2', this.handleEvent2.bind(this))
    );
  }

  destroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
```

### 4. 使用作用域隔离
```typescript
// 不同模块使用不同作用域
const userBus = bus.createScopedBus('user');
const orderBus = bus.createScopedBus('order');

// 避免事件名冲突
userBus.on('created', () => {});    // 'user.created'
orderBus.on('created', () => {});   // 'order.created'
```

### 5. 监控和调试
```typescript
// 开发环境启用详细日志
if (process.env.NODE_ENV === 'development') {
  bus.use(createLoggingMiddleware('Dev'));
  bus.use(createErrorHandlingMiddleware(console.error));
}

// 生产环境监控关键指标
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    const metrics = bus.getMetrics();
    sendToMonitoring(metrics);
  }, 60000);
}
```

## 示例代码

查看完整示例：
```typescript
import { runAllExamples } from './util/event-bus-example';
runAllExamples();
```

## 性能考虑

1. **监听器数量**：默认最大 100 个，可通过配置调整
2. **异步超时**：默认 5 秒，防止处理器阻塞
3. **内存管理**：及时取消不需要的订阅
4. **中间件开销**：中间件会增加执行时间，合理使用

## 兼容性

- TypeScript: 4.0+
- Node.js: 14+
- 浏览器: ES2015+

## 许可证

MIT