/**
 * ToolError - 工具执行错误
 */

export interface Message {
    role: 'user' | 'assistant' | 'system' | 'tool';
    type?: 'text' | 'summary';
    content: string;
    tool_call_id?: string;
}

/**
 * 工具执行错误类
 */
export class ToolError extends Error {
    constructor(data: Message) {
        super(data.content || 'Tool execution failed');
        this.name = 'ToolError';
        this.data = data;
    }

    data: Message;
}
