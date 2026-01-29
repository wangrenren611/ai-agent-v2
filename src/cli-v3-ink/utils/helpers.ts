/**
 * CLI v2 (Ink-based) Helper Functions
 */

import { MAX_TOOL_ARGS_PREVIEW, MAX_TOOL_OUTPUT_PREVIEW } from './constants';

// ============================================================================
// Model Helpers
// ============================================================================

/**
 * 获取当前选择的模型
 */
export const getSelectedModel = (): string => {
  return (global as any).__selectedModel ||
         process.env.AI_MODEL ||
         'gpt-4o';
};

// ============================================================================
// Tool Call Helpers
// ============================================================================

/**
 * 格式化工具参数用于显示
 */
export const formatToolArgs = (args: unknown): string => {
  if (!args) {
    return '';
  }

  try {
    const argsObj = typeof args === 'string' ? JSON.parse(args) : args;
    const keys = Object.keys(argsObj).slice(0, 2);
    const formatted = keys.map(k => `${k}=${JSON.stringify(argsObj[k]).slice(0, 20)}...`).join(' ');
    return formatted.length > MAX_TOOL_ARGS_PREVIEW
      ? formatted.slice(0, MAX_TOOL_ARGS_PREVIEW) + '...'
      : formatted;
  } catch {
    const str = String(args);
    return str.length > MAX_TOOL_ARGS_PREVIEW
      ? str.slice(0, MAX_TOOL_ARGS_PREVIEW) + '...'
      : str;
  }
};

/**
 * 格式化工具输出用于显示
 */
export const formatToolOutput = (data: unknown): string => {
  if (!data) {
    return '';
  }

  const outputStr = typeof data === 'string' ? data : JSON.stringify(data);
  return outputStr.length > MAX_TOOL_OUTPUT_PREVIEW
    ? outputStr.slice(0, MAX_TOOL_OUTPUT_PREVIEW) + '...'
    : outputStr;
};

// ============================================================================
// Separator Helpers
// ============================================================================

/**
 * 计算分隔线长度
 */
export const getSeparatorLength = (): number => {
  return Math.min(process.stdout.columns || 80, 80);
};

// ============================================================================
// Directory Helpers
// ============================================================================

/**
 * 获取当前目录名
 */
export const getCurrentDirectoryName = (): string => {
  const cwd = process.cwd();
  const parts = cwd.split('/');
  return parts.pop() || cwd;
};
