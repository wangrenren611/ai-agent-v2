import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../api/endpoints';
import type { ChatRequest } from '../../lib/types';

/**
 * Query keys for chat operations
 */
export const chatKeys = {
  all: ['chat'] as const,
  messages: (sessionId: string) => ['chat', 'messages', sessionId] as const,
  message: (sessionId: string, messageId: string) => ['chat', 'messages', sessionId, messageId] as const,
};

/**
 * Hook to fetch messages for a session
 */
export function useMessages(sessionId: string | null) {
  return useQuery({
    queryKey: chatKeys.messages(sessionId ?? 'none'),
    queryFn: () => chatApi.getMessages(sessionId ?? ''),
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to send a message
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ChatRequest) => chatApi.sendMessage(request),
    onSuccess: (_data, variables) => {
      // Invalidate messages query to refetch
      queryClient.invalidateQueries({
        queryKey: chatKeys.messages(variables.sessionId),
      });
    },
  });
}

/**
 * Hook to clear messages
 */
export function useClearMessages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => chatApi.clearMessages(sessionId),
    onSuccess: (_data, variables) => {
      // Invalidate messages query
      queryClient.invalidateQueries({
        queryKey: chatKeys.messages(variables),
      });
    },
  });
}
