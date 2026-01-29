/**
 * Chat Message Component
 *
 * Displays user and assistant messages
 */

import React from 'react';
import { Box, Text } from 'ink';
import { ICONS, COLORS } from '../../utils/constants';
import type { ChatMessage } from '../../types';
import MarkdownText from './markdown-text';
import SystemMessage from './system-message';
import ToolCallMessage from './tool-call-message';

interface ChatMessageProps {
  message: ChatMessage;
  index: number;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, index }) => {
  // Tool call message
  if (message.role === 'tool-call') {
    return <ToolCallMessage message={message} />;
  }

  // System message
  if (message.role === 'system') {
    return <SystemMessage message={message} />;
  }

  // Regular message (user or assistant)
  const prefix = message.role === 'user' ? ICONS.USER : ICONS.ASSISTANT;
  const roleColor = message.role === 'user' ? COLORS.PRIMARY : COLORS.SECONDARY;

  // Streaming indicator
  const streamingIndicator = message.isStreaming ? (
    <Text dimColor color={COLORS.WARNING}> …</Text>
  ) : null;

  return (
    <Box key={`msg-${index}-${message.timestamp.getTime()}`} flexDirection="row">
      <Box>
        <Text bold color={roleColor}>{prefix} </Text>
        <Text>{streamingIndicator}</Text>
      </Box>
      <MarkdownText content={message.content} isStreaming={message.isStreaming} />
    </Box>
  );
};

export default ChatMessage;
