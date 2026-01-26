/**
 * CLI Context - 使用 React Context 管理 CLI 状态
 */
import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type Agent from '../../agent';

interface Message {
    role: 'user' | 'assistant' | 'tool';
    content: string;
    type?: string;
    createdAt?: Date;
}

interface CLIContextType {
    // 状态
    sessionId: string;
    messages: Message[];
    isProcessing: boolean;
    inputValue: string;
    commandHistory: string[];
    historyIndex: number;
    shouldExit: boolean;

    // 操作
    setSessionId: (id: string) => void;
    addMessage: (message: Message) => void;
    setProcessing: (processing: boolean) => void;
    setInputValue: (value: string) => void;
    addToHistory: (value: string) => void;
    navigateHistory: (direction: 'up' | 'down') => void;
    resetHistoryIndex: () => void;
    setShouldExit: (exit: boolean) => void;
    clearMessages: () => void;
}

const CLIContext = createContext<CLIContextType | null>(null);

export function useCLIContext() {
    const context = useContext(CLIContext);
    if (!context) {
        throw new Error('useCLIContext must be used within CLIProvider');
    }
    return context;
}

interface CLIProviderProps {
    children: ReactNode;
    initialSessionId: string;
    agent: Agent;
}

export function CLIProvider({ children, initialSessionId, agent }: CLIProviderProps) {
    const [sessionId] = useState(initialSessionId);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isProcessing, setProcessing] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [shouldExit, setShouldExit] = useState(false);

    const addMessage = useCallback((message: Message) => {
        setMessages(prev => [...prev, { ...message, createdAt: new Date() }]);
    }, []);

    const setSessionId = useCallback((id: string) => {
        // sessionId 是只读的，如果需要切换会话，应该创建新的上下文
        console.log('Session ID requested change to:', id);
    }, []);

    const addToHistory = useCallback((value: string) => {
        setCommandHistory(prev => {
            // 避免重复连续的相同命令
            if (prev.length > 0 && prev[prev.length - 1] === value) {
                return prev;
            }
            return [...prev, value];
        });
        setHistoryIndex(-1);
    }, []);

    const navigateHistory = useCallback((direction: 'up' | 'down') => {
        if (commandHistory.length === 0) return;

        if (direction === 'up') {
            if (historyIndex < commandHistory.length - 1) {
                const newIndex = historyIndex + 1;
                setHistoryIndex(newIndex);
                setInputValue(commandHistory[commandHistory.length - 1 - newIndex]);
            }
        } else {
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setInputValue(commandHistory[commandHistory.length - 1 - newIndex]);
            } else if (historyIndex === 0) {
                setHistoryIndex(-1);
                setInputValue('');
            }
        }
    }, [commandHistory, historyIndex]);

    const resetHistoryIndex = useCallback(() => {
        setHistoryIndex(-1);
    }, []);

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    const value: CLIContextType = {
        sessionId,
        messages,
        isProcessing,
        inputValue,
        commandHistory,
        historyIndex,
        shouldExit,
        setSessionId,
        addMessage,
        setProcessing,
        setInputValue,
        addToHistory,
        navigateHistory,
        resetHistoryIndex,
        setShouldExit,
        clearMessages,
    };

    return (
        <CLIContext.Provider value={value}>
            {children}
        </CLIContext.Provider>
    );
}
