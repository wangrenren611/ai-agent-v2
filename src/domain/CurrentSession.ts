/**
 * CurrentSession - 当前会话层
 * 管理用户可见的原始消息，压缩后移除已压缩的原始消息
 */
import { Message } from "../providers/base";

const MAX_MESSAGES = 100; // 内存中最大消息数量

export class CurrentSession {
    private messages: Message[] = [];
    private readonly maxMessages: number;

    constructor(maxMessages: number = MAX_MESSAGES) {
        this.maxMessages = maxMessages;
    }

    /**
     * 添加消息到当前会话
     * 只添加非 summary 类型的消息
     */
    add(message: Message): void {
        // 只存储非 summary 类型的消息
        if (message.type === 'summary') {
            return;
        }

        this.messages.push(message);

        // 如果超出最大数量，移除最旧的
        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }
    }

    /**
     * 获取所有消息（返回副本，防止外部修改）
     */
    getAll(): Message[] {
        return [...this.messages];
    }

    /**
     * 获取消息数量
     */
    size(): number {
        return this.messages.length;
    }

    /**
     * 清空会话
     */
    clear(): void {
        this.messages = [];
    }

    /**
     * 获取最近的 N 条消息
     */
    getRecent(count: number): Message[] {
        return this.messages.slice(-count);
    }

    /**
     * 压缩后保留最近 N 条消息，移除其他
     */
    keepRecent(count: number): void {
        this.messages = this.messages.slice(-count);
    }

    /**
     * 检查是否需要压缩
     * @param threshold 触发压缩的 token 阈值
     * @returns 是否需要压缩
     */
    needsCompaction(threshold: number): boolean {
        return this.calculateTokenCount() >= threshold;
    }

    /**
     * 计算当前会话的 token 数量
     * 使用简单的估算方法
     */
    calculateTokenCount(): number {
        return this.messages.reduce((acc, msg) => {
            return acc + this.estimate(msg.content) + 4; // 4 tokens 为消息基础开销
        }, 0);
    }

    /**
     * 估算文本的 token 数量
     * 经验系数：中文 1:1, 英文 4:1
     * 特殊处理：JSON、代码、数字等会消耗更多 token
     */
    private estimate(text: string): number {
        if (!text) return 0;

        // 特殊内容类型检测
        const isJson = text.trim().startsWith('{') || text.trim().startsWith('[');
        const isCode = /```|function |const |let |var |class |import |export /i.test(text);

        // 基础计算
        const chineseChars = text.match(/[\u4e00-\u9fa5]/g)?.length || 0;
        const otherChars = text.length - chineseChars;
        let tokenCount = Math.ceil(chineseChars * 1.0 + otherChars * 0.25);

        // JSON 和代码有更多结构开销
        if (isJson || isCode) {
            tokenCount = Math.ceil(tokenCount * 1.3); // 增加 30% 开销
        }

        // 数字和特殊符号（JSON key、标点等）也占用 token
        const specialChars = text.match(/[\d\{\}\[\]:,\.\(\)]/g)?.length || 0;
        tokenCount += Math.ceil(specialChars * 0.5);

        return tokenCount;
    }

    /**
     * 设置消息列表（用于会话恢复）
     */
    setMessages(messages: Message[]): void {
        // 只设置非 summary 类型的消息
        this.messages = messages.filter(m => m.type !== 'summary');
    }
}
