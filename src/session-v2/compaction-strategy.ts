/**
 * 智能压缩策略实现
 * 
 * 采用两阶段压缩算法：
 * 1. 分区阶段：将消息分为保护区（保留）和压缩区（摘要）
 * 2. 摘要阶段：使用 LLM 生成压缩区消息的摘要
 * 
 * 关键优化：
 * - 保持 Assistant-Tool 关系完整性
 * - 工具调用链不跨区断裂
 * - 性能优化：使用 Map 减少 O(n²) 查找
 */

import type { Message } from '../agent/message';
import { uuid } from 'uuidv4';
import { ScopedLogger } from '../util/log';
import type {
  ICompactionStrategy,
  CompactionStrategyConfig,
  CompactionContext,
  CompactionResult,
  MessagePartition,
  MessageGroup,
} from './types';

export { type CompactionStrategyConfig };

/**
 * 智能压缩策略
 */
export class SmartCompactionStrategy implements ICompactionStrategy {
  private config: CompactionStrategyConfig;
  private logger: ScopedLogger;

  constructor(config: CompactionStrategyConfig) {
    this.config = {
      ...config,
      keepMessagesNum: config.keepMessagesNum ?? 40,
      triggerRatio: config.triggerRatio ?? 0.90,
    };
    this.logger = new ScopedLogger('Compaction');
  }

  /**
   * 估算 Token 数量
   * 简单估算：字符数 / 4 + 每条消息基础开销
   */
  calculateTokens(messages: Message[], tools?: any[]): number {
    const allContent = [...messages];
    if (tools?.length) {
      allContent.push(...tools);
    }

    return allContent.reduce((acc, msg) => {
      const text = JSON.stringify(msg);
      // 基础开销 4 tokens (role, formatting)
      return acc + Math.ceil(text.length / 4) + 4;
    }, 0);
  }

  /**
   * 检查是否需要压缩
   */
  shouldCompact(context: CompactionContext): boolean {
    const { messages, tools } = context;
    const usableLimit = this.config.maxTokens - this.config.maxOutputTokens;
    const threshold = usableLimit * this.config.triggerRatio;
    
    const totalUsed = this.calculateTokens(messages, tools);
    
    // 只有消息数量超过保留数量且达到 Token 阈值时才压缩
    return messages.length > this.config.keepMessagesNum && totalUsed >= threshold;
  }

  /**
   * 执行压缩
   */
  async compact(context: CompactionContext): Promise<CompactionResult> {
    const { messages, tools } = context;
    const tokensBefore = this.calculateTokens(messages, tools);

    // 1. 检查是否需要压缩
    if (!this.shouldCompact(context)) {
      return {
        isCompacted: false,
        summaryMessage: null,
        messages: messages.filter(m => m.role !== 'system'),
        tokensBefore,
      };
    }

    this.logger.info(`[Compaction] 触发压缩。当前 Token: ${tokensBefore}`);

    // 2. 分区：区分保护区（保留）和压缩区（摘要）
    const partition = this.partitionMessages(messages);

    // 3. 生成摘要
    const summaryMessage = await this.generateSummary(partition);

    // 4. 重组消息列表
    const compactedMessages = this.rebuildMessages(summaryMessage, partition.protected);
    
    const tokensAfter = this.calculateTokens(compactedMessages, tools);

    this.logger.info(
      `[Compaction] 压缩完成。Token: ${tokensBefore} → ${tokensAfter} ` +
      `(减少 ${Math.round((1 - tokensAfter / tokensBefore) * 100)}%)`
    );

    return {
      isCompacted: true,
      summaryMessage,
      messages: compactedMessages,
      tokensBefore,
      tokensAfter,
    };
  }

  // ---------------------------------------------------------------------------
  // 私有方法：分区算法
  // ---------------------------------------------------------------------------

