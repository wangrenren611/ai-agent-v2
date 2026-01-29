import { Message as MessageType } from '../providers/providers/base';
import { ToolResult } from './types';

export type Message = {
    messageId: string;
    role:  MessageType['role'];
    content: MessageType['content'];
    type?: MessageType['type'] ;
    reasoning_content?: MessageType['reasoning_content'] | undefined;
    tool_call_id?: MessageType['tool_call_id'] | undefined;
    tool_calls?: MessageType['tool_calls'] | undefined;
    toolName?: string;
    args?: unknown;
    result?: ToolResult;
    duration?: number;
    parentMessageId?: string;
}

