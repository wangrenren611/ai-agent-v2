/**
 * SessionManager - 会话管理器
 * 负责管理用户会话和三层存储架构
 */
import { Session, createSession } from "../domain/session";
import { Message } from "../providers/base";
import { CurrentSession } from "../domain/CurrentSession";
import { ShortTermStore, SummaryMetadata } from "../domain/ShortTermStore";
import { ILongTermStore } from "../domain/LongTermStore";
import { ScopedLogger } from "../util/log";

const _DEFAULT_COMPRESSION_THRESHOLD = 0.92; // 92% 触发压缩
const KEEP_RECENT_COUNT = 6; // 压缩后保留最近 N 条消息（保留足够上下文）

export class SessionManager {
    private logger: ScopedLogger;
    private sessions = new Map<string, Session>();
    private currentSessions = new Map<string, CurrentSession>();
    private shortTermStores = new Map<string, ShortTermStore>();
    private repository: ILongTermStore;
    private loadedSessions = new Set<string>(); // 已加载历史记录的会话

    constructor(repository: ILongTermStore) {
        this.logger = new ScopedLogger('SessionManager');
        this.repository = repository;
    }

    /**
     * 创建新会话
     */
    async createSession(userId: string): Promise<Session> {
        const session = createSession(userId);
        this.sessions.set(session.id, session);
        this.currentSessions.set(session.id, new CurrentSession());
        this.shortTermStores.set(session.id, new ShortTermStore());

        // 持久化会话到数据库
        try {
            await this.repository.saveSession(session);
        } catch (_error) {
            this.logger.error(`Failed to persist session ${session.id}`);
        }

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
     * 自动加载历史记录（懒加载）
     */
    async getOrCreateSession(sessionId: string, userId: string): Promise<Session> {
        let session = this.sessions.get(sessionId);
        if (!session) {
            // 先尝试从数据库加载会话
            const loadedSession = await this.repository.loadSession(sessionId);
            if (loadedSession) {
                session = loadedSession;
            } else {
                session = createSession(userId, sessionId); // 使用指定的 sessionId 创建会话
            }

            this.sessions.set(sessionId, session);
            this.currentSessions.set(sessionId, new CurrentSession());
            this.shortTermStores.set(sessionId, new ShortTermStore());

            // 如果是新创建的会话，持久化到数据库
            if (!loadedSession) {
                try {
                    await this.repository.saveSession(session);
                } catch (_error) {
                    this.logger.error(`Failed to persist session ${session.id}`);
                }
            } else {
                // 只在会话已存在时加载历史记录
                await this.loadFullHistory(sessionId);
            }
        }

        return session;
    }

    /**
     * 获取会话的当前会话层
     */
    getCurrentSession(sessionId: string): CurrentSession {
        let currentSession = this.currentSessions.get(sessionId);
        if (!currentSession) {
            currentSession = new CurrentSession();
            this.currentSessions.set(sessionId, currentSession);
        }
        return currentSession;
    }

    /**
     * 获取会话的短期存储层
     */
    getShortTermStore(sessionId: string): ShortTermStore {
        let shortTermStore = this.shortTermStores.get(sessionId);
        if (!shortTermStore) {
            shortTermStore = new ShortTermStore();
            this.shortTermStores.set(sessionId, shortTermStore);
        }
        return shortTermStore;
    }

    /**
     * 添加消息到会话（内存 + 持久化）
     * 只添加非摘要类型到 CurrentSession
     */
    async addMessage(sessionId: string, userId: string, msg: Message): Promise<void> {
        // 非摘要消息添加到当前会话层
        if (msg.type !== 'summary') {
            const currentSession = this.getCurrentSession(sessionId);
            currentSession.add(msg);
        }

        // 所有消息都持久化到数据库
        try {
            await this.repository.save(sessionId, userId, msg);
        } catch (_error) {
            this.logger.error(`Failed to persist message for session ${sessionId}`);
        }
    }

    /**
     * 获取用户可见的消息（不包含摘要）
     */
    getUserVisibleMessages(sessionId: string): Message[] {
        const currentSession = this.getCurrentSession(sessionId);
        return currentSession.getAll();
    }

    /**
     * 添加摘要到短期存储并持久化
     */
    async addSummary(
        sessionId: string,
        userId: string,
        summaryMessage: Message,
        metadata: SummaryMetadata
    ): Promise<void> {
        // 添加到短期存储
        const shortTermStore = this.getShortTermStore(sessionId);
        const summaryId = `summary_${Date.now()}`;
        shortTermStore.addSummary(summaryId, summaryMessage, metadata);

        // 持久化到数据库
        try {
            await this.repository.save(sessionId, userId, summaryMessage);
        } catch (_error) {
            this.logger.error(`Failed to persist summary for session ${sessionId}`);
        }
    }

    /**
     * 获取短期存储的摘要
     */
    getSummaries(sessionId: string): Message[] {
        const shortTermStore = this.getShortTermStore(sessionId);
        return shortTermStore.getAllSummaries();
    }

    /**
     * 构建 LLM 上下文（系统消息 + 摘要 + 当前消息）
     */
    async buildLLMContext(sessionId: string, systemMessage: Message): Promise<Message[]> {
        const shortTermStore = this.getShortTermStore(sessionId);
        const currentSession = this.getCurrentSession(sessionId);

        const summaries = shortTermStore.getAllSummaries();
        const currentMessages = currentSession.getAll();

        return [systemMessage, ...summaries, ...currentMessages];
    }

    /**
     * 检查是否需要压缩
     */
    needsCompaction(sessionId: string, threshold: number): boolean {
        const currentSession = this.getCurrentSession(sessionId);
        return currentSession.needsCompaction(threshold);
    }

    /**
     * 执行压缩
     * @param sessionId 会话 ID
     * @param userId 用户 ID
     * @param summaryMessage 摘要消息
     * @param keepRecent 保留最近的 N 条消息
     */
    async compact(
        sessionId: string,
        userId: string,
        summaryMessage: Message,
        keepRecent: number = KEEP_RECENT_COUNT
    ): Promise<void> {
        const currentSession = this.getCurrentSession(sessionId);
        const messageCount = currentSession.size();
        const tokenCount = currentSession.calculateTokenCount();

        // 计算元数据
        const metadata: SummaryMetadata = {
            createdAt: new Date(),
            messageCount,
            tokenCount,
        };

        // 添加摘要到短期存储
        await this.addSummary(sessionId, userId, summaryMessage, metadata);

        // 从当前会话中移除已压缩的消息，只保留最近 N 条
        currentSession.keepRecent(keepRecent);

        this.logger.info(
            `Compacted session ${sessionId}: ${messageCount} messages -> ${keepRecent} messages, token count: ${tokenCount}`
        );
    }

    /**
     * 获取会话的所有消息（包含摘要）
     * 如果内存为空，自动从数据库加载历史记录
     */
    async getMessages(sessionId: string): Promise<Message[]> {
        // 自动加载历史记录
        if (!this.loadedSessions.has(sessionId)) {
            await this.loadFullHistory(sessionId);
        }

        const shortTermStore = this.getShortTermStore(sessionId);
        const currentSession = this.getCurrentSession(sessionId);

        const summaries = shortTermStore.getAllSummaries();
        const currentMessages = currentSession.getAll();

        return [...summaries, ...currentMessages];
    }

    /**
     * 同步获取内存中的消息（不触发数据库加载）
     */
    getMessagesFromMemory(sessionId: string): Message[] {
        const shortTermStore = this.getShortTermStore(sessionId);
        const currentSession = this.getCurrentSession(sessionId);

        const summaries = shortTermStore.getAllSummaries();
        const currentMessages = currentSession.getAll();

        return [...summaries, ...currentMessages];
    }

    /**
     * 从数据库加载完整历史到内存
     */
    async loadFullHistory(sessionId: string): Promise<void> {
        if (this.loadedSessions.has(sessionId)) {
            return; // 已加载，跳过
        }

        try {
            // 加载原始消息到当前会话层
            const originalMessages = await this.repository.loadOriginalMessages(sessionId);
            const currentSession = this.getCurrentSession(sessionId);
            currentSession.setMessages(originalMessages);

            // 加载摘要消息到短期存储层
            const summaryMessages = await this.repository.loadSummaries(sessionId);
            const shortTermStore = this.getShortTermStore(sessionId);

            for (const summary of summaryMessages) {
                const metadata: SummaryMetadata = {
                    createdAt: new Date(), // 没有存储创建时间，使用当前时间
                    messageCount: 0,
                    tokenCount: 0,
                };
                const summaryId = `summary_${Date.now()}_${Math.random()}`;
                shortTermStore.addSummary(summaryId, summary, metadata);
            }

            this.loadedSessions.add(sessionId);
            this.logger.info(
                `Loaded ${originalMessages.length} original messages and ${summaryMessages.length} summaries for session ${sessionId}`
            );
        } catch (_error) {
            this.logger.error(`Failed to load history for session ${sessionId}`);
        }
    }

    /**
     * 从数据库加载会话历史（向后兼容）
     */
    async loadHistory(sessionId: string): Promise<void> {
        await this.loadFullHistory(sessionId);
    }

    /**
     * 删除会话
     */
    async deleteSession(sessionId: string): Promise<void> {
        // 先尝试删除数据库中的数据
        let sessionDeleted = false;
        try {
            await this.repository.deleteSession(sessionId);
            sessionDeleted = true;
            await this.repository.deleteBySession(sessionId);
        } catch (_error) {
            // 如果消息删除失败但会话已删除，记录错误
            if (sessionDeleted) {
                this.logger.error(`Failed to delete messages for session ${sessionId}, but session was already deleted. Manual cleanup may be required.`);
            } else {
                this.logger.error(`Failed to delete session ${sessionId} from database`);
            }
            throw _error; // 重新抛出错误，不清理内存状态
        }

        // 只有数据库删除成功后才清理内存状态
        this.sessions.delete(sessionId);
        this.currentSessions.delete(sessionId);
        this.shortTermStores.delete(sessionId);
        this.loadedSessions.delete(sessionId);

        this.logger.info(`Deleted session ${sessionId}`);
    }

    /**
     * 获取所有活跃会话
     */
    getActiveSessions(): Session[] {
        return Array.from(this.sessions.values());
    }

    /**
     * 加载用户的所有会话（用于启动时恢复）
     */
    async loadUserSessions(userId: string): Promise<void> {
        try {
            const sessions = await this.repository.loadSessionsByUser(userId);
            for (const session of sessions) {
                // 只加载会话元数据，不加载消息历史（懒加载）
                if (!this.sessions.has(session.id)) {
                    this.sessions.set(session.id, session);
                    this.currentSessions.set(session.id, new CurrentSession());
                    this.shortTermStores.set(session.id, new ShortTermStore());
                }
            }
            this.logger.info(`Loaded ${sessions.length} sessions for user ${userId}`);
        } catch (_error) {
            this.logger.error(`Failed to load sessions for user ${userId}`);
        }
    }
}
