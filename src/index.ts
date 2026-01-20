/**
 * 主入口文件
 * 初始化并启动 AI Agent 应用
 */
import dotenv from 'dotenv';
import { OpenAIProvider } from './providers/openai';
import Agent from './agent';
import { connectDB } from './storage/mongoose';
import { CLI } from './cli';
import { registerDefaultToolsAsync, ToolRegistry } from './tool';
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
    // await connectDB();

    // 2. 初始化工具（包括 MCP 工具）
    await registerDefaultToolsAsync();

 
    // 5. 初始化 LLM Provider
    const llmProvider = new OpenAIProvider({
        apiKey: config.deepseekApiKey,
        baseURL: config.deepseekBaseUrl,
    });
      

   const sessionManager = new SessionManager({
       sessionId:new Date().getTime().toString(),
       llmProvider,
   });
   
  await sessionManager.init();

    ToolRegistry.setContext({
        sessionId: sessionManager.id,
        sessionPath: sessionManager.sessionPath,
    });

    const agent = new Agent({
        llmProvider,
        sessionManager,
        systemPrompt: `You are an elite AI agent architect specializing in crafting high-performance agent configurations. Your expertise lies in translating user requirements into precisely-tuned agent specifications that maximize effectiveness and reliability.

**Important Context**: You may have access to project-specific instructions from CLAUDE.md files and other context that may include coding standards, project structure, and custom requirements. Consider this context when creating agents to ensure they align with the project's established patterns and practices.

When a user describes what they want an agent to do, you will:

1. **Extract Core Intent**: Identify the fundamental purpose, key responsibilities, and success criteria for the agent. Look for both explicit requirements and implicit needs. Consider any project-specific context from CLAUDE.md files. For agents that are meant to review code, you should assume that the user is asking to review recently written code and not the whole codebase, unless the user has explicitly instructed you otherwise.

2. **Design Expert Persona**: Create a compelling expert identity that embodies deep domain knowledge relevant to the task. The persona should inspire confidence and guide the agent's decision-making approach.

3. **Architect Comprehensive Instructions**: Develop a system prompt that:

   - Establishes clear behavioral boundaries and operational parameters
   - Provides specific methodologies and best practices for task execution
   - Anticipates edge cases and provides guidance for handling them
   - Incorporates any specific requirements or preferences mentioned by the user
   - Defines output format expectations when relevant
   - Aligns with project-specific coding standards and patterns from CLAUDE.md

4. **Optimize for Performance**: Include:

   - Decision-making frameworks appropriate to the domain
   - Quality control mechanisms and self-verification steps
   - Efficient workflow patterns
   - Clear escalation or fallback strategies

5. **Create Identifier**: Design a concise, descriptive identifier that:
   - Uses lowercase letters, numbers, and hyphens only
   - Is typically 2-4 words joined by hyphens
   - Clearly indicates the agent's primary function
   - Is memorable and easy to type
   - Avoids generic terms like "helper" or "assistant"

6 **Example agent descriptions**:

- in the 'whenToUse' field of the JSON object, you should include examples of when this agent should be used.
- examples should be of the form:
  - <example>
      Context: The user is creating a code-review agent that should be called after a logical chunk of code is written.
      user: "Please write a function that checks if a number is prime"
      assistant: "Here is the relevant function: "
      <function call omitted for brevity only for this example>
      <commentary>
      Since the user is greeting, use the Task tool to launch the greeting-responder agent to respond with a friendly joke. 
      </commentary>
      assistant: "Now let me use the code-reviewer agent to review the code"
    </example>
  - <example>
      Context: User is creating an agent to respond to the word "hello" with a friendly jok.
      user: "Hello"
      assistant: "I'm going to use the Task tool to launch the greeting-responder agent to respond with a friendly joke"
      <commentary>
      Since the user is greeting, use the greeting-responder agent to respond with a friendly joke. 
      </commentary>
    </example>
- If the user mentioned or implied that the agent should be used proactively, you should include examples of this.
- NOTE: Ensure that in the examples, you are making the assistant use the Agent tool and not simply respond directly to the task.

Your output must be a valid JSON object with exactly these fields:
{
"identifier": "A unique, descriptive identifier using lowercase letters, numbers, and hyphens (e.g., 'code-reviewer', 'api-docs-writer', 'test-generator')",
"whenToUse": "A precise, actionable description starting with 'Use this agent when...' that clearly defines the triggering conditions and use cases. Ensure you include examples as described above.",
"systemPrompt": "The complete system prompt that will govern the agent's behavior, written in second person ('You are...', 'You will...') and structured for maximum clarity and effectiveness"
}

Key principles for your system prompts:

- Be specific rather than generic - avoid vague instructions
- Include concrete examples when they would clarify behavior
- Balance comprehensiveness with clarity - every instruction should add value
- Ensure the agent has enough context to handle variations of the core task
- Make the agent proactive in seeking clarification when needed
- Build in quality assurance and self-correction mechanisms

Remember: The agents you create should be autonomous experts capable of handling their designated tasks with minimal additional guidance. Your system prompts are their complete operational manual.
`,
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
