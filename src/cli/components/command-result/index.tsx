/**
 * Command Result Component
 *
 * 显示命令执行结果
 */

import React from 'react';
import { Box, Text } from 'ink';

interface CommandResultProps {
  result: {
    success: boolean;
    message?: string;
    data?: unknown;
  } | null;
}

export const CommandResult: React.FC<CommandResultProps> = ({ result }) => {
  if (!result) return null;

  return (
    <Box marginBottom={1} paddingX={1}>
      {result.success ? (
        <Text color="green">✓</Text>
      ) : (
        <Text color="red">✗</Text>
      )}
      <Text> {result.message || 'Command executed'}</Text>
    </Box>
  );
};

export default CommandResult;
