/**
 * 主入口文件
 * 初始化并启动 AI Agent 应用
 */
import dotenv from 'dotenv';
import { OpenAIProvider } from './providers/openai';
import { Agent } from './agent';
import { registerDefaultToolsAsync, ToolRegistry } from './tool';
import { operatorPrompt } from './prompts/operator';
import { setAgentContext } from './context';

const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${env}`, override: true });
