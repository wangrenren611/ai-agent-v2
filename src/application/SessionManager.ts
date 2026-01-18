/**
 * SessionManager - 会话管理器
 * 负责管理用户会话和消息队列
 */
import { MessageQueue } from "../domain/MessageQueue";
import { Session, createSession } from "../domain/session";
import { Message } from "../providers/base";
import { MessageRepository } from "../infrastructure/MessageRepository";
import { ScopedLogger } from "../util/log";

export class SessionManager {
    private logger: ScopedLogger;
    private sessions = new Map<string, Session>();
    private queues = new Map<string, MessageQueue>();
    private repository: MessageRepository;

    constructor(repository: MessageRepository) {
        this.logger = new ScopedLogger('SessionManager');
        this.repository = repository;
    }

    /**
     * 创建新会话
     */
    createSession(userId: string): Session {
        const session = createSession(userId);
        this.sessions.set(session.id, session);
        this.queues.set(session.id, new MessageQueue());
        this.logger.info(`Created session ${session.id} for user ${userId}`);
        return session;
    }

    /**
     * 获取会话
     */
    getSession(sessionId: string): Session | undefined {
        return this.sessions.get(sessionId);
    }

    /**
     * 获取或创建会话
     */
    async getOrCreateSession(sessionId: string, userId: string): Promise<Session> {
        let session = this.sessions.get(sessionId);
        if (!session) {
            session = createSession(userId);
            // 使用指定的 sessionId
            this.sessions.set(sessionId, session);
            this.queues.set(sessionId, new MessageQueue());
        
        //    const messages =await this.loadHistory(sessionId);

        //    if(messages.length){
        //        const queue = this.getQueue(sessionId);
        //        messages.forEach((message)=>{
        //           queue?.add(message)
        //        })
        //    }
        }

        return session;
    }

 
    /**
     * 获取会话的消息队列
     */
    getQueue(sessionId: string): MessageQueue {
        let queue = this.queues.get(sessionId);
        if (!queue) {
            queue = new MessageQueue();
            this.queues.set(sessionId, queue);
        }
        return queue;
    }

    /**
     * 添加消息到会话（内存 + 持久化）
     */
    async addMessage(sessionId: string, userId: string, msg: Message): Promise<void> {
        const queue = this.getQueue(sessionId);
        queue.add(msg);

        // 异步持久化到数据库
        try {
            await this.repository.save(sessionId, userId, msg);
        } catch (error) {
            this.logger.error(`Failed to persist message for session ${sessionId}`);
        }
    }

    /**
     * 获取会话的所有消息
     * 如果内存队列为空，自动从数据库加载历史记录
     */
    async getMessages(sessionId: string): Promise<Message[]> {
        const queue = this.getQueue(sessionId);

        return queue.getAll();
    }

    /**
     * 同步获取内存中的消息（不触发数据库加载）
     */
    getMessagesFromMemory(sessionId: string): Message[] {
        const queue = this.getQueue(sessionId);
        return queue.getAll();
    }

    /**
     * 从数据库加载会话历史
     */
    async loadHistory(sessionId: string): Promise<Message[]> {
        try {
            const messages = await this.repository.findBySession(sessionId);
            
            this.logger.info(`Loaded ${messages.length} messages for session ${sessionId}`);
            return messages

        } catch (error) {
            this.logger.error(`Failed to load history for session ${sessionId}`);
        }

        return []
    }

    /**
     * 删除会话
     */
    async deleteSession(sessionId: string): Promise<void> {
        this.sessions.delete(sessionId);
        this.queues.delete(sessionId);
        await this.repository.deleteBySession(sessionId);
        this.logger.info(`Deleted session ${sessionId}`);
    }

    /**
     * 获取所有活跃会话
     */
    getActiveSessions(): Session[] {
        return Array.from(this.sessions.values());
    }
}
