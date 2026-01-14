/**
 * 输出格式化工具
 */

/**
 * 格式化时间戳
 */
export function formatTimestamp(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
}

/**
 * 截断文本
 */
export function truncate(text: string, maxLength: number, suffix = '...'): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * 格式化消息预览
 */
export function formatMessagePreview(content: string, maxLength = 100): string {
    return truncate(content.replace(/\n/g, ' '), maxLength);
}

/**
 * 格式化角色图标
 */
export function formatRoleIcon(role: string): string {
    switch (role) {
        case 'user':
            return '👤';
        case 'assistant':
            return '🤖';
        case 'system':
            return '⚙️';
        default:
            return '❓';
    }
}

/**
 * 格式化列表项
 */
export function formatListItem(index: number, text: string, icon = '•'): string {
    const indexStr = String(index + 1).padStart(2, ' ');
    return `  ${indexStr}. ${icon} ${text}`;
}

/**
 * 创建分隔线
 */
export function separator(char = '─', length = 50): string {
    return char.repeat(length);
}

/**
 * 格式化会话 ID（只显示后8位）
 */
export function formatSessionId(sessionId: string): string {
    if (sessionId.length <= 8) return sessionId;
    return `...${sessionId.slice(-8)}`;
}
