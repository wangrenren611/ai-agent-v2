import { Message } from "./message";


/**
 * 工具执行错误类
 */
export class ToolError extends Error {
    constructor(data: Message) {
        super((data?.content as string) || 'Tool execution failed');
        this.name = 'ToolError';
        this.data = data;
    }

    data: Message;
}
