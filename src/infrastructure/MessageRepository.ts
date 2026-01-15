/**
 * MessageRepository - 消息持久化仓储
 * 负责消息的数据库操作
 */
import { message } from "../providers/base";
import { Message } from "../storage/models/message";
import { ScopedLogger } from "../util/log";

export class MessageRepository {
    private logger: ScopedLogger;

    constructor() {
        this.logger = new ScopedLogger('MessageRepository');
    }

    /**
     * 保存单条消息
     */
    async save(sessionId: string, userId: string, msg: message): Promise<void> {
        try {
            await Message.create({
                sessionId,
                userId,
                content: msg.content || '',
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
    async saveBatch(sessionId: string, userId: string, messages: message[]): Promise<void> {
        try {
            const docs = messages.map(msg => ({
                sessionId,
                userId,
                content: msg.content || '',
                role: msg.role,
                type: msg.type || 'text',
                toolCallId: msg.tool_call_id,
                toolCalls: msg.tool_calls ? JSON.stringify(msg.tool_calls) : undefined,
            }));
            await Message.insertMany(docs);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to save messages batch: ${errorMsg}`);
            throw error;
        }
    }

    /**
     * 根据会话 ID 查询消息
     */
    async findBySession(sessionId: string): Promise<message[]> {
        try {
            const docs = await Message.find({ sessionId }).sort({ createdAt: 1 });
            return docs.map(doc => {
                const msg: message = {
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
            });
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
            await Message.deleteMany({ sessionId });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to delete messages: ${errorMsg}`);
            throw error;
        }
    }
}
