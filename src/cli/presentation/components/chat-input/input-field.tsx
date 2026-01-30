/**
 * Input Field Component
 *
 * 纯输入框组件 - 负责接收用户输入
 * 不包含命令建议逻辑
 */

import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

// ============================================================================
// Props
// ============================================================================

export interface InputFieldProps {
  /** 当前输入值 */
  value: string;

  /** 值变化回调 */
  onChange: (value: string) => void;

  /** 提交回调 */
  onSubmit: () => void;

  /** 是否禁用 */
  disabled?: boolean;

  /** 占位符文本 */
  placeholder?: string;

  /** 提示符 */
  prompt?: string;

  /** 焦点状态 */
  isFocused?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * 纯输入框组件
 *
 * 职责：
 * - 显示输入框和提示符
 * - 处理用户输入
 * - 触发提交事件
 */
export const InputField: React.FC<InputFieldProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Enter your message or /command...',
  prompt = '> ',
  isFocused = true,
}) => {
  return (
    <Box>
      <Text>{prompt}</Text>
      <TextInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder={placeholder}
        focus={isFocused && !disabled}
      />
    </Box>
  );
};

export default InputField;
