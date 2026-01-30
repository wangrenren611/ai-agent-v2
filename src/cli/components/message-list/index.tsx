/**
 * Message List Component
 *
 * Displays conversation messages with improved styling and tool call integration
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Message } from '../../../agent/message';
import { COLORS, ICONS } from '../../utils/constants';
import MarkdownText from './MarkdownText';
import Loading from '../Loading';
import ToolCallList from '../tool-call';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading = false }) => {
  // Group messages by user/assistant and tool calls
  const groupMessages = (messages: Message[]) => {
    const groups: Array<{
      type: 'user' | 'assistant' | 'tool-group';
      message?: Message;
      tools?: Message[];
      index: number;
    }> = [];

    messages.forEach((msg, index) => {
      const isUser = msg.role === 'user';
      const isAssistant = msg.role === 'assistant';
      const isToolCall = msg.type === 'tool-call';

      if (isToolCall) {
        // Check if there's already a tool group
        const lastGroup = groups[groups.length - 1];
        if (lastGroup?.type === 'tool-group') {
          lastGroup.tools?.push(msg);
        } else {
          groups.push({
            type: 'tool-group',
            tools: [msg],
            index,
          });
        }
      } else {
        // Start a new message group
        groups.push({
          type: isUser ? 'user' : 'assistant',
          message: msg,
          index,
        });
      }
    });

    return groups;
  };

  const renderUserMessage = (msg: Message) => {
    const content = typeof msg.content === 'string' ? msg.content : '';
    const trimmedContent = content.trim();

    return (
      <Box
        key={`user-${msg.messageId}`}
        flexDirection="row"
        marginBottom={1}
        width="100%"
      >
       <Text color={COLORS.DIM}>{ICONS.INPUT}</Text>
        {trimmedContent && (
          <Box marginLeft={1}>
            <Text dimColor color="gray">
              {trimmedContent}
            </Text>
          </Box>
        )}
      </Box>
    );
  };

  const renderAssistantMessage = (msg: Message) => {
    const content = typeof msg.content === 'string' ? msg.content : '';
    const trimmedContent = content;

    return (
      <Box
        key={`assistant-${msg.messageId}`}
        flexDirection="row"
        marginBottom={1}
        width="100%"
      >
      <Text bold color="green">{ICONS.ASSISTANT}</Text>
        {trimmedContent && (
          <Box marginLeft={1}>
            <MarkdownText content={trimmedContent} />
          </Box>
        )}
      </Box>
    );
  };

  const renderToolGroup = (tools: Message[], index: number) => {
    const toolCallMessages = tools.filter(t => t.type === 'tool-call').map(t => ({
      type: 'tool-call' as const,
      toolName: t.toolName,
      args: t.args,
      result: t.result,
    }));

    return (
      <Box
        key={`tool-group-${index}`}
        flexDirection="column"
        marginBottom={1}
        width="100%"
      >
        <Box>
          <Text color={COLORS.DIM}>⚡</Text>
          <Text> </Text>
          <Text bold color="yellow">
            Tools
          </Text>
        </Box>
        <Box marginLeft={3}>
          <ToolCallList messages={toolCallMessages} />
        </Box>
      </Box>
    );
  };

  const groupedMessages = groupMessages(messages);

  if (messages.length === 0) {
    return (
      <Box justifyContent="center" marginTop={1}>
        <Text dimColor color={COLORS.DIM}>
          No messages yet. Start chatting!
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width="100%">
      {groupedMessages.map((group) => {
        if (group.type === 'user') {
          return renderUserMessage(group.message!);
        } else if (group.type === 'assistant') {
          return renderAssistantMessage(group.message!);
        } else {
          return renderToolGroup(group.tools!, group.index);
        }
      })}
      {isLoading && <Loading />}
    </Box>
  );
};

export default MessageList;
