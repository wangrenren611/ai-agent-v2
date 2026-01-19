'use client';

import React, { useRef, useState, useEffect, useMemo, memo } from 'react';
import { UnifiedMessage, AgentInfo, StreamingToolCall } from './types';
import { StreamingText } from './StreamingText';
import { ShowToolStream } from './ShowToolStream';
import ReactMarkdown from 'react-markdown';

type MessageGroup = {
  type: 'user' | 'assistant_group';
  messages: UnifiedMessage[];
  key: string;
};

// Agent header component
const AgentHeader = memo(function AgentHeader({ agentInfo }: { agentInfo: AgentInfo }) {
  return (
    <div className="flex items-center gap-2">
      {agentInfo.avatar && (
        <div className="h-5 w-5 flex items-center justify-center rounded">
          {agentInfo.avatar}
        </div>
      )}
      <p className="text-sm text-muted-foreground">{agentInfo.name}</p>
    </div>
  );
});

// User message row
const UserMessageRow = memo(function UserMessageRow({
  message,
  groupKey,
}: {
  message: UnifiedMessage;
  groupKey: string;
}) {
  const messageContent = useMemo(() => {
    try {
      const parsed = JSON.parse(message.content);
      return parsed.content || message.content;
    } catch {
      return message.content;
    }
  }, [message.content]);

  return (
    <div key={groupKey} className="flex justify-end">
      <div className="flex max-w-[85%] rounded-3xl rounded-br-sm bg-blue-600 text-white px-4 py-2.5 break-words overflow-hidden">
        <div className="min-w-0 flex-1">
          <p className="text-sm whitespace-pre-wrap break-words">{messageContent}</p>
        </div>
      </div>
    </div>
  );
});

