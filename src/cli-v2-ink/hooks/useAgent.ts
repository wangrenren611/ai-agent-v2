/**
 * useAgent Hook
 *
 * Manages Agent initialization and event handling
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Agent } from '../../agent';
import { ProviderRegistry, ProviderType } from '../../providers';
import { operatorPrompt } from '../../prompts/operator';
import { registerDefaultToolsAsync, ToolRegistry } from '../../tool';
import type { ChatMessage, ToolCallInfo } from '../types';
import { formatToolArgs, formatToolOutput } from '../utils/helpers';
import { INITIAL_DELAY_MS, MESSAGES } from '../utils/constants';

interface UseAgentProps {
  selectedModel: string;
  onStateChange: (state: { status: string; ready: boolean }) => void;
  onMessage: (message: ChatMessage) => void;
  onResponseUpdate: (chunk: string) => void;
  onResponseComplete: (content: string) => void;
  onProcessingChange: (isProcessing: boolean) => void;
  onAgentReady: (agent: Agent) => void;
}

export const useAgent = ({
  selectedModel,
  onStateChange,
  onMessage,
  onResponseUpdate,
  onResponseComplete,
  onProcessingChange,
  onAgentReady,
}: UseAgentProps) => {
  const [agent, setAgent] = useState<Agent | null>(null);
  const activeToolCallRef = useRef<Map<string, ToolCallInfo>>(new Map());

  const initializeAgent = useCallback(async () => {
    try {
      onStateChange({ status: MESSAGES.LOADING, ready: false });

      // Load environment
      const env = process.env.NODE_ENV || 'development';
      const dotenv = await import('dotenv');
      dotenv.config({ path: `.env.${env}`, override: true });

      // Initialize tools
      await registerDefaultToolsAsync();
      const tools = ToolRegistry.getSchemas();
      onStateChange({ status: `${MESSAGES.READY} ${tools.length} tools`, ready: false });

      // Create provider
      const llmProvider = ProviderRegistry.createFromEnv(ProviderType.GLM);

      // Create agent
      const newAgent = new Agent({
        model: selectedModel,
        llmProvider,
        temperature: 0.1,
        systemPrompt: operatorPrompt({
          directory: process.env.PROJECT_DIRECTORY || process.cwd(),
          vcs: process.env.VCS || 'git',
          language: process.env.PROJECT_LANGUAGE || 'Chinese',
        }),
        tools,
        // sessionId:'session_1769580128861'
      });

      // Set up event listeners
      newAgent.on('stream-chunk', (data: any) => {
          onResponseUpdate(data.content);
      });

      newAgent.on('complete', (data: any) => {
        // Signal that streaming is complete with final content
        onResponseComplete(data.response?.content || '');

        // Notify processing change
        onProcessingChange(false);
        onStateChange({ status: MESSAGES.READY, ready: true });
      });

      newAgent.on('error', (data: any) => {
        const errorMsg = data?.error?.message || 'Unknown error';
        onMessage({
          role: 'system',
          content: `Error: ${errorMsg}`,
          timestamp: new Date(),
        });
        onProcessingChange(false);
        onStateChange({ status: MESSAGES.READY, ready: true });
      });

      newAgent.on('thinking', (data: any) => {
        if (data?.step !== undefined) {
          onStateChange({ status: `${MESSAGES.THINKING} (step ${data.step})...`, ready: true });
        }
      });

      newAgent.on('tool-call', (data: any) => {
        if (data?.toolName) {
          const argsStr = formatToolArgs(data.args);

          onMessage({
            role: 'tool-call',
            content: '',
            toolName: data.toolName,
            toolArgs: argsStr,
            toolStatus: 'calling',
            timestamp: new Date(),
          });

          // Track tool call
          activeToolCallRef.current.set(data.toolName, {
            name: data.toolName,
            index: -1, // Not needed with Map
            args: argsStr,
          });
        }
      });

      newAgent.on('tool-result', (data: any) => {
        const toolCall = activeToolCallRef.current.get(data?.toolName);
        if (toolCall && data?.toolName) {
          const success = data.result?.success !== false;
          const outputPreview = data.result?.data
            ? formatToolOutput(data.result.data)
            : '';

          onMessage({
            role: 'tool-call',
            content: '',
            toolName: data.toolName,
            toolArgs: toolCall.args,
            toolStatus: success ? 'success' : 'error',
            toolOutput: success ? outputPreview : `Error: ${data.result?.error || 'Failed'}`,
            timestamp: new Date(),
          });

          // Remove tool call from tracking
          activeToolCallRef.current.delete(data.toolName);
        }
      });

      // Start agent
      newAgent.start();

      setAgent(newAgent);
      onAgentReady(newAgent);
      onStateChange({ status: MESSAGES.READY, ready: true });

      // Check for pending message from home page
      const pendingMessage = (global as any).__pendingMessage;
      if (pendingMessage && newAgent) {
        (global as any).__pendingMessage = undefined;
        setTimeout(() => {
          onMessage({ role: 'user', content: pendingMessage, timestamp: new Date() });
          onProcessingChange(true);
          onStateChange({ status: MESSAGES.THINKING, ready: true });
          newAgent.run(pendingMessage, { stream: true }).catch((error: Error) => {
            onMessage({
              role: 'system',
              content: `Error: ${error.message}`,
              timestamp: new Date(),
            });
            onProcessingChange(false);
            onStateChange({ status: MESSAGES.READY, ready: true });
          });
        }, INITIAL_DELAY_MS);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      onMessage({
        role: 'system',
        content: `Failed to initialize: ${errorMessage}`,
        timestamp: new Date(),
      });
      onStateChange({ status: 'Error', ready: true });
    }
  }, [selectedModel, onStateChange, onMessage, onResponseUpdate, onResponseComplete, onProcessingChange, onAgentReady]);

  useEffect(() => {
    initializeAgent();
  }, [initializeAgent]);

  return agent;
};
