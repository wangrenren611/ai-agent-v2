/**
 * Error Message Component
 *
 * Displays prominent error messages
 */

import React from 'react';
import { Box, Text } from 'ink';
import { ICONS, COLORS } from '../utils/constants';

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  const lines = message.split('\n');

  return (
    <Box
      borderStyle="double"
      borderColor={COLORS.ERROR}
      paddingY={0}
    >
      <Box>
        <Text bold color={COLORS.ERROR}>{ICONS.SYSTEM} {lines[0]}</Text>
      </Box>
      {lines.length > 1 && (
        <Box marginLeft={3}>
          <Text dimColor color={COLORS.ERROR}>
            {lines.slice(1).join('\n')}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default ErrorMessage;
