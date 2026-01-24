import { Message, LLMProvider } from "../providers/base";
import { ScopedLogger } from "../util/log";

export class Compaction {
  private readonly maxTokens: number;
  private readonly maxOutputTokens: number;
  private readonly triggerRatio = 0.10; // 92% 触发压缩

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
    console.log(totalUsed)
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
   * 性能优化：构建消息列表中 tool 消息的索引映射
   * 时间复杂度：O(m)，其中 m 是 messages 的长度
   * @returns Map<tool_call_id, message>
   */
  private buildToolMessageMap(messages: Message[]): Map<string, Message> {
    const map = new Map<string, Message>();

    for (const msg of messages) {
      if (msg.role === 'tool' && msg.tool_call_id) {
        map.set(msg.tool_call_id, msg);
      }
    }

    return map;
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

    // 限制保护区的最大膨胀倍数（防止从 6 条膨胀到 100+ 条）
    const MAX_ACTIVE_SIZE = KEEP_RECENT_COUNT * 2;

    // 检查保护区的所有 tool 消息，确保它们的配对 assistant 以及所有相关的 tool 回复都被保留
    // 需要处理多个 assistant 的情况（连续多次工具调用）

    // 性能优化：一次性构建所有索引，避免 O(n²) 的多次查找
    // 时间复杂度：O(n + m + k)，其中 n=history长度，m=pending长度，k=active长度
    const toolCallToAssistantIndex = this.buildToolCallToAssistantIndex(history);
    const pendingToolMap = this.buildToolMessageMap(pendingMessages);
    const activeToolMap = this.buildToolMessageMap(activeMessages);

    const toolMessagesInActive = activeMessages.filter(m =>
      m.role === 'tool' && m.tool_call_id  // 过滤掉无效的 tool_call_id
    );

    if (toolMessagesInActive.length > 0) {
      // 收集所有需要保留的 assistant 消息和需要重新排序的 tool 回复
      const assistantsToKeep: Map<string, { message: Message; index: number }> = new Map();
      const toolsToKeep: Message[] = [];
      // 跟踪从 pendingMessages 移到 toolsToKeep 的 tool_call_id
      const movedToolCallIds = new Set<string>();
      // 使用已处理的 assistant 索引集合，避免重复处理
      const processedAssistants = new Set<number>();

      // 为每个 tool 消息查找其配对的 assistant（使用 O(1) 索引查找）
      for (const toolMessage of toolMessagesInActive) {
        const toolCallId = toolMessage.tool_call_id;
        if (!toolCallId) continue;

        // O(1) 查找：使用预构建的索引
        const assistantIndex = toolCallToAssistantIndex.get(toolCallId);

        if (assistantIndex === undefined) {
          continue; // 没有找到配对的 assistant
        }

        // 跳过已处理的 assistant
        if (processedAssistants.has(assistantIndex)) {
          continue;
        }

        // assistant 可能在 pendingMessages 中，也可能在 activeMessages 中
        const assistantInPending = assistantIndex < pendingMessages.length;

        // 无论 assistant 在哪里，都从 history 中获取
        const assistantMessage = history[assistantIndex];

        if (!assistantMessage || !assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
          continue;
        }

        const assistantKey = assistantIndex.toString();
        processedAssistants.add(assistantIndex);

        // 检查这个 assistant 有多少个 tool_calls
        const toolCalls = assistantMessage.tool_calls?.filter(call => call.id) || [];
        const toolCallCount = toolCalls.length;

        // 性能优化：使用 Set 和预构建的 Map，避免嵌套循环 O(n*m)
        const matchedToolCallIds = new Set<string>();
        for (const call of toolCalls) {
          if (activeToolMap.has(call.id)) {
            matchedToolCallIds.add(call.id);
          }
        }

        this.logger.info(
          `[Compaction] 检测到 assistant（索引 ${assistantIndex}）有 ${toolCallCount} 个 tool_calls，` +
          `但只有 ${matchedToolCallIds.size} 个 tool 回复在保护区内`
        );

        // 场景1：有缺失的 tool 回复（在 pendingMessages 中）
        if (toolCallCount > matchedToolCallIds.size) {
          // 按 tool_calls 的原始顺序从 pendingMessages 中添加 tool 回复
          for (const toolCall of toolCalls) {
            // 只添加缺失的（不在 active 中的）
            if (!matchedToolCallIds.has(toolCall.id)) {
              // O(1) 查找：使用预构建的 Map
              const toolMessage = pendingToolMap.get(toolCall.id);
              if (toolMessage) {
                toolsToKeep.push(toolMessage);
                // 跟踪已移动的 tool_call_id，稍后从 pendingMessages 中过滤
                movedToolCallIds.add(toolCall.id);
              }
            }
          }

          this.logger.info(
            `[Compaction] 已为 assistant（索引 ${assistantIndex}）找回 ${toolCallCount - matchedToolCallIds.size} 个缺失的 tool 回复`
          );

          // 如果 assistant 在 pendingMessages 中，标记需要保留
          if (assistantInPending) {
            assistantsToKeep.set(assistantKey, {
              message: assistantMessage,
              index: assistantIndex,
            });
          }
        } else {
          // 场景2：所有 tool 回复都在 activeMessages 中，但顺序可能不对
          // 同时，assistant 本身也在 activeMessages 中，需要一起处理

          // 按 tool_calls 的顺序从 activeMessages 中提取 tool 回复
          for (const toolCall of toolCalls) {
            // O(1) 查找：使用预构建的 Map
            const toolReply = activeToolMap.get(toolCall.id);
            if (toolReply) {
              toolsToKeep.push(toolReply);
            }
          }

          // 从 activeMessages 中移除这些 tool 回复和 assistant 本身
          // 因为后面会把 assistant 和 tool 回复重新添加到前面
          const toolCallIds = toolCalls.map(c => c.id);
          activeMessages = activeMessages.filter(m => {
            // 移除这个 assistant
            if (m === assistantMessage) return false;
            // 移除这些 tool 回复
            if (m.role === 'tool' && toolCallIds.includes(m.tool_call_id || '')) return false;
            return true;
          });

          this.logger.info(
            `[Compaction] 已为 assistant（索引 ${assistantIndex}）重新排序 ${toolsToKeep.length} 个 tool 回复`
          );
        }

        // 标记这个 assistant 需要保留（无论在 pendingMessages 还是 activeMessages 中）
        assistantsToKeep.set(assistantKey, {
          message: assistantMessage,
          index: assistantIndex,
        });
      }

      // 将需要保留的 assistant 和 tool 回复按正确顺序加入保护区
      if (assistantsToKeep.size > 0 || toolsToKeep.length > 0) {
        // 按索引排序 assistants（保持原始顺序）
        const sortedAssistants = Array.from(assistantsToKeep.values())
          .sort((a, b) => a.index - b.index)
          .map(item => item.message);

        // 从 pendingMessages 中移除这些 assistants（如果它们在 pendingMessages 中）
        // 同时移除已移动到 toolsToKeep 的 tool 消息
        const indicesToRemove = Array.from(assistantsToKeep.values())
          .filter(item => item.index < pendingMessages.length)
          .map(item => item.index);

        if (indicesToRemove.length > 0 || movedToolCallIds.size > 0) {
          pendingMessages = pendingMessages.filter((msg, i) => {
            // 移除 assistant 消息
            if (indicesToRemove.includes(i)) return false;
            // 移除已移动的 tool 消息
            if (msg.role === 'tool' && msg.tool_call_id && movedToolCallIds.has(msg.tool_call_id)) return false;
            return true;
          });
        }

        // 构建新的 activeMessages：[assistants, tools, 原activeMessages]
        // toolsToKeep 已经按 tool_calls 的顺序排列
        let newActiveMessages: Message[] = [
          ...sortedAssistants,
          ...toolsToKeep,
          ...activeMessages,
        ];

        // 检查是否超过最大限制
        if (newActiveMessages.length > MAX_ACTIVE_SIZE) {
          this.logger.warn(
            `[Compaction] 保护区膨胀：从 ${KEEP_RECENT_COUNT} 条增长到 ${newActiveMessages.length} 条` +
            `(超过最大限制 ${MAX_ACTIVE_SIZE})，将进行裁剪`
          );

          // 裁剪：保留前面的 assistants 和 tools，裁剪后面的原始 activeMessages
          const overflow = newActiveMessages.length - MAX_ACTIVE_SIZE;
          if (overflow > 0 && sortedAssistants.length + toolsToKeep.length < MAX_ACTIVE_SIZE) {
            // 可以安全地裁剪后面的消息
            newActiveMessages = newActiveMessages.slice(0, MAX_ACTIVE_SIZE);
          }
        }

        activeMessages = newActiveMessages;
        this.logger.info(
          `[Compaction] 已将 ${sortedAssistants.length} 个 assistant 和 ${toolsToKeep.length} 个 tool 回复移到保护区` +
          `（保护区大小：${activeMessages.length}）`
        );
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
      return acc + this.estimate(JSON.stringify(m)) + 4;
    }, 0);
  }

  /**
   * 估算单段文本的 Token
   */
  private estimate(text: string): number {
    if (!text) return 0;
    return Math.ceil(
      text.length/4,
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
          model: process.env.AI_MODEL,
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
