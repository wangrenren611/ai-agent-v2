import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { Command, matchCommands } from '../utils/commands';

interface CommandListProps {
  keyword: string;
  selectedIndex: number;
  onSelect: (command: Command) => void;
}

export const CommandList: React.FC<CommandListProps> = ({
  keyword,
  selectedIndex,
  onSelect,
}) => {
  const filteredCommands = useMemo(() => {
    return matchCommands(keyword);
  }, [keyword]);

  return (
    <Box flexDirection="column">
      {filteredCommands.map((cmd, index) => (
        <Box key={cmd.id}>
          <Box width={2}>
            <Text color={index === selectedIndex ? 'green' : 'gray'}>
              {index === selectedIndex ? '▶ ' : '  '}
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
  );
};
