'use client';

import { Message } from '@agent/providers/base';
import { ExtendedMessage, ThinkingStep, TodoItem } from '../lib/types';
import ReactMarkdown from 'react-markdown';

interface MessageListProps {
  messages: ExtendedMessage[];
  isLoading?: boolean;
  thinkingSteps?: ThinkingStep[];
  todos?: TodoItem[];
}

export default function MessageList({ messages, isLoading, thinkingSteps = [], todos = [] }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.length === 0 && !isLoading && thinkingSteps.length === 0 && (
        <div className="flex items-center justify-center h-full text-zinc-400">
          <p>No messages yet. Start a conversation!</p>
        </div>
      )}

      {/* Render thinking steps if loading and there are steps */}
      {(isLoading || thinkingSteps.length > 0) && thinkingSteps.length > 0 && (
        <ThinkingProcessView steps={thinkingSteps} />
      )}

      {/* Render todo list if available */}
      {todos.length > 0 && (
        <TodoListView todos={todos} />
      )}

      {messages.map((message, index) => {
        const isUser = message.role === 'user';

        return (
          <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                isUser
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
              }`}
            >
              {/* Message content */}
              {message.role === 'tool' ? (
                <ToolResultView content={message.content} />
              ) : message.type === 'tool' ? (
                <ToolCallView content={message.content} />
              ) : message.type === 'tool_call' ? (
                <div className="text-sm">
                  <span className="font-semibold">Calling tools...</span>
                </div>
              ) : message.type === 'text' || !message.type ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              )}

              {/* Thinking steps for this message if available */}
              {message.thinkingSteps && message.thinkingSteps.length > 0 && (
                <ThinkingProcessView steps={message.thinkingSteps} />
              )}

              {/* Todo list for this message if available */}
              {message.todos && message.todos.length > 0 && (
                <TodoListView todos={message.todos} />
              )}
            </div>
          </div>
        );
      })}

      {/* Loading indicator */}
      {isLoading && thinkingSteps.length === 0 && (
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

// Thinking process view component
function ThinkingProcessView({ steps }: { steps: ThinkingStep[] }) {
  return (
    <div className="mt-3 border-t border-zinc-200 dark:border-zinc-700 pt-2">
      <details className="group">
        <summary className="cursor-pointer text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 flex items-center gap-1">
          <span className="transform group-open:rotate-90 transition-transform">▶</span>
          <span>Thinking Process ({steps.length} steps)</span>
        </summary>
        <div className="mt-2 space-y-1">
          {steps.map((step) => (
            <div key={step.id} className="text-xs font-mono">
              <span className="text-zinc-400">[{step.iteration ? `#${step.iteration}`: '...'}</span>{' '}
              <span className={
                step.type === 'tool_call' ? 'text-blue-500' :
                step.type === 'tool_result' ? 'text-green-500' :
                'text-zinc-600 dark:text-zinc-400'
              }>
                {step.content}
              </span>
              {step.duration && <span className="text-zinc-400 ml-1">({step.duration}ms)</span>}
              {step.toolParams ? (
                <details className="ml-2 text-zinc-500">
                  <summary className="cursor-pointer hover:text-zinc-600">params</summary>
                  <pre className="text-xs overflow-x-auto">{JSON.stringify(step.toolParams, null, 2)}</pre>
                </details>
              ) : null}
              {step.toolResult && typeof step.toolResult === 'string' ? (
                <details className="ml-2 text-zinc-500">
                  <summary className="cursor-pointer hover:text-zinc-600">result</summary>
                  <pre className="text-xs overflow-x-auto max-h-32 overflow-y-auto">
                    {step.toolResult.length > 500 ? `${step.toolResult.slice(0, 500)}...` : step.toolResult}
                  </pre>
                </details>
              ) : null}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

// Todo list view component
function TodoListView({ todos }: { todos: TodoItem[] }) {
  const pendingCount = todos.filter(t => t.status === 'pending').length;
  const inProgressCount = todos.filter(t => t.status === 'in_progress').length;
  const completedCount = todos.filter(t => t.status === 'completed').length;

  return (
    <div className="mt-3 border-t border-zinc-200 dark:border-zinc-700 pt-2">
      <details className="group" open>
        <summary className="cursor-pointer text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 flex items-center gap-1">
          <span className="transform group-open:rotate-90 transition-transform">▶</span>
          <span>Task List ({todos.length} tasks)</span>
          <span className="ml-auto text-zinc-400">
            {completedCount}/{todos.length} done
          </span>
        </summary>
        <div className="mt-2 space-y-1">
          {todos.map((todo) => (
            <div key={todo.id} className="flex items-center gap-2 text-xs">
              <span className={
                todo.status === 'completed' ? 'text-green-500' :
                todo.status === 'in_progress' ? 'text-yellow-500' :
                'text-zinc-400'
              }>
                {todo.status === 'completed' ? '✓' :
                 todo.status === 'in_progress' ? '◐' :
                 '○'}
              </span>
              <span className={
                todo.status === 'completed' ? 'line-through text-zinc-400' :
                todo.status === 'in_progress' ? 'text-yellow-600 dark:text-yellow-400' :
                'text-zinc-600 dark:text-zinc-400'
              }>
                {todo.status === 'in_progress' ? todo.activeForm : todo.content}
              </span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

// Tool result view component
function ToolResultView({ content }: { content: string }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-semibold">Tool Result</summary>
      <pre className="mt-2 whitespace-pre-wrap break-words text-xs overflow-x-auto max-h-60 overflow-y-auto">
        {content}
      </pre>
    </details>
  );
}

// Tool call view component
function ToolCallView({ content }: { content: string }) {
  return (
    <div className="text-xs opacity-70 mb-1">
      <span className="font-semibold">Tool Call:</span> {content}
    </div>
  );
}
