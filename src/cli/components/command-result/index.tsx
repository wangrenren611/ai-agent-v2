/**
 * Command Result Component
 *
 * 显示命令执行结果，支持多种样式
 */

import React from 'react';
import { Box, Text } from 'ink';
import { COLORS, ICONS } from '../../utils/constants';

interface CommandResultProps {
  result: {
    success: boolean;
    message?: string;
    data?: unknown;
    exit?: boolean;
  } | null;
}

export const CommandResult: React.FC<CommandResultProps> = ({ result }) => {
  if (!result) return null;

  const { success, message, data, exit } = result;

  // 获取数据显示（支持 JSON 格式化）
  const renderData = () => {
    if (!data) return null;
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const lines = dataStr.split('\n');

    return (
      <Box flexDirection="column" marginLeft={2}>
        {lines.map((line, index) => (
          <Box key={index}>
            <Text dimColor color="gray">
              {line}
            </Text>
          </Box>
        ))}
      </Box>
    );
  };

  const iconColor = success ? COLORS.SECONDARY : COLORS.ERROR;
  const icon = success ? ICONS.CHECK : ICONS.ERROR;
  const textColor = success ? COLORS.SECONDARY : COLORS.ERROR;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Box paddingX={1}>
          <Text bold color={iconColor}>
            {icon}
          </Text>
        </Box>
        <Box marginLeft={1}>
          <Text bold color={textColor}>
            {message || 'Command executed'}
          </Text>
          {exit && (
            <Text dimColor color="gray">
              {' '} (exiting...)
            </Text>
          )}
        </Box>
      </Box>

      {renderData()}
    </Box>
  );
};

export default CommandResult;
