/**
 * Session V2 类型定义
 * 
 * 定义会话管理、消息存储和上下文压缩的核心接口
 */

import type { Message } from '../agent/message';
import type { LLMProvider } from '../providers/providers/base';

// =============================================================================
// 仓储接口
// =============================================================================

/**
 * 消息仓储接口
 * 抽象消息持久化层，支持不同的存储后端
 */
export interface IMessageRepository {
  /** 初始化仓储 */
  init(): Promise<void>;
  
  /** 获取所有消息 */
  getAll(): Promise<Message[]>;
  
  /** 保存单条消息 */
  save(message: Message): Promise<void>;
  
  /** 批量保存消息 */
  saveBatch(messages: Message[]): Promise<void>;
  
  /** 设置所有消息（替换） */
  setAll(messages: Message[]): Promise<void>;
  
  /** 清空所有消息 */
  clear(): Promise<void>;
}

/**
 * 会话元数据
 */
export interface SessionMetadata {
  id: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  totalTokens: number;
}

// =============================================================================
// 压缩策略接口
// =============================================================================

/**
 * 压缩策略配置
 */
export interface CompactionStrategyConfig {
  maxTokens: number;
  maxOutputTokens: number;
  keepMessagesNum: number;
  triggerRatio: number;
  llmProvider: LLMProvider;
}

/**
 * 压缩上下文
 */
export interface CompactionContext {
  messages: Message[];
  tools?: any[];
  threshold: number;
}

/**
 * 压缩结果
 */
export interface CompactionResult {
  /** 是否执行了压缩 */
  isCompacted: boolean;
  
  /** 摘要消息（如果有） */
  summaryMessage: Message | null;
  
  /** 压缩后的消息列表 */
  messages: Message[];
  
  /** 压缩前的 Token 数 */
  tokensBefore?: number;
  
  /** 压缩后的 Token 数 */
  tokensAfter?: number;
}

/**
 * 压缩策略接口
 * 策略模式：允许不同的压缩算法实现
 */
export interface ICompactionStrategy {
  /** 
   * 计算 Token 使用量
   */
  calculateTokens(messages: Message[], tools?: any[]): number;
  
  /**
   * 执行压缩
   */
  compact(context: CompactionContext): Promise<CompactionResult>;
  
  /**
   * 检查是否需要压缩
   */
  shouldCompact(context: CompactionContext): boolean;
}

// =============================================================================
// 会话管理接口
// =============================================================================

/**
 * 会话管理器配置
 */
export interface SessionManagerConfig {
  sessionId: string;
  sessionDir?: string;
  llmProvider: LLMProvider;
  repository?: IMessageRepository;
  compactionStrategy?: ICompactionStrategy;
  maxTokens?: number;
  maxOutputTokens?: number;
}

/**
 * 会话统计信息
 */
export interface SessionStats {
  messageCount: number;
  totalTokens: number;
  isCompacted: boolean;
  lastCompactionAt?: number;
}

/**
 * 添加消息选项
 */
export interface AddMessageOptions {
  /** 是否立即触发压缩检查 */
  checkCompaction?: boolean;
  
  /** 是否持久化 */
  persist?: boolean;
}

// =============================================================================
// 压缩相关类型
// =============================================================================

/**
 * 消息分区结果
 */
export interface MessagePartition {
  /** 保护区（保留的最近消息） */
  protected: Message[];
  
  /** 待压缩区（需要摘要的消息） */
  compressible: Message[];
  
  /** 摘要消息（如果存在） */
  summary?: Message;
}

/**
 * 工具调用关系
 */
export interface ToolCallRelation {
  assistantIndex: number;
  toolCallId: string;
  toolMessage?: Message;
}

/**
 * 消息组（Assistant + 其 Tool Calls）
 */
export interface MessageGroup {
  assistant: Message;
  tools: Message[];
  startIndex: number;
}
