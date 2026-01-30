import { useInput } from 'ink';
import type { Key as EventKey } from 'ink';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import React from 'react';
// @ts-ignore
import { ProviderRegistry, ProviderType } from '../../providers/provider-registry';
import useAgent from '../hooks/use-agent';
import { Message } from '../../agent/message';
import {
  commandExecutor,
  registerDefaultCommands,
  type CommandContext,
  type CommandResult,
} from '../commands';

// ============================================================================
// Register Commands on Import
// ============================================================================

registerDefaultCommands();

// ============================================================================
// Page ID Type
// ============================================================================

export type PageId = 'home' | 'help' | 'model-select' | 'settings' | string;

// ============================================================================
// App Context Type
// ============================================================================

export type AppContextType = {
  isEscape: boolean;
  input: string;
  messages: Message[];
  setInput: (newInput: string) => void;
  onSubmit: (newInput: string) => void;
  isLoading: boolean;
  model: string;
  usedTokens: {
    usedTokens: number;
    totalTokens: number;
  };
  error: {
    message: string;
    phase: string;
  } | null;
  sessionId?: string;
  setSessionId?: (id: string) => void;
  memoryEnabled?: boolean;
  setMemory?: (enabled: boolean) => void;
  clearMessages?: () => void;
  commandResult?: CommandResult | null;
  setCommandResult?: (result: CommandResult | null) => void;
  // Navigation state
  currentPage: PageId;
  navigateToPage: (pageId: PageId) => void;
  goBack: () => void;
  canGoBack: boolean;
  setModel?: (model: string) => void;
  modelSelectIndex: number;
};

// ============================================================================
// Default Context
// ============================================================================

const AppContext = createContext<AppContextType>({
  isEscape: false,
  input: '',
  messages: [],
  setInput: (newInput: string) => {},
  onSubmit: (newInput: string) => {},
  isLoading: false,
  model: ProviderType.GLM,
  usedTokens: {
    usedTokens: 0,
    totalTokens: 0,
  },
  error: null,
  sessionId: undefined,
  setSessionId: undefined,
  memoryEnabled: false,
  setMemory: undefined,
  clearMessages: undefined,
  commandResult: null,
  setCommandResult: undefined,
  currentPage: 'home',
  navigateToPage: () => {},
  goBack: () => {},
  canGoBack: false,
  setModel: undefined,
  modelSelectIndex: 0,
});

// ============================================================================
// Provider Component
// ============================================================================

export const AppContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [eventKey, setEventKey] = useState<EventKey>();
  const [input, setInput] = useState('');
  const [model, setModel] = useState<string>(ProviderType.GLM);
  const [sessionId, setSessionId] = useState<string | undefined>(`session_${Date.now()}`);
  const [memoryEnabled, setMemoryEnabled] = useState<boolean>(false);
  const [commandResult, setCommandResult] = useState<CommandResult | null>(null);

  // Page navigation state
  const [pageHistory, setPageHistory] = useState<PageId[]>(['home']);
  const [currentPage, setCurrentPage] = useState<PageId>('home');

  const { submitMessage, messages, setMessages, isLoading, usedTokens, error, agent  } = useAgent({ model: model as any });

  // Model selection index
  const [modelSelectIndex, setModelSelectIndex] = useState(0);
  const AVAILABLE_MODELS =  ProviderRegistry.getModels();

  // Navigation functions
  const navigateToPage = useCallback((pageId: PageId) => {
    setPageHistory(prev => [...prev, pageId]);
    setCurrentPage(pageId);
  }, []);

  const goBack = useCallback(() => {
    if (pageHistory.length > 1) {
      const newHistory = pageHistory.slice(0, -1);
      setPageHistory(newHistory);
      setCurrentPage(newHistory[newHistory.length - 1]);
      setCommandResult(null);
      // 清除 input，防止残留命令字符串
      setInput('');
      // 清除 eventKey，防止触发退出逻辑
      setEventKey(undefined);
    }
  }, [pageHistory]);

  const canGoBack = pageHistory.length > 1;

  // 处理模型选择页面的键盘导航
  const handlePageKey = useCallback((key: EventKey) => {
    if (currentPage === 'model-select') {
      if (key.upArrow) {
        setModelSelectIndex(prev => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setModelSelectIndex(prev => Math.min(AVAILABLE_MODELS.length - 1, prev + 1));
      } else if (key.return) {
        const newModel = AVAILABLE_MODELS[modelSelectIndex];
        // 设置模型到 agent（通过 setAgentModel 如果可用）
        setModel(newModel);
        goBack();
     }
    }
  
  }, [currentPage, modelSelectIndex, setModel, setModel, goBack]);
  // 处理键盘输入（全局监听以设置 eventKey，但页面特定逻辑由 handlePageKey 处理）
  useInput((_input, key) => {
    setEventKey(key);
    // 只在特定页面处理页面特定的键盘逻辑
    if (currentPage === 'home' || currentPage === 'model-select') {
      handlePageKey(key);
    }
  });



  // 同步模型选择索引
  useEffect(() => {
    const currentIndex = AVAILABLE_MODELS.indexOf(model);
    if (currentIndex >= 0) {
      setModelSelectIndex(currentIndex);
    }
  }, [model, currentPage]);

  // 处理 ESC 退出（仅在 home 页面）
  useEffect(() => {
    if (eventKey?.escape &&  currentPage === 'home') {
      process.exit(0);
    }
  }, [eventKey?.escape, currentPage]);

  // 处理 backspace 返回（非 home 页面）
  useEffect(() => {
    if ((eventKey?.backspace || eventKey?.escape) && currentPage !== 'home') {
      goBack();
    }
  }, [eventKey?.backspace, eventKey?.escape, currentPage, goBack]);

  // 处理提交
  const onSubmit = async (newInput: string) => {
    setInput(newInput);

    // 尝试执行命令
    const commandContext: CommandContext = {
      input: newInput,
      sessionId,
      userId: 'default',
      model,
      messages,
      memoryEnabled,
      setSessionId,
      setModel,
      setMemory: setMemoryEnabled,
      clearMessages: () => setMessages([]),
      navigateToPage,
      agent: agent || undefined,
    };

    const result = await commandExecutor.execute(newInput, commandContext);
    // 如果是命令执行，处理结果
    if (result) {
      // 设置命令结果到状态（由 UI 显示）
      setCommandResult(result);

      // 处理退出
      if (result.exit) {
        process.exit(0);
      }
      setInput('');
      return;
    }
    
    // 否则作为普通消息发送
    submitMessage(newInput);
    setInput('');
  };

  return (
    <AppContext.Provider
      value={{
        model,
        usedTokens,
        input,
        messages,
        setInput,
        onSubmit,
        isEscape: !!eventKey?.escape,
        isLoading,
        error,
        sessionId,
        setSessionId,
        memoryEnabled,
        setMemory: setMemoryEnabled,
        clearMessages: () => setMessages([]),
        commandResult,
        setCommandResult,
        currentPage,
        navigateToPage,
        goBack,
        canGoBack,
        setModel,
        modelSelectIndex
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};
