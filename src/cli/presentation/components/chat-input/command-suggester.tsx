/**
 * Command Suggester Component
 *
 * 命令建议组件 - 使用模糊匹配和键盘导航
 * 使用 capture 阶段事件监听来阻止事件冒泡
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import { commandRegistry, type Command } from '../../../commands';
import fuzzysort from 'fuzzysort';

// ============================================================================
// Props
// ============================================================================

export interface CommandSuggesterProps {
  /** 是否可见 */
  visible: boolean;

  /** 当前输入值（用于筛选） */
  input: string;

  /** 命令选择回调 */
  onSelect: (command: Command) => void;

  /** 取消回调 */
  onCancel: () => void;

  /** 初始选中索引 */
  initialSelectedIndex?: number;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_VISIBLE = 8;

// ============================================================================
// Component
// ============================================================================

/**
 * 命令建议组件
 *
 * 职责：
 * - 显示匹配的命令列表
 * - 处理键盘导航（上下箭头、Enter、ESC）
 * - 使用模糊匹配筛选命令
 * - 使用 capture 阶段事件阻止冒泡
 */
export const CommandSuggester: React.FC<CommandSuggesterProps> = ({
  visible,
  input,
  onSelect,
  onCancel,
  initialSelectedIndex = 0,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
  const [filteredCommands, setFilteredCommands] = useState<Command[]>([]);

  // 模糊匹配和筛选
  useEffect(() => {
    if (!visible) return;

    const allCommands = commandRegistry.getAll();
    const searchTerm = input.replace(/^\/+/, '').trim();

    if (!searchTerm) {
      setFilteredCommands(allCommands);
      setSelectedIndex(0);
      return;
    }

    // 使用模糊匹配
    const results = fuzzysort.go(searchTerm, allCommands, {
      key: 'name',
      threshold: -1000,
    });

    setFilteredCommands(results.map((r) => r.obj));
    setSelectedIndex(0);
  }, [input, visible]);

  // 键盘导航 - 使用 capture 阶段监听以阻止事件冒泡
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 上箭头
      if (e.key === 'upArrow' || (e as any).key === 'ArrowUp' || (e as any).upArrow) {
        e.stopImmediatePropagation();
        setSelectedIndex((prev) => Math.max(0, prev - 1));
        return;
      }

      // 下箭头
      if (e.key === 'downArrow' || (e as any).key === 'ArrowDown' || (e as any).downArrow) {
        e.stopImmediatePropagation();
        setSelectedIndex((prev) => Math.min(filteredCommands.length - 1, prev + 1));
        return;
      }

      // Enter - 选择命令
      if (e.key === 'Enter' || e.key === 'return') {
        e.stopImmediatePropagation();
        if (filteredCommands.length > 0 && filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex]);
        }
        return;
      }

      // ESC - 取消
      if (e.key === 'Escape' || e.key === 'escape') {
        e.stopImmediatePropagation();
        onCancel();
        return;
      }
    };

    // 使用 capture 阶段监听，确保在其他处理器之前执行
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [visible, filteredCommands, selectedIndex, onSelect, onCancel]);

  if (!visible || filteredCommands.length === 0) {
    return null;
  }

  // 计算可见的命令列表
  const visibleCommands = filteredCommands.slice(0, MAX_VISIBLE);
  const hasMore = filteredCommands.length > MAX_VISIBLE;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold dimColor>
          Commands
        </Text>
      </Box>

      {visibleCommands.map((cmd, index) => (
        <Box key={cmd.id}>
          <Text color={index === selectedIndex ? 'cyanBright' : 'gray'} bold={index === selectedIndex}>
            {index === selectedIndex ? '> ' : '  '}
          </Text>
          <Text color={index === selectedIndex ? 'cyanBright' : 'white'} bold={index === selectedIndex}>
            {cmd.name}
          </Text>
          {cmd.aliases && cmd.aliases.length > 0 && (
            <Text dimColor>
              {' '}
              ({cmd.aliases.join(', ')})
            </Text>
          )}
          <Text dimColor>
            {' '}
            - {cmd.description}
          </Text>
        </Box>
      ))}

      {hasMore && (
        <Box>
          <Text dimColor>
            ... and {filteredCommands.length - MAX_VISIBLE} more
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default CommandSuggester;
