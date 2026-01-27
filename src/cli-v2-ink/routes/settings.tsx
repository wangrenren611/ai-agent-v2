/**
 * Settings Route (Ink-based)
 *
 * Configuration interface for themes and other preferences.
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { RouteContextValue } from '../context/route';

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

  return React.createElement(
    Box,
    { flexDirection: 'column', paddingX: 2, paddingY: 1 },
    React.createElement(Box, { marginBottom: 1 },
      React.createElement(Text, { bold: true, color: 'cyan' }, 'Settings')
    ),
    React.createElement(Box, { flexDirection: 'column' },
      React.createElement(Box, {},
        React.createElement(Text, { bold: true }, 'Theme:'),
        React.createElement(Text, null, ' '),
        React.createElement(Text, null, 'Default Dark')
      ),
      React.createElement(Box, {},
        React.createElement(Text, { bold: true }, 'Mode:'),
        React.createElement(Text, null, ' '),
        React.createElement(Text, null, 'Dark')
      ),
      React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { dimColor: true }, 'Press Esc to return to home')
      )
    )
  );
};

export default Settings;
