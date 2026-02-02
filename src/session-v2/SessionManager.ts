/**
 * 重构后的 SessionManager
 * 
 * 职责：
 * 1. 会话生命周期管理
 * 2. 消息的增删改查
 * 3. 协调压缩策略
 * 4. 统计数据提供
 * 
 * 改进：
 * - 依赖抽象接口（Repository, CompactionStrategy）
 * - 单一职责：只负责协调，不直接处理文件或 LLM
 * - 支持依赖注入，便于测试
 */

import path from 'node:path';
import { uuid } from 'uuidv4';
import type { Message } from '../agent/message';
import type { LLMProvider } from '../providers/providers/base';
import { FileSystemMessageRepository } from './repository';
import { SmartCompactionStrategy } from './compaction-strategy';
import type {
  IMessageRepository,
  ICompactionStrategy,
  SessionManagerConfig,
  SessionStats,
  AddMessageOptions,
  CompactionResult,
} from './types';

export class SessionManager {
  // 配置
  private config: Required<Pick<SessionManagerConfig, 'sessionId' | 'llmProvider'>> &
    Omit<SessionManagerConfig, 'sessionId' | 'llmProvider'>;

  // 依赖组件
  private repository: IMessageRepository;
  private compactionStrategy: ICompactionStrategy;

  // 运行时状态（内存缓存）
  private messages: Message[] = [];
  private lastCompactionResult: CompactionResult | null = null;

  constructor(config: SessionManagerConfig) {
    this.config = {
      sessionDir: path.join('.agent-cache', 'sessions', config.sessionId),
      ...config,
    };

    // 初始化仓储（默认文件系统）
    this.repository =
      config.repository ||
      new FileSystemMessageRepository({
        sessionPath: this.config.sessionDir!,
      });

    // 初始化压缩策略（默认智能压缩）
    this.compactionStrategy =
      config.compactionStrategy ||
      new SmartCompactionStrategy({
        maxTokens: this.config.maxTokens!,
        maxOutputTokens: this.config.maxOutputTokens!,
        llmProvider: config.llmProvider,
        keepMessagesNum: 40,
        triggerRatio: 0.90,
      });
  }

  // ---------------------------------------------------------------------------
  // 生命周期方法
  // ---------------------------------------------------------------------------

  /**
   * 初始化会话
   * 从持久化存储加载消息
   */
  async init(): Promise<void> {
    await this.repository.init();
    this.messages = await this.repository.getAll();
  }

  /**
   * 获取会话 ID
   */
  get id(): string {
    return this.config.sessionId;
  }

  // ---------------------------------------------------------------------------
  // 消息操作方法
  // ---------------------------------------------------------------------------

  /**
   * 添加单条消息
   * 
   * @param message 消息对象
   * @param options 添加选项
   * @returns 添加后的消息（包含生成的 messageId）
   */
  async addMessage(
    message: Message,
    options: AddMessageOptions = {}
  ): Promise<Message> {
    const { persist = true } = options;

    // 确保消息有 ID
    const enrichedMessage: Message = {
      ...message,
      messageId: message.messageId || uuid(),
    };

    // 更新内存缓存
    this.messages.push(enrichedMessage);

    // 持久化
    if (persist) {
      await this.repository.save(enrichedMessage);
    }

    return enrichedMessage;
  }

  /**
   * 批量添加消息
   */
  async addMessages(
    messages: Message[],
    options: AddMessageOptions = {}
  ): Promise<Message[]> {
    if (messages.length === 0) return [];

    const { persist = true } = options;

    // 确保所有消息都有 ID
    const enrichedMessages = messages.map(msg => ({
      ...msg,
      messageId: msg.messageId || uuid(),
    }));

    // 更新内存缓存
    this.messages.push(...enrichedMessages);

    // 持久化
    if (persist) {
      await this.repository.saveBatch(enrichedMessages);
    }

    return enrichedMessages;
  }

  /**
   * 获取所有消息
   * 返回内存缓存（已压缩的消息列表）
   */
  getMessages(): Message[] {
    return [...this.messages];
  }

  /**
   * 获取原始消息（未压缩）
   */
  async getRawMessages(): Promise<Message[]> {
    // 如果需要获取未压缩的原始消息，需要重新从存储加载
    return await this.repository.getAll();
  }

  /**
   * 设置所有消息（替换）
   * 通常用于压缩后更新消息列表
   */
  async setMessages(messages: Message[]): Promise<void> {
    // 确保所有消息都有 ID
    this.messages = messages.map(msg => ({
      ...msg,
      messageId: msg.messageId || uuid(),
    }));

    await this.repository.setAll(this.messages);
  }

  /**
   * 清空所有消息
   */
  async clearAll(): Promise<void> {
    this.messages = [];
    this.lastCompactionResult = null;
    await this.repository.clear();
  }

  // ---------------------------------------------------------------------------
  // 压缩相关方法
  // ---------------------------------------------------------------------------

  /**
   * 检查是否需要压缩
   */
  shouldCompact(tools?: any[]): boolean {
    const threshold =
      (this.config.maxTokens! - this.config.maxOutputTokens!) * 0.9;

    return this.compactionStrategy.shouldCompact({
      messages: this.messages,
      tools,
      threshold,
    });
  }

  /**
   * 执行压缩
   * 
   * @param tools 工具列表（用于 Token 计算）
   * @returns 压缩结果
   */
  async compact(tools?: any[]): Promise<CompactionResult> {
    const threshold =
      (this.config.maxTokens! - this.config.maxOutputTokens!) * 0.9;

    const result = await this.compactionStrategy.compact({
      messages: this.messages,
      tools,
      threshold,
    });

    // 更新内存缓存
    if (result.isCompacted) {
      this.messages = result.messages;
      await this.repository.setAll(this.messages);
    }

    this.lastCompactionResult = result;
    return result;
  }

  /**
   * 获取上次压缩结果
   */
  getLastCompactionResult(): CompactionResult | null {
    return this.lastCompactionResult;
  }

  // ---------------------------------------------------------------------------
  // 统计信息
  // ---------------------------------------------------------------------------

  /**
   * 获取会话统计信息
   */
  getStats(tools?: any[]): SessionStats {
    const totalTokens = this.compactionStrategy.calculateTokens(
      this.messages,
      tools
    );

    return {
      messageCount: this.messages.length,
      totalTokens,
      isCompacted: this.lastCompactionResult?.isCompacted ?? false,
      lastCompactionAt: this.lastCompactionResult
        ? Date.now()
        : undefined,
    };
  }

  /**
   * 计算 Token 使用量
   */
  calculateTokens(tools?: any[]): number {
    return this.compactionStrategy.calculateTokens(this.messages, tools);
  }
}
