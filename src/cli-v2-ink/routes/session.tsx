/**
 * Session Route (Ink-based)
 *
 * Main chat interface with Agent integration.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { Agent } from '../../agent';
import { OpenAIProvider } from '../../providers/openai';
import { operatorPrompt } from '../../prompts/operator';
import { registerDefaultToolsAsync, ToolRegistry } from '../../tool';
import { CLI_TEMPERATURE } from '../../agent/types';
import type { RouteContextValue } from '../context/route';

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

  return React.createElement(
    Text,
    { bold: true, color: 'yellow' },
    frames[frame] + ' ' + text
  );
};

// ============================================================================
// Header Component
// ============================================================================

const Header: React.FC<{ isProcessing: boolean; status: string }> = ({ isProcessing, status }) => {
  return React.createElement(
    Box,
    {
      borderStyle: 'single',
      borderColor: 'gray',
      paddingX: 1,
      justifyContent: 'space-between',
    },
    React.createElement(
      Box,
      null,
      React.createElement(Text, { bold: true, color: 'cyan' }, 'AI Agent v2'),
      React.createElement(Text, { dimColor: true, color: 'gray' }, ' · '),
      React.createElement(Text, { dimColor: true }, process.cwd().split('/').pop() || process.cwd())
    ),
    React.createElement(
      Box,
      null,
      isProcessing
        ? React.createElement(LoadingSpinner, { text: status })
        : React.createElement(Text, { dimColor: true, color: 'gray' }, status)
    )
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

        // Create provider
        const llmProvider = new OpenAIProvider({
          apiKey: process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || '',
          baseURL: process.env.OPENAI_API_BASE_URL || process.env.DEEPSEEK_BASE_URL || '',
        });
        // Create agent
        const newAgent = new Agent({
          model: process.env.AI_MODEL || 'gpt-4o',
          llmProvider,
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
            newAgent.run(pendingMessage, { stream: true, temperature: CLI_TEMPERATURE }).catch((error: Error) => {
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

        agent.run(trimmedInput, { stream: true, temperature: CLI_TEMPERATURE }).catch((error: Error) => {
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
      const icon = msg.toolStatus === 'calling' ? '⟳' : msg.toolStatus === 'success' ? '✓' : '✗';
      const color = msg.toolStatus === 'calling' ? 'yellow' :
                    msg.toolStatus === 'success' ? 'green' : 'red';

      return React.createElement(
        Box,
        { key: `tool-${index}-${msg.timestamp.getTime()}`, flexDirection: 'column', marginBottom: 1 },
        React.createElement(
          Box,
          null,
          React.createElement(Text, { bold: true, color }, `⏺ ${msg.toolName}(${msg.toolArgs || ''})`)
        ),
        msg.toolOutput && React.createElement(
          Box,
          { paddingLeft: 2 },
          React.createElement(Text, { dimColor: true, color: 'gray' }, `  ${msg.toolOutput}`)
        )
      );
    }

    // Regular message
    const prefix = msg.role === 'user' ? '❯' : '⏺';
    const roleColor = msg.role === 'user' ? 'cyan' : 'green';

    return React.createElement(
      Box,
      { key: `msg-${index}-${msg.timestamp.getTime()}`, flexDirection: 'column', marginBottom: 1 },
      React.createElement(
        Box,
        null,
        React.createElement(Text, { bold: true, color: roleColor }, `${prefix} ${msg.content.split('\n')[0]}`)
      ),
      msg.content.includes('\n') && React.createElement(
        Box,
        { paddingLeft: 2 },
        React.createElement(
          Text,
          { dimColor: msg.isStreaming, wrap: 'wrap' },
          msg.content.split('\n').slice(1).join('\n')
        )
      )
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
      return React.createElement(
        Box,
        { flexGrow: 1, justifyContent: 'center', paddingY: 2 },
        React.createElement(Text, { dimColor: true, color: 'gray' }, 'No messages yet. Start chatting!')
      );
    }

    return React.createElement(
      Box,
      { flexDirection: 'column', flexGrow: 1, paddingY: 1 },
      ...allMessages.slice(-20).map((msg, index) => renderMessage(msg, index))
    );
  };

  // Loading state
  if (!ready) {
    return React.createElement(
      Box,
      { flexDirection: 'column', paddingX: 2 },
      React.createElement(Text, { bold: true, color: 'cyan' }, 'AI Agent CLI'),
      React.createElement(Text, { dimColor: true }, status)
    );
  }

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    // Header
    React.createElement(Header, { isProcessing, status }),
    // Messages area
    React.createElement(
      Box,
      {
        flexGrow: 1,
        flexDirection: 'column',
        paddingY: 1,
      },
      renderMessages()
    ),
    // Separator
    React.createElement(
      Box,
      null,
      React.createElement(Text, { dimColor: true, color: 'gray' }, '─'.repeat(Math.min(process.stdout.columns || 80, 80)))
    ),
    // Input area
    React.createElement(
      Box,
      null,
      React.createElement(Text, { bold: true, color: 'cyan' }, '❯ '),
      React.createElement(Text, null, input),
      React.createElement(Text, { backgroundColor: 'gray' }, ' ')
    ),
    // Help text
    React.createElement(
      Box,
      null,
      React.createElement(Text, { dimColor: true, color: 'gray' }, 'Esc: Back · Ctrl+C: Exit')
    )
  );
};

export default Session;
