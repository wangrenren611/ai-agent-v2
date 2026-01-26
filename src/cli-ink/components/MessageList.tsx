/**
 * 消息显示组件
 */
import React, { useEffect, useRef } from 'react';
import { Box, Text } from 'ink';
import { useCLIContext } from '../context';

export function MessageList() {
    const { messages } = useCLIContext();
    const endRef = useRef<HTMLDivElement>(null);

    // 自动滚动到底部
    useEffect(() => {
        // Ink 不支持 DOM 操作，但我们可以确保最后一条消息可见
    }, [messages]);

    if (messages.length === 0) {
        return null;
    }

    return (
        <Box flexDirection="column">
            {messages.map((msg, index) => (
                <MessageItem key={index} message={msg} />
            ))}
        </Box>
    );
}

interface MessageItemProps {
    message: {
        role: 'user' | 'assistant' | 'tool';
        content: string;
        type?: string;
        createdAt?: Date;
    };
}

function MessageItem({ message }: MessageItemProps) {
    const isUser = message.role === 'user';
    const isTool = message.role === 'tool';
    const isSummary = message.type === 'summary';

    let label: React.ReactNode;
    let labelColor: string;

    if (isUser) {
        label = '👤 You';
        labelColor = 'blue';
    } else if (isTool) {
        label = '🔧 Tool';
        labelColor = 'magenta';
    } else if (isSummary) {
        label = '📝 Summary';
        labelColor = 'yellow';
    } else {
        label = '🤖 Agent';
        labelColor = 'green';
    }

    return (
        <Box flexDirection="column" marginBottom={1}>
            <Text color={labelColor} bold>
                {label}
                {message.createdAt && (
                    <Text color="gray" dimColor>
                        {' '}
                        {new Date(message.createdAt).toLocaleTimeString()}
                    </Text>
                )}
            </Text>
            <Box
                paddingLeft={2}
                borderStyle={isUser ? 'bold' : undefined}
                borderColor={isUser ? 'blue' : undefined}
            >
                <Text wrap="wrap">{message.content}</Text>
            </Box>
        </Box>
    );
}

/**
 * 欢迎信息组件
 */
export function Welcome() {
    return (
        <Box flexDirection="column" marginBottom={1}>
            <Text color="green" bold>
                ╔════════════════════════════════════════════════╗
            </Text>
            <Text color="green" bold>
                ║       AI Agent - Interactive Mode              ║
            </Text>
            <Text color="green" bold>
                ╚════════════════════════════════════════════════╝
            </Text>
            <Text color="gray">Type /help for available commands</Text>
            <Text color="gray">Type "/" to show command menu</Text>
        </Box>
    );
}
