import { useEffect, useState } from "react";
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
    
    const initAgent = async () => {
        
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
        setAgent(agent);

        agent.on('stream-chunk', (message:StreamChunk) => {
          
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
        });

        agent.on('complete', () => {
            setIsLoading(false);
            setCurrentMessageId(null);
        });

        agent.on('tool-call', (data) => {
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
        })

        agent.on('tool-result', (data) => {
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
        })
    }

    useEffect(() => {
        initAgent();
    }, [model]);

    const submitMessage = (message: string) => {
        if (agent && message) {
            const userMessage: Message = {
                messageId: `user-${Date.now()}`,
                role: 'user',
                content: message,
            };
            setMessages(prev => [...prev, userMessage]);
            setIsLoading(true);
            
            agent.run(message, {
                stream: true,
            });
        }
    }


    return {
        submitMessage,
        messages,
        isLoading,
        currentMessageId
    }

}

export default useAgent;