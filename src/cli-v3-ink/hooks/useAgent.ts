/**
 * useAgent Hook
 *
 * Manages Agent initialization and event handling
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Agent } from '../../agent';
import { operatorPrompt } from '../../prompts/operator';
import { registerDefaultToolsAsync, ToolRegistry } from '../../tool';
import { ChatMessage, ToolCallInfo } from '../types';
import { useAgentContext } from '../context';
import { INITIAL_DELAY_MS, MESSAGES } from '../utils/constants';
import { formatToolArgs, formatToolOutput } from '../utils/helpers';
import { getModel, ModelType } from '../../providers';
import { model } from 'mongoose';

// ============================================================================
// Type Definitions
// ============================================================================

interface UseAgentProps {
  selectedModel: ModelType;
  onStateChange: (state: { status: string; ready: boolean }) => void;
  onMessage: (message: ChatMessage) => void;
  onResponseUpdate: (chunk: string) => void;
  onResponseComplete: (content: string) => void;
  onProcessingChange: (isProcessing: boolean) => void;
  onAgentReady: (agent: Agent) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TEMPERATURE = 0.1;
const GLOBAL_PENDING_MESSAGE_KEY = '__pendingMessage';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Load environment variables from .env file
 */
const loadEnvironment = async (): Promise<void> => {
  const env = process.env.NODE_ENV || 'development';
  const dotenv = await import('dotenv');
  dotenv.config({ path: `.env.${env}`, override: true });
};

/**
 * Create system error message
 */
const createErrorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  return `Error: ${message}`;
};

// ============================================================================
// useAgent Hook
// ============================================================================

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
  const { aiModel } = useAgentContext();

  /**
   * Handle stream-chunk event
   */
  const handleStreamChunk = useCallback((data: any) => {
    if (data?.content) {
      onResponseUpdate(data.content);
    }
  }, [onResponseUpdate]);

  /**
   * Handle complete event
   */
  const handleComplete = useCallback((data: any) => {
    const content = data?.response?.content || '';
    onResponseComplete(content);
    onProcessingChange(false);
    onStateChange({ status: MESSAGES.READY, ready: true });
  }, [onResponseComplete, onProcessingChange, onStateChange]);

  /**
   * Handle error event
   */
  const handleError = useCallback((data: any) => {
    const errorMsg = data?.error?.message || 'Unknown error';
    onMessage({
      role: 'system',
      content: createErrorMessage(errorMsg),
      timestamp: new Date(),
    });
    onProcessingChange(false);
    onStateChange({ status: MESSAGES.READY, ready: true });
  }, [onMessage, onProcessingChange, onStateChange]);

  /**
   * Handle thinking event
   */
  const handleThinking = useCallback((data: any) => {
    if (data?.step !== undefined) {
      onStateChange({
        status: `${MESSAGES.THINKING} (step ${data.step})...`,
        ready: true,
      });
    }
  }, [onStateChange]);

  /**
   * Handle tool-call event
   */
  const handleToolCall = useCallback((data: any) => {
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

      activeToolCallRef.current.set(data.toolName, {
        name: data.toolName,
        index: -1,
        args: argsStr,
      });
    }
  }, [onMessage]);

  /**
   * Handle tool-result event
   */
  const handleToolResult = useCallback((data: any) => {
    const toolCall = data?.toolName ? activeToolCallRef.current.get(data.toolName) : null;
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
        toolOutput: success
          ? outputPreview
          : `Error: ${data.result?.error || 'Failed'}`,
        timestamp: new Date(),
      });

      activeToolCallRef.current.delete(data.toolName);
    }
  }, [onMessage]);

  /**
   * Set up all agent event listeners
   */
  const setupEventListeners = useCallback((newAgent: Agent) => {
    newAgent.on('stream-chunk', handleStreamChunk);
    newAgent.on('complete', handleComplete);
    newAgent.on('error', handleError);
    newAgent.on('thinking', handleThinking);
    newAgent.on('tool-call', handleToolCall);
    newAgent.on('tool-result', handleToolResult);
  }, [handleStreamChunk, handleComplete, handleError, handleThinking, handleToolCall, handleToolResult]);

  /**
   * Process pending message from global state
   */
  const processPendingMessage = useCallback((newAgent: Agent) => {
    const pendingMessage = (global as Record<string, unknown>)[GLOBAL_PENDING_MESSAGE_KEY] as string | undefined;

    if (pendingMessage) {
      (global as Record<string, unknown>)[GLOBAL_PENDING_MESSAGE_KEY] = undefined;

      setTimeout(() => {
        onMessage({ role: 'user', content: pendingMessage, timestamp: new Date() });
        onProcessingChange(true);
        onStateChange({ status: MESSAGES.THINKING, ready: true });

        newAgent.run(pendingMessage, { stream: true }).catch((error: Error) => {
          onMessage({
            role: 'system',
            content: createErrorMessage(error),
            timestamp: new Date(),
          });
          onProcessingChange(false);
          onStateChange({ status: MESSAGES.READY, ready: true });
        });
      }, INITIAL_DELAY_MS);
    }
  }, [onMessage, onProcessingChange, onStateChange]);

  /**
   * Initialize agent with all necessary setup
   */
  const initializeAgent = useCallback(async () => {
    try {

    
      onStateChange({ status: MESSAGES.LOADING, ready: false });

      // Step 1: Load environment
      await loadEnvironment();

      // Step 2: Initialize and register tools
      await registerDefaultToolsAsync();
      const tools = ToolRegistry.getSchemas();
      onStateChange({ status: `${MESSAGES.READY} ${tools.length} tools`, ready: false });


      // Step 4: Create agent instance
      const newAgent = new Agent({
        llmProvider: getModel(selectedModel||aiModel),
        temperature: DEFAULT_TEMPERATURE,
        systemPrompt: operatorPrompt({
          directory: process.env.PROJECT_DIRECTORY || process.cwd(),
          vcs: process.env.VCS || 'git',
          language: process.env.PROJECT_LANGUAGE || 'Chinese',
        }),
        tools,
      });

      // Step 5: Set up event listeners
      setupEventListeners(newAgent);

      // Step 6: Start agent
      newAgent.start();

      // Step 7: Update state
      setAgent(newAgent);
      onAgentReady(newAgent);
      onStateChange({ status: MESSAGES.READY, ready: true });

      // Step 8: Process pending message if exists
      processPendingMessage(newAgent);

    } catch (error) {
      onMessage({
        role: 'system',
        content: `Failed to initialize: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
      });
      onStateChange({ status: 'Error', ready: true });
    }
  }, [selectedModel, onStateChange, aiModel, onAgentReady, setupEventListeners, processPendingMessage, onMessage]);

  /**
   * Initialize agent on mount
   */
  useEffect(() => {
    initializeAgent();
  }, [initializeAgent]);

  return agent;
};
