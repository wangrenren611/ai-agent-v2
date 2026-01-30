/**
 * Message 类型转换工具
 * 用于在 AgentMessage（扩展类型）和 ProviderMessage（基础类型）之间转换
 */

import { Message as ProviderMessage } from '../providers/providers/base';
import { Message as AgentMessage } from './message';
import { ToolResult } from './types';
import { uuid } from 'uuidv4';

// ============================================================================
// 转换函数
// ============================================================================

/**
 * 将 AgentMessage 转换为 ProviderMessage
 * 移除 Agent 层特有的扩展字段（messageId、toolName、args、result、duration、parentMessageId）
 */
export function toProviderMessage(agentMessage: AgentMessage): ProviderMessage {
    const { messageId, toolName, args, result, duration, parentMessageId, ...providerFields } = agentMessage;
    return providerFields as ProviderMessage;
}

/**
 * 批量转换 AgentMessage 到 ProviderMessage
 */
export function toProviderMessageList(agentMessages: AgentMessage[]): ProviderMessage[] {
    return agentMessages.map(toProviderMessage);
}

/**
 * 将 ProviderMessage 转换为 AgentMessage
 * 添加 Agent 层需要的扩展字段
 */
export function toAgentMessage(
    providerMessage: ProviderMessage,
    options?: {
        messageId?: string;
        toolName?: string;
        args?: unknown;
        result?: ToolResult;
        duration?: number;
        parentMessageId?: string;
    }
): AgentMessage {
    return {
        messageId: options?.messageId || uuid(),
        role: providerMessage.role,
        content: providerMessage.content,
        type: providerMessage.type,
        reasoning_content: providerMessage.reasoning_content,
        tool_call_id: providerMessage.tool_call_id,
        tool_calls: providerMessage.tool_calls,
        toolName: options?.toolName,
        args: options?.args,
        result: options?.result,
        duration: options?.duration,
        parentMessageId: options?.parentMessageId,
    };
}

/**
 * 批量转换 ProviderMessage 到 AgentMessage
 * 为每个消息生成 messageId
 */
export function toAgentMessageList(
    providerMessages: ProviderMessage[],
    options?: Omit<Parameters<typeof toAgentMessage>[1], 'messageId'>
): AgentMessage[] {
    return providerMessages.map((msg) => toAgentMessage(msg, options));
}

/**
 * 从 AgentMessage 中提取 ProviderMessage 的所有字段
 * 用于类型检查或过滤
 */
export function extractProviderFields(agentMessage: AgentMessage): Omit<AgentMessage, 'messageId' | 'toolName' | 'args' | 'result' | 'duration' | 'parentMessageId'> {
    const { messageId, toolName, args, result, duration, parentMessageId, ...providerFields } = agentMessage;
    return providerFields;
}

/**
 * 检查 AgentMessage 是否可以作为 ProviderMessage 使用（仅检查基础字段）
 */
export function isAgentMessageValid(agentMessage: AgentMessage): boolean {
    const providerMsg = toProviderMessage(agentMessage);
    return (
        !!providerMsg.role &&
        providerMsg.content !== undefined
    );
}
