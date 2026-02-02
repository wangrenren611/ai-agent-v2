/**
 * 事件适配器
 * 
 * 将 Agent 的原始事件转换为新的 UI 事件格式
 * 提供统一的转换逻辑，使 UI 层与核心 Agent 解耦
 */

import type { AgentEvents } from '../../agent/types';
import type { UIEvent, ToolInvocation } from '../types/message-types';
import type { Subscription } from '../../util/event-bus/types';
import { TypedEventBus } from '../../util/event-bus';

// =============================================================================
// 事件转换器
// =============================================================================

/**
 * Agent 事件总线类型
 */
export type AgentEventBus = TypedEventBus<AgentEvents>;

/**
 * UI 事件回调
 */
export type UIEventCallback = (event: UIEvent) => void;

/**
 * 流式消息状态跟踪
 */
interface StreamingState {
  messageId: string | null;
  buffer: string;
  hasStarted: boolean;
}

// =============================================================================
// 适配器类
// =============================================================================

export class AgentEventAdapter {
  private subscriptions: Subscription[] = [];
  private streamingState: StreamingState = {
    messageId: null,
    buffer: '',
    hasStarted: false,
  };
  private pendingToolCalls: Map<string, ToolInvocation> = new Map();

  constructor(
    private agentEvents: AgentEventBus,
    private uiEventCallback: UIEventCallback
  ) {}

  /**
   * 开始监听 Agent 事件并转换为 UI 事件
   */
  start(): void {
    this.subscriptions = [
      this.agentEvents.on('stream-chunk', (chunk) => this.handleStreamChunk(chunk)),
      this.agentEvents.on('tool-call', (data) => this.handleToolCall(data)),
      this.agentEvents.on('tool-result', (data) => this.handleToolResult(data)),
      this.agentEvents.on('thinking', (data) => this.handleThinking(data)),
      this.agentEvents.on('thinking-end', (data) => this.handleThinkingEnd(data)),
      this.agentEvents.on('complete', (data) => this.handleComplete(data)),
      this.agentEvents.on('error', (data) => this.handleError(data)),
      this.agentEvents.on('token-usage', (data) => this.handleTokenUsage(data)),
    ];
  }

  /**
   * 停止监听并清理订阅
   */
  stop(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.streamingState = { messageId: null, buffer: '', hasStarted: false };
    this.pendingToolCalls.clear();
  }

  // ---------------------------------------------------------------------------
  // 事件处理器
  // ---------------------------------------------------------------------------

  /**
   * 处理流式输出块
   */
  private handleStreamChunk(chunk: AgentEvents['stream-chunk']): void {
    const { messageId, content, finish_reason, tool_calls } = chunk;

    // 新消息开始
    if (this.streamingState.messageId !== messageId) {
      // 完成之前的消息
      if (this.streamingState.hasStarted && this.streamingState.messageId) {
        this.uiEventCallback({
          type: 'assistant-message-complete',
          messageId: this.streamingState.messageId,
          content: this.streamingState.buffer,
        });
      }

      // 开始新消息
      this.streamingState = {
        messageId,
        buffer: '',
        hasStarted: false,
      };
    }

    // 发送开始事件（仅一次）
    if (!this.streamingState.hasStarted) {
      this.uiEventCallback({
        type: 'assistant-message-start',
        messageId,
        timestamp: Date.now(),
        hasToolCalls: !!(tool_calls && tool_calls.length > 0),
      });
      this.streamingState.hasStarted = true;
    }

    // 发送内容增量（即使同时有 tool_calls，也要处理内容）
    if (content) {
      this.streamingState.buffer += content;
      this.uiEventCallback({
        type: 'assistant-message-delta',
        messageId,
        contentDelta: content,
        isDone: finish_reason === 'stop' || finish_reason === 'eos',
      });
    }

    // 消息完成（或者有工具调用时也视为消息完成）
    if (finish_reason === 'stop' || finish_reason === 'eos' || (tool_calls && tool_calls.length > 0)) {
      this.uiEventCallback({
        type: 'assistant-message-complete',
        messageId,
        content: this.streamingState.buffer,
      });
      this.streamingState = { messageId: null, buffer: '', hasStarted: false };
    }
  }

