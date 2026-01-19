import { apiClient } from '../client';
import type { ChatRequest, ChatResponse, MessagesResponse } from '@/lib/types';

/**
 * Chat API endpoints
 */
export const chatApi = {
  /**
   * Send a chat message
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const { data } = await apiClient.post<ChatResponse>('/api/chat', request);
    return data;
  },

  /**
   * Get messages for a session
   */
  async getMessages(sessionId: string): Promise<MessagesResponse> {
    const { data } = await apiClient.get<MessagesResponse>(`/api/messages/${sessionId}`);
    return data;
  },

  /**
   * Clear messages for a session
   */
  async clearMessages(sessionId: string): Promise<void> {
    await apiClient.delete(`/api/messages/${sessionId}`);
  },
};
