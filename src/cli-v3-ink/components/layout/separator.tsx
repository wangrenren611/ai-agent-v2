/**
 * Separator Component
 *
 * Horizontal line for visual separation
 */

import React from 'react';
import { Box, Text } from 'ink';
import { COLORS } from '../../utils/constants';
import { getSeparatorLength } from '../../utils/helpers';

interface SeparatorProps {
  char?: string;
  color?: string;
}

const Separator: React.FC<SeparatorProps> = ({
  char = '─',
  color = COLORS.DIM,
}) => {
  const length = getSeparatorLength();
  const line = char.repeat(length);

  return (
    <Box marginBottom={1}>
      <Text dimColor color={color}>{line}</Text>
    </Box>
  );
};

export default Separator;
