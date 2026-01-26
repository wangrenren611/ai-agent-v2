/**
 * Ink CLI 入口文件
 * 渲染 CLI 应用
 */
import { render } from 'ink';
import React from 'react';
import { CLIApp } from './App';
import Agent from '../agent';

interface InkCLIProps {
    agent: Agent;
    sessionId?: string;
}

export function createInkCLI(agent: Agent, sessionId?: string) {
    const session = sessionId || new Date().getTime().toString();
    const App = () => <CLIApp agent={agent} initialSessionId={session} />;
    return render(<App />);
}

export default createInkCLI;
