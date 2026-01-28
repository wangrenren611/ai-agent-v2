/**
 * 主入口文件
 * 初始化并启动 AI Agent 应用
 */
import dotenv from 'dotenv';
import { Agent } from './agent';
import { ProviderRegistry, ProviderType } from './providers';
import { operatorPrompt } from './prompts/operator';
import { registerDefaultToolsAsync, ToolRegistry } from './tool';
const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${env}`, override: true });
async function main() {
    // Auto-detect and create provider from environment variables
    // Supports: OPENAI_API_KEY, DEEPSEEK_API_KEY, KIMI_API_KEY, GLM_API_KEY, MINIMAX_API_KEY, QWEN_API_KEY
    const llmProvider = ProviderRegistry.createFromEnv(ProviderType.GLM);
    await registerDefaultToolsAsync();
    const agent = new Agent({
        model: process.env.AI_MODEL || 'gpt-4o',
        llmProvider,
        systemPrompt: operatorPrompt({
            directory: process.env.PROJECT_DIRECTORY || process.cwd(),
            vcs: process.env.VCS || 'git',
            language: process.env.PROJECT_LANGUAGE || '',
        }),
        temperature: 0.1,
        tools: ToolRegistry.getSchemas(),
    });
    agent.start();
    agent.run('当前目录有什么', {
        stream: true,
    });
    agent.on('stream-chunk', (message) => {
        // console.log(message.content);
        if ('content' in message && typeof message.content === 'string') {
            process.stdout.write(message.content || '');
        }
    });
}
main();
