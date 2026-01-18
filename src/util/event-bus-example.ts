/**
 * EventBus 使用示例
 */

import { 
  EventBus, 
  TypedEventBus, 
  eventBus, 
  typedEventBus,
  createLoggingMiddleware,
  createErrorHandlingMiddleware,
  createValidationMiddleware,
  ScopedEventBus
} from './event-bus';

// ==================== 示例 1: 基本使用 ====================

function exampleBasicUsage() {
  console.log('=== 示例 1: 基本使用 ===');

  const bus = new EventBus();

  // 订阅事件
  const subscription1 = bus.on('user.login', (data) => {
    console.log(`用户登录: ${data.username}`);
  });

  const subscription2 = bus.onAsync('user.login', async (data) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log(`异步处理登录: ${data.username}`);
  });

  // 发布事件
  bus.emit('user.login', { username: '张三', userId: '123' });

  // 移除监听器
  subscription1.unsubscribe();

  // 一次性订阅
  bus.once('app.startup', (data) => {
    console.log(`应用启动: ${data.version}`);
  });

  bus.emit('app.startup', { version: '1.0.0' });
  bus.emit('app.startup', { version: '1.0.1' }); // 不会触发

  // 等待事件
  setTimeout(() => {
    bus.emit('data.loaded', { items: [1, 2, 3] });
  }, 100);

  bus.waitFor('data.loaded', 2000)
    .then(data => console.log('数据加载完成:', data))
    .catch(err => console.error('等待超时:', err));
}

// ==================== 示例 2: 类型安全使用 ====================

function exampleTypedUsage() {
  console.log('\n=== 示例 2: 类型安全使用 ===');

  // 定义事件类型
  interface MyEvents {
    'user.created': { id: string; name: string; email: string };
    'order.placed': { orderId: string; amount: number; items: string[] };
    'payment.processed': { paymentId: string; status: 'success' | 'failed' };
  }

  const typedBus = new TypedEventBus<MyEvents>();

  // 类型安全的订阅
  typedBus.on('user.created', (user) => {
    console.log(`新用户创建: ${user.name} (${user.email})`);
  });

  typedBus.on('order.placed', (order) => {
    console.log(`新订单: ${order.orderId}, 金额: $${order.amount}`);
  });

  // 类型安全的发布
  typedBus.emit('user.created', {
    id: 'user-001',
    name: '李四',
    email: 'lisi@example.com'
  });

  typedBus.emit('order.placed', {
    orderId: 'order-001',
    amount: 99.99,
    items: ['商品A', '商品B']
  });

  // 错误的类型会被 TypeScript 检测到
  // typedBus.emit('user.created', { id: '123' }); // 类型错误
  // typedBus.on('unknown.event', () => {}); // 类型错误
}

// ==================== 示例 3: 中间件使用 ====================

function exampleMiddlewareUsage() {
  console.log('\n=== 示例 3: 中间件使用 ===');

  const bus = new EventBus();

  // 添加全局日志中间件
  bus.use(createLoggingMiddleware('MyApp'));

  // 添加错误处理中间件
  bus.use(createErrorHandlingMiddleware((error, context) => {
    console.error(`全局错误处理: ${context.event}`, error);
  }));

  // 添加事件特定验证中间件
  bus.useForEvent('user.register', createValidationMiddleware(
    (data: any) => data.email && data.email.includes('@'),
    '邮箱格式无效'
  ));

  // 订阅事件
  bus.on('user.register', (user) => {
    console.log(`用户注册成功: ${user.email}`);
  });

  bus.on('user.register', async (user) => {
    // 模拟异步操作
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log(`发送欢迎邮件给: ${user.email}`);
  });

  // 发布有效事件
  bus.emit('user.register', {
    email: 'user@example.com',
    name: '王五'
  });

  // 发布无效事件（会触发验证错误）
  setTimeout(() => {
    bus.emit('user.register', {
      email: 'invalid-email',
      name: '赵六'
    }).catch(err => console.log('预期中的错误:', err.message));
  }, 100);
}

// ==================== 示例 4: 作用域事件总线 ====================

function exampleScopedBus() {
  console.log('\n=== 示例 4: 作用域事件总线 ===');

  const bus = new EventBus();

  // 创建作用域总线
  const sessionBus = bus.createScopedBus('session');
  const paymentBus = bus.createScopedBus('payment');

  // 在作用域总线上订阅
  sessionBus.on('created', (data) => {
    console.log(`会话创建: ${data.sessionId}`);
  });

  paymentBus.on('completed', (data) => {
    console.log(`支付完成: ${data.paymentId}, 金额: $${data.amount}`);
  });

  // 在作用域总线上发布
  sessionBus.emit('created', { sessionId: 'sess-001', userId: 'user-123' });
  paymentBus.emit('completed', { paymentId: 'pay-001', amount: 99.99 });

  // 父总线也能收到作用域事件（带作用域前缀）
  bus.on('session.created', (data) => {
    console.log(`父总线收到会话事件: ${data.sessionId}`);
  });

  // 移除作用域的所有事件
  sessionBus.offAll();
}

// ==================== 示例 5: 指标监控 ====================

