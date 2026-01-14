/**
 * 输入相关工具函数
 */

/**
 * 输入历史记录（支持上下箭头导航）
 */
export class InputHistory {
    private history: string[] = [];
    private index = -1;
    private readonly maxSize = 100;

    add(input: string): void {
        // 跳过空输入和重复输入
        const trimmed = input.trim();
        if (!trimmed) return;
        if (this.history[this.history.length - 1] === trimmed) return;

        this.history.push(trimmed);

        // 限制历史记录大小
        if (this.history.length > this.maxSize) {
            this.history.shift();
        }

        // 重置索引
        this.index = this.history.length;
    }

    /**
     * 获取上一条历史记录
     * @returns 如果已经是第一个，返回 null
     */
    getPrevious(): string | null {
        if (this.history.length === 0) return null;
        // 如果已经在第一个，不能再向前
        if (this.index <= 0) return null;
        this.index--;
        return this.history[this.index];
    }

    /**
     * 获取下一条历史记录
     * @returns 如果已经是最后一个，返回 null
     */
    getNext(): string | null {
        if (this.history.length === 0) return null;
        // 如果已经超过或等于最后一个，不能再向后
        if (this.index >= this.history.length - 1) return null;
        this.index++;
        return this.history[this.index];
    }

    reset(): void {
        this.index = this.history.length;
    }

    getAll(): string[] {
        return [...this.history];
    }

    clear(): void {
        this.history = [];
        this.index = -1;
    }
}

/**
 * 格式化输入提示
 */
export function formatPrompt(prompt: string, sessionId?: string): string {
    if (sessionId) {
        return `${prompt} [${sessionId.slice(-8)}]`;
    }
    return prompt;
}

/**
 * 检测是否是命令
 */
export function isCommand(input: string): boolean {
    return input.trim().startsWith('/');
}

/**
 * 提取命令名称
 */
export function extractCommandName(input: string): string | null {
    if (!isCommand(input)) return null;

    const match = input.trim().match(/^\/(\w+)/);
    return match ? match[1] : null;
}
