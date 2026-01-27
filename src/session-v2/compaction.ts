import { Message, LLMProvider } from '../providers/base.js';
import { ScopedLogger } from '../util/log.js';

export class Compaction {
  private readonly maxTokens: number;
  private readonly maxOutputTokens: number;
  private readonly triggerRatio = 0.90; // 92% 触发压缩
  private keepMessagesNum: number = 40;
  logger: ScopedLogger;
  llmProvider: LLMProvider;

  constructor(config: { maxTokens: number; maxOutputTokens: number; llmProvider: LLMProvider; keepMessagesNum?: number }) {
    this.maxTokens = config.maxTokens;
    this.maxOutputTokens = config.maxOutputTokens;
    this.logger = new ScopedLogger("Compaction");
    this.llmProvider = config.llmProvider;
    this.keepMessagesNum = config.keepMessagesNum || this.keepMessagesNum;
  }

  getToken(history: Message[],tools:any[]) {
    const totalUsed = this.calculateTotalUsage(history,tools);
    const usableLimit = this.maxTokens - this.maxOutputTokens;

    return {
      totalUsed,
      usableLimit: usableLimit * this.triggerRatio
    };
  }

  /**
   * 性能优化：构建 tool_call_id 到 assistant 索引的映射表
   * 时间复杂度：O(n)，其中 n 是 history 的长度
   * @returns Map<tool_call_id, assistant_index>
   */
  private buildToolCallToAssistantIndex(messages: Message[]): Map<string, number> {
    const index = new Map<string, number>();

    // 遍历所有消息，记录每个 tool_call_id 对应的 assistant 索引
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === 'assistant' && msg.tool_calls) {
        for (const call of msg.tool_calls) {
          if (call.id) {
            index.set(call.id, i);
          }
        }
      }
    }

    return index;
  }

  /**
   * 计算消息历史中所有消息的总 token 使用量
   * 时间复杂度：O(n)，其中 n 是 history 的长度
   */
  private calculateTotalUsage(messages: Message[],tools:any[]): number {
    // 使用更精确的 token 计算
    return messages.reduce((sum, msg) => {
      // 基础 token 开销（角色标记等）
      const baseTokens = 4;
      // 内容 token（使用字符数/4 作为粗略估计）
      const contentStr = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      const contentTokens = Math.ceil(contentStr.length / 4);
      // tool_calls 的 token 开销
      const toolTokens = msg.tool_calls
        ? msg.tool_calls.reduce((tSum, call) => {
            return tSum + Math.ceil(call.function.name.length / 4) + Math.ceil(call.function.arguments.length / 4);
          }, 0)
        : 0;
      return sum + baseTokens + contentTokens + toolTokens;
    }, 0)+JSON.stringify(tools).length/4;
  }

  /**
   * 检查是否需要压缩
   */
  shouldCompact(messages: Message[], tools: any[]): boolean {
    const { totalUsed, usableLimit } = this.getToken(messages, tools);
    const shouldCompact = totalUsed > usableLimit;

    if (shouldCompact) {
      this.logger.info(
        `[Compaction] 需要压缩: 使用量 ${Math.round(totalUsed)} > 阈值 ${Math.round(usableLimit)} (限制: ${this.maxTokens}, 保留: ${this.maxOutputTokens})`
      );
    }

    return shouldCompact;
  }

  /**
   * 异步摘要函数
   */
  private async summarizer(text: string, previousSummary: string): Promise<string> {
    const prompt = previousSummary
      ? `基于之前的摘要：\n${previousSummary}\n\n新的对话内容：\n${text}\n\n请更新摘要，保留关键信息：`
      : `请对以下对话进行简要摘要，保留关键信息：\n\n${text}`;

    const response = await this.llmProvider.generate(
      [{ role: "user", content: prompt }],
      { temperature: 0.3 }
    );

    return response?.content || "摘要生成失败";
  }

  /**
   * 执行压缩
   * 策略：
   * 1. 保留最近 keepMessagesNum 条消息作为"活跃区"
   * 2. 将活跃区之前的消息进行摘要
   * 3. 将摘要作为一条 assistant 消息插入到活跃区之前
   */
  async compact(history: Message[], tools: any[]): Promise<{
    isCompacted: boolean;
    summaryMessage?: Message;
    newHistory: Message[];
  }> {
    if (!this.shouldCompact(history, tools)) {
      return { isCompacted: false, newHistory: history };
    }

    // 1. 分离活跃区和待压缩区
    const activeMessages = history.slice(-this.keepMessagesNum);
    let pendingMessages = history.slice(0, -this.keepMessagesNum);

    // 2. 智能保护：确保待压缩区结尾的 tool/tool_call 对完整
    // 从后往前遍历待压缩区，找到第一个需要保护的 assistant
    const toolCallIndexMap = this.buildToolCallToAssistantIndex(pendingMessages);
    let protectCount = 0;

    for (let i = pendingMessages.length - 1; i >= 0; i--) {
      const msg = pendingMessages[i];

      if (msg.role === 'tool' && msg.tool_call_id) {
        // 找到这个 tool 对应的 assistant
        const assistantIndex = toolCallIndexMap.get(msg.tool_call_id);
        if (assistantIndex !== undefined && assistantIndex < pendingMessages.length) {
          // 需要保护从 assistantIndex 到当前位置的所有消息
          const messagesToProtect = pendingMessages.slice(assistantIndex);
          protectCount += messagesToProtect.length;
          activeMessages.unshift(...messagesToProtect);
          pendingMessages = pendingMessages.slice(0, assistantIndex);
          break; // 只处理最靠近活跃区的一对
        }
      }
    }

    if (protectCount > 0) {
      this.logger.info(`[Compaction] 智能保护: 将 ${protectCount} 条消息移到活跃区以保持 tool 调用完整性`);
    }

    // 额外保护：确保活跃区以 user 或 assistant 消息开始（不以 tool 开始）
    if (activeMessages.length > 0 && activeMessages[0].role === 'tool') {
      // 找到这个 tool 对应的 assistant
      const toolMsg = activeMessages[0];
      if (toolMsg.tool_call_id) {
        const assistantIndex = toolCallIndexMap.get(toolMsg.tool_call_id);
        if (assistantIndex !== undefined && assistantIndex < pendingMessages.length) {
          // 将对应的 assistant 移到活跃区开头
          const assistantMsg = pendingMessages[assistantIndex];
          pendingMessages = pendingMessages.filter((_, idx) => idx !== assistantIndex);
          activeMessages.unshift(assistantMsg);
          this.logger.info(`[Compaction] 额外保护: 将 assistant 消息移到活跃区开头`);
        }
      }
    }

    // 统计信息
    const totalTools = pendingMessages.filter(m => m.role === 'tool').length;
    const totalAssistants = pendingMessages.filter(m => m.role === 'assistant' && m.tool_calls).length;
    if (totalTools > 0 || totalAssistants > 0) {
      // 验证所有 tool 调用是否都有对应的 assistant
      const toolCallIds = new Set(pendingMessages.filter(m => m.role === 'tool').map(m => m.tool_call_id));
      const assistantCallIds = new Set(
        pendingMessages
          .filter(m => m.role === 'assistant' && m.tool_calls)
          .flatMap(m => m.tool_calls?.map(c => c.id) || [])
      );

      const orphanedTools = [...toolCallIds].filter((id): id is string => id !== undefined && !assistantCallIds.has(id));
      const orphanedAssistants = [...assistantCallIds].filter(id => !toolCallIds.has(id));

      if (orphanedTools.length > 0) {
        this.logger.warn(`[Compaction] 警告: 发现 ${orphanedTools.length} 个孤立的 tool 消息（无对应 assistant）`);
      }

      if (orphanedAssistants.length > 0) {
        this.logger.info(
          `[Compaction] 已将 ${totalAssistants} 个 assistant 和 ${totalTools} 个 tool 回复移到保护区` +
          `（保护区大小：${activeMessages.length}）`
        );
      }
    }

    // 3. 提取之前的摘要（如果存在）
    let previousSummary = "";
    if (pendingMessages.length > 0 && pendingMessages[0].type === "summary") {
      const summaryContent = pendingMessages[0].content;
      previousSummary = typeof summaryContent === 'string' ? summaryContent : JSON.stringify(summaryContent);
      pendingMessages = pendingMessages.slice(1);
    }

    // 4. 将待压缩的消息序列化为文本
    // 特别处理：将 tool 消息与其 result 格式化，方便 LLM 理解
    const textToSummarize = pendingMessages
      .map((m) => {
        const prefix = m.type ? `[${m.role}:${m.type}]` : `[${m.role}]`;
        // 如果内容过长（如巨大的代码输出），在摘要前进行初步截断
        const contentStr = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        const content =
          contentStr.length > 2000
            ? contentStr.slice(0, 1000) + "...(省略)..."
            : contentStr;
        return `${prefix}: ${content}`;
      })
      .join("\n");

    // 5. 执行异步摘要
    const newSummaryContent = await this.summarizer(
      textToSummarize,
      previousSummary,
    );

    const summaryMessage: Message = {
      role: "assistant",
      type: "summary",
      content: `${newSummaryContent}`,
    };

    // 6. 重组历史
    const newHistory = [summaryMessage, ...activeMessages, {
      role: "user" as const,
      type: "text" as const,
      content: "Confirm task completion. If the task is not finished, define the next actions and continue execution until all user requirements are satisfied.",
    }];

    return {
      isCompacted: true,
      summaryMessage,
      newHistory,
    };
  }
}
