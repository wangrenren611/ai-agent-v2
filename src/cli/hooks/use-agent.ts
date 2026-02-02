/**
 * Agent Hook
 * 
 * 重构后的 useAgent hook，职责：
 * 1. 初始化和管理 Agent 实例
 * 2. 将 Agent 事件转换为 UI 事件
 * 3. 协调消息状态管理
 * 
 * 设计原则：
 * - 单一职责：不直接处理消息组装逻辑，委托给 useMessageStore
 * - 事件驱动：通过事件适配器将核心层事件转换为 UI 事件
 * - 清晰的状态边界：Agent 实例、消息状态、加载状态分离
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { registerDefaultToolsAsync, ToolRegistry } from '../../tool';
import { Agent } from '../../agent';
import { operatorPrompt } from '../../prompts/operator';
import { ProviderRegistry, type ModelId } from '../../providers/registry';
import type { Subscription } from '../../util/event-bus/types';
import type { AgentEvents } from '../../agent/types';
import { useMessageStore } from './use-message-store';
import { AgentEventAdapter } from '../utils/event-adapter';
import type { UIMessage } from '../types/message-types';

// =============================================================================
// Hook 配置选项
// =============================================================================

export interface UseAgentOptions {
  model: ModelId;
}

export interface UseAgentReturn {
  /** 提交用户消息 */
  submitMessage: (message: string) => void;
  /** 消息列表（UI 格式） */
  messages: UIMessage[];
  /** 是否正在加载 */
  isLoading: boolean;
  /** Token 使用情况 */
  usedTokens: { usedTokens: number; totalTokens: number };
  /** 错误信息 */
  error: { message: string; phase: string } | null;
  /** Agent 实例 */
  agent: Agent | null;
  /** 当前步骤 */
  currentStep: number;
  /** 清除所有消息 */
  clearMessages: () => void;
}

// =============================================================================
// Hook 实现
// =============================================================================

export function useAgent({ model }: UseAgentOptions): UseAgentReturn {
  // ---------------------------------------------------------------------------
  // Refs（保持引用稳定）
  // ---------------------------------------------------------------------------
  const agentRef = useRef<Agent | null>(null);
  const modelRef = useRef<string>(model);
  const adapterRef = useRef<AgentEventAdapter | null>(null);
  const subscriptionsRef = useRef<Subscription[]>([]);

  // ---------------------------------------------------------------------------
  // 消息状态管理
  // ---------------------------------------------------------------------------
  const {
    messages,
    isLoading,
    currentStep,
    activeAssistantMessageId,
    addUserMessage,
    applyEvent,
    clearMessages: clearMessageStore,
    setLoading,
  } = useMessageStore();

  // ---------------------------------------------------------------------------
  // 本地状态
  // ---------------------------------------------------------------------------
  const [usedTokens, setUsedTokens] = useState<{ usedTokens: number; totalTokens: number }>({
    usedTokens: 0,
    totalTokens: 0,
  });
  const [error, setError] = useState<{ message: string; phase: string } | null>(null);

  // ---------------------------------------------------------------------------
  // Agent 初始化
  // ---------------------------------------------------------------------------
  const initAgent = useCallback(async () => {
    // 清理旧的订阅和适配器
    subscriptionsRef.current.forEach(sub => sub.unsubscribe());
    subscriptionsRef.current = [];
    adapterRef.current?.stop();
    adapterRef.current?.reset();

    // 注册工具
    await registerDefaultToolsAsync();

    // 创建 Agent 实例
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

    // 启动 Agent
    await agent.start();

    // 保存引用
    agentRef.current = agent;
    modelRef.current = model;

    // 初始化 Token 统计
    setUsedTokens(agent.getUsedTokens());

    // 创建事件适配器
    const adapter = new AgentEventAdapter(agent.events, (event) => {
      // 将 UI 事件应用到消息存储
      applyEvent(event);

      // 处理特定事件
      if (event.type === 'token-usage') {
        setUsedTokens({
          usedTokens: event.usedTokens,
          totalTokens: event.totalTokens,
        });
      } else if (event.type === 'error') {
        setError({
          message: event.error.message,
          phase: event.phase,
        });
        setLoading(false);
      } else if (event.type === 'session-complete') {
        setLoading(false);
      }
    });

    adapter.start();
    adapterRef.current = adapter;

    // 注册额外的核心事件监听器（用于需要特殊处理的场景）
    const handleTokenUsage = (data: AgentEvents['token-usage']) => {
      setUsedTokens({
        usedTokens: data.usedTokens,
        totalTokens: data.totalTokens,
      });
    };

    subscriptionsRef.current.push(
      agent.events.on('token-usage', handleTokenUsage)
    );

  }, [model, applyEvent, setLoading]);

  // ---------------------------------------------------------------------------
  // 生命周期管理
  // ---------------------------------------------------------------------------
  useEffect(() => {
    initAgent();

    // 清理函数
    return () => {
      subscriptionsRef.current.forEach(sub => sub.unsubscribe());
      subscriptionsRef.current = [];
      adapterRef.current?.stop();
    };
  }, [initAgent]);

  // ---------------------------------------------------------------------------
  // 提交消息
  // ---------------------------------------------------------------------------
  const submitMessage = useCallback((message: string) => {
    const currentAgent = agentRef.current;
    
    if (!currentAgent || !message.trim()) {
      console.log('[useAgent] Cannot submit - agent is null or message is empty');
      return;
    }

    // 清除之前的错误
    setError(null);

    // 添加用户消息到状态
    const userMessageId = `user-${Date.now()}`;
    addUserMessage(message.trim(), userMessageId);

    // 调用 Agent
    setLoading(true);
    currentAgent.run(message.trim(), {
      stream: true,
    });
  }, [addUserMessage, setLoading]);

  // ---------------------------------------------------------------------------
  // 清除消息
  // ---------------------------------------------------------------------------
  const clearMessages = useCallback(() => {
    clearMessageStore();
    agentRef.current?.clear();
  }, [clearMessageStore]);

  // ---------------------------------------------------------------------------
  // 返回值
  // ---------------------------------------------------------------------------
  return {
    submitMessage,
    messages,
    isLoading,
    usedTokens,
    error,
    agent: agentRef.current,
    currentStep,
    clearMessages,
  };
}

export default useAgent;
