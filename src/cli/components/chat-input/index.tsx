/**
 * Chat Input Component
 *
 * 支持命令选择和消息输入
 */

import Input from 'ink-text-input';
import { useAppContext } from '../../context/app';
import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import CommandSelector from '../command-selector';
import type { Command } from '../../commands';

export const ChatInput: React.FC<any> = (props) => {
  const { input, setInput, onSubmit } = useAppContext();
  const [showCommandSelector, setShowCommandSelector] = useState(false);
  const [isSelectingCommand, setIsSelectingCommand] = useState(false);



  // 命令选择回调
  const handleCommandSelect = useCallback((command: Command) => {
    setIsSelectingCommand(true);
    setShowCommandSelector(false);
    // 直接提交命令
    onSubmit(command.name);
    // 重置标志（延迟以确保 wrappedOnSubmit 不会触发）
    setTimeout(() => setIsSelectingCommand(false), 0);
  }, [onSubmit]);

  // 取消命令选择
  const handleCancelCommand = useCallback(() => {
    setShowCommandSelector(false);
    setInput('');
  }, [setInput]);

  // 输入变化处理
  const handleChange = useCallback((newInput: string) => {
    setInput(newInput);

    const isCmd = newInput.trim().startsWith('/');
    setShowCommandSelector(isCmd);
  }, [setInput]);

  // 包装 onSubmit 以防止重复提交
  const wrappedOnSubmit = useCallback((value: string) => {
    // 如果正在选择命令，忽略这次提交（由 CommandSelector 处理）
    if (isSelectingCommand) {
      return;
    }
    onSubmit(value);
  }, [onSubmit, isSelectingCommand]);

  return (
    <Box flexDirection="column">
      <Box>
        <Text>{'> '}</Text>
        <Input
          value={input}
          placeholder="Enter your message or /command..."
          onSubmit={wrappedOnSubmit}
          onChange={handleChange}
          {...props}
        />
      </Box>
      {showCommandSelector && (
        <Box>
          <CommandSelector
            visible={showCommandSelector}
            input={input}
            onSelect={handleCommandSelect}
            onCancel={handleCancelCommand}
          />
        </Box>
      )}
    </Box>
  );
};
