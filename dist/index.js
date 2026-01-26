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
const operator_1 = require("./prompts/operator");
const context_1 = require("./context");
const env = process.env.NODE_ENV || 'development';
dotenv_1.default.config({ path: `.env.${env}`, override: true });
/**
 * 初始化应用
 */
async function initializeApp(config) {
    // 初始化工具（包括 MCP 工具）
    await (0, tool_1.registerDefaultToolsAsync)();
    // 初始化 LLM Provider
    const llmProvider = new openai_1.OpenAIProvider({
        apiKey: config.deepseekApiKey,
        baseURL: config.deepseekBaseUrl,
    });
    const customPrompt = (0, operator_1.operatorPrompt)({
        directory: process.cwd(),
        vcs: "git",
        language: "Chinese",
    });
    console.log(`Available tools:\n${tool_1.ToolRegistry.getSchemas().map(tool => `'${tool.function.name}'`).join("\n")}`);
    // 创建 Agent（内部会创建 AgentContext）
    const agent = new agent_1.default({
        llmProvider,
        systemPrompt: customPrompt,
        defaultTools: tool_1.ToolRegistry.getSchemas(),
    });
    // 设置全局 AgentContext 单例（供 ToolRegistry 等使用）
    (0, context_1.setAgentContext)(agent.context);
    agent.start();
    console.log(`[App] Initialized with session: ${agent.context.sessionId}`);
    console.log(`[App] Cache directory: ${agent.context.cacheRoot}`);
    console.log(`[App] Session directory: ${agent.context.sessionDir}`);
    return { agent, sessionId: agent.context.sessionId };
}
/**
 * 启动 CLI 交互模式
 */
async function startCLI(agent, sessionId) {
    const cli = new cli_1.CLI({
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
        throw new Error('DEEEPSEEK_BASE_URL is not set');
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
