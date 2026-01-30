/**
 * Tool Call Display Component
 *
 * Displays tool calls and results with improved styling
 */

import React from 'react';
import { Box, Text } from 'ink';
import { COLORS, ICONS } from '../../utils/constants';

interface ToolCallProps {
  toolName: string;
  args?: unknown;
  result?: {
    success: boolean;
    output?: string;
    error?: string;
    duration?: number;
  };
  isLast?: boolean;
}

const ToolCall: React.FC<ToolCallProps> = ({
  toolName,
  args,
  result,
  isLast = false
}) => {
  const formatArgs = (args: unknown): string => {
    if (args === null || args === undefined) return '';
    const str = typeof args === 'string' ? args : JSON.stringify(args);
    return str.length > 50 ? str.slice(0, 50) + '...' : str;
  };

  const formatOutput = (output: unknown): string => {
    if (output === null || output === undefined) return '';
    const str = typeof output === 'string' ? output : JSON.stringify(output);
    return str.length > 200 ? str.slice(0, 200) + '...' : str;
  };

  const isSuccess = result?.success !== false;

  return (
    <Box
      flexDirection="column"
      marginBottom={isLast ? 1 : 0.5}
      paddingX={1}
    >
      {/* Tool header */}
      <Box>
        <Text color={isSuccess ? COLORS.SECONDARY : COLORS.ERROR}>
          {isSuccess ? ICONS.CHECK : ICONS.ERROR}
        </Text>
        <Text> </Text>
        <Text bold color="white">
          {toolName}
        </Text>
      </Box>

      {/* Args */}
      {args !== null && args !== undefined && (
        <Box marginLeft={2}>
          <Text color={COLORS.DIM}>
            {formatArgs(args)}
          </Text>
        </Box>
      )}

      {/* Result */}
      {result && (
        <Box marginLeft={2}>
          <Text color={COLORS.DIM}>
            {result.duration && `(${result.duration}ms) `}
          </Text>
          {result.output && (
            <Text dimColor color="gray">
              {formatOutput(result.output)}
            </Text>
          )}
          {result.error && (
            <Text color={COLORS.ERROR}>
              {result.error}
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
};

interface ToolCallListProps {
  messages: Array<{
    type: 'tool-call' | 'tool-result';
    toolName?: string;
    args?: unknown;
    result?: {
      success: boolean;
      output?: string;
      error?: string;
      duration?: number;
    };
  }>;
}

const ToolCallList: React.FC<ToolCallListProps> = ({ messages }) => {
  if (messages.length === 0) return null;

  return (
    <Box flexDirection="column" marginTop={1} marginBottom={1}>
      {messages.map((msg, index) => {
        if (msg.type === 'tool-call') {
          const resultMsg = messages[index + 1];
          return (
            <ToolCall
              key={index}
              toolName={msg.toolName || 'Unknown'}
              args={msg.args}
              result={resultMsg?.type === 'tool-result' ? resultMsg.result : undefined}
              isLast={index === messages.length - 1}
            />
          );
        }
        return null;
      })}
    </Box>
  );
};

export default ToolCallList;
export { ToolCall };