  /**
   * 消息分区算法
   * 
   * 策略：
   * 1. 最近 N 条消息作为保护区
   * 2. 保护区内有关联的 Assistant-Tool 对完整性检查
   * 3. 如果工具调用的结果在保护区，对应的 Assistant 也移入保护区
   */
  private partitionMessages(messages: Message[]): MessagePartition {
    const { keepMessagesNum } = this.config;
    
    // 过滤掉系统消息
    const userMessages = messages.filter(m => m.role !== 'system');
    
    // 基础分区
    let protected_ = userMessages.slice(-keepMessagesNum);
    let compressible = userMessages.slice(0, -keepMessagesNum);

    // 如果没有可压缩的消息，全部作为保护区
    if (compressible.length === 0) {
      return { protected: protected_, compressible: [] };
    }

    // 提取之前的摘要（如果存在）
    let summary: Message | undefined;
    if (compressible.length > 0 && compressible[0].type === 'summary') {
      summary = compressible[0];
      compressible = compressible.slice(1);
    }

    // 完整性检查：确保保护区内 Tool 消息的 Assistant 也在保护区
    const groupsToMove = this.findIncompleteGroups(protected_, compressible);
    
    if (groupsToMove.length > 0) {
      // 将不完整的 Assistant-Tool 组从压缩区移到保护区
      const movedIndices = new Set<number>();
      
      for (const group of groupsToMove) {
        // 从压缩区移除
        const indexInCompressible = compressible.findIndex(
          m => m.messageId === group.assistant.messageId
        );
        if (indexInCompressible >= 0) {
          movedIndices.add(indexInCompressible);
        }
        
        // 添加到保护区（按原始顺序）
        protected_ = [
          ...protected_.slice(0, group.startIndex),
          group.assistant,
          ...group.tools,
          ...protected_.slice(group.startIndex),
        ];
      }

      // 从压缩区删除已移动的消息
      compressible = compressible.filter((_, idx) => !movedIndices.has(idx));
      
      // 同时移除已移动的 tool 消息
      const toolIds = new Set(
        groupsToMove.flatMap(g => g.tools.map(t => t.messageId))
      );
      compressible = compressible.filter(m => !toolIds.has(m.messageId || ''));
    }

    // 限制保护区大小（防止过度膨胀）
    const MAX_PROTECTED_SIZE = keepMessagesNum * 2;
    if (protected_.length > MAX_PROTECTED_SIZE) {
      this.logger.warn(
        `[Compaction] 保护区膨胀: ${protected_.length} > ${MAX_PROTECTED_SIZE}，执行裁剪`
      );
      
      const overflow = protected_.length - MAX_PROTECTED_SIZE;
      const movedBack = protected_.slice(0, overflow);
      protected_ = protected_.slice(overflow);
      compressible = [...movedBack, ...compressible];
    }

    return {
      protected: protected_,
      compressible,
      summary,
    };
  }

  /**
   * 查找需要移动到保护区的不完整 Assistant-Tool 组
   * 
   * 场景：保护区内有 Tool 消息，但对应的 Assistant 在压缩区
   */
  private findIncompleteGroups(
    protected_: Message[],
    compressible: Message[]
  ): MessageGroup[] {
    
    const groups: MessageGroup[] = [];
    
    // 构建压缩区的 Assistant 索引
    const compressibleAssistants = new Map<string, Message>();
    compressible.forEach((msg, idx) => {
      if (msg.role === 'assistant' && msg.tool_calls?.length) {
        msg.tool_calls.forEach(call => {
          if (call.id) {
            compressibleAssistants.set(call.id, msg);
          }
        });
      }
    });

    // 检查保护区内的 Tool 消息
    const toolMessages = protected_.filter(m => m.role === 'tool' && m.tool_call_id);
    
    for (const toolMsg of toolMessages) {
      const assistant = compressibleAssistants.get(toolMsg.tool_call_id!);
      if (assistant) {
        // 找到对应的 Assistant，收集其所有 Tools
        const existingGroup = groups.find(g => g.assistant.messageId === assistant.messageId);
        if (!existingGroup) {
          groups.push({
            assistant,
            tools: [toolMsg],
            startIndex: 0, // 稍后计算
          });
        } else {
          existingGroup.tools.push(toolMsg);
        }
      }
    }

    return groups;
  }

