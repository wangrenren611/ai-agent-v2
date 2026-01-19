import { create } from 'zustand';
import { UnifiedMessage } from '@/components/thread/types';

export type AgentStatus = 'idle' | 'running' | 'connecting' | 'error';

export interface ChatState {
  // State
  messages: UnifiedMessage[];
  currentSessionId: string | null;
  isLoading: boolean;
  agentStatus: AgentStatus;
  userId: string;
  processingMessage: boolean;

  // Actions
  setMessages: (messages: UnifiedMessage[]) => void;
  addMessage: (message: UnifiedMessage) => void;
  updateMessage: (messageId: string, updates: Partial<UnifiedMessage>) => void;
  setCurrentSessionId: (sessionId: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setAgentStatus: (status: AgentStatus) => void;
  setUserId: (userId: string) => void;
  setProcessingMessage: (processing: boolean) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  // Initial state
  messages: [],
  currentSessionId: null,
  isLoading: false,
  agentStatus: 'idle',
  userId: '',
  processingMessage: false,

  // Actions
  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateMessage: (messageId, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.message_id === messageId ? { ...m, ...updates } : m
      ),
    })),

  setCurrentSessionId: (sessionId) => set({ currentSessionId: sessionId }),

  setIsLoading: (isLoading) => set({ isLoading }),

  setAgentStatus: (agentStatus) => set({ agentStatus }),

  setUserId: (userId) => set({ userId }),

  setProcessingMessage: (processingMessage) => set({ processingMessage }),

  clearMessages: () => set({ messages: [] }),
}));
