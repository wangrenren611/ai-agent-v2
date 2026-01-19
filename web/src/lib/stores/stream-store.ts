import { create } from 'zustand';
import { StreamingToolCall } from '@/components/thread/types';

export type StreamStatus = 'streaming' | 'connecting' | 'idle';

export interface StreamState {
  // State
  streamingTextContent: string;
  streamingToolCall: StreamingToolCall | undefined;
  streamStatus: StreamStatus;
  currentMessageId: string | null;

  // Actions
  setStreamingTextContent: (content: string) => void;
  appendToStreamingContent: (content: string) => void;
  setStreamingToolCall: (toolCall: StreamingToolCall | undefined) => void;
  setStreamStatus: (status: StreamStatus) => void;
  setCurrentMessageId: (messageId: string | null) => void;
  resetStream: () => void;
}

export const useStreamStore = create<StreamState>((set) => ({
  // Initial state
  streamingTextContent: '',
  streamingToolCall: undefined,
  streamStatus: 'idle',
  currentMessageId: null,

  // Actions
  setStreamingTextContent: (streamingTextContent) => set({ streamingTextContent }),

  appendToStreamingContent: (content) =>
    set((state) => ({
      streamingTextContent: state.streamingTextContent + content,
    })),

  setStreamingToolCall: (streamingToolCall) => set({ streamingToolCall }),

  setStreamStatus: (streamStatus) => set({ streamStatus }),

  setCurrentMessageId: (currentMessageId) => set({ currentMessageId }),

  resetStream: () =>
    set({
      streamingTextContent: '',
      streamingToolCall: undefined,
      streamStatus: 'idle',
      currentMessageId: null,
    }),
}));