// Assistant group row
const AssistantGroupRow = memo(function AssistantGroupRow({
  group,
  isLastGroup,
  agentInfo,
  handleToolClick,
  streamingTextContent,
  streamingToolCall,
  streamHookStatus,
  agentStatus,
}: {
  group: MessageGroup;
  isLastGroup: boolean;
  agentInfo: AgentInfo;
  handleToolClick?: (messageId: string | null, toolName: string, toolCallId?: string) => void;
  streamingTextContent?: string;
  streamingToolCall?: StreamingToolCall;
  streamHookStatus?: string;
  agentStatus: string;
}) {
  const isStreaming = streamHookStatus === 'streaming' || streamHookStatus === 'connecting';
  const isAgentRunning = agentStatus === 'running' || agentStatus === 'connecting';

  // Tool results map
  const toolResultsMap = useMemo(() => {
    const map = new Map<string | null, UnifiedMessage[]>();
    group.messages.forEach((msg) => {
      if (msg.type === 'tool') {
        try {
          const meta = JSON.parse(msg.metadata || '{}');
          const assistantId = meta.assistant_message_id || null;
          if (!map.has(assistantId)) {
            map.set(assistantId, []);
          }
          map.get(assistantId)?.push(msg);
        } catch {
          // Skip invalid metadata
        }
      }
    });
    return map;
  }, [group.messages]);

  const assistantMessages = useMemo(
    () => group.messages.filter((m) => m.type === 'assistant'),
    [group.messages]
  );

  const renderedMessages = useMemo(() => {
    const elements: React.ReactNode[] = [];

    group.messages.forEach((message, msgIndex) => {
      if (message.type === 'assistant') {
        const msgKey = message.message_id || `submsg-assistant-${msgIndex}`;
        const toolResults = toolResultsMap.get(message.message_id ?? null) || [];

        // Parse metadata to check for tool calls
        let hasToolCalls = false;
        try {
          const metadata = JSON.parse(message.metadata || '{}');
          hasToolCalls = (metadata.tool_calls?.length || 0) > 0;
        } catch {
          // Invalid metadata
        }

        elements.push(
          <div key={msgKey} className="space-y-2">
            {/* Message content */}
            {message.content && (
              <div className="text-sm text-foreground">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}

            {/* Tool calls if present */}
            {hasToolCalls && (
              <div className="text-xs text-muted-foreground">
                Used {toolResults.length} tool{toolResults.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        );
      }
    });

    return elements;
  }, [group.messages, toolResultsMap]);

  // Streaming content
  const streamingContent = useMemo(() => {
    if (!isLastGroup || !isAgentRunning) return null;
    if (!streamingTextContent && !streamingToolCall) return null;

    return (
      <div className="mt-2 space-y-2">
        {streamingTextContent && (
          <StreamingText content={streamingTextContent} isStreaming={isStreaming} />
        )}
        {streamingToolCall && (
          <ShowToolStream
            content={JSON.stringify(streamingToolCall)}
            messageId={streamingToolCall.message_id}
            onToolClick={handleToolClick}
            showExpanded={false}
          />
        )}
      </div>
    );
  }, [
    isLastGroup,
    isAgentRunning,
    streamingTextContent,
    streamingToolCall,
    isStreaming,
    handleToolClick,
  ]);

  // Loading indicator
  const showLoader = useMemo(() => {
    if (!isLastGroup) return false;
    if (agentStatus !== 'running' && agentStatus !== 'connecting') return false;
    if (streamingTextContent || streamingToolCall) return false;
    if (streamHookStatus !== 'streaming' && streamHookStatus !== 'connecting') return false;
    return true;
  }, [
    isLastGroup,
    agentStatus,
    streamingTextContent,
    streamingToolCall,
    streamHookStatus,
  ]);

  return (
    <div className="flex flex-col gap-2">
      <AgentHeader agentInfo={agentInfo} />
      <div className="flex w-full break-words">
        <div className="space-y-1.5 min-w-0 flex-1">
          {renderedMessages}
          {streamingContent}
          {showLoader && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>Thinking...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// Main ThreadContent component
export interface ThreadContentProps {
  messages: UnifiedMessage[];
  streamingTextContent?: string;
  streamingToolCall?: StreamingToolCall;
  agentStatus: 'idle' | 'running' | 'connecting' | 'error';
  streamHookStatus?: string;
  onToolClick?: (messageId: string | null, toolName: string, toolCallId?: string) => void;
  agentName?: string;
  agentAvatar?: React.ReactNode;
}

export const ThreadContent: React.FC<ThreadContentProps> = memo(
  function ThreadContent({
    messages,
    streamingTextContent = '',
    streamingToolCall,
    agentStatus,
    streamHookStatus = 'idle',
    onToolClick,
    agentName = 'Agent',
    agentAvatar,
  }) {
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const latestMessageRef = useRef<HTMLDivElement>(null);
    const prevMessagesLengthRef = useRef(0);

    // Auto-scroll to bottom
    useEffect(() => {
      const container = messagesContainerRef.current;
      if (!container) return;

      const shouldScroll =
        messages.length !== prevMessagesLengthRef.current ||
        agentStatus === 'running' ||
        agentStatus === 'connecting';

      if (shouldScroll) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      }

      prevMessagesLengthRef.current = messages.length;
    }, [messages, agentStatus]);

    // Agent info
    const agentInfo = useMemo<AgentInfo>(() => {
      return {
        name: agentName,
        avatar: agentAvatar || (
          <div className="h-5 w-5 flex items-center justify-center rounded bg-blue-100 dark:bg-blue-900/30">
            <span className="text-xs">🤖</span>
          </div>
        ),
      };
    }, [agentName, agentAvatar]);

    // Group messages
    const groupedMessages = useMemo(() => {
      const groups: MessageGroup[] = [];
      let currentGroup: MessageGroup | null = null;
      let assistantGroupCounter = 0;

      messages.forEach((message, index) => {
        const messageType = message.type;
        const key = message.message_id || `msg-${index}`;

        if (messageType === 'user') {
          if (currentGroup) {
            groups.push(currentGroup);
            currentGroup = null;
          }
          groups.push({ type: 'user', messages: [message], key });
        } else if (
          messageType === 'assistant' ||
          messageType === 'tool' ||
          messageType === 'browser_state'
        ) {
          const canAddToExistingGroup =
            currentGroup && currentGroup.type === 'assistant_group';

          if (canAddToExistingGroup) {
            currentGroup?.messages.push(message);
          } else {
            if (currentGroup) {
              groups.push(currentGroup);
            }
            assistantGroupCounter++;
            currentGroup = {
              type: 'assistant_group',
              messages: [message],
              key: `assistant-group-${assistantGroupCounter}`,
            };
          }
        }
      });

      if (currentGroup) {
        groups.push(currentGroup);
      }

      return groups;
    }, [messages]);

    // Empty state
    if (messages.length === 0 && !streamingTextContent && !streamingToolCall && agentStatus === 'idle') {
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center space-y-2">
            <p className="text-4xl">🤖</p>
            <p>Start a conversation...</p>
          </div>
        </div>
      );
    }

    // Render message group
    const renderMessageGroup = (group: MessageGroup, index: number) => {
      const isLastGroup = index === groupedMessages.length - 1;

      if (group.type === 'user') {
        return (
          <div key={group.key}>
            <UserMessageRow message={group.messages[0]} groupKey={group.key} />
          </div>
        );
      }

      return (
        <div key={group.key} ref={isLastGroup ? latestMessageRef : null}>
          <AssistantGroupRow
            group={group}
            isLastGroup={isLastGroup}
            agentInfo={agentInfo}
            handleToolClick={onToolClick}
            streamingTextContent={streamingTextContent}
            streamingToolCall={streamingToolCall}
            streamHookStatus={streamHookStatus}
            agentStatus={agentStatus}
          />
        </div>
      );
    };

    return (
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scroll-smooth"
      >
        {groupedMessages.map((group, index) => renderMessageGroup(group, index))}

        {/* Bottom spacer for scrolling */}
        <div ref={latestMessageRef} className="h-4" />
      </div>
    );
  }
);

export default ThreadContent;
