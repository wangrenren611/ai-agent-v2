/**
 * Chat Input Component
 *
 * 组合器组件 - 组合 InputField 和 CommandSuggester
 * 使用状态机管理输入状态
 */

import React, { useCallback, useEffect } from 'react';
import { Box } from 'ink';
import { InputField } from './input-field';
import { CommandSuggester } from './command-suggester';
import { useInputState } from '../../../infrastructure/hooks';
import type { Command } from '../../../commands';

// ============================================================================
// Props
// ============================================================================

export interface ChatInputProps {
  /** 提交回调 */
  onSubmit: (value: string) => Promise<void> | void;

  /** 初始值 */
  initialValue?: string;

  /** 是否禁用 */
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * 聊天输入组件
 *
 * 职责：
 * - 组合 InputField 和 CommandSuggester
 * - 管理输入状态机
 * - 处理命令选择和提交
 * - 无需 setTimeout 补丁，状态机确保正确性
 */
export const ChatInput: React.FC<ChatInputProps> = ({
  onSubmit,
  initialValue = '',
  disabled = false,
}) => {
  const inputState = useInputState();

  // 初始化输入
  useEffect(() => {
    if (initialValue) {
      inputState.startTyping(initialValue);
    }
  }, [initialValue]);

  // 输入变化处理
  const handleChange = useCallback(
    (value: string) => {
      inputState.changeInput(value);
    },
    [inputState]
  );

  // 提交处理
  const handleSubmit = useCallback(async () => {
    if (!inputState.canSubmit) {
      return;
    }

    const value = inputState.value;

    // 设置为执行状态
    inputState.submit();

    // 执行提交
    await onSubmit(value);

    // 完成后重置
    inputState.reset();
  }, [inputState, onSubmit]);

  // 命令选择回调
  const handleCommandSelect = useCallback(
    (command: Command) => {
      // 状态机处理：从 selecting-command 转换到 executing
      inputState.submit();

      // 提交命令名称
      const result = onSubmit(command.name);
      if (result instanceof Promise) {
        result.then(() => {
          inputState.reset();
        });
      } else {
        inputState.reset();
      }
    },
    [inputState, onSubmit]
  );

  // 取消命令选择
  const handleCancelCommand = useCallback(() => {
    inputState.cancelCommandSelect();
  }, [inputState]);

  // 检测是否输入命令，自动启动命令选择
  useEffect(() => {
    const isCmd = inputState.value.trim().startsWith('/');
    const shouldShowSelector = isCmd && inputState.state.status === 'typing';

    if (shouldShowSelector && !inputState.isSelectingCommand) {
      inputState.startCommandSelect(0);
    } else if (!isCmd && inputState.isSelectingCommand) {
      inputState.cancelCommandSelect();
    }
  }, [inputState.value, inputState.state.status, inputState]);

  return (
    <Box flexDirection="column">
      <InputField
        value={inputState.value}
        onChange={handleChange}
        onSubmit={handleSubmit}
        disabled={disabled || inputState.isExecuting}
        isFocused={true}
      />

      {inputState.isSelectingCommand && (
        <CommandSuggester
          visible={inputState.isSelectingCommand}
          input={inputState.value}
          onSelect={handleCommandSelect}
          onCancel={handleCancelCommand}
          initialSelectedIndex={
            inputState.state.status === 'selecting-command' ? inputState.state.selectedIndex : 0
          }
        />
      )}
    </Box>
  );
};

export default ChatInput;
