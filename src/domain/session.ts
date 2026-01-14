/**
 * Session 领域模型
 * 表示一个用户会话
 */
export interface Session {
    id: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * 创建新会话
 */
export function createSession(userId: string): Session {
    const now = new Date();
    return {
        id: generateSessionId(),
        userId,
        createdAt: now,
        updatedAt: now,
    };
}

/**
 * 生成会话 ID
 */
function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}
