/**
 * Agent - AI 代理
 * 负责编排 LLM 调用和会话管理
 */
import EventEmitter from "events";
import { LLMProvider, message } from "../providers/base";
import { ScopedLogger } from "../util/log";
import { SessionManager } from "../application/SessionManager";
import { SYSTEM_PROMPT } from "../prompts/system";

export interface AgentConfig {
    llmProvider: LLMProvider;
    sessionManager: SessionManager;
    systemPrompt?: string;
}

export interface AgentResponse {
    content: string;
    sessionId: string;
    role: 'assistant';
}

export default class Agent extends EventEmitter {
    private llmProvider: LLMProvider;
    private logger: ScopedLogger;
    private sessionManager: SessionManager;
    private systemPrompt: string;

    constructor(config: AgentConfig) {
        super();
        this.llmProvider = config.llmProvider;
        this.sessionManager = config.sessionManager;
        this.systemPrompt = config.systemPrompt || SYSTEM_PROMPT;
        this.logger = new ScopedLogger('Agent');
    }

    /**
     * 运行 Agent 处理用户查询
     * @param sessionId 会话 ID
     * @param userId 用户 ID
     * @param query 用户查询
     * @param options 选项
     * @returns Agent 响应
     */
    async run(
        sessionId: string,
        userId: string,
        query: string,
        options?: { silent?: boolean }
    ): Promise<AgentResponse | null> {
        if (!options?.silent) {
            this.logger.info(`Processing query for session ${sessionId}: ${query}`);
        }

        try {

            // 1. 确保会话存在
            this.sessionManager.getOrCreateSession(sessionId, userId);

            // 2. 添加用户消息到会话
            await this.sessionManager.addMessage(sessionId, userId, {
                role: 'user',
                content: query,
            });

            // 3. 获取会话历史（自动懒加载）
            const history = await this.sessionManager.getMessages(sessionId);

            // 4. 构建完整消息（系统提示 + 历史消息）
            const systemMessage: message = {
                role: 'system',
                content: this.systemPrompt,
            };
            const fullMessages = [systemMessage, ...history];

            // 5. 调用 LLM
            const llmResponse = await this.llmProvider.generate(fullMessages, {
                model: 'deepseek-chat',
            });

            if (!llmResponse) {
                this.emit('failure', { sessionId, error: 'LLM returned null response' });
                return null;
            }

            // 6. 添加助手响应到会话
            await this.sessionManager.addMessage(sessionId, userId, {
                role: 'assistant',
                content: llmResponse.content,
            });

            this.emit('success', { sessionId, response: llmResponse });

            // this.logger.json(llmResponse);

            return {
                content: llmResponse.content,
                sessionId,
                role: 'assistant',
            };

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.emit('failure', { sessionId, error: errorMsg });
            if (!options?.silent) {
                this.logger.error(`Agent error: ${errorMsg}`);
            }
            return null;
        } finally {
            this.emit('end', { sessionId });
        }
    }

    /**
     * 获取会话历史
     */
    async getHistory(sessionId: string): Promise<message[]> {
        return await this.sessionManager.getMessages(sessionId);
    }

    /**
     * 从数据库加载会话历史
     */
    async loadHistory(sessionId: string): Promise<void> {
        await this.sessionManager.loadHistory(sessionId);
    }

    /**
     * 清除会话历史
     */
    async clearSession(sessionId: string): Promise<void> {
        await this.sessionManager.deleteSession(sessionId);
        this.logger.info(`Cleared session ${sessionId}`);
    }
}
