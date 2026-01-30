/**
 * Main Application Component
 *
 * Root component that sets up all providers and renders appropriate view
 */

import React, { useEffect } from 'react';
import { Box, Text } from 'ink';
import { useAppContext } from './context';
import Welcome from './components/welcome';
import { ChatInput } from './components/chat-input';
import MessageList from './components/message-list';
import CommandResult from './components/command-result';
import HelpPage from './pages/help';
import ModelSelectPage from './pages/model-select';
import KeybindHint from './components/keybind-hint';

// ============================================================================
// Main App Component
// ============================================================================

const App: React.FC = () => {
  const {
    messages,
    isLoading,
    model,
    usedTokens,
    commandResult,
    setCommandResult,
    currentPage,
    canGoBack,
    goBack,
    modelSelectIndex
  } = useAppContext();

  // 命令结果自动清除
  useEffect(() => {
    if (commandResult) {
      const timer = setTimeout(() => {
        setCommandResult?.(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [commandResult, setCommandResult]);

  // 渲染不同页面
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <>
            <Welcome  model={model} currentPath={process.cwd()} />
            {commandResult && <CommandResult result={commandResult} />}
            {messages.length > 0 && <MessageList messages={messages} isLoading={isLoading} />}
            <Box marginBottom={messages?.length > 0 ? 2 : 0}>
             <ChatInput />
           </Box>
          </>
        );

      case 'help':
        return (
          <HelpPage
            onBack={goBack}
            onExecute={() => {
              goBack();
            }}
          />
        );

      case 'model-select':
        return (
          <ModelSelectPage
            onBack={goBack}
            modelSelectIndex={modelSelectIndex}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Box flexDirection="column">
      {renderPage()}

      {/* Status bar */}
      {currentPage === 'home' && (
        <Box marginTop={1}>
          <Text color="gray">
            Context left: {Math.ceil(((1-usedTokens?.usedTokens/usedTokens?.totalTokens) || 0) * 100)}%
          </Text>
        </Box>
      )}

      {/* Navigation hint */}
      {canGoBack && currentPage !== 'home' && (
        <Box marginTop={1}>
          <Text dimColor color="gray">
            [Esc] or [Backspace] to go back
          </Text>
        </Box>
      )}

      {/* Keybind hints */}
      {currentPage === 'home' && <KeybindHint />}
    </Box>
  );
};

export default App;
