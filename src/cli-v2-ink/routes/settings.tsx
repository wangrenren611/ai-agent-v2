/**
 * Settings Route (Ink-based)
 *
 * Configuration interface for themes and other preferences.
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { RouteContextValue } from '../context/route.js';

interface SettingsProps {
  navigate: RouteContextValue['navigate'];
}

const Settings: React.FC<SettingsProps> = ({ navigate }) => {
  useInput((_inputChar: string, key: any) => {
    if (key.escape) {
      navigate('home');
    } else if (key.ctrl && _inputChar === 'c') {
      process.exit(0);
    }
  });

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Settings</Text>
      </Box>
      <Box flexDirection="column">
        <Box>
          <Text bold>Theme:</Text>
          <Text> </Text>
          <Text>Default Dark</Text>
        </Box>
        <Box>
          <Text bold>Mode:</Text>
          <Text> </Text>
          <Text>Dark</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press Esc to return to home</Text>
        </Box>
      </Box>
    </Box>
  );
};

export default Settings;
