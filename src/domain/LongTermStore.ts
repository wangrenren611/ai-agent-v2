/**
 * LongTermStore - 长期存储接口
 * 定义消息和会话持久化的契约
 */
import { Message } from "../providers/base";
import { Session } from "./session";

export interface ILongTermStore {
    /**
     * 保存单条消息
     */
    save(sessionId: string, userId: string, msg: Message): Promise<void>;

    /**
     * 批量保存消息
     */
    saveBatch(sessionId: string, userId: string, messages: Message[]): Promise<void>;

    /**
     * 加载完整历史记录（包含所有类型的消息）
     */
    loadFullHistory(sessionId: string): Promise<Message[]>;

    /**
     * 加载原始消息（不包含摘要）
     */
    loadOriginalMessages(sessionId: string): Promise<Message[]>;

    /**
     * 加载摘要消息
     */
    loadSummaries(sessionId: string): Promise<Message[]>;

    /**
     * 删除会话的所有消息
     */
    deleteBySession(sessionId: string): Promise<void>;

    /**
     * 保存会话
     */
    saveSession(session: Session): Promise<void>;

    /**
     * 根据 ID 加载会话
     */
    loadSession(sessionId: string): Promise<Session | null>;

    /**
     * 加载用户的所有会话
     */
    loadSessionsByUser(userId: string): Promise<Session[]>;

    /**
     * 删除会话
     */
    deleteSession(sessionId: string): Promise<void>;
}
