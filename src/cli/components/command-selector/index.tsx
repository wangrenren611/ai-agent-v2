/**
 * Command Selector Component
 *
 * 命令选择器，支持模糊匹配和键盘导航
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { commandRegistry, type Command } from '../../commands';
import fuzzysort from 'fuzzysort';

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

    // 使用模糊匹配
    const results = fuzzysort.go(searchTerm, allCommands, {
      key: 'name',
      threshold: -1000,
    });

    setFilteredCommands(results.map(r => r.obj));
    setSelectedIndex(0);
  }, [input, visible]);

  // 键盘导航
  const handleKey = useCallback(
    (_input: string, key: any) => {
      if (!visible) return;

      // 上箭头
      if (key.upArrow) {
        setSelectedIndex(prev => Math.max(0, prev - 1));
        return true; // 阻止事件传播
      }

      // 下箭头
      if (key.downArrow) {
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

      // ESC - 取消
      if (key.escape) {
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
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold dimColor>Commands</Text>
      </Box>

      {visibleCommands.map((cmd, index) => (
        <Box key={cmd.id}>
          <Text
            color={index === selectedIndex ? 'cyanBright' : 'gray'}
            bold={index === selectedIndex}
          >
            {index === selectedIndex ? '> ' : '  '}
          </Text>
          <Text
            color={index === selectedIndex ? 'cyanBright' : 'white'}
            bold={index === selectedIndex}
          >
            {cmd.name}
          </Text>
          {cmd.aliases && cmd.aliases.length > 0 && (
            <Text dimColor>
              {' '}
              ({cmd.aliases.join(', ')})
            </Text>
          )}
          <Text dimColor> - {cmd.description}</Text>
        </Box>
      ))}

      {hasMore && (
        <Box>
          <Text dimColor>... and {filteredCommands.length - maxVisible} more</Text>
        </Box>
      )}
    </Box>
  );
};

export default CommandSelector;
