/**
 * EventBus 与 SessionManager 集成示例
 * 展示如何在现有的 SessionManager 中集成事件总线
 */

import { typedEventBus, createLoggingMiddleware } from './event-bus';
import { Message } from '../providers/base';

// ==================== 现有 SessionManager 的事件化改造 ====================

/**
 * 事件化的 SessionManager 类
 * 在现有功能基础上添加事件发布
 */
export class SessionManagerWithEvents {
  private sessionId: string;
  private messageList: Message[] = [];

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    
    // 订阅与自己相关的事件
    this.setupEventListeners();
    
    // 添加监控中间件
    this.setupMonitoring();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听自己的消息添加事件
    typedEventBus.on('session.message.added', (data) => {
      if (data.sessionId === this.sessionId) {
        console.log(`[Session ${this.sessionId}] 收到新消息:`, data.message.content?.substring(0, 50));
      }
    });

    // 监听压缩事件
    typedEventBus.on('session.compaction.completed', (data) => {
      if (data.sessionId === this.sessionId) {
        console.log(`[Session ${this.sessionId}] 压缩完成，压缩了 ${data.compressedCount} 条消息`);
      }
    });

    // 监听错误事件
    typedEventBus.on('session.error', (data) => {
      if (data.sessionId === this.sessionId) {
        console.error(`[Session ${this.sessionId}] 错误:`, data.error.message);
      }
    });
  }

  /**
   * 设置监控
   */
  private setupMonitoring(): void {
    // 添加会话特定的日志中间件
    typedEventBus.useForEvent('session.message.added', createLoggingMiddleware(`Session-${this.sessionId}`));
  }

  /**
   * 添加消息（发布事件）
   */
  async addMessage(message: Message): Promise<void> {
    // 现有业务逻辑
    this.messageList.push(message);
    
    // 发布消息添加事件
    await typedEventBus.emit('session.message.added', {
      sessionId: this.sessionId,
      message,
      timestamp: Date.now(),
      messageCount: this.messageList.length
    });

    // 检查是否需要压缩
    await this.checkAndCompact();
  }

  /**
   * 获取消息（可能触发压缩）
   */
  async getMessages(): Promise<Message[]> {
    // 现有业务逻辑
    const messages = [...this.messageList];
    
    // 发布消息获取事件
    await typedEventBus.emit('session.messages.retrieved', {
      sessionId: this.sessionId,
      count: messages.length,
      timestamp: Date.now()
    });

    return messages;
  }

  /**
   * 检查并执行压缩
   */
  private async checkAndCompact(): Promise<void> {
    const tokenCount = this.calculateTokenCount();
    const threshold = 1000; // 示例阈值
    
    if (tokenCount > threshold) {
      // 发布压缩触发事件
      await typedEventBus.emit('session.compaction.triggered', {
        sessionId: this.sessionId,
        tokenCount,
        threshold,
        timestamp: Date.now()
      });

      try {
        // 执行压缩逻辑
        const result = await this.performCompaction();
        
        // 发布压缩完成事件
        await typedEventBus.emit('session.compaction.completed', {
          sessionId: this.sessionId,
          summary: result.summary,
          compressedCount: result.compressedCount,
          originalTokenCount: tokenCount,
          compressedTokenCount: result.newTokenCount,
          timestamp: Date.now()
        });
      } catch (error) {
        // 发布压缩失败事件
        await typedEventBus.emit('session.compaction.failed', {
          sessionId: this.sessionId,
          error: error instanceof Error ? error : new Error(String(error)),
          tokenCount,
          timestamp: Date.now()
        });
        
        // 同时发布通用错误事件
        await typedEventBus.emit('session.error', {
          sessionId: this.sessionId,
          error: error instanceof Error ? error : new Error(String(error)),
          operation: 'compaction',
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * 计算 Token 数量（示例）
   */
  private calculateTokenCount(): number {
    return this.messageList.reduce((total, message) => {
      return total + (message.content?.length || 0) * 0.25; // 简单估算
    }, 0);
  }

  /**
   * 执行压缩（示例）
   */
  private async performCompaction(): Promise<{
    summary: any;
    compressedCount: number;
    newTokenCount: number;
  }> {
    // 模拟压缩逻辑
    const compressedCount = Math.floor(this.messageList.length * 0.5);
    const summary = {
      content: `压缩了 ${compressedCount} 条消息`,
      timestamp: Date.now()
    };
    
    // 保留部分消息
    this.messageList = this.messageList.slice(-10);
    
    return {
      summary,
      compressedCount,
      newTokenCount: this.calculateTokenCount()
    };
  }

  /**
   * 清空会话
   */
  async clear(): Promise<void> {
    const messageCount = this.messageList.length;
    this.messageList = [];
    
    // 发布清空事件
    await typedEventBus.emit('session.cleared', {
      sessionId: this.sessionId,
      clearedCount: messageCount,
      timestamp: Date.now()
    });
  }

  /**
   * 获取会话统计信息
   */
  getStats(): {
    messageCount: number;
    tokenCount: number;
    lastActivity?: number;
  } {
    return {
      messageCount: this.messageList.length,
      tokenCount: this.calculateTokenCount(),
      lastActivity: this.messageList.length > 0 ? Date.now() : undefined
    };
  }
}

// ==================== 监控服务示例 ====================

/**
 * 会话监控服务
 * 监听所有会话事件，进行集中监控
 */
export class SessionMonitorService {
  private sessionStats = new Map<string, any>();
  private errorLog: any[] = [];

  constructor() {
    this.setupEventHandlers();
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 监控消息添加
    typedEventBus.on('session.message.added', (data) => {
      this.updateSessionStats(data.sessionId, {
        lastMessage: data.timestamp,
        messageCount: data.messageCount
      });
      this.logActivity(`消息添加: ${data.sessionId}`);
    });

    // 监控压缩事件
    typedEventBus.on('session.compaction.triggered', (data) => {
      this.logActivity(`压缩触发: ${data.sessionId} (${data.tokenCount}/${data.threshold} tokens)`);
    });

    typedEventBus.on('session.compaction.completed', (data) => {
      this.updateSessionStats(data.sessionId, {
        lastCompaction: data.timestamp,
        compressionRate: data.compressedCount
      });
      this.logActivity(`压缩完成: ${data.sessionId}，节省 ${data.originalTokenCount - data.compressedTokenCount} tokens`);
    });

    // 监控错误
    typedEventBus.on('session.error', (data) => {
      this.errorLog.push({
        sessionId: data.sessionId,
        error: data.error.message,
        operation: data.operation,
        timestamp: data.timestamp
      });
      console.error(`[Monitor] 会话错误: ${data.sessionId} - ${data.error.message}`);
    });

    // 监控清空事件
    typedEventBus.on('session.cleared', (data) => {
      this.sessionStats.delete(data.sessionId);
      this.logActivity(`会话清空: ${data.sessionId} (${data.clearedCount} 条消息)`);
    });
  }

  /**
   * 更新会话统计
   */
  private updateSessionStats(sessionId: string, updates: any): void {
    const stats = this.sessionStats.get(sessionId) || {};
    this.sessionStats.set(sessionId, { ...stats, ...updates });
  }

  /**
   * 记录活动
   */
  private logActivity(message: string): void {
    console.log(`[Monitor] ${new Date().toISOString()} - ${message}`);
  }

  /**
   * 获取监控报告
   */
  getReport(): {
    activeSessions: number;
    totalErrors: number;
    sessionStats: Map<string, any>;
    recentErrors: any[];
  } {
    return {
      activeSessions: this.sessionStats.size,
      totalErrors: this.errorLog.length,
      sessionStats: new Map(this.sessionStats),
      recentErrors: this.errorLog.slice(-10)
    };
  }
}

// ==================== 使用示例 ====================

async function runIntegrationExample() {
  console.log('🚀 EventBus 与 SessionManager 集成示例\n');

  // 创建监控服务
  const monitor = new SessionMonitorService();

  // 创建多个会话管理器
  const session1 = new SessionManagerWithEvents('session-001');
  const session2 = new SessionManagerWithEvents('session-002');

  // 模拟用户交互
  console.log('=== 模拟用户交互 ===');
  
  await session1.addMessage({
    role: 'user',
    content: '你好，我想了解产品信息'
  });

  await session2.addMessage({
    role: 'user',
    content: '我需要技术支持'
  });

  await session1.addMessage({
    role: 'assistant',
    content: '当然，我们有以下产品...（详细的产品介绍）'.repeat(10)
  });

  await session2.addMessage({
    role: 'assistant',
    content: '请描述您遇到的具体问题...（详细的技术支持回复）'.repeat(10)
  });

  // 获取消息（可能触发压缩）
  console.log('\n=== 获取消息 ===');
  const messages1 = await session1.getMessages();
  console.log(`会话1消息数量: ${messages1.length}`);

  // 模拟更多消息以触发压缩
  console.log('\n=== 模拟大量消息触发压缩 ===');
  for (let i = 0; i < 20; i++) {
    await session1.addMessage({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `测试消息 ${i + 1}: ${'这是一条较长的测试消息，用于测试压缩功能。'.repeat(5)}`
    });
  }

  // 获取统计信息
  console.log('\n=== 会话统计 ===');
  console.log('会话1统计:', session1.getStats());
  console.log('会话2统计:', session2.getStats());

  // 获取监控报告
  console.log('\n=== 监控报告 ===');
  const report = monitor.getReport();
  console.log(`活跃会话: ${report.activeSessions}`);
  console.log(`总错误数: ${report.totalErrors}`);
  console.log('会话统计:', Object.fromEntries(report.sessionStats));

  // 清空会话
  console.log('\n=== 清空会话 ===');
  await session1.clear();
  await session2.clear();

  // 最终监控报告
  console.log('\n=== 最终监控报告 ===');
  const finalReport = monitor.getReport();
  console.log(`最终活跃会话: ${finalReport.activeSessions}`);
  console.log(`最终总错误数: ${finalReport.totalErrors}`);

  console.log('\n✅ 集成示例运行完成');
}

// 运行示例
if (require.main === module) {
  runIntegrationExample().catch(console.error);
}

// 导出
export {
  SessionManagerWithEvents,
  SessionMonitorService,
  runIntegrationExample
};