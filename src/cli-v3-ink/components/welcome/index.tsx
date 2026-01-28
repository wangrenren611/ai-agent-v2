/**
 * Welcome Component
 *
 * Displays the ASCII art banner with app info
 */

import React from 'react';
import { Box, Text } from 'ink';
import { COLORS } from '../../utils/constants';

const SEPARATOR = '─'.repeat(50);

interface WelcomeProps {
  currentPath?: string;
  model?: string;
}

const Welcome: React.FC<WelcomeProps> = ({
  currentPath = 'D:\\work\\ai-agent-v2',
  model = 'glm-4.7',
}) => {
  return (
    <Box flexDirection="column" marginBottom={1} paddingTop={2}>
      {/* ASCII Art Cat Banner */}
      <Box flexDirection="column">
        <Box>
          <Text bold color={COLORS.PRIMARY}>    /\\_/\\</Text>
        </Box>
        <Box>
          <Text bold color={COLORS.PRIMARY}>   ( o.o )</Text>
          <Text>       CoCo Code v1.0.0</Text>
        </Box>
        <Box>
          <Text bold color={COLORS.PRIMARY}>   &gt;  ^  &lt;</Text>
          <Text>       {model} · API Usage</Text>
        </Box>
        <Box>
          <Text bold color={COLORS.PRIMARY}>    //   \\\\</Text>
          <Text  dimColor>    {currentPath}</Text>
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
        <Text color={COLORS.PRIMARY}>/model</Text>
        <Text dimColor> to try Ai Coding</Text>
      </Box>

      {/* Separator */}
      <Box marginTop={0.5}>
        <Text dimColor>{SEPARATOR}</Text>
      </Box>
    </Box>
  );
};

export default Welcome;
