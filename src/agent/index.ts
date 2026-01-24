/**
 * Agent - AI 代理
 * 负责编排 LLM 调用和会话管理
 *
 * 注意：此文件是旧版 Agent，建议使用 index-eventbus.ts 以获得 EventBus 集成
 * 要启用 EventBus 功能，请导入 './index-eventbus' 而不是此文件
 */
import EventEmitter from "events";
import { LLMProvider, LLMResponse, Message, ToolCall, ToolSchema } from "../providers/base";
import { ScopedLogger } from "../util/log";
import { SessionManager } from "../session-v2";
import { ToolRegistry } from "../tool/registry";

export interface AgentConfig {
    llmProvider: LLMProvider;
    sessionManager: SessionManager;
    systemPrompt: string;
    /** 默认工具列表（可选），不传则使用 ToolRegistry 中所有工具 */
    defaultTools?: ToolSchema[];
    /** 最大循环次数，0 或 null 表示无限制，默认 1024 */
    maxLoop?: number | null;
    /** 最大 token 数，默认 8000 */
    maxTokens?: number;
    /** 最大输出 token 数，默认 8000 */
    maxOutputTokens?: number;
    /** 工具并发上限，默认 1 */
    toolConcurrency?: number;
    /** 单次工具调用超时（毫秒），默认 300000 (5分钟) */
    toolTimeoutMs?: number;
    /** 连续错误次数上限，默认 2 */
    noProgressLimit?: number;
}

export interface AgentResponse {
    content: string;
    role: Message['role'];
    type?: Message['type'];
}

export default class Agent extends EventEmitter {
    private llmProvider: LLMProvider;
    private logger: ScopedLogger;
    private sessionManager: SessionManager;
    private systemPrompt: string;
    private defaultTools: ToolSchema[] | undefined;
    private maxLoop: number | null | undefined;
    private maxOutputTokens: number;
    private maxTokens: number;
    private noProgressLimit: number;

    constructor(config: AgentConfig) {
        super();
        this.llmProvider = config.llmProvider;
        this.sessionManager = config.sessionManager;
        this.systemPrompt = config.systemPrompt;
        this.defaultTools = config.defaultTools;
        this.logger = new ScopedLogger('Agent');
        this.maxLoop = config.maxLoop;

        const providerMaxOutput = this.llmProvider.maxOutputTokens;
        const providerMaxTokens = this.llmProvider.maxTokens;
        this.maxOutputTokens = Math.min(config.maxOutputTokens ?? providerMaxOutput, providerMaxOutput);
        this.maxTokens = Math.min(config.maxTokens ?? providerMaxTokens, providerMaxTokens);
        this.noProgressLimit = Math.max(0, config.noProgressLimit ?? 2);

        this.sessionManager.maxOutputTokens = this.maxOutputTokens;
        this.sessionManager.maxTokens = this.maxTokens;
    }

    /**
     * 执行单个工具调用
     */
    private async executeToolCall(toolCall: ToolCall): Promise<Message> {
        const { name, arguments: args } = toolCall.function;
        if (!name) {
            return {
                role: 'tool',
                type: 'text',
                content: 'Error: Tool name is empty',
                tool_call_id: toolCall.id,
            };
        }

        const result = await ToolRegistry.execute(name, args);

        let content: string;
        if (typeof result === 'string') {
            content = result;
        } else {
            content = JSON.stringify(result?.metadata ?? result ?? {});
        }

        return {
            role: 'tool',
            type: 'text',
            content,
            tool_call_id: toolCall.id,
        };
    }

    /**
     * 处理工具调用，返回是否有工具被调用
     */
    private async handleToolCalls(
        llmResponse: LLMResponse,
        spinner: ReturnType<ScopedLogger['spinner']>
    ): Promise<boolean> {
        if (!llmResponse.tool_calls || llmResponse.tool_calls.length === 0) {
            return false;
        }

        const toolResults = await Promise.all(
            llmResponse.tool_calls.map(call => this.executeToolCall(call))
        );

        this.sessionManager.addMessage(toolResults);

        // Bug修复：提取content字段进行拼接，而非直接join对象数组
        const summaries = toolResults
            .map(r => {
                const content = r.content ?? '';
                return content.length > 50 ? content.slice(0, 47) + '...' : content;
            })
            .join(', ');

        spinner.succeed(`Tool calls: ${summaries}`);
        return true;
    }

    /**
     * 运行 Agent 处理用户查询
     * @param query 用户查询
     * @param options 选项
     * @returns Agent 响应
     */
    async run(
        query: string,
        options?: { silent?: boolean; tools?: ToolSchema[] }
    ): Promise<AgentResponse | null> {
        const tools = options?.tools ?? this.defaultTools ?? [];
        let consecutiveErrorCount = 0;
        let i = 0;
        // 添加用户消息
        this.sessionManager.addMessage({
            role: 'user',
            type: 'text',
            content: query,
        });

        while (true) {
            i++;

            // maxLoop 为 0 或 null 表示无限制
            if (this.maxLoop && this.maxLoop > 0 && i > this.maxLoop) {
                return {
                    content: `Max loop limit reached (${this.maxLoop})`,
                    role: 'assistant',
                };
            }

            const llmMessages = await this.sessionManager.getMessages();
            const spinner = this.logger.spinner(`Thinking-${i + 1}...`);

            try {
                const llmResponse = await this.llmProvider.generate(
                    [
                        { role: 'system', content: this.systemPrompt },
                        ...llmMessages,
                    ],
                    {
                        model: process.env.AI_MODEL,
                        tools: tools.length > 0 ? tools : undefined,
                        max_tokens: this.maxOutputTokens,
                    }
                );

                if (!llmResponse) {
                     throw new Error('LLM response is null');
                }

                this.sessionManager.addMessage(llmResponse);

                const hasToolCalls = await this.handleToolCalls(llmResponse, spinner);

                if (!hasToolCalls) {
                    // 单次无工具调用即返回，无需继续循环
                    // 正常结束状态：'stop'、'eos'、undefined；其他值可能是异常
                    const validEnd = ['stop', 'eos', undefined].includes(llmResponse.finishReason as string);

                    if (!validEnd) {
                        spinner.fail(`Unexpected finishReason: ${llmResponse.finishReason}`);
                        return {
                            content: `Unexpected finishReason: ${llmResponse.finishReason}`,
                            role: 'assistant',
                        };
                    }

                    spinner.succeed(llmResponse?.content ?? '');
                    return {
                        content: llmResponse?.content ?? '',
                        role: 'assistant',
                        type: 'text',
                    };
                }

                // 工具调用成功，重置连续错误计数
                consecutiveErrorCount = 0;

            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                spinner.fail(errorMsg);
                this.logger.error(`LLM call failed: ${errorMsg}`);

                this.sessionManager.addMessage({
                    role: 'assistant',
                    type: 'text',
                    content: `LLM error: ${errorMsg}`,
                });

                consecutiveErrorCount++;

                if (consecutiveErrorCount > this.noProgressLimit) {
                    return {
                        content: `Max error limit reached: ${errorMsg}`,
                        role: 'assistant',
                    };
                }
            }
        }
    }
}
