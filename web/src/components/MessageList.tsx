'use client';

import { Message } from '@agent/providers/base';
import ReactMarkdown from 'react-markdown';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

export default function MessageList({ messages, isLoading }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.length === 0 && !isLoading && (
        <div className="flex items-center justify-center h-full text-zinc-400">
          <p>No messages yet. Start a conversation!</p>
        </div>
      )}
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              message.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
            }`}
          >
            {message.role === 'tool' ? (
              // Tool result message (role === 'tool')
              <details className="text-sm">
                <summary className="cursor-pointer font-semibold">Tool Result</summary>
                <pre className="mt-2 whitespace-pre-wrap break-words text-xs overflow-x-auto">
                  {message.content}
                </pre>
              </details>
            ) : message.type === 'tool' ? (
              // Tool call message (type === 'tool')
              <div className="text-xs opacity-70 mb-1">
                <span className="font-semibold">Tool Call:</span> {message.content}
              </div>
            ) : message.type === 'tool_call' ? (
              // Tool call message (type === 'tool_call')
              <div className="text-sm">
                <span className="font-semibold">Calling tools...</span>
              </div>
            ) : message.type === 'text' || !message.type ? (
              // Regular text message
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            ) : (
              // Other message types (summary, etc.)
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            )}
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-3">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
