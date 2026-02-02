/**
 * Main Application Component
 *
 * Root component that sets up all providers and renders appropriate view
 */

import React, { useState, useCallback } from 'react';
import { Box, useStdout } from 'ink';
import { ChatInput } from './components/chat-input';
import { MessageList } from './components/message-list';
import { useKeyboard } from './context';
import { HelpPage } from './components/help-page';
import { ModelSelect } from './components/model-select';
import Welcome from './components/welcome';
import useAgent from './hooks/use-agent';
import { useAppContext } from './context/app';
 
// ============================================================================
// Main App Component
// ============================================================================

const App: React.FC = () => {
	const { mode, setMode } = useKeyboard();
	const [showHistory, setShowHistory] = useState(false);
	const { model } = useAppContext();
	const { stdout } = useStdout();

	// Agent 状态管理
	const { messages, isLoading, usedTokens, error, submitMessage } = useAgent({
		model
	});

	// 处理消息提交
	const handleSubmit = useCallback((value: string) => {
		submitMessage(value);
	}, [submitMessage]);

	// 切换历史记录显示
	const handleToggleHistory = useCallback(() => {
		setShowHistory(prev => !prev);
	}, []);

	// 页面模式：显示对应的页面组件
	if (mode === 'page-help') {
		return <HelpPage onBack={() => setMode('typing')} />;
	}

	if (mode === 'page-model-select') {
		return <ModelSelect onBack={() => setMode('typing')} />;
	}

	// 默认视图：消息列表 + 输入框
	// 使用 flexDirection="column" 和合理的布局确保输入框始终在底部
	return (
		<Box flexDirection="column" width="100%">
			{/* 欢迎消息 - 只在第一次显示 */}
			{messages.length === 0 && <Welcome />}

			{/* 消息列表 - 使用 Static 组件实现真正的终端滚动 */}
			<MessageList
				messages={messages}
				isLoading={isLoading}
				usedTokens={usedTokens}
				error={error}
				showHistory={showHistory}
				onToggleHistory={handleToggleHistory}
				maxMessages={0}  // 0 表示不限制消息数量
			/>

			{/* 输入框 - 固定在底部 */}
			<Box marginTop={1}>
				<ChatInput onSubmit={handleSubmit} />
			</Box>
		</Box>
	);
};

export default App;
