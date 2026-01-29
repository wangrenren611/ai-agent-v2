/**
 * Message List Component
 *
 * Displays chat messages with streaming support
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { ICONS, MESSAGES, COLORS, MAX_DISPLAYED_MESSAGES } from '../../utils/constants';
import type { ChatMessage } from '../../types';
import ChatMessageComp from './chat-message';

interface MessageListProps {
  messages: ChatMessage[];
  currentResponse: string;
}

const MessageList: React.FC<MessageListProps> = ({ messages, currentResponse }) => {
  // Display messages with optional streaming response
  const displayedMessages = useMemo(() => {
    const lastMessage = messages[messages.length - 1];

    if (currentResponse && lastMessage?.role === 'assistant') {
      // Replace last assistant message with streaming version
      const streamingMessage: ChatMessage = {
        ...lastMessage,
        content: currentResponse,
        isStreaming: true,
      };
      return [...messages.slice(0, -1), streamingMessage];
    } else if (currentResponse) {
      // Add new streaming message
      const streamingMessage: ChatMessage = {
        role: 'assistant',
        content: currentResponse,
        timestamp: new Date(),
        isStreaming: true,
      };
      return [...messages, streamingMessage];
    }

    return messages;
  }, [messages, currentResponse]);

  // Check if last message is a system error
  const lastMessage = displayedMessages[displayedMessages.length - 1];
  const hasError = lastMessage?.role === 'system' &&
                   lastMessage.content.toLowerCase().includes('error');

  // Empty state
  if (displayedMessages.length === 0) {
    return (
      <Box flexGrow={1} justifyContent="center" >
        <Text dimColor color={COLORS.DIM}>{MESSAGES.NO_MESSAGES}</Text>
      </Box>
    );
  }

  // Display last N messages
  const visibleMessages = displayedMessages.slice(-MAX_DISPLAYED_MESSAGES);

  return (
    <Box flexDirection="column">
      {visibleMessages?.map?.((msg, index) => (
        <ChatMessageComp
          key={`${msg.role}-${index}-${msg.timestamp.getTime()}`}
          message={msg}
          index={index}
        />
      ))}
      {/* Error indicator */}
      {hasError && (
        <Box >
          <Text color={COLORS.ERROR}>
            {ICONS.TOOL_ERROR} {lastMessage?.content}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default MessageList;
