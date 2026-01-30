/**
 * Command Selector Component
 *
 * 命令选择器，支持模糊匹配和键盘导航，优化 UI 显示
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { commandRegistry, type Command } from '../../commands';
import fuzzysort from 'fuzzysort';
import { COLORS } from '../../utils/constants';

// ============================================================================
// Props
// ============================================================================

interface CommandSelectorProps {
  visible: boolean;
  input: string;
  onSelect: (command: Command) => void;
  onCancel: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const CommandSelector: React.FC<CommandSelectorProps> = ({
  visible,
  input,
  onSelect,
  onCancel,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredCommands, setFilteredCommands] = useState<Command[]>([]);
  const maxVisible = 8;

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

    // 使用模糊匹配，同时搜索名称和描述
    const nameResults = fuzzysort.go(searchTerm, allCommands, {
      key: 'name',
      threshold: -1000,
    });

    const descResults = fuzzysort.go(searchTerm, allCommands, {
      key: 'description',
      threshold: -2000, // 描述匹配权重稍低
    });

    // 合并结果去重
    const uniqueResults = new Map<string, Command>();
    [...nameResults, ...descResults].forEach(r => {
      uniqueResults.set(r.obj.id, r.obj);
    });

    setFilteredCommands(Array.from(uniqueResults.values()));
    setSelectedIndex(0);
  }, [input, visible]);

  // 键盘导航
  const handleKey = useCallback(
    (_input: string, key: any) => {
      if (!visible) return;

      // 上箭头 / Ctrl+P
      if (key.upArrow || (key.ctrl && key.name === 'p')) {
        setSelectedIndex(prev => Math.max(0, prev - 1));
        return true; // 阻止事件传播
      }

      // 下箭头 / Ctrl+N
      if (key.downArrow || (key.ctrl && key.name === 'n')) {
        setSelectedIndex(prev => Math.min(filteredCommands.length - 1, prev + 1));
        return true; // 阻止事件传播
      }

      // Enter - 选择命令
      if (key.return) {
        if (filteredCommands.length > 0 && filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex]);
          return true; // 阻止事件传播，防止触发 Input 的 onSubmit
        }
      }

      // ESC / Ctrl+C - 取消
      if (key.escape || (key.ctrl && key.name === 'c')) {
        onCancel();
        return true; // 阻止事件传播
      }
    },
    [visible, filteredCommands, selectedIndex, onSelect, onCancel]
  );

  // 注册键盘监听
  useInput(handleKey, { isActive: visible });

  if (!visible || filteredCommands.length === 0) {
    return null;
  }

  // 计算可见的命令列表
  const visibleCommands = filteredCommands.slice(0, maxVisible);
  const hasMore = filteredCommands.length > maxVisible;

  return (
    <Box
      flexDirection="column"
      marginBottom={1}
      borderStyle="single"
      borderColor={COLORS.DIM}
      paddingX={1}
    >
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color={COLORS.PRIMARY}>
          Commands
        </Text>
        <Text dimColor color={COLORS.DIM}>
          {' '} ({filteredCommands.length})
        </Text>
      </Box>

      {/* Command List */}
      {visibleCommands.map((cmd, index) => (
        <Box key={cmd.id} marginBottom={index < visibleCommands.length - 1 ? 0.5 : 0}>
          <Text
            color={index === selectedIndex ? COLORS.PRIMARY : COLORS.DIM}
            bold={index === selectedIndex}
          >
            {index === selectedIndex ? '► ' : '  '}
          </Text>
          <Text
            color={index === selectedIndex ? COLORS.PRIMARY : 'white'}
            bold={index === selectedIndex}
          >
            {cmd.name}
          </Text>
          {cmd.aliases && cmd.aliases.length > 0 && (
            <Text dimColor color="gray">
              {' '}
              ({cmd.aliases.join(', ')})
            </Text>
          )}
        </Box>
      ))}

      {/* Description for selected command */}
      {visibleCommands[selectedIndex]?.description && (
        <Box marginTop={1} marginLeft={2}>
          <Text dimColor color="gray">
            {visibleCommands[selectedIndex].description}
          </Text>
        </Box>
      )}

      {/* More indicator */}
      {hasMore && (
        <Box marginTop={1}>
          <Text dimColor color={COLORS.DIM}>
            ... and {filteredCommands.length - maxVisible} more
          </Text>
        </Box>
      )}

      {/* Footer hint */}
      <Box marginTop={1}>
        <Text dimColor color={COLORS.DIM}>
          [↑↓] Navigate • [Enter] Select • [Esc] Cancel
        </Text>
      </Box>
    </Box>
  );
};

export default CommandSelector;
