import React, { useEffect, useState } from 'react';
import { Box, Text, Transform } from 'ink';
import { COLORS } from '../../utils/constants';

interface LoadingProps {
  text?: string;
  color?: string;
}

/**
 * 优化的加载组件，使用 Transform 实现动画效果
 */
const Loading: React.FC<LoadingProps> = ({
  text = 'AI is thinking...',
  color = COLORS.DIM
}) => {
  const [frame, setFrame] = useState(0);

  // 旋转动画帧
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % 10);
    }, 80); // 80ms 切换一次，与 SPINNER_INTERVAL_MS 一致

    return () => clearInterval(interval);
  }, []);

  // 旋转的圆点字符
  const spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const currentChar = spinnerChars[frame];

  return (
    <Box marginTop={1} marginBottom={4}>
      {/* 使用 Transform 实现动态变换效果 */}
      <Transform transform={(string, index) => {
        // 只在第一帧（spinner 字符位置）应用变换
        if (index === 0) {
          // 返回当前帧的 spinner 字符
          return currentChar;
        }
        return string;
      }}>
        <Text color={COLORS.SECONDARY}>
          ●
        </Text>
      </Transform>
      <Text> </Text>
      <Text color={color}>{text}</Text>
    </Box>
  );
};

export default Loading;
