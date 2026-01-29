/**
 * Welcome Banner Component
 *
 * ASCII art banner with app information
 */

import React from 'react';
import { Box, Text } from 'ink';
import { COLORS } from '../../utils/constants';

interface WelcomeBannerProps {
  model?: string;
  currentPath?: string;
}

const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  model = 'gpt-4o',
  currentPath = process.cwd(),
}) => {
  return (
    <Box flexDirection="column" marginBottom={1} paddingTop={2}>
      {/* ASCII Art Banner */}
      <Box flexDirection="column">
        <Box>
          <Text bold color={COLORS.PRIMARY}>    /\\_/\\</Text>
        </Box>
        <Box>
          <Text bold color={COLORS.PRIMARY}>   ( o.o )</Text>
          <Text>       AI Agent CLI v3.0</Text>
        </Box>
        <Box>
          <Text bold color={COLORS.PRIMARY}>    {'> ^ <'}</Text>
          <Text>        {model} · Ready</Text>
        </Box>
        <Box>
          <Text bold color={COLORS.PRIMARY}>    // \\\\</Text>
          <Text dimColor>      {currentPath}</Text>
        </Box>
        <Box>
          <Text bold color={COLORS.PRIMARY}>   (___(___)</Text>
        </Box>
      </Box>

      {/* Empty line */}
      <Box />

      {/* Tip */}
      <Box marginTop={1}>
        <Text dimColor>  </Text>
        <Text color={COLORS.PRIMARY}>/help</Text>
        <Text dimColor> for commands · </Text>
        <Text color={COLORS.PRIMARY}>/model</Text>
        <Text dimColor> to switch AI</Text>
      </Box>
    </Box>
  );
};

export default WelcomeBanner;