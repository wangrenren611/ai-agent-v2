/**
 * Model Selection Page
 *
 * 选择 AI 模型
 */

import React from 'react';
import { Box, Text } from 'ink';
import { ProviderRegistry } from '../../../providers/provider-registry';

interface ModelSelectPageProps {
  onBack: () => void;
  modelSelectIndex: number;
}


export const ModelSelectPage: React.FC<ModelSelectPageProps> = ({
  modelSelectIndex,
}) => {
  // 键盘处理在 app context 中处理

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyanBright">🤖 Select Model</Text>
      </Box>

      {ProviderRegistry.getModels().map((model, index) => (
        <Box key={model}>
          <Text
            color={modelSelectIndex === index ? 'cyanBright' : 'gray'}
            bold={modelSelectIndex === index}
          >
            {modelSelectIndex === index ? '> ' : '  '}
          </Text>
          <Text
            color={modelSelectIndex === index ? 'cyanBright' : 'white'}
            bold={modelSelectIndex === index}
          >
            {model}
          </Text>
          {modelSelectIndex === index && (
            <Text color="green"> (current)</Text>
          )}
          <Text dimColor> - {model}</Text>
        </Box>
      ))}

      <Box marginTop={1}>
        <Text dimColor>
          [↑↓] Select • [Enter] Confirm • [Esc/Backspace] Back
        </Text>
      </Box>
    </Box>
  );
};

export default ModelSelectPage;
