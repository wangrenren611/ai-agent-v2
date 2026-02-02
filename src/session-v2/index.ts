/**
 * Session V2 - 重构后的会话管理模块
 * 
 * 导出内容：
 * - SessionManager: 会话管理器
 * - 仓储实现: FileSystemMessageRepository
 * - 压缩策略: SmartCompactionStrategy
 * - 类型定义
 */

// 核心类
export { SessionManager } from './SessionManager';

// 仓储实现
export { FileSystemMessageRepository } from './repository';

// 压缩策略
export { SmartCompactionStrategy } from './compaction-strategy';

// 类型定义
export type {
  IMessageRepository,
  ICompactionStrategy,
  CompactionStrategyConfig,
  CompactionContext,
  CompactionResult,
  SessionManagerConfig,
  SessionStats,
  AddMessageOptions,
  MessagePartition,
  MessageGroup,
} from './types';
