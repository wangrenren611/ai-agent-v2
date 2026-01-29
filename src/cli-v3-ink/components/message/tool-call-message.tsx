/**
 * Tool Call Message Component
 *
 * Displays tool execution status and results
 */

import React from 'react';
import { Box, Text } from 'ink';
import { ICONS, COLORS } from '../../utils/constants';
import { formatToolArgs, formatToolOutput } from '../../utils/formatters';
import type { ChatMessage } from '../../types';

interface ToolCallMessageProps {
  message: ChatMessage;
}

const ToolCallMessage: React.FC<ToolCallMessageProps> = ({ message }) => {
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
    <Box flexDirection="column" >
      <Box>
        <Text bold color={color}>
          {icon} {message.toolName}
        </Text>
        {message.toolArgs && (
          <Text dimColor color={COLORS.DIM}>
            ({formatToolArgs(message.toolArgs)})
          </Text>
        )}
      </Box>
      {message.toolOutput && (
        <Box marginLeft={3}>
          <Text dimColor color={COLORS.DIM}>
            {formatToolOutput(message.toolOutput)}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default ToolCallMessage;
