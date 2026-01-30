/**
 * Help Details Page
 *
 * 显示命令详情和帮助信息
 */

import React from 'react';
import { Box, Text } from 'ink';
import { commandRegistry, type Command } from '../../commands';

interface HelpPageProps {
  commandName?: string;
  onBack: () => void;
  onExecute: (command: string) => void;
}

export const HelpPage: React.FC<HelpPageProps> = ({
  commandName,
  onBack,
  onExecute,
}) => {
  // 获取所有命令并按分类分组
  const allCommands = commandRegistry.getAll();

  // 如果指定了命令名，显示该命令的详细信息
  if (commandName) {
    const command = commandRegistry.get(commandName);
    if (!command) {
      return (
        <Box>
          <Text color="red">Command not found: {commandName}</Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="cyanBright">{command.name}</Text>
        </Box>

        {command.aliases && command.aliases.length > 0 && (
          <Box marginBottom={1}>
            <Text dimColor>Aliases: {command.aliases.join(', ')}</Text>
          </Box>
        )}

        <Box marginBottom={1}>
          <Text color="yellowBright">Description:</Text>
          <Text> {command.description}</Text>
        </Box>

        {command.usage && (
          <Box marginBottom={1}>
            <Text color="yellowBright">Usage:</Text>
            <Text> {command.usage}</Text>
          </Box>
        )}

        <Box marginBottom={1}>
          <Text dimColor>Press [Enter] to execute or [Esc] to go back</Text>
        </Box>
      </Box>
    );
  }

  // 显示所有命令列表（按分类）
  const categories = [
    { name: 'Core', value: 'core' as const },
    { name: 'Session', value: 'session' as const },
    { name: 'Model', value: 'model' as const },
    { name: 'File', value: 'file' as const },
    { name: 'Memory', value: 'memory' as const },
  ];

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyanBright">📖 Command Help</Text>
      </Box>

      {categories.map((category) => {
        const categoryCommands = allCommands.filter(cmd => cmd.category === category.value);
        if (categoryCommands.length === 0) return null;

        return (
          <Box key={category.value} flexDirection="column" marginBottom={1}>
            <Box>
              <Text bold color="yellowBright">{category.name}:</Text>
            </Box>
            {categoryCommands.map(cmd => (
              <Box key={cmd.id}>
                <Text dimColor>  • </Text>
                <Text color="cyanBright">{cmd.name}</Text>
                {cmd.aliases && cmd.aliases.length > 0 && (
                  <Text dimColor> ({cmd.aliases.join(', ')})</Text>
                )}
                <Text dimColor> - {cmd.description}</Text>
              </Box>
            ))}
          </Box>
        );
      })}

      <Box marginTop={1}>
        <Text dimColor>Press [Esc] or [Backspace] to go back</Text>
      </Box>
    </Box>
  );
};

export default HelpPage;
