/**
 * 主入口文件
 * 初始化并启动 AI Agent 应用
 */
import dotenv from 'dotenv';
import { OpenAIProvider } from './providers/openai';
import Agent from './agent';
import { CLI } from './cli';
import { registerDefaultToolsAsync, ToolRegistry } from './tool';
import { operatorPrompt } from './prompts/operator';

const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${env}`, override: true });

/**
 * 应用配置
 */
interface AppConfig {
    deepseekApiKey: string;
    deepseekBaseUrl: string;
}

/**
 * 初始化应用
 */
async function initializeApp(config: AppConfig) {
    // 初始化工具（包括 MCP 工具）
    await registerDefaultToolsAsync();

    // 初始化 LLM Provider
    const llmProvider = new OpenAIProvider({
        apiKey: config.deepseekApiKey,
        baseURL: config.deepseekBaseUrl,
    });

    const customPrompt = operatorPrompt({
        directory: process.cwd(),
        vcs: "git",
        language: "Chinese",
    });

    console.log(`Available tools:\n${ToolRegistry.getSchemas().map(tool => `'${tool.function.name}'`).join("\n")}`);

    const sessionId = new Date().getTime().toString();

    const agent = new Agent({
        llmProvider,
        systemPrompt: customPrompt,
        defaultTools: ToolRegistry.getSchemas(),
        sessionId,
    });
    agent.start();
    return { agent, sessionId };
}

/**
 * 启动 CLI 交互模式
 */
async function startCLI(agent: Agent, sessionId: string): Promise<void> {
    const cli = new CLI({
        agent,
        sessionId,
        prompt: '>',
    });

    await cli.start();
}

/**
 * 主函数
 */
async function main() {
    // 验证环境变量
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    const deepseekBaseUrl = process.env.DEEPSEEK_BASE_URL;

    if (!deepseekApiKey) {
        throw new Error('DEEPSEEK_API_KEY is not set');
    }

    if (!deepseekBaseUrl) {
        throw new Error('DEEPSEEK_BASE_URL is not set');
    }

    // 初始化应用
    const { agent, sessionId } = await initializeApp({
        deepseekApiKey,
        deepseekBaseUrl,
    });

    // 启动 CLI
    await startCLI(agent, sessionId);
}

main().catch(console.error);
