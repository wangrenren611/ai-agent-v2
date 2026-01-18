'use client';

import { useState, FormEvent, KeyboardEvent } from 'react';

interface InputBoxProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function InputBox({ onSend, disabled }: InputBoxProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-zinc-200 dark:border-zinc-700 p-4">
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-3 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          style={{ minHeight: '48px', maxHeight: '200px' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 200) + 'px';
          }}
        />
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white rounded-xl font-medium transition-colors disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </form>
  );
}
