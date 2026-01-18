import { Message, LLMProvider } from "../providers/base";
import { ScopedLogger } from "../util/log";

export class Compaction {
  private readonly maxTokens: number;
  private readonly maxOutputTokens: number;
  private readonly triggerRatio = 0.90; // 92% 触发压缩
  private readonly targetRatio = 0.75; // 压缩到 75% 停止

  // 经验系数：中文 1:1, 英文 4:1
  private readonly WEIGHT_ZH = 1.0;
  private readonly WEIGHT_EN = 0.25;
  logger: ScopedLogger;
  lastSummaryMessage: Message | null;
  private readonly llmProvider: LLMProvider;

  constructor(config: { maxTokens: number; maxOutputTokens: number; llmProvider: LLMProvider }) {
    this.maxTokens = config.maxTokens;
    this.maxOutputTokens = config.maxOutputTokens;
    this.llmProvider = config.llmProvider;
    this.logger = new ScopedLogger("Compaction");
    this.lastSummaryMessage = null;

  }

   getToken(history: Message[]){
    const totalUsed = this.calculateTotalUsage(history);
    const usableLimit = this.maxTokens - this.maxOutputTokens;

    return {
      totalUsed,
     usableLimit:usableLimit*this.triggerRatio
    }
  }

  /**
   * 核心入口：检查并执行压缩
   * @param history 原始历史记录
   * @param summarizer 外部注入的 LLM 摘要执行器
   */
  /**
   * 查找与 tool 消息配对的 assistant 消息索引
   * @param messages 完整消息列表
   * @param toolMessage tool 消息
   * @returns assistant 消息的索引，未找到返回 -1
   */
  private findMatchingAssistant(messages: Message[], toolMessage: Message): number {
    const toolCallId = toolMessage.tool_call_id;
    if (!toolCallId) return -1;

    const toolIndex = messages.indexOf(toolMessage);

    // 从 tool 消息的位置向前查找 assistant 消息
    for (let i = toolIndex - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'assistant' && msg.tool_calls) {
        const hasMatchingCall = msg.tool_calls.some(call => call.id === toolCallId);
        if (hasMatchingCall) return i;
      }
    }
    return -1;
  }

  async compact(history: Message[]): Promise<{
    isCompacted: boolean,
    summaryMessage: Message | null,
    list: Message[]
  }> {
    const totalUsed = this.calculateTotalUsage(history);
    const usableLimit = this.maxTokens - this.maxOutputTokens;
    const KEEP_RECENT_COUNT = 6;
    // 如果没达到 92% 的阈值，直接返回原数据
    if (totalUsed < usableLimit * this.triggerRatio || history.length <= KEEP_RECENT_COUNT) {
      return {
        isCompacted: false,
        summaryMessage: null,
        list: history
      };
    }



    this.logger.info(
      `[Compaction] 触发压缩。当前 Token: ${totalUsed}, 阈值: ${Math.floor(usableLimit * this.triggerRatio)}`
    );

    let activeMessages = history.slice(-KEEP_RECENT_COUNT); // 保护区
    let pendingMessages = history.slice(0, -KEEP_RECENT_COUNT); // 待压缩区

    // 检查保护区的第一条是否是 tool 消息，如果是则将其配对的 assistant 消息也保留
    if (activeMessages.length > 0 && activeMessages[0].role === 'tool') {
      const assistantIndex = this.findMatchingAssistant(history, activeMessages[0]);
      // assistantIndex 是在 history 中的索引，pendingMessages 是 history.slice(0, -KEEP_RECENT_COUNT)
      // 所以 assistantIndex 直接对应 pendingMessages 中的索引
      if (assistantIndex >= 0 && assistantIndex < pendingMessages.length) {
        // 将配对的 assistant 消息从待压缩区移到保护区
        const assistantMessage = pendingMessages[assistantIndex];
        pendingMessages = pendingMessages.filter((_, i) => i !== assistantIndex);
        activeMessages = [assistantMessage, ...activeMessages];
        this.logger.info(`[Compaction] 保护区首条是 tool 消息，已将其配对的 assistant 消息也保留在保护区`);
      }
    }

    // 3. 提取之前的摘要（如果存在）
    let previousSummary = "";
    if (pendingMessages.length > 0 && pendingMessages[0].type === "summary") {
      previousSummary = pendingMessages[0].content;
      pendingMessages = pendingMessages.slice(1);
    }

    // 4. 将待压缩的消息序列化为文本
    // 特别处理：将 tool 消息与其 result 格式化，方便 LLM 理解
    const textToSummarize = pendingMessages
      .map((m) => {
        const prefix = m.type ? `[${m.role}:${m.type}]` : `[${m.role}]`;
        // 如果内容过长（如巨大的代码输出），在摘要前进行初步截断
        const content =
          m.content.length > 2000
            ? m.content.slice(0, 1000) + "...(省略)..."
            : m.content;
        return `${prefix}: ${content}`;
      })
      .join("\n");

    // 5. 执行异步摘要
    try {
      const newSummaryContent = await this.summarizer(
        textToSummarize,
        previousSummary,
      );

      const summaryMessage: Message = {
        role: "system",
        type: "summary",
        content: `[Historical Memory Snapshot]:\n${newSummaryContent}`,
      };

      // 6. 重组历史
      const newHistory = [summaryMessage, ...activeMessages];

      // 7. 递归检查：如果压缩后还是超标（极端情况），继续压缩
      // if (
      //   this.calculateTotalUsage(newHistory) >
      //   usableLimit * this.targetRatio
      // ) {
      //   // 如果单条摘要+保护区还是太大，可以考虑减少保护区数量
      //   return newHistory.slice(-KEEP_RECENT_COUNT);
      // }

      return {
        isCompacted: true,
        summaryMessage,
        list: newHistory
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[Compaction] 摘要生成失败: ${errorMsg}`);
      return {
        isCompacted: true,
        summaryMessage: null,
        list: history.slice(0, history.length - KEEP_RECENT_COUNT)
      };
    }
  }

  /**
   * 计算整个对话数组的 Token 用量
   */
  public calculateTotalUsage(messages: Message[]): number {
    return messages.reduce((acc, m) => {
      // 每条消息基础开销 4 tokens (role, name, newline)
      return acc + this.estimate(m.content) + 4;
    }, 0);
  }

  /**
   * 估算单段文本的 Token
   */
  private estimate(text: string): number {
    if (!text) return 0;
    // 匹配 CJK 字符（中日韩）
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g)?.length || 0;
    const otherChars = text.length - chineseChars;
    return Math.ceil(
      chineseChars * this.WEIGHT_ZH + otherChars * this.WEIGHT_EN,
    );
  }

  async summarizer(textToSummarize: string, previousSummary?: string) {
    const spinner = this.logger.spinner("上下文压缩...");

    try {
      const llmResponse = await this.llmProvider.generate(
        [
          {
            role: "user",
            content: `You are an expert conversation compressor. Compress the conversation history into a structured summary organized in the following 8 sections:
1. **Primary Request and Intent**: What is the user's core goal?
2. **Key Technical Concepts**: Frameworks, libraries, tech stacks, etc., involved in the conversation.
3. **Files and Code Sections**: All file paths mentioned or modified.
4. **Errors and Fixes**: Record error messages encountered and their solutions.
5. **Problem Solving**: The thought process and decision path for solving the problem.
6. **All User Messages**: Preserve key instructions and feedback from the user.
7. **Pending Tasks**: Work items that remain unfinished.
8. **Current Work**: The progress at the point the conversation was interrupted.

<previous_summary>
 ${previousSummary}
</previous_summary>

<current_mesage_history>
${textToSummarize}
</current_mesage_history>

  ## Requirements:
- Maintain high density and accuracy of information
- Highlight key technical decisions and solutions
- Ensure continuity of context
- Retain all important file paths
- Use concise English expression`,
          },
        ],
        {
          model: "deepseek-chat",
          max_tokens: 8000,
          temperature: 0.3,
        },
      );
      spinner.succeed("上下文压缩成功");
      return llmResponse?.content || '';
    } catch (error: any) {
      this.logger.error(error.toString());

      spinner.fail("上下文压缩失败");
    }
  }
}
