/**
 * ShortTermStore - 短期存储层
 * 管理压缩后的摘要，用于构建 LLM 上下文
 */
import { Message } from "../providers/base";

const MAX_SUMMARIES = 5; // 最多保留 5 个摘要

export interface SummaryMetadata {
    createdAt: Date;
    messageCount: number;
    tokenCount: number;
}

export class ShortTermStore {
    private summaries: Map<string, { message: Message; metadata: SummaryMetadata }>;
    private readonly maxSummaries: number;

    constructor(maxSummaries: number = MAX_SUMMARIES) {
        this.summaries = new Map();
        this.maxSummaries = maxSummaries;
    }

    /**
     * 添加摘要到短期存储
     * @param summaryId 摘要 ID
     * @param message 摘要消息
     * @param metadata 摘要元数据
     */
    addSummary(summaryId: string, message: Message, metadata: SummaryMetadata): void {
        // 如果超出最大数量，移除最旧的摘要
        if (this.summaries.size >= this.maxSummaries) {
            const oldestKey = this.summaries.keys().next().value;
            if (oldestKey !== undefined) {
                this.summaries.delete(oldestKey);
            }
        }

        this.summaries.set(summaryId, { message, metadata });
    }

    /**
     * 获取所有摘要消息
     */
    getAllSummaries(): Message[] {
        return Array.from(this.summaries.values()).map(item => item.message);
    }

    /**
     * 获取所有摘要及其元数据
     */
    getAllSummariesWithMetadata(): Array<{ message: Message; metadata: SummaryMetadata }> {
        return Array.from(this.summaries.values());
    }

    /**
     * 获取指定摘要
     */
    getSummary(summaryId: string): Message | undefined {
        const item = this.summaries.get(summaryId);
        return item?.message;
    }

    /**
     * 删除指定摘要
     */
    removeSummary(summaryId: string): boolean {
        return this.summaries.delete(summaryId);
    }

    /**
     * 清空所有摘要
     */
    clear(): void {
        this.summaries.clear();
    }

    /**
     * 获取摘要数量
     */
    size(): number {
        return this.summaries.size;
    }

    /**
     * 设置摘要列表（用于会话恢复）
     */
    setSummaries(summaries: Array<{ message: Message; metadata: SummaryMetadata }>): void {
        this.summaries.clear();

        // 如果超出最大数量，只保留最新的
        const toKeep = summaries.slice(-this.maxSummaries);
        for (let i = 0; i < toKeep.length; i++) {
            const item = toKeep[i];
            const summaryId = `summary_${i}`;
            this.summaries.set(summaryId, item);
        }
    }

    /**
     * 获取总 token 数量
     */
    calculateTotalTokenCount(): number {
        return Array.from(this.summaries.values()).reduce((acc, item) => {
            return acc + item.metadata.tokenCount;
        }, 0);
    }
}
