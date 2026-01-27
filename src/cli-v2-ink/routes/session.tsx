/**
 * Session Route (Ink-based)
 *
 * Main chat interface with Agent integration.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { Agent } from '../../agent/index.js';
import { ProviderRegistry, ProviderType } from '../../providers/index.js';
import { operatorPrompt } from '../../prompts/operator.js';
import { registerDefaultToolsAsync, ToolRegistry } from '../../tool/index.js';
import type { RouteContextValue } from '../context/route.js';

// ============================================================================
// Types
// ============================================================================

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool' | 'tool-call';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  toolName?: string;
  toolArgs?: string;
  toolStatus?: 'calling' | 'success' | 'error';
  toolOutput?: string;
}

interface SessionProps {
  navigate: RouteContextValue['navigate'];
}

// ============================================================================
// Loading Spinner Component
// ============================================================================

const LoadingSpinner: React.FC<{ text?: string }> = ({ text = 'Thinking' }) => {
  const [frame, setFrame] = useState(0);
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];


  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev: number) => (prev + 1) % frames.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return (
    <Text bold color="yellow">
      {frames[frame]} {text}
    </Text>
  );
};

// ============================================================================
// Header Component
// ============================================================================

const Header: React.FC<{ isProcessing: boolean; status: string; model: string }> = ({ isProcessing, status, model }) => {
  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      justifyContent="space-between"
    >
      <Box>
        <Text bold color="cyan">AI Agent v2</Text>
        <Text dimColor color="gray"> · </Text>
        <Text dimColor>{process.cwd().split('/').pop() || process.cwd()}</Text>
        <Text dimColor color="gray"> · </Text>
        <Text dimColor>Model: {model}</Text>
      </Box>
      <Box>
        {isProcessing ? (
          <LoadingSpinner text={status} />
        ) : (
          <Text dimColor color="gray">{status}</Text>
        )}
      </Box>
    </Box>
  );
};

// ============================================================================
// Session Component
// ============================================================================

const Session: React.FC<SessionProps> = ({ navigate }) => {
  const { exit } = useApp();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [status, setStatus] = useState('Ready');
  const [agent, setAgent] = useState<Agent | null>(null);
  const [ready, setReady] = useState(false);

  // 获取当前模型（Home 里通过 "model xxx" 可切换）
  const getSelectedModel = () =>
    (global as any).__selectedModel ||
    process.env.AI_MODEL ||
    'gpt-4o';

  const selectedModel = getSelectedModel();

  // Initialize Agent
  useEffect(() => {
    const initAgent = async () => {
      try {
        // Load environment
        const env = process.env.NODE_ENV || 'development';
        const dotenv = await import('dotenv');
        dotenv.config({ path: `.env.${env}`, override: true });

        // Initialize tools
        await registerDefaultToolsAsync();
        const tools = ToolRegistry.getSchemas();
        setStatus(`Ready · ${tools.length} tools`);
        const llmProvider = ProviderRegistry.createFromEnv(ProviderType.KIMI);
        // Create provider
  
        // Create agent
        const newAgent = new Agent({
          model: selectedModel,
          llmProvider,  
          temperature: 0.6,
          systemPrompt: operatorPrompt({
            directory: process.env.PROJECT_DIRECTORY || process.cwd(),
            vcs: process.env.VCS || 'git',
            language: process.env.PROJECT_LANGUAGE || 'Chinese',
          }),
          tools,
        
        });

        // Start agent
        newAgent.start();

        // Set up event listeners
        newAgent.on('stream-chunk', (message: any) => {
          if (message && message.content) {
            setCurrentResponse((prev: string) => prev + message.content);
          }
        });

        newAgent.on('complete', (data: any) => {
          setMessages((prev: ChatMessage[]) => [...prev, {
            role: 'assistant',
            content: data.response?.content || currentResponse || '',
            timestamp: new Date(),
          }]);
          setCurrentResponse('');
          setIsProcessing(false);
          setStatus('Ready');
        });

        newAgent.on('error', (data: any) => {
          const errorMsg = data?.error?.message || 'Unknown error';
          setMessages((prev: ChatMessage[]) => [...prev, {
            role: 'system',
            content: `Error: ${errorMsg}`,
            timestamp: new Date(),
          }]);
          setIsProcessing(false);
          setStatus('Ready');
        });

        newAgent.on('thinking', (data: any) => {
          if (data?.step) {
            setStatus(`Thinking (step ${data.step})...`);
          }
        });

        // Track active tool calls
        let activeToolCall: { name: string; index: number; args: string } | null = null;

        newAgent.on('tool-call', (data: any) => {
          if (data?.toolName) {
            // Format args for display (truncated)
            let argsStr = '';
            if (data.args) {
              try {
                const argsObj = typeof data.args === 'string' ? JSON.parse(data.args) : data.args;
                const keys = Object.keys(argsObj).slice(0, 2);
                argsStr = keys.map(k => `${k}=${JSON.stringify(argsObj[k]).slice(0, 20)}...`).join(' ');
              } catch {
                argsStr = String(data.args).slice(0, 50);
              }
            }

            activeToolCall = {
              name: data.toolName,
              index: messages.length,
              args: argsStr
            };

            setMessages((prev: ChatMessage[]) => [...prev, {
              role: 'tool-call',
              content: '',
              toolName: data.toolName,
              toolArgs: argsStr,
              toolStatus: 'calling',
              timestamp: new Date(),
            }]);
          }
        });

        newAgent.on('tool-result', (data: any) => {
          if (activeToolCall && data?.toolName === activeToolCall.name) {
            const duration = data.duration || 0;
            const success = data.result?.success !== false;
            let outputPreview = '';

            if (data.result?.data) {
              const outputStr = typeof data.result.data === 'string' ? data.result.data : JSON.stringify(data.result.data);
              outputPreview = outputStr.slice(0, 200);
              if (outputStr.length > 200) outputPreview += '...';
            }

            setMessages((prev: ChatMessage[]) => {
              return prev.map((msg, idx) => {
                if (idx === activeToolCall?.index && msg.role === 'tool-call') {
                  return {
                    ...msg,
                    toolStatus: success ? 'success' : 'error',
                    toolOutput: success ? outputPreview : `Error: ${data.result?.error || 'Failed'}`,
                  };
                }
                return msg;
              });
            });

            activeToolCall = null;
          }
        });

        setAgent(newAgent);
        setReady(true);

        // Check for pending message from home page
        const pendingMessage = (global as any).__pendingMessage;
        if (pendingMessage) {
          (global as any).__pendingMessage = undefined;
          setTimeout(() => {
            setMessages([{ role: 'user', content: pendingMessage, timestamp: new Date() }]);
            setIsProcessing(true);
            setStatus('Thinking...');
            newAgent.run(pendingMessage, { stream: true }).catch((error: Error) => {
              setMessages((prev: ChatMessage[]) => [...prev, {
                role: 'system',
                content: `Error: ${error.message}`,
                timestamp: new Date(),
              }]);
              setIsProcessing(false);
              setStatus('Ready');
            });
          }, 100);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setMessages((prev: ChatMessage[]) => [...prev, {
          role: 'system',
          content: `Failed to initialize: ${errorMessage}`,
          timestamp: new Date(),
        }]);
        setStatus('Error');
        setReady(true);
      }
    };

    initAgent();
  }, []);

  // Handle input
  useInput((inputChar: string, key: any) => {
    // Always allow Ctrl+C and Escape
    if (key.ctrl && inputChar === 'c') {
      exit();
      return;
    }

    if (key.escape) {
      navigate('home');
      return;
    }

    if (key.return) {
      const trimmedInput = input.trim();
      if (trimmedInput && agent && ready) {
        setInput('');
        setCurrentResponse('');

        setMessages((prev: ChatMessage[]) => [...prev, {
          role: 'user',
          content: trimmedInput,
          timestamp: new Date(),
        }]);

        setIsProcessing(true);
        setStatus('Thinking...');

        agent.run(trimmedInput, { stream: true }).catch((error: Error) => {
          setMessages((prev: ChatMessage[]) => [...prev, {
            role: 'system',
            content: `Error: ${error.message}`,
            timestamp: new Date(),
          }]);
          setIsProcessing(false);
          setStatus('Ready');
        });
      }
      return;
    }

    if (isProcessing) return;

    if (key.backspace || key.delete) {
      setInput((prev: string) => prev.slice(0, -1));
    } else if (inputChar) {
      setInput((prev: string) => prev + inputChar);
    }
  });

  // Render single message
  const renderMessage = (msg: ChatMessage, index: number) => {
    if (msg.role === 'tool-call') {
      // Tool call message
      const icon = msg.toolStatus === 'calling' ? '⏳' : msg.toolStatus === 'success' ? '✓' : '✗';
      const color = msg.toolStatus === 'calling' ? 'yellow' :
                    msg.toolStatus === 'success' ? 'green' : 'red';

      return (
        <Box key={`tool-${index}-${msg.timestamp.getTime()}`} flexDirection="column" marginBottom={1}>
          <Box>
            <Text bold color={color}>{icon} {msg.toolName}({msg.toolArgs || ''})</Text>
          </Box>
          {msg.toolOutput && (
            <Box paddingLeft={2}>
              <Text dimColor color="gray">  {msg.toolOutput}</Text>
            </Box>
          )}
        </Box>
      );
    }

    // Regular message
    const prefix = msg.role === 'user' ? '❯' : '⏺';
    const roleColor = msg.role === 'user' ? 'cyan' : 'green';

    return (
      <Box key={`msg-${index}-${msg.timestamp.getTime()}`} flexDirection="column" marginBottom={1}>
        <Box>
          <Text bold color={roleColor}>{prefix} {msg.content.split('\n')[0]}</Text>
        </Box>
        {msg.content.includes('\n') && (
          <Box paddingLeft={2}>
            <Text dimColor={msg.isStreaming} wrap="wrap">
              {msg.content.split('\n').slice(1).join('\n')}
            </Text>
          </Box>
        )}
      </Box>
    );
  };

  // Render all messages
  const renderMessages = () => {
    const allMessages: ChatMessage[] = [...messages];

    if (currentResponse) {
      allMessages.push({
        role: 'assistant',
        content: currentResponse,
        timestamp: new Date(),
        isStreaming: true,
      });
    }

    if (allMessages.length === 0) {
      return (
        <Box flexGrow={1} justifyContent="center" paddingY={2}>
          <Text dimColor color="gray">No messages yet. Start chatting!</Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column" flexGrow={1} paddingY={1}>
        {allMessages.slice(-20).map((msg, index) => renderMessage(msg, index))}
      </Box>
    );
  };

  // Loading state
  if (!ready) {
    return (
      <Box flexDirection="column" paddingX={2}>
        <Text bold color="cyan">AI Agent CLI</Text>
        <Text dimColor>{status}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Header isProcessing={isProcessing} status={status} model={selectedModel} />
      {/* Messages area */}
      <Box
        flexGrow={1}
        flexDirection="column"
        paddingY={1}
      >
        {renderMessages()}
      </Box>
      {/* Separator */}
      <Box>
        <Text dimColor color="gray">{'---'.repeat(Math.min(process.stdout.columns || 80, 80))}</Text>
      </Box>
      {/* Input area */}
      <Box>
        <Text bold color="cyan">❯ </Text>
        <Text>{input}</Text>
        <Text backgroundColor="gray"> </Text>
      </Box>
      {/* Help text */}
      <Box>
        <Text dimColor color="gray">Esc: Back ; Ctrl+C: Exit</Text>
      </Box>
    </Box>
  );
};

export default Session;
