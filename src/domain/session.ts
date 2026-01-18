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
 * @param userId 用户 ID
 * @param sessionId 可选的会话 ID，如果不提供则自动生成
 */
export function createSession(userId: string, sessionId?: string): Session {
    const now = new Date();
    return {
        id: sessionId || generateSessionId(),
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
