/**
 * Welcome Banner Component
 *
 * Modern ASCII art banner with app information
 * Inspired by Claude Code and OpenCode
 */

import React from 'react';
import { Box, Text } from 'ink';
import { COLORS, ICONS } from '../../utils/constants';

interface WelcomeBannerProps {
  model?: string;
  currentPath?: string;
}

const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  model = 'gpt-4o',
  currentPath = process.cwd(),
}) => {
  // Truncate path if too long
  const displayPath = currentPath.length > 60
    ? '...' + currentPath.slice(-57)
    : currentPath;

  return (
    <Box flexDirection="column" marginBottom={1} paddingTop={0}>
      {/* Compact ASCII Art Banner - 60% size */}
      <Box flexDirection="column" marginBottom={1}>
        <Box justifyContent="center">
          <Text bold color="cyan">
            {`
  ██████╗ ███████╗ ██████╗ ███████╗    ██████╗ ███████╗██████╗
  ██╔══██╗██╔════╝██╔════╝ ██╔════╝   ██╔═══██╗██╔════╝██╔══██╗
  ███████║█████╗  ██║  ███╗█████╗     ██║   ██║███████╗██████╔╝
  ██╔══██║██╔══╝  ██║   ██║██╔══╝     ██║   ██║╚════██║██╔═══╝
  ██║  ██║███████╗╚██████╔╝███████╗   ╚██████╔╝███████║██║
  ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚══════╝    ╚═════╝ ╚══════╝╚═╝
            `}
          </Text>
        </Box>

        {/* Decorative Line */}
        <Box justifyContent="center" marginTop={0}>
          <Text color="cyan" bold>
            ┌──────────────────────────────────────────────────────────────┐
          </Text>
        </Box>
        <Box justifyContent="center">
          <Text color="cyan" bold>
            │  </Text>
          <Text color="greenBright" bold>✨</Text>
          <Text color="white"> AI-Powered Development Assistant </Text>
          <Text color="cyan" bold>  │</Text>
        </Box>
        <Box justifyContent="center">
          <Text color="cyan" bold>
            └──────────────────────────────────────────────────────────────┘
          </Text>
        </Box>
      </Box>

      {/* Model and Status Info */}
      <Box justifyContent="center" marginTop={0}>
        <Text dimColor>  </Text>
        <Text color={COLORS.ACCENT}>{ICONS.TOOL}</Text>
        <Text dimColor> v1.0.1 · </Text>
        <Text color="cyanBright">{model}</Text>
        <Text dimColor> · </Text>
        <Text color="greenBright">● Ready</Text>
        <Text dimColor> · </Text>
        <Text dimColor color="gray">{displayPath}</Text>
      </Box>

      {/* Commands Help */}
      <Box justifyContent="center" marginTop={0}>
        <Text dimColor>  </Text>
        <Text color="cyanBright">/help</Text>
        <Text dimColor> commands · </Text>
        <Text color="cyanBright">/model</Text>
        <Text dimColor> switch AI · </Text>
        <Text color="cyanBright">/clear</Text>
        <Text dimColor> reset · </Text>
        <Text color="cyanBright">Ctrl+C</Text>
        <Text dimColor> quit</Text>
      </Box>
    </Box>
  );
};

export default WelcomeBanner;
