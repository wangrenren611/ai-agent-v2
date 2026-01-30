/**
 * Toast Component
 *
 * Display temporary notifications
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { COLORS } from '../../utils/constants';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

interface ToastProps {
  message?: string;
  title?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  show: (props: ToastProps) => void;
  hide: () => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [toast, setToast] = useState<ToastProps>({});

  const show = (props: ToastProps) => {
    setToast(props);
    setVisible(true);
  };

  const hide = () => {
    setVisible(false);
  };

  return (
    <ToastContext.Provider value={{ show, hide }}>
      {children}
      {visible && <Toast {...toast} />}
    </ToastContext.Provider>
  );
};

const Toast: React.FC<ToastProps> = ({
  message,
  title,
  variant = 'info',
  duration = 3000,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  if (!visible) return null;

  const getIcon = (): string => {
    switch (variant) {
      case 'success':
        return '✓';
      case 'warning':
        return '⚠';
      case 'error':
        return '✗';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  const getColor = (): string => {
    switch (variant) {
      case 'success':
        return COLORS.SECONDARY;
      case 'warning':
        return COLORS.WARNING;
      case 'error':
        return COLORS.ERROR;
      case 'info':
      default:
        return COLORS.INFO;
    }
  };

  return (
    <Box
      paddingX={1}
      marginBottom={1}
      borderStyle="single"
      borderColor={getColor()}
    >
      <Box>
        <Text bold color={getColor()}>
          {getIcon()}
        </Text>
        <Text> </Text>
        {title && (
          <Text bold color={getColor()}>
            {title}
          </Text>
        )}
        {title && message && <Text> - </Text>}
        {message && (
          <Text color="gray">
            {message}
          </Text>
        )}
      </Box>
    </Box>
  );
};

export default Toast;
