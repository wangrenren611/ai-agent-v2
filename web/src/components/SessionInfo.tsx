'use client';

import { Session } from '../lib/types';

interface SessionInfoProps {
  currentSessionId: string | null;
  messageCount: number;
  onClearMessages: () => void;
  onNewSession: () => void;
}

export default function SessionInfo({
  currentSessionId,
  messageCount,
  onClearMessages,
  onNewSession,
}: SessionInfoProps) {
  return (
    <div className="border-b border-zinc-200 dark:border-zinc-700 px-4 py-3 bg-white dark:bg-zinc-900 flex items-center justify-between">
      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        <span className="font-medium">Session:</span>{' '}
        <span className="font-mono text-xs">{currentSessionId || 'None'}</span>
        <span className="mx-2">•</span>
        <span className="font-medium">Messages:</span> {messageCount}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onClearMessages}
          disabled={!currentSessionId || messageCount === 0}
          className="px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Clear Messages
        </button>
        <button
          onClick={onNewSession}
          className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          New Session
        </button>
      </div>
    </div>
  );
}
