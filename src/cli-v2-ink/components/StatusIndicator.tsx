/**
 * Status Indicator Component
 *
 * Displays current processing status at the bottom of message list
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import LoadingSpinner from './LoadingSpinner';
import { COLORS, ICONS } from '../utils/constants';

interface StatusIndicatorProps {
  isProcessing: boolean;
  status: string;
  currentResponse: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  isProcessing,
  status,
  currentResponse,
}) => {
  const [showStatus, setShowStatus] = useState(false);

  // Only show status when processing or when there's a streaming response
  useEffect(() => {
    setShowStatus(isProcessing || currentResponse.length > 0);
  }, [isProcessing, currentResponse.length]);

  if (!showStatus) {
    return null;
  }

  return (
    <Box marginBottom={1}>
      <Box>
        {isProcessing ? (
          <LoadingSpinner text={status} />
        ) : (
          <Box>
            <Text color={COLORS.SECONDARY}>{ICONS.CHECK} </Text>
            <Text color={COLORS.SECONDARY}>Done</Text>
          </Box>
        )}
      </Box>
      {currentResponse.length > 0 && (
        <Box marginLeft={1}>
          <Text dimColor color={COLORS.DIM}>· {currentResponse.length} chars</Text>
        </Box>
      )}
    </Box>
  );
};

export default StatusIndicator;
