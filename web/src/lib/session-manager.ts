// Session manager wrapper
import { SessionManager as AgentSessionManager } from '@agent/session-v2';
import { LLMProvider } from '@agent/providers/base';

// Global session cache
const sessionCache = new Map<string, AgentSessionManager>();

export function getSessionManager(sessionId: string, llmProvider: LLMProvider, userId?: string): AgentSessionManager {
  if (!sessionCache.has(sessionId)) {
    const sessionManager = new AgentSessionManager({
      sessionId,
      llmProvider,
      userId: userId || 'web_user'
    });
    sessionCache.set(sessionId, sessionManager);
  }
  return sessionCache.get(sessionId)!;
}

export function hasSession(sessionId: string): boolean {
  return sessionCache.has(sessionId);
}

export function getAllSessionIds(): string[] {
  return Array.from(sessionCache.keys());
}

export function removeSession(sessionId: string): boolean {
  return sessionCache.delete(sessionId);
}

export function clearAllSessions(): void {
  sessionCache.clear();
}
