/**
 * Custom Input Component with Command Support
 *
 * Built on top of ink-text-input for reliable input handling
 * Only intercepts navigation keys when needed
 */

import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

interface CustomInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: (value: string) => void;
  disabled?: boolean;
  onEscape?: () => void;
  onExit?: () => void;
  showCommandList?: boolean;
  commandListIndex?: number;
  matchedCommandsLength?: number;
  executeCommand?: () => void;
  navigateCommandList?: (direction: 'up' | 'down') => void;
}

export default function CustomInput({
  value,
  onChange,
  placeholder = '',
  onSubmit,
  disabled = false,
  onEscape,
  onExit,
  showCommandList = false,
  executeCommand,
  navigateCommandList,
}: CustomInputProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    console.log('[CustomInput] Component mounted, disabled:', disabled, 'focus:', !disabled);
    setIsMounted(true);
    
    return () => {
      console.log('[CustomInput] Component unmounted');
      setIsMounted(false);
    };
  }, []);

  useEffect(() => {
    console.log('[CustomInput] Props changed:', { value, disabled, focus: !disabled, showCommandList });
  }, [value, disabled, showCommandList]);

  const handleSubmit = (newValue: string) => {
    console.log('[CustomInput] Submit:', newValue, 'showCommandList:', showCommandList);
    
    // If command list is shown, execute selected command
    if (showCommandList && executeCommand) {
      console.log('[CustomInput] Executing command');
      executeCommand();
      return;
    }
    
    // Otherwise, submit normally
    if (onSubmit && newValue.trim()) {
      console.log('[CustomInput] Calling onSubmit');
      onSubmit(newValue);
    }
  };

  const handleChange = (newValue: string) => {
    console.log('[CustomInput] Value changed:', newValue);
    onChange(newValue);
  };

  // Only intercept navigation keys when needed
  useInput((inputChar, key) => {
    if (disabled) return;
    
    // Handle command list navigation
    if (showCommandList) {
      if (key.upArrow && navigateCommandList) {
        navigateCommandList('up');
      }
      if (key.downArrow && navigateCommandList) {
        navigateCommandList('down');
      }
      if (key.escape && onEscape) {
        onEscape();
      }
      // Don't intercept Enter - let TextInput handle it
      return;
    }
    
    // Handle normal navigation
    if (key.escape && onEscape) {
      onEscape();
    }
    
    // Handle Ctrl+C
    if (key.ctrl && inputChar === 'c' && onExit) {
      onExit();
    }
    
    // Don't intercept any other keys - let TextInput handle them
  });

  return (
    <TextInput
      value={value}
      onChange={handleChange}
      onSubmit={handleSubmit}
      placeholder={placeholder}
      focus={!disabled}
      showCursor={!disabled}
    />
  );
}
