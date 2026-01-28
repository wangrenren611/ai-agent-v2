/**
 * Custom Input Component
 *
 * Uses ink-text-input library to handle cursor positioning and editing
 */

import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface CustomInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  onEscape?: () => void;
  onExit?: () => void;
}

const CustomInput: React.FC<CustomInputProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = '',
  onEscape,
  onExit,
}) => {
  const handleSubmit = (val: string) => {
    // Check for exit command
    if (val.toLowerCase() === 'exit' && onExit) {
      onExit();
      return;
    }
    onSubmit(val);
  };

  return (
    <TextInput
      value={value}
      onChange={onChange}
      onSubmit={handleSubmit}
      placeholder={placeholder}
      showCursor={true}
      focus={!disabled}
    />
  );
};

export default CustomInput;
