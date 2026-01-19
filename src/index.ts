/**
 * 主入口文件
 * 初始化并启动 AI Agent 应用
 */
import dotenv from 'dotenv';
import { OpenAIProvider } from './providers/openai';
import Agent from './agent';
import { connectDB } from './storage/mongoose';
import { CLI } from './cli';
import { registerDefaultToolsAsync } from './tool';
import { SessionManager } from './session-v2';

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
    // 1. 连接数据库
    await connectDB();

    // 2. 初始化工具（包括 MCP 工具）
    await registerDefaultToolsAsync();

 
    // 5. 初始化 LLM Provider
    const llmProvider = new OpenAIProvider({
        apiKey: config.deepseekApiKey,
        baseURL: config.deepseekBaseUrl,
    });
      

   const sessionManager = new SessionManager({
       sessionId:"1768827517165",//new Date().getTime().toString(),
       llmProvider,
   });
   
  await sessionManager.init();
    const agent = new Agent({
        llmProvider,
        sessionManager,
    });

    return { agent, sessionManager };
}

/**
 * 启动 CLI 交互模式
 */
async function startCLI(agent: Agent, sessionManager: SessionManager): Promise<void> {
    const cli = new CLI({
        agent,
        sessionManager,
        sessionId: sessionManager.id,
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
    const { agent, sessionManager } = await initializeApp({
        deepseekApiKey,
        deepseekBaseUrl,
    });

    // 检查命令行参数
    const args = process.argv.slice(2);
    const mode = args[0] || 'cli';

    switch (mode) {
        case 'cli':
        default:
            await startCLI(agent, sessionManager);
            break;
    }
}

main().catch(console.error);
