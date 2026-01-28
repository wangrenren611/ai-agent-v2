/**
 * Settings Route (Ink-based)
 *
 * Configuration interface for themes and other preferences.
 */

import React, { useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import type { RouteContextValue } from '../context/route';
import { COLORS } from '../utils/constants';

interface SettingsProps {
  navigate: RouteContextValue['navigate'];
}

const Settings: React.FC<SettingsProps> = ({ navigate }) => {
  const isMounted = useRef(true);

  useInput((_inputChar: string, key: any) => {
    if (!isMounted.current) return;

    if (key.escape) {
      isMounted.current = false;
      navigate('home');
    } else if (key.ctrl && _inputChar === 'c') {
      process.exit(0);
    }
  });

  // Cleanup effect
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color={COLORS.PRIMARY}>Settings</Text>
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
