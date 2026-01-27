/**
 * 主入口文件
 * 初始化并启动 AI Agent 应用
 */
import dotenv from 'dotenv';
import { Agent } from './agent';
import { OpenAIProvider } from './providers/openai';
import { operatorPrompt } from './prompts/operator';
import { registerDefaultToolsAsync, ToolRegistry } from './tool';
const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${env}`, override: true });
async function main() {
    const llmProvider = new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY || '',
        baseURL: process.env.OPENAI_API_BASE_URL || '',
    });
    await registerDefaultToolsAsync();
    console.log(ToolRegistry.getSchemas());
    const agent = new Agent({
        model: process.env.AI_MODEL || 'gpt-4o',
        llmProvider,
        systemPrompt: operatorPrompt({
            directory: process.env.PROJECT_DIRECTORY || process.cwd(),
            vcs: process.env.VCS || 'git',
            language: process.env.PROJECT_LANGUAGE || '',
        }),
        tools: ToolRegistry.getSchemas(),
    });
    agent.start();
    agent.run('执行测试/Users/wrr/work/ai-agent-v2/src/agent/index.test.ts', {
        stream: true,
    });
    agent.on('stream-chunk', (message) => {
        // console.log(message.content);
        process.stdout.write(message.content || '');
    });
}
main();
