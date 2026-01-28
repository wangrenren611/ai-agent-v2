/**
 * Message List Component
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { ChatMessage } from '../types';
import ChatMessageComp from './ChatMessage';
import { MAX_DISPLAYED_MESSAGES, MESSAGES, COLORS } from '../utils/constants';

interface MessageListProps {
  messages: ChatMessage[];
  currentResponse: string;
}

const MessageList: React.FC<MessageListProps> = ({ messages, currentResponse }) => {
  // Display messages with optional streaming response
  const displayedMessages = React.useMemo(() => {
    // If there's a streaming response, temporarily replace the last assistant message
    // (if it exists) with the streaming version
    const lastMessage = messages[messages.length - 1];

    if (currentResponse && lastMessage?.role === 'assistant') {
      // Replace last assistant message with streaming version
      const streamingMessage: ChatMessage = {
        ...lastMessage,
        content: currentResponse,
        isStreaming: true,
      };
      return [
        ...messages.slice(0, -1),
        streamingMessage,
      ];
    } else if (currentResponse) {
      // If no last assistant message, add streaming message as new
      const streamingMessage: ChatMessage = {
        role: 'assistant',
        content: currentResponse,
        timestamp: new Date(),
        isStreaming: true,
      };
      return [...messages, streamingMessage];
    }

    // No streaming response, display as-is
    return messages;
  }, [messages, currentResponse]);

  // Empty state
  if (displayedMessages.length === 0) {
    return (
      <Box flexGrow={1} justifyContent="center" paddingY={2}>
        <Text dimColor color={COLORS.DIM}>{MESSAGES.NO_MESSAGES}</Text>
      </Box>
    );
  }

  // Display last N messages
  const visibleMessages = displayedMessages.slice(-MAX_DISPLAYED_MESSAGES);

  return (
    <Box flexDirection="column" flexGrow={1} paddingY={1}>
      {visibleMessages.map((msg, index) => (
        <ChatMessageComp
          key={`${msg.role}-${index}-${msg.timestamp.getTime()}`}
          message={msg}
          index={index}
        />
      ))}
    </Box>
  );
};

export default MessageList;
