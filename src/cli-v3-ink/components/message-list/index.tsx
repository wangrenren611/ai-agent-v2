import React from 'react';
import { Box, Text } from 'ink';
import { Message } from '../../../agent/message';
import { COLORS, ICONS } from '../../utils/constants';
import MarkdownText from './MarkdownText';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading = false }) => {

  const formatArgs = (args: unknown): string => {
    if (args === null || args === undefined) return 'null';
    const str = typeof args === 'string' ? args : JSON.stringify(args);
    return str.length > 40 ? str.slice(0, 40) + '...' : str;
  };

  const formatResult = (result: any): string => {
    if (result === null || result === undefined) return 'null';
    const str = typeof result === 'string' ? result : JSON.stringify(result);
    return str.length > 60 ? str.slice(0, 60) + '...' : str;
  };

  const renderMessage = (msg: Message, index: number) => {
    const isUser = msg.role === 'user';
    const isToolCall = msg.type === 'tool-call';
    const isToolResult = msg.type === 'tool-result';

    let icon = '●';
    let iconColor: string = COLORS.DIM;

    if (isUser) {
      icon = ICONS.INPUT;
      iconColor = COLORS.DIM;
    } else if (isToolCall) {
      if (msg.result?.success) {
        iconColor = COLORS.SECONDARY;
      } else if (msg.result?.success === false) {
        iconColor = COLORS.ERROR;
      } else {
        iconColor = COLORS.DIM;
      }
    } else if (isToolResult) {
      if (msg.result?.success) {
        iconColor = COLORS.SECONDARY;
      } else {
        iconColor = COLORS.ERROR;
      }
    } else {
      iconColor = 'white';
    }

    return (<Box key={`${msg.messageId}-${index}`} flexDirection="column">
        {msg.content && !isToolCall ? (<Box marginTop={1}><Text color={iconColor}>{icon}</Text><Text>{' '}</Text><MarkdownText content={((msg?.content as string)?.trim() as string).replace(/^\n+|\n+$/g, '')} /></Box>) : null}
        {isToolCall && (
          <Box marginTop={1}>
            <Text color={iconColor}>{icon}</Text><Text>{' '}</Text>
            <Text>{msg.toolName}</Text>
            <Text>({formatArgs(msg.args)})</Text>
          </Box>
        )}
        {isToolResult && (
          <Box marginLeft={4}><Text color={'#999'}>{formatResult(msg.result)}</Text></Box>
        )}
      </Box>);
  };

  if (messages.length === 0) {
    return (
      <Box justifyContent="center" marginTop={1}>
        <Text dimColor color={COLORS.DIM}>No messages yet. Start chatting!</Text>
      </Box>
    );
  }

  return (<Box flexDirection="column">
      {messages.map((msg, index) => renderMessage(msg, index))}
      {isLoading && (
        <Box marginTop={1} marginBottom={4}>
          <Text color={COLORS.DIM}><Text color={COLORS.SECONDARY}>●</Text> AI is thinking...</Text>
        </Box>
      )}
    </Box>);
};

export default MessageList;
