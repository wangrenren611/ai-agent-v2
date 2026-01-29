/**
 * Command Palette Component
 *
 * Shows filtered commands based on input
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { matchCommands } from '../../utils/commands';
import type { Command } from '../../types/commands';

interface CommandPaletteProps {
  open: boolean;
  input: string;
  selectedIndex: number;
  onSelect: (command: Command) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  input,
  selectedIndex,
  onSelect,
}) => {
  const filteredCommands = useMemo(() => {
    return matchCommands(input);
  }, [input]);

  if (!open) return null;

  return (
    <Box flexDirection="column" paddingX={2} marginBottom={1}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>Commands:</Text>
        <Text color="gray"> (↑↓ navigate, Enter execute, Esc cancel)</Text>
      </Box>
      <Box flexDirection="column">
        {filteredCommands.map((cmd, index) => (
          <Box key={cmd.id}>
            <Box width={2}>
              <Text color={index === selectedIndex ? 'green' : 'gray'}>
                {index === selectedIndex ? '> ' : '  '}
              </Text>
            </Box>
            <Box width={15}>
              <Text color={index === selectedIndex ? 'green' : 'cyan'}>
                {cmd.name}
              </Text>
            </Box>
            <Box flexGrow={1}>
              <Text color={index === selectedIndex ? 'green' : 'white'}>
                {cmd.description}
              </Text>
            </Box>
          </Box>
        ))}
        {filteredCommands.length === 0 && (
          <Box>
            <Text color="gray">No matching commands</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default CommandPalette;
