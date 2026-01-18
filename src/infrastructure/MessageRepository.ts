/**
 * MessageRepository - 消息持久化仓储
 * 负责消息和会话的数据库操作
 */
import { Message } from "../providers/base";
import { MessageData } from "../storage/models/message";
import { SessionModel } from "../storage/models/session";
import { Session } from "../domain/session";
import { ScopedLogger } from "../util/log";
import { ILongTermStore } from "../domain/LongTermStore";

export class MessageRepository implements ILongTermStore {
    private logger: ScopedLogger;

    constructor() {
        this.logger = new ScopedLogger('MessageRepository');
    }

    /**
     * 保存单条消息
     */
    async save(sessionId: string, userId: string, msg: Message): Promise<void> {
        try {
            await MessageData.create({
                sessionId,
                userId,
                content: msg.role === 'tool' ? '' : (msg.content || ''),
                role: msg.role,
                type: msg.type || 'text',
                toolCallId: msg.tool_call_id,
                toolCalls: msg.tool_calls ? JSON.stringify(msg.tool_calls) : undefined,
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to save message: ${errorMsg}`);
            throw error;
        }
    }

    /**
     * 批量保存消息
     */
    async saveBatch(sessionId: string, userId: string, messages: Message[]): Promise<void> {
        try {
            const docs = messages.map(msg => ({
                sessionId,
                userId,
                content: msg.role === 'tool' ? '' : (msg.content || ''),
                role: msg.role,
                type: msg.type || 'text',
                toolCallId: msg.tool_call_id,
                toolCalls: msg.tool_calls ? JSON.stringify(msg.tool_calls) : undefined,
            }));
            await MessageData.insertMany(docs);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to save messages batch: ${errorMsg}`);
            throw error;
        }
    }

    /**
     * 根据会话 ID 查询消息
     */
    async findBySession(sessionId: string): Promise<Message[]> {
        try {
            const docs = await MessageData.find({ sessionId }).sort({ createdAt: 1 });
            return docs.map(doc => this.docToMessage(doc));
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to find messages: ${errorMsg}`);
            return [];
        }
    }

    /**
     * 删除会话的所有消息
     */
    async deleteBySession(sessionId: string): Promise<void> {
        try {
            await MessageData.deleteMany({ sessionId });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to delete messages: ${errorMsg}`);
            throw error;
        }
    }

    /**
     * 加载完整历史记录（包含所有类型的消息）
     * ILongTermStore 接口实现
     */
    async loadFullHistory(sessionId: string): Promise<Message[]> {
        return this.findBySession(sessionId);
    }

    /**
     * 加载原始消息（不包含摘要）
     * ILongTermStore 接口实现
     */
    async loadOriginalMessages(sessionId: string): Promise<Message[]> {
        try {
            const docs = await MessageData.find({
                sessionId,
                type: { $ne: 'summary' }
            }).sort({ createdAt: 1 });

            return docs.map(doc => this.docToMessage(doc));
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to load original messages: ${errorMsg}`);
            return [];
        }
    }

    /**
     * 加载摘要消息
     * ILongTermStore 接口实现
     */
    async loadSummaries(sessionId: string): Promise<Message[]> {
        try {
            const docs = await MessageData.find({
                sessionId,
                type: 'summary'
            }).sort({ createdAt: 1 });

            return docs.map(doc => this.docToMessage(doc));
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to load summaries: ${errorMsg}`);
            return [];
        }
    }

    /**
     * 将数据库文档转换为 Message 对象
     */
    private docToMessage(doc: any): Message {
        const msg: Message = {
            role: doc.role as any,
            content: doc.content,
            type: doc.type as any,
        };
        if (doc.toolCallId) {
            msg.tool_call_id = doc.toolCallId;
        }
        if (doc.toolCalls) {
            try {
                msg.tool_calls = JSON.parse(doc.toolCalls);
            } catch {
                // Ignore invalid JSON
            }
        }
        return msg;
    }

    /**
     * 保存会话
     * ILongTermStore 接口实现
     */
    async saveSession(session: Session): Promise<void> {
        try {
            await SessionModel.findOneAndUpdate(
                { sessionId: session.id },
                {
                    $set: {
                        sessionId: session.id,
                        userId: session.userId,
                    },
                },
                { upsert: true, new: true }
            );
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to save session: ${errorMsg}`);
            throw error;
        }
    }

    /**
     * 根据 ID 加载会话
     * ILongTermStore 接口实现
     */
    async loadSession(sessionId: string): Promise<Session | null> {
        try {
            const doc = await SessionModel.findOne({ sessionId });
            if (!doc) {
                return null;
            }
            return {
                id: doc.sessionId,
                userId: doc.userId,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to load session: ${errorMsg}`);
            return null;
        }
    }

    /**
     * 加载用户的所有会话
     * ILongTermStore 接口实现
     */
    async loadSessionsByUser(userId: string): Promise<Session[]> {
        try {
            const docs = await SessionModel.find({ userId }).sort({ createdAt: -1 });
            return docs.map(doc => ({
                id: doc.sessionId,
                userId: doc.userId,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            }));
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to load sessions by user: ${errorMsg}`);
            return [];
        }
    }

    /**
     * 删除会话
     * ILongTermStore 接口实现
     */
    async deleteSession(sessionId: string): Promise<void> {
        try {
            await SessionModel.deleteOne({ sessionId });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to delete session: ${errorMsg}`);
            throw error;
        }
    }
}
