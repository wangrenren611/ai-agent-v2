/**
 * Agent - AI 代理 (重构版)
 * 
 * 职责：
 * 1. 初始化和管理核心组件
 * 2. 对外提供简洁的接口
 * 3. 事件转发
 * 
 * 改进：
 * - 分层架构：核心逻辑移至 AgentRunner
 * - 依赖注入：易于测试和扩展
 * - 单一职责：只负责协调，不处理具体逻辑
 */

import { TypedEventBus } from '../util/event-bus';
import { SessionManager } from '../session-v2/SessionManager';
import { ToolRegistry } from '../tool/registry';
import { AgentContext, getAgentContext } from '../context';
import { ScopedLogger } from '../util/log';
import type {
  AgentEvents,
  AgentConfig,
  AgentRunOptions,
  AgentResponse,
  ToolSchema,
} from './types';
import type { Message } from './message';
import { ErrorHandler } from './core/ErrorHandler';
import { ToolExecutor } from './core/ToolExecutor';
import { AgentRunner } from './core/AgentRunner';
import { SmartCompactionStrategy } from '../session-v2/compaction-strategy';

// 常量定义
const DEFAULT_MAX_LOOP = 1024;
const DEFAULT_NO_PROGRESS_LIMIT = 10;

export class Agent {
  // 配置
  private config: AgentConfig;
  
  // 公开属性
  public readonly sessionManager: SessionManager;
  public readonly context: AgentContext;
  public readonly events: TypedEventBus<AgentEvents>;
  public readonly tools: ToolSchema[];
  
  // 私有组件
  private logger: ScopedLogger;
  private runner: AgentRunner;

  constructor(config: AgentConfig) {
    this.config = {
      maxLoop: DEFAULT_MAX_LOOP,
      noProgressLimit: DEFAULT_NO_PROGRESS_LIMIT,
      ...config,
    };
    this.tools = config.tools || [];

    // 初始化上下文
    this.context = this.initContext(config.sessionId);
    this.context.initialize();

    // 初始化事件总线
    this.events = new TypedEventBus<AgentEvents>();

    // 初始化日志
    this.logger = new ScopedLogger('Agent');

    // 初始化会话管理器
    this.sessionManager = this.initSessionManager(config);

    // 初始化运行器
    this.runner = this.initRunner();

    // 设置工具注册表上下文
    ToolRegistry.setAgentContext(this.context);
  }

  /**
   * 初始化上下文
   */
  private initContext(sessionId?: string): AgentContext {
    return getAgentContext({
      session: {
        sessionId: sessionId || `session_${Date.now()}`,
        userId: 'default',
      },
    });
  }

  /**
   * 初始化会话管理器
   */
  private initSessionManager(config: AgentConfig): SessionManager {
    const maxTokens = config.maxTokens ?? config.llmProvider.config.maxTokens;
    const maxOutputTokens = config.maxOutputTokens ?? config.llmProvider.config.maxOutputTokens;
    const temperature = config.temperature ?? config.llmProvider.config.temperature;

    return new SessionManager({
      sessionId: this.context.sessionId,
      sessionDir: this.context.sessionDir,
      llmProvider: config.llmProvider,
      maxTokens,
      maxOutputTokens,
    });
  }

  /**
   * 初始化运行器
   */
  private initRunner(): AgentRunner {
    const maxTokens = this.config.maxTokens ?? this.config.llmProvider.config.maxTokens;
    const maxOutputTokens = this.config.maxOutputTokens ?? this.config.llmProvider.config.maxOutputTokens;

    return new AgentRunner(
      {
        llmProvider: this.config.llmProvider,
        sessionManager: this.sessionManager,
        systemPrompt: this.config.systemPrompt,
        maxLoop: this.config.maxLoop ?? DEFAULT_MAX_LOOP,
        temperature: this.config.temperature ?? this.config.llmProvider.config.temperature,
        maxTokens,
        maxOutputTokens,
        tools: this.tools,  // 传递工具
      },
      {
        errorHandler: new ErrorHandler({
          maxNetworkRetries: 10,
          noProgressLimit: this.config.noProgressLimit ?? DEFAULT_NO_PROGRESS_LIMIT,
        }),
        toolExecutor: new ToolExecutor(),
      }
    );
  }

  // ---------------------------------------------------------------------------
  // 公开方法
  // ---------------------------------------------------------------------------

  /**
   * 启动 Agent
   */
  async start(): Promise<void> {
    await this.sessionManager.init();
  }

  /**
   * 运行 Agent 处理用户查询
   */
  async run(query: string, options: AgentRunOptions = {}): Promise<AgentResponse | null> {
    const streamEnabled = options.stream ?? false;
    const streamCallback = options.streamCallback;

    return this.runner.run(query, options, {
      // 流式输出
      onStreamChunk: streamCallback
        ? (chunk) => {
            streamCallback(chunk);
            this.events.emit('stream-chunk', chunk);
          }
        : (chunk) => {
            this.events.emit('stream-chunk', chunk);
          },

      // 思考事件
      onThinking: (step) => {
        this.events.emit('thinking', { step });
      },

      onThinkingEnd: (step, hasToolCalls) => {
        this.events.emit('thinking-end', { step, hasToolCalls });
      },

      // 工具调用事件
      onToolCallsStart: (count) => {
        this.events.emit('tool-calls-start', { count });
      },

      onToolCallsEnd: (summary, hasErrors) => {
        this.events.emit('tool-calls-end', { 
          count: 0, // 需要统计
          hasErrors,
          summary 
        });
      },

      onToolCall: (data) => {
        this.events.emit('tool-call', data);
      },

      onToolResult: (data) => {
        this.events.emit('tool-result', data as { messageId: string; toolName: string; result: { success: boolean; data?: unknown; error?: string; }; duration: number; });
      },

      // Token 使用
      onTokenUsage: (used, total) => {
        this.events.emit('token-usage', { usedTokens: used, totalTokens: total });
      },

      // 完成
      onComplete: (response) => {
        this.events.emit('complete', { response });
      },

      // 错误
      onError: (error, phase) => {
        this.events.emit('error', { error, phase });
      },
    });
  }

  /**
   * 获取 Token 使用情况
   */
  getUsedTokens(): { usedTokens: number; totalTokens: number } {
    const stats = this.sessionManager.getStats(this.tools);
    const sessionConfig = this.sessionManager['config'] as any;
    return {
      usedTokens: stats.totalTokens,
      totalTokens: sessionConfig.maxTokens!,
    };
  }

  /**
   * 订阅事件
   */
  on<TEvent extends keyof AgentEvents>(
    event: TEvent,
    listener: (data: AgentEvents[TEvent]) => void
  ): void {
    this.events.on(event, listener);
  }

  /**
   * 清空会话
   */
  clear(): void {
    this.sessionManager.clearAll();
  }
}

export default Agent;
