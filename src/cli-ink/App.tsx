/**
 * CLI 主应用组件 - 使用 Ink
 */
import React, { useState, useCallback } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { CLIProvider, useCLIContext } from './context';
import { Input } from './components/Input';
import { MessageList, Welcome } from './components/MessageList';
import { executeCommand } from './commands';
import { Spinner } from '@inkjs/ui';
import Agent from '../../agent';

interface CLIAppProps {
    agent: Agent;
    initialSessionId: string;
}

function CLIAppContent({ agent }: { agent: Agent }) {
    const { exit } = useApp();
    const {
        messages,
        addMessage,
        isProcessing,
        setProcessing,
        shouldExit,
        setShouldExit,
    } = useCLIContext();

    // 处理用户提交
    const handleSubmit = useCallback(async (input: string) => {
        // 添加用户消息
        addMessage({ role: 'user', content: input });

        // 检查是否是命令
        const { executed, output } = await executeCommand(input);

        if (executed) {
            // 如果是命令且有输出，显示输出
            if (output) {
                addMessage({ role: 'assistant', content: output });
            }
            // 检查是否应该退出
            if (shouldExit) {
                setShouldExit(false); // 重置
                exit();
            }
            return;
        }

        // 不是命令，作为聊天发送
        setProcessing(true);

        try {
            // 显示助手标记
            addMessage({ role: 'assistant', content: '', type: 'streaming' });

            // 调用 agent
            const response = await agent.run(input, {
                silent: true,
                stream: true,
                streamCallback: (chunk) => {
                    // 流式更新最后一条消息
                    const lastMsg = messages[messages.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant') {
                        lastMsg.content += chunk.content || '';
                        // 强制更新
                        addMessage({ ...lastMsg });
                    }
                },
            });

            // 如果没有流式响应，直接设置最终内容
            if (response) {
                const lastMsg = messages[messages.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                    lastMsg.content = response.content;
                    addMessage({ ...lastMsg });
                }
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            addMessage({
                role: 'assistant',
                content: `❌ Error: ${errorMsg}`,
                type: 'text',
            });
        } finally {
            setProcessing(false);
        }
    }, [agent, messages, addMessage, setProcessing, shouldExit, exit, setShouldExit]);

    // 监听退出信号
    useInput((input, key) => {
        if (key.ctrl && input === 'c') {
            exit();
        }
    });

    return (
        <Box flexDirection="column" height="100%">
            {/* 欢迎信息 */}
            <Welcome />

            {/* 消息列表 */}
            <MessageList />

            {/* 处理中状态 */}
            {isProcessing && (
                <Box>
                    <Text color="yellow"><Spinner type="dots" /></Text>
                    <Text color="yellow"> Thinking...</Text>
                </Box>
            )}

            {/* 输入区域 */}
            <Input onSubmit={handleSubmit} />
        </Box>
    );
}

export function CLIApp({ agent, initialSessionId }: CLIAppProps) {
    return (
        <CLIProvider agent={agent} initialSessionId={initialSessionId}>
            <CLIAppContent agent={agent} />
        </CLIProvider>
    );
}
