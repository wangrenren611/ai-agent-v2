import { apiClient } from '../client';
import type { Session } from '../../stores/session-store';

/**
 * Sessions list response
 */
export interface SessionsResponse {
  sessions: Session[];
}

/**
 * Create session request
 */
export interface CreateSessionRequest {
  userId?: string;
}

/**
 * Create session response
 */
export interface CreateSessionResponse {
  sessionId: string;
}

/**
 * Sessions API endpoints
 */
export const sessionsApi = {
  /**
   * Get all sessions
   */
  async getSessions(): Promise<SessionsResponse> {
    const { data } = await apiClient.get<SessionsResponse>('/api/sessions');
    return data;
  },

  /**
   * Create a new session
   */
  async createSession(request: CreateSessionRequest): Promise<CreateSessionResponse> {
    const { data } = await apiClient.post<CreateSessionResponse>('/api/sessions', request);
    return data;
  },

  /**
   * Get a specific session
   */
  async getSession(sessionId: string): Promise<Session> {
    const { data } = await apiClient.get<Session>(`/api/sessions/${sessionId}`);
    return data;
  },

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await apiClient.delete(`/api/sessions/${sessionId}`);
  },
};
