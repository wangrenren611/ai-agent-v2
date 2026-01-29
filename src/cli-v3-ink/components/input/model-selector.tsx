/**
 * Model Selector Component
 *
 * Allows user to select AI model
 */

import React from 'react';
import { Box, Text } from 'ink';
import { PROVIDER_METADATA } from '../../../providers/provider-registry';

interface ModelSelectorProps {
  open: boolean;
  selectedIndex: number;
  onSelect: (model: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  open,
  selectedIndex,
  onSelect,
}) => {
  if (!open) return null;

  const models = Object.values(PROVIDER_METADATA);

  return (
    <Box flexDirection="column" paddingX={2} marginBottom={1}>
      <Box marginBottom={1}>
        <Text color="yellow" bold>Select Model:</Text>
        <Text color="gray"> (↑↓ navigate, Enter select, Esc cancel)</Text>
      </Box>
      <Box flexDirection="column">
        {models.map((metadata, index) => (
          <Box key={metadata.type}>
            {index === selectedIndex ? (
              <Text color="green">{'>'} </Text>
            ) : (
              <Text>  </Text>
            )}
            <Text color={index === selectedIndex ? 'green' : 'white'}>
              {metadata.name}
            </Text>
            <Text color="gray"> - </Text>
            <Text color="cyan">{metadata.defaultModel}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ModelSelector;
