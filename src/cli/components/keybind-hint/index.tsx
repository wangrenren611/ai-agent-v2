/**
 * Keybind Hint Component
 *
 * Display keyboard shortcuts and commands hint
 */

import React from 'react';
import { Box, Text } from 'ink';
import { COLORS } from '../../utils/constants';

interface KeybindHintProps {
  show?: boolean;
  shortcuts?: {
    key: string;
    description: string;
  }[];
}

const defaultShortcuts = [
  { key: 'Ctrl+C', description: 'Exit' },
  { key: '/cmd', description: 'Commands' },
  { key: '↑↓', description: 'Navigate' },
];

export const KeybindHint: React.FC<KeybindHintProps> = ({
  show = true,
  shortcuts = defaultShortcuts,
}) => {
  if (!show) return null;

  return (
    <Box marginTop={1}>
      <Text dimColor color={COLORS.DIM}>
        {shortcuts.map((shortcut, index) => (
          <React.Fragment key={index}>
            <Text bold color={COLORS.PRIMARY}>
              [{shortcut.key}]
            </Text>
            <Text> {shortcut.description}</Text>
            {index < shortcuts.length - 1 && <Text> • </Text>}
          </React.Fragment>
        ))}
      </Text>
    </Box>
  );
};

export default KeybindHint;
