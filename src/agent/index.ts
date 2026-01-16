/**
 * Agent - AI 代理
 * 负责编排 LLM 调用和会话管理
 */
import EventEmitter from "events";
import { LLMProvider, message, ToolSchema } from "../providers/base";
import { ScopedLogger } from "../util/log";
import { formatToolResult } from "../util/log-format";
import { SessionManager } from "../application/SessionManager";
import { SYSTEM_PROMPT } from "../prompts/system";
import { ToolRegistry } from "../tool";

export interface AgentConfig {
    llmProvider: LLMProvider;
    sessionManager: SessionManager;
    systemPrompt?: string;
    /** 默认工具列表（可选），不传则使用 ToolRegistry 中所有工具 */
    defaultTools?: ToolSchema[];
    /** 最大循环次数，防止无限循环，默认 10 */
    maxLoop?: number;
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
    private defaultTools: ToolSchema[] | undefined;
    private maxLoop: number;
    constructor(config: AgentConfig) {
        super();
        this.llmProvider = config.llmProvider;
        this.sessionManager = config.sessionManager;
        this.systemPrompt = config.systemPrompt || SYSTEM_PROMPT;
        this.defaultTools = config.defaultTools;
        this.logger = new ScopedLogger('Agent');
        this.maxLoop = config.maxLoop || 100; // 默认 10 次，与系统提示词建议一致
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
        options?: { silent?: boolean; tools?: ToolSchema[] }
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

            // 3. 获取工具 schemas（优先级：传入参数 > 默认配置 > ToolRegistry 全部）
            const tools = options?.tools ?? this.defaultTools ?? ToolRegistry.getSchemas();

            // 4. LLM 调用循环（处理工具调用）
            let i = 0; // 防止无限循环
            let finalResponse: AgentResponse | null = null;

            while (i < this.maxLoop) {
                i++; // 在循环开始时递增计数器
                const spinner = this.logger.spinner(`Thinking-${i}...`);
                // 获取会话历史（自动懒加载）
                const history = await this.sessionManager.getMessages(sessionId);

                // 构建完整消息（系统提示 + 历史消息）
                const systemMessage: message = {
                    role: 'system',
                    content: this.systemPrompt,
                };

                const fullMessages = [systemMessage, ...history];

                // 调用 LLM
                const llmResponse = await this.llmProvider.generate(fullMessages, {
                    model: 'deepseek-chat',
                    tools: tools.length > 0 ? tools : undefined,
                });
                
                spinner.succeed(`Thinking-${i} end`);

                if (!llmResponse) {
                    this.emit('failure', { sessionId, error: 'LLM returned null response' });
                    this.logger.error("LLM error")
                    return null;
                }

                // 检查是否有工具调用
                if (llmResponse.tool_calls && llmResponse.tool_calls.length > 0) {
                    // 添加 assistant 消息（包含 tool_calls）
                    await this.sessionManager.addMessage(sessionId, userId, {
                        role: 'assistant',
                        content: llmResponse.content,
                        type: 'tool_call',
                        tool_calls: llmResponse.tool_calls,
                    });

                    this.logger.info(`Tool tips: ${llmResponse.content}`);

                    // 并行执行所有工具调用
                    const toolPromises = llmResponse.tool_calls.map(async (toolCall) => {
                        const { id, function: fn } = toolCall;

                        try {
                            // 解析参数（带容错处理）
                            let args: unknown;
                            try {
                                args = JSON.parse(fn.arguments);
                            } catch (parseError) {
                                // JSON 解析失败 - 记录详细信息并返回友好的错误信息
                                const truncatedArgs = fn.arguments.length > 200
                                    ? fn.arguments.slice(0, 200) + '...'
                                    : fn.arguments;
                                const parseErrorMsg = parseError instanceof Error ? parseError.message : String(parseError);
                                const errorMsg = `Invalid JSON in tool parameters: ${parseErrorMsg}\nReceived: ${truncatedArgs}`;
                                this.logger.error(errorMsg);
                                return {
                                    toolCall,
                                    result: `Error: Failed to parse tool arguments. The JSON was malformed. Please try again with properly formatted parameters.`,
                                    error: errorMsg
                                };
                            }

                            const spinner = this.logger.spinner(`Tool ${fn.name}(...)`);
                            // 执行工具
                            const result = await ToolRegistry.execute(fn.name, args);
                            spinner.succeed(`Tool ${fn.name} completed`);

                            if (!options?.silent) {
                                this.logger.info(`Tool ${fn.name} result: ${formatToolResult(fn.name, result)}`);
                            }

                            // 返回成功结果
                            return { toolCall, result, error: undefined };
                        } catch (error) {
                            const errorMsg = error instanceof Error ? error.message : String(error);
                            this.logger.error(`Tool execution error: ${errorMsg}`);

                            // 返回错误结果
                            return { toolCall, result: `Error: ${errorMsg}`, error: errorMsg };
                        }
                    });

                    // 等待所有工具调用完成
                    const results = await Promise.all(toolPromises);

                    // 按原始顺序添加工具结果消息
                    for (const { toolCall, result, error } of results) {
                        const { id } = toolCall;

                        await this.sessionManager.addMessage(sessionId, userId, {
                            role: 'tool',
                            content: result,
                            type: 'tool',
                            tool_call_id: id,
                        });
                    }

                    // 继续循环，让 LLM 基于工具结果生成响应
                    continue;
                }

                // 没有工具调用，这是最终响应
                await this.sessionManager.addMessage(sessionId, userId, {
                    role: 'assistant',
                    content: llmResponse.content,
                });

                finalResponse = {
                    content: llmResponse.content,
                    sessionId,
                    role: 'assistant',
                };
                
                break;
            }

            if (i >= this.maxLoop) {
                this.logger.error('Max iterations reached, possible infinite loop');
                this.emit('failure', { sessionId, error: 'Max iterations reached' });
                return null;
            }

            if (finalResponse) {
                this.emit('success', { sessionId, response: finalResponse });
            }

            return finalResponse;

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.emit('failure', { sessionId, error: errorMsg });
            this.logger.error(`Agent error: ${errorMsg}`);
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
