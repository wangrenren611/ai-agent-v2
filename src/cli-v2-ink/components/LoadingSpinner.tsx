/**
 * Loading Spinner Component
 */

import React, { useState, useEffect } from 'react';
import { Text } from 'ink';
import { SPINNER_INTERVAL_MS } from '../utils/constants';

interface LoadingSpinnerProps {
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ text = 'Thinking' }) => {
  const [frame, setFrame] = useState(0);
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % frames.length);
    }, SPINNER_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <Text bold color="yellow">
      {frames[frame]} {text}
    </Text>
  );
};

export default LoadingSpinner;
