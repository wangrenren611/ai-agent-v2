/**
 * System Message Component
 *
 * Displays system notifications and warnings
 */

import React from 'react';
import { Box, Text } from 'ink';
import { ICONS, COLORS } from '../../utils/constants';
import type { ChatMessage } from '../../types';

interface SystemMessageProps {
  message: ChatMessage;
}

const SystemMessage: React.FC<SystemMessageProps> = ({ message }) => {
  const lines = message.content.split('\n');

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold color={COLORS.WARNING}>
          {ICONS.SYSTEM} {lines[0]}
        </Text>
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
};

export default SystemMessage;