  // ---------------------------------------------------------------------------
  // 私有方法：摘要生成
  // ---------------------------------------------------------------------------

  /**
   * 生成摘要
   */
  private async generateSummary(partition: MessagePartition): Promise<Message> {
    const { compressible, summary: previousSummary } = partition;

    if (compressible.length === 0) {
      return previousSummary || this.createEmptySummary();
    }

    // 序列化待压缩的消息
    const textToSummarize = compressible
      .map(m => {
        const prefix = m.type ? `[${m.role}:${m.type}]` : `[${m.role}]`;
        // 截断过长的内容
        const content = m.content.length > 2000
          ? m.content.slice(0, 1000) + '...(省略)...'
          : m.content;
        return `${prefix}: ${content}`;
      })
      .join('\n');

    // 调用 LLM 生成摘要
    const summaryContent = await this.callSummarizer(
      textToSummarize,
      previousSummary?.content as string
    );

    return {
      messageId: uuid(),
      role: 'assistant',
      type: 'summary',
      content: summaryContent,
    };
  }

  /**
   * 调用 LLM 生成摘要
   */
  private async callSummarizer(
    textToSummarize: string,
    previousSummary?: string
  ): Promise<string> {
    const spinner = this.logger.spinner('上下文压缩...');

    try {
      const response = await this.config.llmProvider.generate(
        [
          {
            role: 'user',
            content: this.buildSummarizerPrompt(textToSummarize, previousSummary),
          },
        ],
        {
          maxOutputTokens: 8000,
          temperature: 0.3,
        }
      );

      spinner.succeed('上下文压缩成功');
      return response?.content || '';
    } catch (error) {
      spinner.fail('上下文压缩失败');
      // 失败时返回简单摘要
      return `[摘要生成失败] 原始消息数: ${textToSummarize.split('\n').length}`;
    }
  }

  /**
   * 构建摘要提示词
   */
  private buildSummarizerPrompt(text: string, previousSummary?: string): string {
    return `You are an expert conversation compressor. Compress conversation history into a structured summary organized in 8 sections:

1. **Primary Request and Intent**: What is user's core goal?
2. **Key Technical Concepts**: Frameworks, libraries, tech stacks involved
3. **Files and Code Sections**: All file paths mentioned or modified
4. **Errors and Fixes**: Error messages and their solutions
5. **Problem Solving**: Thought process and decision path
6. **All User Messages**: Key instructions and feedback from user
7. **Pending Tasks**: Unfinished work items
8. **Current Work**: Progress at interruption point

${previousSummary ? `<previous_summary>\n${previousSummary}\n</previous_summary>\n` : ''}

<current_message_history>
${text}
</current_message_history>

Requirements:
- Maintain high density and accuracy of information
- Highlight key technical decisions and solutions
- Ensure continuity of context
- Retain all important file paths
- Use concise English expression`;
  }

  /**
   * 创建空摘要
   */
  private createEmptySummary(): Message {
    return {
      messageId: uuid(),
      role: 'assistant',
      type: 'summary',
      content: '[会话开始]',
    };
  }

  // ---------------------------------------------------------------------------
  // 私有方法：消息重组
  // ---------------------------------------------------------------------------

  /**
   * 重组消息列表
   * 结构: [Summary, ...ProtectedMessages, UserConfirmMessage]
   */
  private rebuildMessages(summary: Message, protected_: Message[]): Message[] {
    const confirmMessage: Message = {
      messageId: uuid(),
      role: 'user',
      type: 'text',
      content: 'Confirm task completion. If the task is not finished, define next actions and continue execution until all user requirements are satisfied.',
    };

    return [summary, ...protected_, confirmMessage];
  }
}
