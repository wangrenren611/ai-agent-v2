import { Message } from "../providers/base";
import { OpenAIProvider } from "../providers/openai";
import { ScopedLogger } from "../util/log";

export class Compaction {
  private readonly maxTokens: number;
  private readonly maxOutputTokens: number;
  private readonly triggerRatio = 0.05; // 92% 触发压缩
  private readonly targetRatio = 0.75; // 压缩到 75% 停止

  // 经验系数：中文 1:1, 英文 4:1
  private readonly WEIGHT_ZH = 1.0;
  private readonly WEIGHT_EN = 0.25;
  loger: ScopedLogger;
  lastSummaryMessage: Message|null;

  constructor(config: { maxTokens: number; maxOutputTokens: number }) {
    this.maxTokens = config.maxTokens;
    this.maxOutputTokens = config.maxOutputTokens;
    this.loger = new ScopedLogger("Compaction");
    this.lastSummaryMessage=null
  }

  /**
   * 核心入口：检查并执行压缩
   * @param history 原始历史记录
   * @param summarizer 外部注入的 LLM 摘要执行器
   */
  async compact(history: Message[]): Promise<Message[]> {
    const totalUsed = this.calculateTotalUsage(history);
    const usableLimit = this.maxTokens - this.maxOutputTokens;
    console.log(
      "usableLimit",
      `${totalUsed / 1000}/${(usableLimit * this.triggerRatio) / 1000}`,
    );

    // 如果没达到 92% 的阈值，直接返回原数据
    if (totalUsed < usableLimit * this.triggerRatio) {
      return history;
    }
  
    console.log(
      `[Compaction] 触发压缩。当前 Token: ${totalUsed}, 阈值: ${Math.floor(usableLimit * this.triggerRatio)}`,
    );

    // 1. 分离不可压缩的 System Message
    const systemMessages = history.filter((m) => m.role === "system"&&m.type!=='summary');

    // 2. 确定保护区（最近的对话不参与摘要，保证当前逻辑连贯）
    // 对于编程 Agent，建议保留最近 12 条消息（包含约 3-6 次工具交互）
    const KEEP_RECENT_COUNT = 2;
    const otherMessages = history.filter((m) => !systemMessages.includes(m));

    if (otherMessages.length <= KEEP_RECENT_COUNT) return history;

    const activeMessages = otherMessages.slice(-KEEP_RECENT_COUNT); // 保护区
    let pendingMessages = otherMessages.slice(0, -KEEP_RECENT_COUNT); // 待压缩区

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

      this.lastSummaryMessage = {
        role: "system",
        type: "summary",
        content: `[Historical Memory Snapshot]:\n${newSummaryContent}`,
      };
     
      // 6. 重组历史
      const newHistory = [...systemMessages,this.lastSummaryMessage, ...activeMessages];

      // 7. 递归检查：如果压缩后还是超标（极端情况），继续压缩
      if (
        this.calculateTotalUsage(newHistory) >
        usableLimit * this.targetRatio
      ) {
        // 如果单条摘要+保护区还是太大，可以考虑减少保护区数量
        return newHistory.slice(-KEEP_RECENT_COUNT);
      }

      return newHistory;
    } catch (error) {
      console.error("[Compaction] 摘要生成失败:", error);
      return history; // 失败则降级返回原样，避免丢失数据
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
    const llmProvider = new OpenAIProvider({
      baseURL: process.env.DEEPSEEK_BASE_URL,
      apiKey: process.env.DEEPSEEK_API_KEY as string,
      model: "deepseek-chat",
    });

    const spinner = this.loger.spinner("上下文压缩...");

    try {
      const llmResponse = await llmProvider.generate(
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
      return llmResponse?.content||'';
    } catch (error: any) {
      this.loger.error(error.toString());

      spinner.fail("上下文压缩失败");
    }
  }
}
