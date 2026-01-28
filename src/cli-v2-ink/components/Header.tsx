/**
 * Header Component
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { HeaderProps } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { getCurrentDirectoryName } from '../utils/helpers';
import { COLORS } from '../utils/constants';

const Header: React.FC<HeaderProps> = ({ isProcessing, status, model }) => {
  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      justifyContent="space-between"
    >
      <Box>
        <Text bold color={COLORS.PRIMARY}>AI Agent v2</Text>
        <Text dimColor color={COLORS.DIM}> · </Text>
        <Text dimColor>{getCurrentDirectoryName()}</Text>
        <Text dimColor color={COLORS.DIM}> · </Text>
        <Text dimColor>Model: {model}</Text>
      </Box>
      <Box>
        {isProcessing ? (
          <LoadingSpinner text={status} />
        ) : (
          <Text dimColor color={COLORS.DIM}>{status}</Text>
        )}
      </Box>
    </Box>
  );
};

export default Header;