function exampleMetrics() {
  console.log('\n=== 示例 5: 指标监控 ===');

  const bus = new EventBus({ enableMetrics: true });

  // 订阅多个事件
  bus.on('event.a', () => {
    // 模拟处理时间
    const start = Date.now();
    while (Date.now() - start < 10) {}
  });

  bus.onAsync('event.a', async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
  });

  bus.on('event.b', () => {
    // 模拟错误
    throw new Error('测试错误');
  });

  // 发布事件多次
  for (let i = 0; i < 5; i++) {
    bus.emit('event.a', { index: i });
    if (i % 2 === 0) {
      bus.emit('event.b', { index: i }).catch(() => {});
    }
  }

  // 获取指标
  setTimeout(() => {
    const metrics = bus.getMetrics();
    console.log('事件指标:', metrics);
    
    const eventAMetrics = bus.getMetrics('event.a');
    console.log('event.a 指标:', eventAMetrics);
  }, 200);
}

// ==================== 示例 6: 在 SessionManager 中使用 ====================

function exampleSessionManagerIntegration() {
  console.log('\n=== 示例 6: SessionManager 集成示例 ===');

  // 使用预定义的类型安全总线
  const { typedEventBus } = require('./event-bus');

  class SessionManagerWithEvents {
    private sessionId: string;

    constructor(sessionId: string) {
      this.sessionId = sessionId;

      // 订阅相关事件
      typedEventBus.on('session.message.added', this.onMessageAdded.bind(this));
      typedEventBus.on('session.compaction.triggered', this.onCompactionTriggered.bind(this));
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
      // 模拟 token 计算
      const tokenCount = 1500;
      
      // 发布压缩触发事件
      typedEventBus.emit('session.compaction.triggered', {
        sessionId: this.sessionId,
        tokenCount
      });

      // 压缩逻辑...
      const summary = { content: '压缩后的摘要' };
      const compressedCount = 10;

      // 发布压缩完成事件
      typedEventBus.emit('session.compaction.completed', {
        sessionId: this.sessionId,
        summary,
        compressedCount
      });
    }

    private onMessageAdded(data: any) {
      if (data.sessionId === this.sessionId) {
        console.log(`会话 ${this.sessionId} 收到新消息`);
      }
    }

    private onCompactionTriggered(data: any) {
      if (data.sessionId === this.sessionId) {
        console.log(`会话 ${this.sessionId} 触发压缩, token: ${data.tokenCount}`);
      }
    }
  }

  // 创建监控中间件
  typedEventBus.use(createLoggingMiddleware('SessionMonitor'));

  const sessionManager = new SessionManagerWithEvents('session-001');
  sessionManager.addMessage({ role: 'user', content: 'Hello' });
  sessionManager.compact();
}

// ==================== 示例 7: 高级特性 ====================

function exampleAdvancedFeatures() {
  console.log('\n=== 示例 7: 高级特性 ===');

  const bus = new EventBus();

  // 1. 链式中间件
  bus.use(async (context, next) => {
    console.log(`中间件1: ${context.event} 开始`);
    await next();
    console.log(`中间件1: ${context.event} 结束`);
  });

  bus.use(async (context, next) => {
    console.log(`中间件2: 处理 ${context.event}`);
    context.metadata.processedBy = 'middleware2';
    await next();
  });

  // 2. 事件中止
  bus.useForEvent('sensitive.action', async (context, next) => {
    if (!context.metadata.authorized) {
      console.log('未授权，中止事件');
      context.abort();
      return;
    }
    await next();
  });

  bus.on('sensitive.action', (data) => {
    console.log('执行敏感操作:', data);
  });

  // 未授权的事件会被中止
  bus.emit('sensitive.action', { action: 'delete' }, { authorized: false });
  
  // 授权的事件正常执行
  setTimeout(() => {
    bus.emit('sensitive.action', { action: 'view' }, { authorized: true });
  }, 50);

  // 3. 批量订阅和取消
  const subscriptions = [
    bus.on('event.1', () => console.log('事件1')),
    bus.on('event.2', () => console.log('事件2')),
    bus.on('event.3', () => console.log('事件3')),
  ];

  // 批量取消订阅
  setTimeout(() => {
    subscriptions.forEach(sub => sub.unsubscribe());
    console.log('所有订阅已取消');
  }, 100);
}

// ==================== 主执行函数 ====================

async function runAllExamples() {
  console.log('🚀 EventBus 示例开始运行\n');

  try {
    exampleBasicUsage();
    await new Promise(resolve => setTimeout(resolve, 100));

    exampleTypedUsage();
    await new Promise(resolve => setTimeout(resolve, 100));

    exampleMiddlewareUsage();
    await new Promise(resolve => setTimeout(resolve, 200));

    exampleScopedBus();
    await new Promise(resolve => setTimeout(resolve, 100));

    exampleMetrics();
    await new Promise(resolve => setTimeout(resolve, 300));

    exampleSessionManagerIntegration();
    await new Promise(resolve => setTimeout(resolve, 100));

    exampleAdvancedFeatures();
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log('\n✅ 所有示例运行完成');
  } catch (error) {
    console.error('示例运行出错:', error);
  }
}

// 运行示例
if (require.main === module) {
  runAllExamples();
}

// 导出示例函数
export {
  exampleBasicUsage,
  exampleTypedUsage,
  exampleMiddlewareUsage,
  exampleScopedBus,
  exampleMetrics,
  exampleSessionManagerIntegration,
  exampleAdvancedFeatures,
  runAllExamples
};