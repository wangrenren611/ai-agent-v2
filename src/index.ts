/**
 * 主入口文件
 * 初始化并启动 AI Agent 应用
 */
import dotenv from 'dotenv';
import { OpenAIProvider } from './providers/openai';
import { Agent } from './agent';
import { CLI } from './cli';
import { registerDefaultToolsAsync, ToolRegistry } from './tool';
import { operatorPrompt } from './prompts/operator';
import { setAgentContext } from './context';

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
 * 打印启动横幅
 */
function printBanner() {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   🤖  AI Agent V2 - 智能编程助手                                 ║
║    基于 DeepSeek LLM + 领域驱动设计                              ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`);
}

/**
 * 打印环境配置信息
 */
function printEnvInfo(config: AppConfig) {
    console.log('【环境配置】');
    console.log(`  ├─ 环境模式: ${env}`);
    console.log(`  ├─ API Base: ${config.deepseekBaseUrl}`);
    console.log(`  ├─ API Key: ${config.deepseekApiKey ? '******' : '❌ 未设置'}`);
    console.log(`  ├─ 工作目录: ${process.cwd()}`);
    console.log(`  ├─ Node版本: ${process.version}`);
    console.log(`  └─ 平台: ${process.platform} ${process.arch}`);
    console.log('');
}

/**
 * 打印工具注册信息
 */
function printToolsInfo() {
    const schemas = ToolRegistry.getSchemas();
    console.log('【工具注册】');
    console.log(`  ├─ 已注册工具数量: ${schemas.length}`);
    console.log('  └─ 工具列表:');

    if (schemas.length === 0) {
        console.log('     └─ (暂无工具)');
    } else {
        schemas.forEach((tool, index) => {
            const prefix = index === schemas.length - 1 ? '└' : '├';
            const name = tool.function.name;
            const desc = tool.function.description || '(无描述)';
            console.log(`     ${prefix}─ ${name}`);
            console.log(`     │   └─ ${desc.substring(0, 50)}${desc.length > 50 ? '...' : ''}`);
        });
    }
    console.log('');
}

/**
 * 打印 Agent 配置信息
 */
function printAgentInfo(agent: Agent) {
    console.log('【Agent 配置】');
    console.log(`  ├─ 会话ID: ${agent.context.sessionId}`);
    console.log(`  ├─ 缓存目录: ${agent.context.cacheRoot}`);
    console.log(`  ├─ 会话目录: ${agent.context.sessionDir}`);
    console.log(`  ├─ 工具缓存: ${agent.context.toolsCacheDir}`);
    console.log(`  ├─ LLM缓存: ${agent.context.llmCacheDir}`);
    console.log(`  └─ 临时目录: ${agent.context.tempDir}`);
    console.log('');
}

/**
 * 打印启动完成信息
 */
function printStartupInfo(sessionId: string) {
    console.log('【启动完成】');
    console.log(`  ✓ Agent 初始化成功`);
    console.log(`  ✓ 会话ID: ${sessionId}`);
    console.log(`  ✓ 输入 'exit' 或 Ctrl+C 退出`);
    console.log('');
    console.log('─'.repeat(60));
    console.log('');
}

/**
 * 设置 Agent 事件监听
 */
function setupAgentEventListeners(agent: Agent) {
    console.log('【事件监听】正在注册事件监听器...\n');

    // 思考事件
    agent.events.on('thinking', ({ step }) => {
        console.log(`\n🔄 [事件] 思考步骤 ${step}`);
    });

    agent.events.on('thinking-end', ({ step, hasToolCalls }) => {
        const icon = hasToolCalls ? '🛠️' : '✅';
        console.log(`   ${icon} [事件] 思考步骤 ${step} 完成`);
    });

    // 工具调用事件
    agent.events.on('tool-call', ({ toolName, args }) => {
        console.log(`\n🔧 [事件] 调用工具: ${toolName}`);
        if (args && typeof args === 'object') {
            const argsStr = JSON.stringify(args, null, 2);
            console.log(`   📝 参数: ${argsStr.substring(0, 100)}${argsStr.length > 100 ? '...' : ''}`);
        }
    });

    agent.events.on('tool-result', ({ toolName, result, duration }) => {
        const status = result.success ? '✅' : '❌';
        const durationMs = typeof duration === 'number' ? `${duration}ms` : `${Date.now() - (duration as any)}ms`;
        console.log(`   ${status} [事件] 工具 ${toolName} 执行完成 (${durationMs})`);
        if (!result.success && result.error) {
            console.log(`   └─ 错误: ${result.error.substring(0, 100)}`);
        }
    });

    // 工具调用组事件
    agent.events.on('tool-calls-start', ({ count }) => {
        console.log(`\n📦 [事件] 开始工具调用组 (${count} 个工具)`);
    });

    agent.events.on('tool-calls-end', ({ count, hasErrors, summary }) => {
        const status = hasErrors ? '⚠️' : '✅';
        console.log(`   ${status} [事件] 工具调用组完成 (${count} 个工具)`);
        if (summary) {
            console.log(`   📊 摘要: ${summary}`);
        }
    });

    // 消息事件
    // agent.events.on('message', ({ message }) => {
    //     const roleIcon = {
    //         user: '👤',
    //         assistant: '🤖',
    //         system: '⚙️',
    //         tool: '🔧',
    //     };
    //     const icon = roleIcon[message.role] || '📝';
    //     const content = message.content.substring(0, 80);
    //     console.log(`\n${icon} [事件] ${message.role} 消息: "${content}${message.content.length > 80 ? '...' : ''}"`);
    // });

    // 流式输出事件
    agent.events.on('stream-chunk', (chunk) => {
        if (chunk.content) {
            process.stdout.write(`\r📡 [流式] ${chunk.content.substring(0, 50)}`);
        }
    });

    // 错误事件
    agent.events.on('error', ({ error, phase }) => {
        console.log(`\n❌ [事件] ${phase} 阶段错误: ${error.message}`);
    });

    // 日志事件
    agent.events.on('log', ({ level, message }) => {
        const levelIcon = {
            info: 'ℹ️',
            warn: '⚠️',
            error: '❌',
        };
        console.log(`\n${levelIcon[level]} [日志-${level}] ${message}`);
    });

    // 完成事件
    // agent.events.on('complete', ({ response }) => {
    //     console.log(`\n🎉 [事件] 任务完成`);
    //     console.log(`   📄 响应: ${response.content.substring(0, 100)}${response.content.length > 100 ? '...' : ''}`);
    // });

    // 取消事件
    agent.events.on('cancelled', ({ reason }) => {
        console.log(`\n🚫 [事件] 任务取消: ${reason}`);
    });

    console.log('  ✓ 事件监听器注册完成\n');
}

/**
 * 初始化应用
 */
async function initializeApp(config: AppConfig) {
    // 打印启动横幅
    printBanner();

    console.log('【初始化】正在启动应用...\n');

    // 打印环境配置
    printEnvInfo(config);

    // 初始化工具（包括 MCP 工具）
    console.log('【初始化】正在注册工具...');
    await registerDefaultToolsAsync();
    printToolsInfo();

    // 初始化 LLM Provider
    console.log('【初始化】正在初始化 LLM Provider...');
    const llmProvider = new OpenAIProvider({
        apiKey: config.deepseekApiKey,
        baseURL: config.deepseekBaseUrl,
    });
    console.log('  ✓ LLM Provider 初始化完成\n');

    // 生成系统提示词
    console.log('【初始化】正在生成系统提示词...');
    const customPrompt = operatorPrompt({
        directory: process.cwd(),
        vcs: "git",
        language: "Chinese",
    });
    console.log(`  ✓ 提示词长度: ${customPrompt.length} 字符\n`);

    // 创建 Agent
    console.log('【初始化】正在创建 Agent...');
    const agent = new Agent({
        llmProvider,
        systemPrompt: customPrompt,
        defaultTools: ToolRegistry.getSchemas(),
        sessionId: `session_${Date.now()}`,//session_1769441776991
    });

    // 设置全局 AgentContext 单例
    setAgentContext(agent.context);
    agent.start();
    console.log('  ✓ Agent 创建完成\n');

    // // 打印 Agent 配置
    // printAgentInfo(agent);

    // 设置事件监听
    setupAgentEventListeners(agent);

    // 打印启动完成信息
    printStartupInfo(agent.context.sessionId);

    return { agent, sessionId: agent.context.sessionId };
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
