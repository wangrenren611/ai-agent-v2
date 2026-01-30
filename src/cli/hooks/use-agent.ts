import { useEffect, useState, useRef, useCallback } from "react";
import { registerDefaultToolsAsync, ToolRegistry } from "../../tool";
import { Agent } from "../../agent";
import { ProviderRegistry, ProviderType } from "../../providers/provider-registry";
import { operatorPrompt } from "../../prompts/operator";
import { Message } from "../../agent/message";
import { StreamChunk } from "../../agent/types";


const useAgent = ({model}: {model: ProviderType;}) => {
    const [agent, setAgent] = useState<Agent | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
    const [usedTokens, setUsedTokens] = useState<{usedTokens: number; totalTokens: number;}>({usedTokens: 0, totalTokens: 0});

    // 使用 ref 存储事件处理函数的引用，避免闭包问题
    const eventHandlersRef = useRef<{
        handleStreamChunk?: (message: StreamChunk) => void;
        handleComplete?: () => void;
        handleToolCall?: (data: any) => void;
        handleToolResult?: (data: any) => void;
        handleTokenUsage?: (data: { usedTokens: number; totalTokens: number }) => void;
    }>({});

    const agentRef = useRef<Agent | null>(null);

    const initAgent = useCallback(async () => {
        
        await registerDefaultToolsAsync();

        const agent = new Agent({
            llmProvider: ProviderRegistry.createFromEnv(model),
            systemPrompt: operatorPrompt({
                directory: process.env.PROJECT_DIRECTORY || process.cwd(),
                vcs: process.env.VCS || 'git',
                language: process.env.PROJECT_LANGUAGE || '',
            }),
            temperature: 0.1,
            tools: ToolRegistry.getSchemas(),

        });

        await agent.start();

       setUsedTokens(agent.getUsedTokens());

        // 保存到 ref 
        agentRef.current = agent;
    
        setAgent(agent);

        // 立即注册事件监听器（不依赖 useEffect）
        const handleStreamChunk = (message: StreamChunk) => {
            setMessages((prev) => {
                const existingIndex = prev.findIndex(msg => msg.messageId === message.messageId);
                
                if (existingIndex !== -1) {
                    return prev.map((msg, index) => 
                        index === existingIndex 
                            ? { ...msg, content: msg.content + (message?.content || '') }
                            : msg
                    );
                }
                
                return [...prev, message as Message];
            });
        };

        const handleComplete = () => {
            setIsLoading(false);
            setCurrentMessageId(null);
        };

        const handleToolCall = (data: any) => {
            setMessages((prev) => {
                const existingIndex = prev.findIndex(msg => 
                    msg.messageId === data.messageId 
                );

                if (existingIndex !== -1) {
                    return prev.map((msg, index) => 
                        index === existingIndex 
                            ? { 
                                ...msg, 
                                type: 'tool-call' as Message['type'],
                                toolName: data.toolName,
                                args: data.args,
                            }
                            : msg
                    );
                }

                const toolMessage: Message = {
                    messageId: data.messageId,
                    role: 'assistant',
                    type: 'tool-call' as Message['type'],
                    content: '',
                    toolName: data.toolName,
                    args: data.args,
                };

                return [...prev, toolMessage];
            });
        };

        const handleToolResult = (data: any) => {
            setMessages(prev => {
                const existingToolCallIndex = prev.findIndex(msg => 
                    msg.messageId === data.messageId && msg.type === 'tool-call'
                );

                let updatedMessages = [...prev];

                if (existingToolCallIndex !== -1) {
                    updatedMessages = updatedMessages.map((msg, index) => 
                        index === existingToolCallIndex 
                            ? { ...msg, result: data.result }
                            : msg
                    );
                }

                const resultMessage: Message = {
                    messageId: `${data.messageId}-tool-result-${Date.now()}`,
                    role: 'assistant',
                    content: '',
                    type: 'tool-result',
                    toolName: data.toolName,
                    result: data.result,
                    duration: data.duration,
                    parentMessageId: data.messageId,
                };

                return [...updatedMessages, resultMessage];
            });
        };

        const handleTokenUsage = (data: { usedTokens: number; totalTokens: number }) => {
            setUsedTokens({
                usedTokens: data.usedTokens,
                totalTokens: data.totalTokens,
            });
        };

        // 保存处理函数引用以便清理
        eventHandlersRef.current = {
            handleStreamChunk,
            handleComplete,
            handleToolCall,
            handleToolResult,
            handleTokenUsage,
        };

        // 注册事件监听器
        agent.on('stream-chunk', handleStreamChunk);
        agent.on('complete', handleComplete);
        agent.on('tool-call', handleToolCall);
        agent.on('tool-result', handleToolResult);
        agent.on('token-usage', handleTokenUsage);
 
        console.log('[useAgent] Event listeners registered');

    }, [model]);



    useEffect(() => {
        initAgent();
    }, [initAgent]);

    const submitMessage = (message: string) => {
        const currentAgent = agentRef.current;
        if (currentAgent && message) {
            const userMessage: Message = {
                messageId: `user-${Date.now()}`,
                role: 'user',
                content: message,
            };
            setMessages(prev => [...prev, userMessage]);
            setIsLoading(true);
            
            currentAgent.run(message, {
                stream: true,
            });
        }
    }


    return {
        submitMessage,
        messages,
        isLoading,
        currentMessageId,
        usedTokens
    }

}

export default useAgent;
