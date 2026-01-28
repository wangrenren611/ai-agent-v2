/**
 * Chat Message Component
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { ChatMessage } from '../types';
import MarkdownText from './MarkdownText';
import { ICONS, COLORS } from '../utils/constants';

interface ChatMessageProps {
  message: ChatMessage;
  index: number;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, index }) => {
  // Tool call message
  if (message.role === 'tool-call') {
    const icon = message.toolStatus === 'calling'
      ? ICONS.TOOL_CALLING
      : message.toolStatus === 'success'
        ? ICONS.TOOL_SUCCESS
        : ICONS.TOOL_ERROR;

    const color = message.toolStatus === 'calling'
      ? COLORS.WARNING
      : message.toolStatus === 'success'
        ? COLORS.SECONDARY
        : COLORS.ERROR;

    return (
      <Box key={`tool-${index}-${message.timestamp.getTime()}`} flexDirection="column" marginBottom={1}>
        <Box>
          <Text bold color={color}>{icon} {message.toolName}</Text>
          {message.toolArgs && (
            <Text dimColor color={COLORS.DIM}>({message.toolArgs})</Text>
          )}
        </Box>
        {message.toolOutput && (
          <Box marginLeft={3}>
            <Text dimColor color={COLORS.DIM}>{message.toolOutput}</Text>
          </Box>
        )}
      </Box>
    );
  }

  // System message
  if (message.role === 'system') {
    const lines = message.content.split('\n');
    return (
      <Box key={`msg-${index}-${message.timestamp.getTime()}`} flexDirection="column" marginBottom={1}>
        <Box>
          <Text bold color={COLORS.WARNING}>{ICONS.SYSTEM} {lines[0]}</Text>
        </Box>
        {lines.length > 1 && (
          <Box marginLeft={3}>
            <Text dimColor wrap="wrap">
              {lines.slice(1).join('\n')}
            </Text>
          </Box>
        )}
      </Box>
    );
  }

  // Regular message (user or assistant)
  const prefix = message.role === 'user' ? ICONS.USER : ICONS.ASSISTANT;
  const roleColor = message.role === 'user' ? COLORS.PRIMARY : COLORS.SECONDARY;

  // Streaming indicator
  const streamingIndicator = message.isStreaming ? (
    <Text dimColor color={COLORS.WARNING}> …</Text>
  ) : null;

  return (
    <Box key={`msg-${index}-${message.timestamp.getTime()}`} flexDirection="row" >
      <Box height={1} >
        <Text bold color={roleColor} >{prefix}</Text>
        <Text> {streamingIndicator}</Text>
      </Box>
      <MarkdownText  content={message.content} isStreaming={message.isStreaming} />
    </Box>
  );
};

export default ChatMessage;
