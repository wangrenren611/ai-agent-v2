import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsApi } from '../api/endpoints';

/**
 * Query keys for session operations
 */
export const sessionKeys = {
  all: ['sessions'] as const,
  lists: () => ['sessions', 'list'] as const,
  list: (filters: Record<string, unknown>) => ['sessions', 'list', filters] as const,
  details: () => ['sessions', 'detail'] as const,
  detail: (id: string) => ['sessions', 'detail', id] as const,
};

/**
 * Hook to fetch all sessions
 */
export function useSessions() {
  return useQuery({
    queryKey: sessionKeys.lists(),
    queryFn: () => sessionsApi.getSessions(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch a single session
 */
export function useSession(sessionId: string | null) {
  return useQuery({
    queryKey: sessionKeys.detail(sessionId ?? 'none'),
    queryFn: () => sessionsApi.getSession(sessionId ?? ''),
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to create a new session
 */
export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sessionsApi.createSession,
    onSuccess: () => {
      // Invalidate sessions list query
      queryClient.invalidateQueries({
        queryKey: sessionKeys.lists(),
      });
    },
  });
}

/**
 * Hook to delete a session
 */
export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => sessionsApi.deleteSession(sessionId),
    onSuccess: () => {
      // Invalidate sessions list query
      queryClient.invalidateQueries({
        queryKey: sessionKeys.lists(),
      });
    },
  });
}
