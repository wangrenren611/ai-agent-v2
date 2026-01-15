"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 主入口文件
 * 初始化并启动 AI Agent 应用
 */
const dotenv_1 = __importDefault(require("dotenv"));
const openai_1 = require("./providers/openai");
const agent_1 = __importDefault(require("./agent"));
const mongoose_1 = require("./storage/mongoose");
const SessionManager_1 = require("./application/SessionManager");
const MessageRepository_1 = require("./infrastructure/MessageRepository");
const cli_1 = require("./cli");
const env = process.env.NODE_ENV || 'development';
dotenv_1.default.config({ path: `.env.${env}`, override: true });
/**
 * 初始化应用
 */
async function initializeApp(config) {
    // 1. 连接数据库
    await (0, mongoose_1.connectDB)();
    // 2. 初始化基础设施层
    const messageRepo = new MessageRepository_1.MessageRepository();
    // 3. 初始化应用层
    const sessionManager = new SessionManager_1.SessionManager(messageRepo);
    // 4. 初始化 LLM Provider
    const llmProvider = new openai_1.OpenAIProvider({
        apiKey: config.deepseekApiKey,
        baseURL: config.deepseekBaseUrl,
    });
    // 5. 初始化 Agent
    const agent = new agent_1.default({
        llmProvider,
        sessionManager,
    });
    return { agent, sessionManager };
}
/**
 * 启动 CLI 交互模式
 */
async function startCLI(agent, sessionId) {
    const cli = new cli_1.CLI({
        agent,
        sessionId: sessionId || `session_${Date.now()}`,
        userId: 'cli_user',
        prompt: '》',
    });
    await cli.start();
}
/**
 * 运行 Demo 模式（非交互）
 */
async function runDemo(agent) {
    const sessionId = 'session_demo_002';
    const userId = 'user_demo_001';
    try {
        console.log('=== Agent Demo ===\n');
        // 第一轮对话
        console.log('User: 你好');
        const response1 = await agent.run(sessionId, userId, '你好');
        if (response1 === null) {
            console.log('Agent failed to respond\n');
            return;
        }
        console.log(`Agent: ${response1.content}\n`);
        // 第二轮对话（带上下文）
        console.log('User: 你能做什么？');
        const response2 = await agent.run(sessionId, userId, '你能做什么？');
        if (response2 === null) {
            console.log('Agent failed to respond\n');
            return;
        }
        console.log(`Agent: ${response2.content}\n`);
        // 查看会话历史
        const history = await agent.getHistory(sessionId);
        console.log(`=== Session History (${history.length} messages) ===`);
        history.forEach((msg, i) => {
            console.log(`${i + 1}. [${msg.role}]: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
        });
    }
    catch (error) {
        console.error('Error:', error);
    }
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
    const { agent } = await initializeApp({
        deepseekApiKey,
        deepseekBaseUrl,
    });
    // 检查命令行参数
    const args = process.argv.slice(2);
    const mode = args[0] || 'cli';
    switch (mode) {
        case 'demo':
            await runDemo(agent);
            break;
        case 'cli':
        default:
            // 获取指定的 session ID（如果提供）
            const sessionId = args[1];
            await startCLI(agent, sessionId);
            break;
    }
}
main().catch(console.error);
