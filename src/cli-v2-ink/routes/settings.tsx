/**
 * Settings Route (Ink-based)
 *
 * Configuration interface for selecting models and providers.
 * Uses arrow keys to navigate through list.
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import type { RouteContextValue } from '../context/route';
import { COLORS } from '../utils/constants';
import { SelectList, SelectListItem } from '../components/SelectList';
import { ProviderType } from '../../providers';
import { PROVIDER_METADATA } from '../../providers/config';

interface SettingsProps {
  navigate: RouteContextValue['navigate'];
}

const Settings: React.FC<SettingsProps> = ({ navigate }) => {
  const isMounted = useRef(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentModel, setCurrentModel] = useState<string>('');
  const [currentProvider, setCurrentProvider] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);

  // Build list of available models
  const modelList = useMemo<SelectListItem[]>(() => {
    const items: SelectListItem[] = [];

    Object.entries(PROVIDER_METADATA).forEach(([type, metadata]) => {
      items.push({
        id: `${type}-${metadata.defaultModel}`,
        label: metadata.name,
        provider: type.toUpperCase(),
        model: metadata.defaultModel,
      });
    });

    return items;
  }, []);

  // Initialize current selection from environment
  React.useEffect(() => {
    const currentModel = process.env.AI_MODEL;
    const providerType = process.env.ANTHROPIC_API_KEY ? 'UNIVERSAL' : currentModel?.split('-')[0]?.toUpperCase();

    if (currentModel) {
      setCurrentModel(currentModel);
      setCurrentProvider(providerType || 'UNKNOWN');

      const currentIndex = modelList.findIndex(
        item => item.model === currentModel || item.label.toLowerCase().includes(currentModel.split('-')[0])
      );
      if (currentIndex >= 0) {
        setSelectedIndex(currentIndex);
      }
    }
  }, [modelList]);

  useInput((_inputChar: string, key: any) => {
    if (!isMounted.current) return;

    if (key.escape) {
      isMounted.current = false;
      navigate('home');
    } else if (key.ctrl && _inputChar === 'c') {
      process.exit(0);
    }
  });

  const handleSelectModel = useCallback((item: SelectListItem) => {
    try {
      // Set environment variable for selected provider
      const providerType = item.provider.toLowerCase() as ProviderType;
      process.env.AI_MODEL = item.model;

      // Verify provider is available
      const apiKey = process.env[`${providerType.toUpperCase()}_API_KEY`] ||
                      process.env['ANTHROPIC_API_KEY'];

      if (!apiKey) {
        throw new Error(`No API key found for ${item.provider}`);
      }

      setCurrentModel(item.model);
      setCurrentProvider(item.label);
      setError(null);
      setShowError(false);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to select model';
      setError(errorMessage);
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    }
  }, []);

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color={COLORS.PRIMARY}>Settings - Model Selection</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text dimColor>Current:</Text>
          <Text> </Text>
          <Text color="green">{currentModel || 'N/A'}</Text>
          <Text> </Text>
          <Text color="yellow">({currentProvider || 'N/A'})</Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text color="gray">Use ↑↓ arrows to navigate, Enter to select</Text>
        </Box>
        <Box>
          <Text color="gray">Press Esc to return</Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text bold color="cyan">Available Models:</Text>
        </Box>
      </Box>

      <Box marginBottom={1}>
        <SelectList
          items={modelList}
          selectedIndex={selectedIndex}
          onSelect={handleSelectModel}
        />
      </Box>

      {showError && error && (
        <Box marginBottom={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      {currentModel && !showError && (
        <Box marginTop={1}>
          <Text color="green">✓ Model selected: {currentModel}</Text>
        </Box>
      )}
    </Box>
  );
};

export default Settings;
