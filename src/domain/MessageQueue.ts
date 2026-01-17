/**
 * MessageQueue - 消息队列
 * 负责管理内存中的消息队列
 */
import { Message } from "../providers/base";

export class MessageQueue {
    private messages: Message[] = [];

    /**
     * 添加消息到队列
     */
    add(msg: Message): void {
        this.messages.push(msg);
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
     * 清空队列
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
}
