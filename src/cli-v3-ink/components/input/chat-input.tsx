/**
 * Chat Input Component
 *
 * Main input field - simplified version without useInput interference
 */

import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { ICONS } from '../../utils/constants';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Type a message...',
  disabled = false,
}) => {
  const handleSubmit = (newValue: string) => {
    if (newValue.trim()) {
      onSubmit(newValue);
    }
  };

  return (
    <Box>
      <Text bold color="cyan">{ICONS.INPUT} </Text>
      <TextInput
        value={value}
        onChange={onChange}
        onSubmit={handleSubmit}
        placeholder={placeholder}
        focus={!disabled}
        showCursor={!disabled}
      />
    </Box>
  );
};

export default ChatInput;
