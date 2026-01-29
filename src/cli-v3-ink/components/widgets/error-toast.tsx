/**
 * Error Toast Component
 *
 * Displays error messages with auto-dismiss
 */

import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { ICONS, COLORS } from '../../utils/constants';

interface ErrorToastProps {
  message: string;
  duration?: number;
  onDismiss?: () => void;
}

const ErrorToast: React.FC<ErrorToastProps> = ({
  message,
  duration = 3000,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  if (!visible) return null;

  return (
    <Box paddingX={2} marginBottom={1}>
      <Text color={COLORS.ERROR}>
        {ICONS.TOOL_ERROR} {message}
      </Text>
    </Box>
  );
};

export default ErrorToast;
