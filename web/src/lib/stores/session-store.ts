import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Session {
  id: string;
  messageCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface SessionState {
  // State
  sessions: Session[];
  currentSessionId: string | null;
  lastActiveSessionId: string | null;

  // Actions
  setSessions: (sessions: Session[]) => void;
  addSession: (session: Session) => void;
  updateSession: (sessionId: string, updates: Partial<Session>) => void;
  removeSession: (sessionId: string) => void;
  setCurrentSessionId: (sessionId: string | null) => void;
  setLastActiveSessionId: (sessionId: string | null) => void;
  clearSessions: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      // Initial state
      sessions: [],
      currentSessionId: null,
      lastActiveSessionId: null,

      // Actions
      setSessions: (sessions) => set({ sessions }),

      addSession: (session) =>
        set((state) => ({
          sessions: [...state.sessions, session],
          currentSessionId: session.id,
          lastActiveSessionId: session.id,
        })),

      updateSession: (sessionId, updates) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
          ),
        })),

      removeSession: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
          currentSessionId:
            state.currentSessionId === sessionId ? null : state.currentSessionId,
        })),

      setCurrentSessionId: (sessionId) =>
        set({ currentSessionId: sessionId, lastActiveSessionId: sessionId }),

      setLastActiveSessionId: (sessionId) => set({ lastActiveSessionId: sessionId }),

      clearSessions: () =>
        set({ sessions: [], currentSessionId: null, lastActiveSessionId: null }),
    }),
    {
      name: 'session-storage',
      partialize: (state) => ({
        sessions: state.sessions,
        lastActiveSessionId: state.lastActiveSessionId,
      }),
    }
  )
);
