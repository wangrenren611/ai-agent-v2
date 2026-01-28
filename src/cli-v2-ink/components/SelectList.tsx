import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

export interface SelectListItem {
  id: string;
  label: string;
  provider: string;
  model: string;
}

interface SelectListProps {
  items: SelectListItem[];
  onSelect: (item: SelectListItem) => void;
  selectedIndex?: number;
}

export const SelectList: React.FC<SelectListProps> = ({
  items,
  onSelect,
  selectedIndex: controlledIndex
}) => {
  const [internalIndex, setInternalIndex] = useState(0);
  const selectedIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;

  useEffect(() => {
    if (controlledIndex === undefined) {
      setInternalIndex(0);
    }
  }, [controlledIndex]);

  useInput((input, key) => {
    if (controlledIndex === undefined) {
      if (key.upArrow) {
        setInternalIndex(prev => (prev > 0 ? prev - 1 : items.length - 1));
      }

      if (key.downArrow) {
        setInternalIndex(prev => (prev < items.length - 1 ? prev + 1 : 0));
      }

      if (key.return) {
        onSelect(items[selectedIndex]);
      }
    }
  });

  return (
    <Box flexDirection="column">
      {items.map((item, index) => (
        <Box key={item.id} width={60}>
          <Box width={4}>
            <Text color={index === selectedIndex ? 'green' : 'gray'}>
              {index === selectedIndex ? '▶ ' : '  '}
            </Text>
          </Box>
          <Box flexGrow={1}>
            <Text color={index === selectedIndex ? 'green' : 'white'}>
              {item.label}
            </Text>
          </Box>
          <Box width={15}>
            <Text color="yellow">[{item.provider}]</Text>
          </Box>
          <Box width={20}>
            <Text color="cyan">{item.model}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
};
