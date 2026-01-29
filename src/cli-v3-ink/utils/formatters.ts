/**
 * Formatting Utilities
 */

import { MAX_TOOL_ARGS_PREVIEW, MAX_TOOL_OUTPUT_PREVIEW } from './constants';

// ============================================================================
// Time Formatters
// ============================================================================

/**
 * Format timestamp to relative time (e.g., "2m ago", "just now")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

/**
 * Format timestamp to short time (e.g., "14:30")
 */
export function formatShortTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// ============================================================================
// Tool Call Formatters
// ============================================================================

/**
 * Format tool arguments for display
 */
export function formatToolArgs(args: unknown): string {
  if (!args) return '';

  try {
    const argsObj = typeof args === 'string' ? JSON.parse(args) : args;
    const keys = Object.keys(argsObj).slice(0, 2);
    const formatted = keys
      .map(k => `${k}=${JSON.stringify(argsObj[k]).slice(0, 20)}...`)
      .join(' ');
    return formatted.length > MAX_TOOL_ARGS_PREVIEW
      ? formatted.slice(0, MAX_TOOL_ARGS_PREVIEW) + '...'
      : formatted;
  } catch {
    const str = String(args);
    return str.length > MAX_TOOL_ARGS_PREVIEW
      ? str.slice(0, MAX_TOOL_ARGS_PREVIEW) + '...'
      : str;
  }
}

/**
 * Format tool output for display
 */
export function formatToolOutput(data: unknown): string {
  if (!data) return '';

  const outputStr = typeof data === 'string' ? data : JSON.stringify(data);
  return outputStr.length > MAX_TOOL_OUTPUT_PREVIEW
    ? outputStr.slice(0, MAX_TOOL_OUTPUT_PREVIEW) + '...'
    : outputStr;
}

// ============================================================================
// String Formatters
// ============================================================================

/**
 * Truncate string to max length with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Format file size (bytes to human readable)
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
