/**
 * 输入组件 - 使用 Ink 的 useInput 处理用户输入
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { useCLIContext } from './context';
import { executeCommand } from './commands';
import { Spinner } from '@inkjs/ui';

interface InputProps {
    onSubmit: (value: string) => Promise<void>;
}

export function Input({ onSubmit }: InputProps) {
    const [value, setValue] = useState('');
    const [showMenu, setShowMenu] = useState(false);
    const [menuIndex, setMenuIndex] = useState(0);
    const { exit } = useApp();
    const {
        addToHistory,
        navigateHistory,
        resetHistoryIndex,
        isProcessing,
        commandHistory,
    } = useCLIContext();

    // 特殊按键处理
    useInput((input, key) => {
        // 如果正在处理，不接受输入
        if (isProcessing) return;

        // ESC 或 Ctrl+C - 取消当前输入
        if (key.escape) {
            setValue('');
            setShowMenu(false);
            resetHistoryIndex();
            return;
        }

        if (key.ctrl && input === 'c') {
            exit();
            return;
        }

        // 上下箭头 - 历史导航
        if (key.upArrow) {
            navigateHistory('up');
            return;
        }
        if (key.downArrow) {
            navigateHistory('down');
            return;
        }

        // 菜单导航
        if (showMenu) {
            if (key.downArrow || input === 'j') {
                setMenuIndex(prev => Math.min(prev + 1, 6)); // 6 = 命令数量
            } else if (key.upArrow || input === 'k') {
                setMenuIndex(prev => Math.max(prev - 1, 0));
            } else if (key.return) {
                // 选择菜单项
                const commands = ['/help', '/clear', '/history', '/exit', '/session', '/sess'];
                if (menuIndex > 0 && menuIndex < commands.length) {
                    setValue(commands[menuIndex]);
                } else {
                    setValue('');
                }
                setShowMenu(false);
            } else if (key.escape || input === 'q') {
                setShowMenu(false);
            }
            return;
        }

        // 输入 "/" 显示命令菜单
        if (input === '/' && value === '') {
            setShowMenu(true);
            setMenuIndex(0);
            return;
        }

        // 回车提交
        if (key.return) {
            if (value.trim()) {
                addToHistory(value.trim());
                onSubmit(value.trim());
                setValue('');
            }
            return;
        }

        // 普通字符输入
        if (!key.ctrl && !key.meta && input.length === 1) {
            setValue(v => v + input);
            if (showMenu) {
                setShowMenu(false);
            }
        }

        // 退格
        if (key.backspace || (key.ctrl && input === 'h')) {
            setValue(v => v.slice(0, -1));
        }
    });

    // 命令菜单项
    const menuItems = [
        { name: '/', description: 'Use slash command...' },
        { name: '/help', description: 'Show help message' },
        { name: '/clear', description: 'Clear screen and messages' },
        { name: '/history', description: 'Show command history' },
        { name: '/exit', description: 'Exit the CLI' },
        { name: '/session', description: 'Manage sessions' },
        { name: '/sess', description: 'Manage sessions (alias)' },
    ];

    return (
        <Box flexDirection="column" marginTop={1}>
            {/* 命令菜单 */}
            {showMenu && (
                <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
                    {menuItems.map((item, index) => (
                        <Text
                            key={item.name}
                            color={index === menuIndex ? 'cyan' : undefined}
                            inverse={index === menuIndex}
                        >
                            {index === menuIndex ? '❯ ' : '  '}
                            {item.name.padEnd(15)}
                            {item.description}
                        </Text>
                    ))}
                </Box>
            )}

            {/* 输入提示符 */}
            <Box>
                <Text color="green">{'> '}</Text>
                <Text>{value}</Text>
                {isProcessing && (
                    <Text color="yellow"> <Spinner type="dots" /></Text>
                )}
            </Box>
        </Box>
    );
}
