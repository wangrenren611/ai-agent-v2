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
const cli_1 = require("./cli");
const tool_1 = require("./tool");
const session_v2_1 = require("./session-v2");
const operator_1 = require("./prompts/operator");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const env = process.env.NODE_ENV || 'development';
dotenv_1.default.config({ path: `.env.${env}`, override: true });
/**
 * 初始化应用
 */
async function initializeApp(config) {
    // 1. 连接数据库
    // await connectDB();
    // 2. 初始化工具（包括 MCP 工具）
    await (0, tool_1.registerDefaultToolsAsync)();
    // 5. 初始化 LLM Provider
    const llmProvider = new openai_1.OpenAIProvider({
        apiKey: config.deepseekApiKey,
        baseURL: config.deepseekBaseUrl,
    });
    const sessionManager = new session_v2_1.SessionManager({
        sessionId: new Date().getTime().toString(),
        llmProvider,
    });
    await sessionManager.init();
    tool_1.ToolRegistry.setContext({
        sessionId: sessionManager.id,
        sessionPath: sessionManager.sessionPath,
    });
    const customPrompt = (0, operator_1.operatorPrompt)({
        directory: process.cwd(),
        vcs: "git",
    });
    console.log(`Available tools:\n${tool_1.ToolRegistry.getSchemas().map(tool => `'${tool.function.name}'`).join("\n")}`);
    fs_1.default.writeFileSync(path_1.default.resolve(process.cwd(), 'customPrompt.md'), customPrompt);
    const agent = new agent_1.default({
        llmProvider,
        sessionManager,
        systemPrompt: customPrompt,
        defaultTools: tool_1.ToolRegistry.getSchemas(),
    });
    return { agent, sessionManager };
}
/**
 * 启动 CLI 交互模式
 */
async function startCLI(agent, sessionManager) {
    const cli = new cli_1.CLI({
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
