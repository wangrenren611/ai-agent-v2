/**
 * 工具执行器
 * 
 * 职责：
 * 1. 批量执行工具调用
 * 2. 处理工具执行错误
 * 3. 生成执行摘要
 */

import { ToolRegistry } from '../../tool/registry';
import { ToolError } from '../ToolError';
import type { Message } from '../message';
import type { ToolCall, ToolResult } from '../types';

export interface ToolExecutionResult {
  /** 工具执行结果消息 */
  messages: Message[];
  /** 是否有错误 */
  hasError: boolean;
  /** 执行摘要 */
  summary: string;
}

export interface ToolExecutionContext {
  baseMessageId: string;
  onToolCall?: (data: { messageId: string; toolName: string; args: unknown }) => void;
  onToolResult?: (data: { messageId: string; toolName: string; result: ToolResult; duration: number }) => void;
}

export class ToolExecutor {
  /**
   * 批量执行工具调用
   */
  async executeBatch(
    toolCalls: ToolCall[],
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const messages: Message[] = [];
    let hasError = false;

    for (const call of toolCalls) {
      try {
        const result = await this.executeSingle(call, context);
        messages.push(result);
      } catch (error) {
        hasError = true;
        
        if (error instanceof ToolError) {
          messages.push({ ...error.data });
        } else {
          messages.push({
            messageId: context.baseMessageId,
            role: 'tool',
            type: 'text',
            content: `Error: Unknown tool execution error - ${error instanceof Error ? error.message : String(error)}`,
            tool_call_id: call.id,
          });
        }
      }
    }

    const summary = this.generateSummary(messages);

    return {
      messages,
      hasError,
      summary,
    };
  }

  /**
   * 执行单个工具
   */
  private async executeSingle(
    toolCall: ToolCall,
    context: ToolExecutionContext
  ): Promise<Message> {
    const uniqueMessageId = `${context.baseMessageId}-${toolCall.id}`;
    const { name, arguments: args } = toolCall.function;

    if (!name) {
      throw new ToolError({
        messageId: context.baseMessageId,
        role: 'tool',
        type: 'text',
        content: 'Error: Tool name is empty',
        tool_call_id: toolCall.id,
      });
    }

    // 通知工具调用开始
    context.onToolCall?.({
      messageId: uniqueMessageId,
      toolName: name,
      args,
    });

    const startTime = Date.now();
    
    try {
      const result = await ToolRegistry.execute(name, args);
      const duration = Date.now() - startTime;

      // 通知工具调用完成
      context.onToolResult?.({
        messageId: uniqueMessageId,
        toolName: name,
        result,
        duration,
      });

      return {
        messageId: context.baseMessageId,
        role: 'tool',
        type: 'text',
        content: this.formatResult(result),
        tool_call_id: toolCall.id,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      // 通知工具调用失败
      context.onToolResult?.({
        messageId: uniqueMessageId,
        toolName: name,
        result: { success: false, error: errorMsg },
        duration,
      });

      throw new ToolError({
        messageId: context.baseMessageId,
        role: 'tool',
        type: 'text',
        content: `Error: Tool execution failed - ${errorMsg}`,
        tool_call_id: toolCall.id,
      });
    }
  }

  /**
   * 格式化工具结果
   */
  private formatResult(result: ToolResult): string {
    if (!result.success) {
      return `Error: ${result.error || 'Unknown error'}`;
    }

    if (result.data !== undefined) {
      return typeof result.data === 'string' 
        ? result.data 
        : JSON.stringify(result.data, null, 2);
    }

    if (result.metadata) {
      return JSON.stringify(result.metadata, null, 2);
    }

    return 'Tool executed successfully';
  }

  /**
   * 生成执行摘要
   */
  private generateSummary(messages: Message[]): string {
    return messages
      .map(m => {
        const content = m.content || '';
        return content.length > 50 ? content.slice(0, 47) + '...' : content;
      })
      .join(', ');
  }
}
