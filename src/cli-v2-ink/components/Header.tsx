/**
 * Header Component
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { HeaderProps } from '../types';
import { getCurrentDirectoryName } from '../utils/helpers';
import { COLORS, ICONS } from '../utils/constants';

const Header: React.FC<HeaderProps> = ({ model }) => {
  const dirName = getCurrentDirectoryName();

  return (
    <Box
      borderStyle="round"
      borderColor={COLORS.PRIMARY}
      paddingX={1}
      paddingY={0}
      marginBottom={1}
    >
      <Box justifyContent="space-between" width="100%">
        <Box>
          <Text bold color={COLORS.PRIMARY}>{ICONS.ASSISTANT} AI Agent v2</Text>
        </Box>
        <Box>
          <Text dimColor color={COLORS.DIM}>{dirName}</Text>
          <Text color={COLORS.PRIMARY}> · </Text>
          <Text color={COLORS.PRIMARY}>{model}</Text>
        </Box>
      </Box>
    </Box>
  );
};

export default Header;