  /**
   * 处理工具调用事件
   */
  private handleToolCall(data: AgentEvents['tool-call']): void {
    const { messageId, toolName, args } = data;

    // 创建工具调用对象
    const toolInvocation: ToolInvocation = {
      id: messageId, // 使用 messageId 作为 tool call ID
      name: toolName,
      args: args as Record<string, unknown>,
      status: 'running',
      startedAt: Date.now(),
    };

    this.pendingToolCalls.set(messageId, toolInvocation);

    // 发送工具调用开始事件
    this.uiEventCallback({
      type: 'tool-invocation-start',
      messageId: this.extractBaseMessageId(messageId),
      toolCallId: messageId,
      toolName,
      args: args as Record<string, unknown>,
      timestamp: Date.now(),
    });
  }

  /**
   * 处理工具结果事件
   */
  private handleToolResult(data: AgentEvents['tool-result']): void {
    const { messageId, toolName, result, duration } = data;
    
    const pendingCall = this.pendingToolCalls.get(messageId);
    
    if (result && typeof result === 'object' && 'success' in result && !result.success) {
      // 错误结果
      const errorMsg = (result as { error?: string }).error || 'Unknown error';
      this.uiEventCallback({
        type: 'tool-invocation-error',
        messageId: this.extractBaseMessageId(messageId),
        toolCallId: messageId,
        error: errorMsg,
        duration: duration || 0,
        timestamp: Date.now(),
      });
    } else {
      // 成功结果
      this.uiEventCallback({
        type: 'tool-invocation-complete',
        messageId: this.extractBaseMessageId(messageId),
        toolCallId: messageId,
        result,
        duration: duration || 0,
        timestamp: Date.now(),
      });
    }

    this.pendingToolCalls.delete(messageId);
  }

  /**
   * 处理思考开始事件
   */
  private handleThinking(data: AgentEvents['thinking']): void {
    this.uiEventCallback({
      type: 'thinking-start',
      step: data.step,
    });
  }

  /**
   * 处理思考结束事件
   */
  private handleThinkingEnd(data: AgentEvents['thinking-end']): void {
    this.uiEventCallback({
      type: 'thinking-end',
      step: data.step,
      hasToolCalls: data.hasToolCalls,
    });
  }

  /**
   * 处理完成事件
   */
  private handleComplete(data: AgentEvents['complete']): void {
    this.uiEventCallback({
      type: 'session-complete',
      finalContent: data.response.content,
    });
  }

  /**
   * 处理错误事件
   */
  private handleError(data: AgentEvents['error']): void {
    this.uiEventCallback({
      type: 'error',
      error: data.error,
      phase: data.phase,
      recoverable: true, // 可以根据错误类型判断
    });
  }

  /**
   * 处理 Token 使用事件
   */
  private handleTokenUsage(data: AgentEvents['token-usage']): void {
    this.uiEventCallback({
      type: 'token-usage',
      usedTokens: data.usedTokens,
      totalTokens: data.totalTokens,
    });
  }

  // ---------------------------------------------------------------------------
  // 辅助方法
  // ---------------------------------------------------------------------------

  /**
   * 从工具调用 messageId 提取基础消息 ID
   * 
   * 工具调用的 messageId 格式为: {baseMessageId}-{toolCallId}
   */
  private extractBaseMessageId(toolCallMessageId: string): string {
    const lastDashIndex = toolCallMessageId.lastIndexOf('-');
    if (lastDashIndex === -1) {
      return toolCallMessageId;
    }
    return toolCallMessageId.substring(0, lastDashIndex);
  }
}

// =============================================================================
// 工厂函数
// =============================================================================

/**
 * 创建事件适配器
 */
export function createEventAdapter(
  agentEvents: AgentEventBus,
  uiEventCallback: UIEventCallback
): AgentEventAdapter {
  return new AgentEventAdapter(agentEvents, uiEventCallback);
}

export default AgentEventAdapter;
