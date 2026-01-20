```
{
  "role": "user",
  "type": "text",
  "content": "Task: 探索项目整体结构和目录布局\n\nWork autonomously using the allowed tools. Do not ask the user follow-up questions.\n\nReturn a concise final summary with key findings, file:line references, and any remaining gaps.\n\n请深入探索当前项目的完整目录结构，包括：\n1. 所有的主要目录和子目录\n2. 识别所有的源代码文件（.ts文件）\n3. 识别配置文件（package.json, tsconfig.json等）\n4. 列出所有入口文件和关键模块\n5. 提供一个清晰的目录树结构\n\n请提供详细的文件清单和目录结构分析。"
}
```
```
{
  "role": "assistant",
  "content": "我将深入探索项目结构，分析目录布局、源代码文件和配置文件。",
  "type": "tool_call",
  "tool_calls": [
    {
      "function": {
        "arguments": "{\"pattern\":\"**/*.ts\"}",
        "name": "glob"
      },
      "id": "call_-7958586697936847300",
      "index": 0,
      "type": "function"
    },
    {
      "function": {
        "arguments": "{\"pattern\":\"**/*.json\"}",
        "name": "glob"
      },
      "id": "call_-7958586697936847299",
      "index": 1,
      "type": "function"
    },
    {
      "function": {
        "arguments": "{\"pattern\":\"**/*.md\"}",
        "name": "glob"
      },
      "id": "call_-7958586697936847298",
      "index": 2,
      "type": "function"
    }
  ]
}
```
```
{
  "role": "tool",
  "content": "vitest.config.ts\nsrc/codeCompressor.ts\nsrc/index.ts\nsrc/agent/export.ts\nsrc/agent/index-eventbus.ts\nsrc/agent/index.ts\nsrc/cli/CLI.ts\nsrc/cli/index.ts\nsrc/examples/log-demo.ts\nsrc/mcp/client.ts\nsrc/mcp/config-loader.ts\nsrc/mcp/index.ts\nsrc/mcp/json-schema-to-zod.ts\nsrc/mcp/manager.ts\nsrc/mcp/tool-adapter.ts\nsrc/mcp/types.ts\nsrc/prompts/operator.ts\nsrc/prompts/system.ts\nsrc/providers/base.ts\nsrc/providers/openai.ts\nsrc/session-v2/compaction.ts\nsrc/session-v2/index.ts\nsrc/skills/index.ts\nsrc/skills/loader.ts\nsrc/skills/parser.ts\nsrc/skills/skill-tool.ts\nsrc/skills/types.ts\nsrc/storage/memory.ts\nsrc/storage/mongoose.ts\nsrc/tool/base.ts\nsrc/tool/bash-parser.ts\nsrc/tool/bash.test.ts\nsrc/tool/bash.ts\nsrc/tool/batch-replace.ts\nsrc/tool/file.ts\nsrc/tool/glob.ts\nsrc/tool/grep.ts\nsrc/tool/index.test.ts\nsrc/tool/index.ts\nsrc/tool/registry.ts\nsrc/tool/rollback.ts\nsrc/tool/surgical.ts\nsrc/tool/task.ts\nsrc/tool/todo.ts\nsrc/tool/todowrite.ts\nsrc/tool/web-search.ts\nsrc/util/backup-manager.ts\nsrc/util/event-bus-agent.ts\nsrc/util/event-bus-session-integration.ts\nsrc/util/event-bus.test.ts\nsrc/util/event-bus.ts\nsrc/util/log-format.ts\nsrc/util/log.ts\nsrc/util/platform-cmd.ts\nsrc/agent/hooks/examples.ts\nsrc/agent/hooks/index.ts\nsrc/agent/hooks/integration-example.ts\nsrc/cli/commands/clear.ts\nsrc/cli/commands/exit.ts\nsrc/cli/commands/help.ts\nsrc/cli/commands/history.ts\nsrc/cli/commands/index.ts\nsrc/cli/commands/session.ts\nsrc/cli/commands/types.ts\nsrc/cli/utils/format.ts\nsrc/cli/utils/index.ts\nsrc/cli/utils/input.ts\nsrc/cli/utils/reader.ts\nsrc/cli/utils/smart-input.ts\nsrc/storage/models/message.ts\nsrc/storage/models/session.ts",
  "type": "tool",
  "tool_call_id": "call_-7958586697936847300"
}
```
```
{
  "role": "tool",
  "content": "package.json\ntsconfig.json",
  "type": "tool",
  "tool_call_id": "call_-7958586697936847299"
}
```
```
{
  "role": "tool",
  "content": "CLAUDE.md\ncustomPrompt.md\nESLINT_SETUP.md\ndocs/compaction-analysis.md\ndocs/CROSS_PLATFORM.md\ndocs/PROJECT_ANALYSIS.md\ndocs/PROMPTS.md\nskills/git-commit/SKILL.md\nskills/planning-with-files/examples.md\nskills/planning-with-files/reference.md\nskills/planning-with-files/SKILL.md\nskills/ui-ux-pro-max/SKILL.md\nsrc/mcp/README.md\nsrc/util/event-bus-README.md\nskills/planning-with-files/templates/findings.md\nskills/planning-with-files/templates/progress.md\nskills/planning-with-files/templates/task_plan.md\nsrc/agent/hooks/README.md",
  "type": "tool",
  "tool_call_id": "call_-7958586697936847298"
}
```
```
{
  "role": "assistant",
  "content": "",
  "type": "tool_call",
  "tool_calls": [
    {
      "function": {
        "arguments": "{\"filePath\":\"package.json\"}",
        "name": "read_file"
      },
      "id": "call_-7958611230790562594",
      "index": 0,
      "type": "function"
    },
    {
      "function": {
        "arguments": "{\"filePath\":\"tsconfig.json\"}",
        "name": "read_file"
      },
      "id": "call_-7958611230790562593",
      "index": 1,
      "type": "function"
    },
    {
      "function": {
        "arguments": "{\"filePath\":\"CLAUDE.md\"}",
        "name": "read_file"
      },
      "id": "call_-7958611230790562592",
      "index": 2,
      "type": "function"
    },
    {
      "function": {
        "arguments": "{\"filePath\":\"src/index.ts\"}",
        "name": "read_file"
      },
      "id": "call_-7958611230790562591",
      "index": 3,
      "type": "function"
    }
  ]
}
```
```
{
  "role": "tool",
  "content": "--- FILE: package.json ---\nRange: 1 - 64\n\n1 | {\r\n2 |   \"name\": \"ai-agent-v2\",\r\n3 |   \"version\": \"1.0.0\",\r\n4 |   \"description\": \"\",\r\n5 |   \"license\": \"ISC\",\r\n6 |   \"author\": \"\",\r\n7 |   \"type\": \"module\",\r\n8 |   \"main\": \"index.js\",\r\n9 |   \"bin\": {\r\n10 |     \"@qps\": \"bin/index.js\"\r\n11 |   },\r\n12 |   \"files\": [\r\n13 |     \"dist\"\r\n14 |   ],\r\n15 |   \"scripts\": {\r\n16 |     \"typecheck\": \"tsc --noEmit\",\r\n17 |     \"lint\": \"eslint . --ext .ts,.js\",\r\n18 |     \"lint:fix\": \"eslint . --ext .ts,.js --fix\",\r\n19 |     \"lint:strict\": \"eslint . --ext .ts,.js --max-warnings 0\",\r\n20 |     \"build\": \"cross-env NODE_ENV=production  tsc\",\r\n21 |     \"dev\": \"cross-env NODE_ENV=development  tsx src/index.ts\",\r\n22 |     \"dev:demo\": \"cross-env NODE_ENV=development  tsx src/index.ts demo\",\r\n23 |     \"dev:cli\": \"cross-env NODE_ENV=development  tsx src/index.ts cli\",\r\n24 |     \"test\": \"vitest run src/tool/bash.test.ts\",\r\n25 |     \"codeCompressor\": \"cross-env NODE_ENV=development  tsx src/codeCompressor.ts\",\r\n26 |     \"test:ui\": \"vitest --ui\"\r\n27 |   },\r\n28 |   \"devDependencies\": {\r\n29 |     \"@eslint/js\": \"^9.39.2\",\r\n30 |     \"@types/dotenv\": \"^8.2.3\",\r\n31 |     \"@types/node\": \"^22.19.3\",\r\n32 |     \"@types/prompts\": \"^2.4.9\",\r\n33 |     \"@typescript-eslint/eslint-plugin\": \"^8.39.0\",\r\n34 |     \"@typescript-eslint/parser\": \"^8.39.0\",\r\n35 |     \"cross-env\": \"^10.1.0\",\r\n36 |     \"eslint\": \"^9.39.2\",\r\n37 |     \"eslint-plugin-import\": \"^2.31.0\",\r\n38 |     \"ts-node\": \"^10.9.2\",\r\n39 |     \"typescript\": \"^5.9.3\",\r\n40 |     \"typescript-eslint\": \"^8.53.0\",\r\n41 |     \"vitest\": \"^3.2.4\"\r\n42 |   },\r\n43 |   \"dependencies\": {\r\n44 |     \"@mcpc-tech/ripgrep-napi\": \"^0.0.4\",\r\n45 |     \"@tavily/core\": \"^0.7.1\",\r\n46 |     \"chalk\": \"^5.6.2\",\r\n47 |     \"dockerode\": \"^4.0.9\",\r\n48 |     \"dotenv\": \"^17.2.3\",\r\n49 |     \"execa\": \"^8.0.1\",\r\n50 |     \"fast-glob\": \"^3.3.3\",\r\n51 |     \"gray-matter\": \"^4.0.3\",\r\n52 |     \"iconv-lite\": \"^0.7.2\",\r\n53 |     \"isbinaryfile\": \"^6.0.0\",\r\n54 |     \"mongoose\": \"^9.1.3\",\r\n55 |     \"ora\": \"^9.0.0\",\r\n56 |     \"prompts\": \"^2.4.2\",\r\n57 |     \"tree-sitter\": \"^0.22.0\",\r\n58 |     \"tree-sitter-bash\": \"^0.23.1\",\r\n59 |     \"tree-sitter-typescript\": \"^0.23.2\",\r\n60 |     \"tsx\": \"^4.21.0\",\r\n61 |     \"zod\": \"^3.24.1\"\r\n62 |   }\r\n63 | }\r\n64 | ",
  "type": "tool",
  "tool_call_id": "call_-7958611230790562594"
}
```
```
{
  "role": "tool",
  "content": "--- FILE: tsconfig.json ---\nRange: 1 - 25\n\n1 | {\r\n2 |   \"exclude\": [\"dist\", \"__tests__\", \"node_modules\"],\r\n3 |   \"compilerOptions\": {\r\n4 |     \"lib\": [\"ESNext\"],\r\n5 |     \"module\": \"CommonJS\",\r\n6 |     \"types\": [\"node\"],\r\n7 |     \"resolveJsonModule\": true,\r\n8 |     \"allowSyntheticDefaultImports\": true,\r\n9 |     \"strict\": true,\r\n10 |     \"strictNullChecks\": true,\r\n11 |     \"skipLibCheck\": true,\r\n12 |     \"declaration\": true,\r\n13 |     \"outDir\": \"./dist\",\r\n14 |     \"rootDir\": \"./src\",\r\n15 |     \"target\": \"ESNext\",\r\n16 |     \"esModuleInterop\": true\r\n17 |   },\r\n18 |   \"include\": [\r\n19 |     \"./src/**/*\",\r\n20 |     \"./typings\",\r\n21 |     \"./typing.d.ts\",\r\n22 |     \"src/tools/todowrite.ts\"\r\n23 | , \"test-model.js\"  ]\r\n24 | }\r\n25 | ",
  "type": "tool",
  "tool_call_id": "call_-7958611230790562593"
}
```
```
{
  "role": "tool",
  "content": "--- FILE: CLAUDE.md ---\nRange: 1 - 101\n\n1 | # CLAUDE.md\r\n2 | \r\n3 | This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.\r\n4 | \r\n5 | ## Development Commands\r\n6 | \r\n7 | | Command | Description |\r\n8 | |---------|-------------|\r\n9 | | `pnpm typecheck` | Type check without emitting files |\r\n10 | | `pnpm build` | Build for production (outputs to `dist/`) |\r\n11 | | `pnpm dev` | Run CLI interactive mode |\r\n12 | | `pnpm dev:demo` | Run demo mode (non-interactive) |\r\n13 | | `pnpm dev:cli [sessionId]` | Run CLI with optional session ID |\r\n14 | \r\n15 | ## Environment Configuration\r\n16 | \r\n17 | The app uses environment-specific `.env` files loaded by dotenv:\r\n18 | - `.env.development` - Development environment\r\n19 | - `.env.production` - Production environment\r\n20 | \r\n21 | Required environment variables:\r\n22 | - `DEEPSEEK_API_KEY` - API key for LLM provider\r\n23 | - `DEEPSEEK_BASE_URL` - Base URL for LLM API\r\n24 | \r\n25 | ## Architecture Overview\r\n26 | \r\n27 | This is a multi-session AI agent built with **Domain-Driven Design (DDD)** and **Repository Pattern**.\r\n28 | \r\n29 | ```\r\n30 | ┌─────────────────────────────────────────────────────────────┐\r\n31 | │                         CLI Layer                           │\r\n32 | │  (src/cli/) - Interactive commands, readline with history   │\r\n33 | └─────────────────────────────────────────────────────────────┘\r\n34 |                               │\r\n35 | ┌─────────────────────────────────────────────────────────────┐\r\n36 | │                         Agent                               │\r\n37 | │  (src/agent/) - Orchestrates LLM calls and sessions         │\r\n38 | └─────────────────────────────────────────────────────────────┘\r\n39 |                               │\r\n40 |          ┌────────────────────┼────────────────────┐\r\n41 |          │                    │                    │\r\n42 | ┌────────▼─────────┐  ┌───────▼────────┐  ┌───────▼─────────┐\r\n43 | │   Domain Layer   │  │ Application   │  │ Infrastructure  │\r\n44 | │ (src/domain/)    │  │ (src/app/)    │  │ (src/infra/)    │\r\n45 | │ - Session        │  │ SessionMgr    │  │ MessageRepo     │\r\n46 | │ - MessageQueue   │  │               │  │                 │\r\n47 | └──────────────────┘  └───────────────┘  └─────────────────┘\r\n48 | ```\r\n49 | \r\n50 | ### Key Architectural Patterns\r\n51 | \r\n52 | **Lazy-Loading History**: `SessionManager.getMessages()` automatically loads from DB if memory queue is empty. This enables seamless session restoration without explicit load calls.\r\n53 | \r\n54 | **Command Pattern**: CLI commands are modular handlers in `src/cli/commands/`. To add a new command:\r\n55 | 1. Create handler in `commands/` implementing `CommandHandler` interface\r\n56 | 2. Register in `commands/index.ts` registry\r\n57 | 3. No changes needed to main CLI class\r\n58 | \r\n59 | **Mutable Context**: Commands receive `CommandContext` with wrapped values (`{ value: string }`) to allow mutations (sessionId changes, exit flag).\r\n60 | \r\n61 | ### Session Management\r\n62 | \r\n63 | - **Session ID**: User-specified or auto-generated (`session_${timestamp}`)\r\n64 | - **Multi-user**: Each session has a `userId`\r\n65 | - **Memory Queue**: In-memory `MessageQueue` per session for fast access\r\n66 | - **Persistence**: Messages persisted to MongoDB via `MessageRepository`\r\n67 | \r\n68 | ### Code Organization Rules\r\n69 | \r\n70 | **File Size Limit**: No source file should exceed **480 lines**. When a file approaches this limit, split it into smaller, focused modules.\r\n71 | \r\n72 | **Principles**:\r\n73 | - Each file should have a single, clear responsibility\r\n74 | - Extract related functionality into separate modules\r\n75 | - Use barrel files (`index.ts`) for clean imports\r\n76 | - Keep CLI commands and utilities focused and split when needed\r\n77 | \r\n78 | ### CLI Implementation Details\r\n79 | \r\n80 | The CLI uses **Node.js native `readline`** with built-in history support:\r\n81 | - Up/Down arrows navigate input history\r\n82 | - History persisted in `InputHistory` class (max 100 entries)\r\n83 | - Spinner (`ora`) is used during LLM calls - safely terminates before readline resumes\r\n84 | \r\n85 | ### Provider Interface\r\n86 | \r\n87 | To add a new LLM provider, extend `LLMProvider` abstract class from `src/providers/base.ts`:\r\n88 | - Implement `generate(messages, options)` method\r\n89 | - Pass to Agent constructor via `AgentConfig`\r\n90 | \r\n91 | ### Database Models\r\n92 | \r\n93 | - **Message**: `{ sessionId, userId, content, role, type, createdAt }`\r\n94 | - **Session**: `{ sessionId, userId, createdAt, updatedAt }`\r\n95 | \r\n96 | Compound index on `{ sessionId: 1, createdAt: 1 }` optimizes history queries.\r\n97 | \r\n98 | \r\n99 | ### Code File Index\r\n100 | Quickly locate key functions and files\r\n101 | ./ai-agent-v2/projectMap.md",
  "type": "tool",
  "tool_call_id": "call_-7958611230790562592"
}
```
```
{
  "role": "tool",
  "content": "--- FILE: src/index.ts ---\nRange: 1 - 125\n\n1 | /**\r\n2 |  * 主入口文件\r\n3 |  * 初始化并启动 AI Agent 应用\r\n4 |  */\r\n5 | import dotenv from 'dotenv';\r\n6 | import { OpenAIProvider } from './providers/openai';\r\n7 | import Agent from './agent';\r\n8 | import { connectDB } from './storage/mongoose';\r\n9 | import { CLI } from './cli';\r\n10 | import { registerDefaultToolsAsync, ToolRegistry } from './tool';\r\n11 | import { SessionManager } from './session-v2';\r\n12 | import { operatorPrompt } from './prompts/operator';\r\n13 | import path from 'path';\r\n14 | import fs from 'fs';\r\n15 | \r\n16 | const env = process.env.NODE_ENV || 'development';\r\n17 | dotenv.config({ path: `.env.${env}`, override: true });\r\n18 | \r\n19 | /**\r\n20 |  * 应用配置\r\n21 |  */\r\n22 | interface AppConfig {\r\n23 |     deepseekApiKey: string;\r\n24 |     deepseekBaseUrl: string;\r\n25 | }\r\n26 | \r\n27 | /**\r\n28 |  * 初始化应用\r\n29 |  */\r\n30 | async function initializeApp(config: AppConfig) {\r\n31 |     // 1. 连接数据库\r\n32 |     // await connectDB();\r\n33 | \r\n34 |     // 2. 初始化工具（包括 MCP 工具）\r\n35 |     await registerDefaultToolsAsync();\r\n36 | \r\n37 |  \r\n38 |     // 5. 初始化 LLM Provider\r\n39 |     const llmProvider = new OpenAIProvider({\r\n40 |         apiKey: config.deepseekApiKey,\r\n41 |         baseURL: config.deepseekBaseUrl,\r\n42 |     });\r\n43 |       \r\n44 | \r\n45 |    const sessionManager = new SessionManager({\r\n46 |        sessionId:new Date().getTime().toString(),\r\n47 |        llmProvider,\r\n48 |    });\r\n49 |    \r\n50 |   await sessionManager.init();\r\n51 | \r\n52 |     ToolRegistry.setContext({\r\n53 |         sessionId: sessionManager.id,\r\n54 |         sessionPath: sessionManager.sessionPath,\r\n55 |     });\r\n56 | \r\n57 |     const tools = ToolRegistry.getSchemas();\r\n58 | \r\n59 |     const customPrompt = operatorPrompt({\r\n60 |         directory: process.cwd(),\r\n61 |         vcs: \"git\",\r\n62 |         tools,\r\n63 |     });\r\n64 |     fs.writeFileSync(path.resolve(process.cwd(), 'customPrompt.md'), customPrompt);\r\n65 |     const agent = new Agent({\r\n66 |         llmProvider,\r\n67 |         sessionManager,\r\n68 |         systemPrompt: customPrompt,\r\n69 |         defaultTools: tools,\r\n70 |     });\r\n71 | \r\n72 |     return { agent, sessionManager };\r\n73 | }\r\n74 | \r\n75 | /**\r\n76 |  * 启动 CLI 交互模式\r\n77 |  */\r\n78 | async function startCLI(agent: Agent, sessionManager: SessionManager): Promise<void> {\r\n79 |     const cli = new CLI({\r\n80 |         agent,\r\n81 |         sessionManager,\r\n82 |         sessionId: sessionManager.id,\r\n83 |         prompt: '>',\r\n84 |     });\r\n85 | \r\n86 |     await cli.start();\r\n87 | }\r\n88 | \r\n89 | \r\n90 | /**\r\n91 |  * 主函数\r\n92 |  */\r\n93 | async function main() {\r\n94 |     // 验证环境变量\r\n95 |     const deepseekApiKey = process.env.DEEPSEEK_API_KEY;\r\n96 |     const deepseekBaseUrl = process.env.DEEPSEEK_BASE_URL;\r\n97 | \r\n98 |     if (!deepseekApiKey) {\r\n99 |         throw new Error('DEEPSEEK_API_KEY is not set');\r\n100 |     }\r\n101 | \r\n102 |     if (!deepseekBaseUrl) {\r\n103 |         throw new Error('DEEPSEEK_BASE_URL is not set');\r\n104 |     }\r\n105 | \r\n106 |     // 初始化应用\r\n107 |     const { agent, sessionManager } = await initializeApp({\r\n108 |         deepseekApiKey,\r\n109 |         deepseekBaseUrl,\r\n110 |     });\r\n111 | \r\n112 |     // 检查命令行参数\r\n113 |     const args = process.argv.slice(2);\r\n114 |     const mode = args[0] || 'cli';\r\n115 | \r\n116 |     switch (mode) {\r\n117 |         case 'cli':\r\n118 |         default:\r\n119 |             await startCLI(agent, sessionManager);\r\n120 |             break;\r\n121 |     }\r\n122 | }\r\n123 | \r\n124 | main().catch(console.error);\r\n125 | ",
  "type": "tool",
  "tool_call_id": "call_-7958611230790562591"
}
```
```
{
  "role": "assistant",
  "content": "",
  "type": "tool_call",
  "tool_calls": [
    {
      "function": {
        "arguments": "{\"pattern\":\"*\"}",
        "name": "glob"
      },
      "id": "call_-7958602847014272589",
      "index": 0,
      "type": "function"
    },
    {
      "function": {
        "arguments": "{\"pattern\":\".*\"}",
        "name": "glob"
      },
      "id": "call_-7958602847014272588",
      "index": 1,
      "type": "function"
    },
    {
      "function": {
        "arguments": "{\"filePath\":\"vitest.config.ts\"}",
        "name": "read_file"
      },
      "id": "call_-7958602847014272587",
      "index": 2,
      "type": "function"
    }
  ]
}
```
```
{
  "role": "tool",
  "content": "CLAUDE.md\ncustomPrompt.md\nenv.example\neslint.config.js\nESLINT_SETUP.md\npackage.json\npnpm-lock.yaml\ntest.js\ntsconfig.json\nvitest.config.ts",
  "type": "tool",
  "tool_call_id": "call_-7958602847014272589"
}
```
```
{
  "role": "tool",
  "content": ".env.development\n.gitignore\n.mcp.json\n.mcp.json.example\n.npmrc",
  "type": "tool",
  "tool_call_id": "call_-7958602847014272588"
}
```
```
{
  "role": "tool",
  "content": "--- FILE: vitest.config.ts ---\nRange: 1 - 8\n\n1 | import { defineConfig } from 'vitest/config';\r\n2 | \r\n3 | export default defineConfig({\r\n4 |   test: {\r\n5 |     globals: true,\r\n6 |   },\r\n7 | });\r\n8 | ",
  "type": "tool",
  "tool_call_id": "call_-7958602847014272587"
}
```
```
{
  "role": "assistant",
  "content": "",
  "type": "tool_call",
  "tool_calls": [
    {
      "function": {
        "arguments": "{\"filePath\":\"src/agent/index.ts\"}",
        "name": "read_file"
      },
      "id": "call_-7958781586376257629",
      "index": 0,
      "type": "function"
    },
    {
      "function": {
        "arguments": "{\"filePath\":\"src/tool/index.ts\"}",
        "name": "read_file"
      },
      "id": "call_-7958781586376257628",
      "index": 1,
      "type": "function"
    },
    {
      "function": {
        "arguments": "{\"filePath\":\"src/skills/index.ts\"}",
        "name": "read_file"
      },
      "id": "call_-7958781586376257627",
      "index": 2,
      "type": "function"
    },
    {
      "function": {
        "arguments": "{\"filePath\":\"src/session-v2/index.ts\"}",
        "name": "read_file"
      },
      "id": "call_-7958781586376257626",
      "index": 3,
      "type": "function"
    }
  ]
}
```
```
{
  "role": "tool",
  "content": "--- FILE: src/agent/index.ts ---\nRange: 1 - 382\n\n1 | /**\r\n2 |  * Agent - AI 代理\r\n3 |  * 负责编排 LLM 调用和会话管理\r\n4 |  * \r\n5 |  * 注意：此文件是旧版 Agent，建议使用 index-eventbus.ts 以获得 EventBus 集成\r\n6 |  * 要启用 EventBus 功能，请导入 './index-eventbus' 而不是此文件\r\n7 |  */\r\n8 | import EventEmitter from \"events\";\r\n9 | import { LLMProvider, LLMResponse, ToolSchema } from \"../providers/base\";\r\n10 | import { ScopedLogger } from \"../util/log\";\r\n11 | import { formatToolResult } from \"../util/log-format\";\r\n12 | import { SessionManager } from \"../session-v2\";\r\n13 | import { SYSTEM_PROMPT } from \"../prompts/system\";\r\n14 | import { ToolRegistry } from \"../tool/registry\";\r\n15 | \r\n16 | export interface AgentConfig {\r\n17 |     llmProvider: LLMProvider;\r\n18 |     sessionManager: SessionManager;\r\n19 |     systemPrompt: string;\r\n20 |     /** 默认工具列表（可选），不传则使用 ToolRegistry 中所有工具 */\r\n21 |     defaultTools?: ToolSchema[];\r\n22 |     /** 最大循环次数，防止无限循环，默认 10 */\r\n23 |     maxLoop?: number;\r\n24 |     /** 最大 token 数，默认 8000 */\r\n25 |     maxTokens?: number;\r\n26 |     /** 最大输出 token 数，默认 8000 */\r\n27 |     maxOutputTokens?: number;\r\n28 |     /** 工具并发上限，默认 4 */\r\n29 |     toolConcurrency?: number;\r\n30 |     /** 单次工具调用超时（毫秒），默认 120000 */\r\n31 |     toolTimeoutMs?: number;\r\n32 |     /** 连续重复的工具调用轮次上限，默认 2 */\r\n33 |     noProgressLimit?: number;\r\n34 | }\r\n35 | \r\n36 | export interface AgentResponse {\r\n37 |     content: string;\r\n38 |     role: 'assistant';\r\n39 | }\r\n40 | \r\n41 | export default class Agent extends EventEmitter {\r\n42 |     private llmProvider: LLMProvider;\r\n43 |     private logger: ScopedLogger;\r\n44 |     private sessionManager: SessionManager;\r\n45 |     private systemPrompt: string;\r\n46 |     private defaultTools: ToolSchema[] | undefined;\r\n47 |     private maxLoop: number;\r\n48 |     maxOutputTokens: number;\r\n49 |     maxTokens: number;\r\n50 |     private toolConcurrency: number;\r\n51 |     private toolTimeoutMs: number;\r\n52 |     private noProgressLimit: number;\r\n53 |     constructor(config: AgentConfig) {\r\n54 |         super();\r\n55 |         this.llmProvider = config.llmProvider;\r\n56 |         this.sessionManager = config.sessionManager;\r\n57 |         this.systemPrompt = config.systemPrompt;\r\n58 |         this.defaultTools = config.defaultTools;\r\n59 |         this.logger = new ScopedLogger('Agent');\r\n60 |         this.maxLoop = config.maxLoop ?? 1024;\r\n61 |         const providerMaxOutput = this.llmProvider.maxOutputTokens;\r\n62 |         const providerMaxTokens = this.llmProvider.maxTokens;\r\n63 |         this.maxOutputTokens = Math.min(config.maxOutputTokens ?? providerMaxOutput, providerMaxOutput);\r\n64 |         this.maxTokens = Math.min(config.maxTokens ?? providerMaxTokens, providerMaxTokens);\r\n65 |         this.toolConcurrency = Math.max(1, config.toolConcurrency ?? 4);\r\n66 |         this.toolTimeoutMs = config.toolTimeoutMs ?? 1000*60*5;\r\n67 |         this.noProgressLimit = Math.max(0, config.noProgressLimit ?? 2);\r\n68 |         this.sessionManager.maxOutputTokens = this.maxOutputTokens;\r\n69 |         this.sessionManager.maxTokens = this.maxTokens;\r\n70 |     }\r\n71 | \r\n72 |     private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {\r\n73 |         if (!timeoutMs || timeoutMs <= 0) {\r\n74 |             return promise;\r\n75 |         }\r\n76 | \r\n77 |         let timeoutId: ReturnType<typeof setTimeout> | undefined;\r\n78 |         const timeoutPromise = new Promise<never>((_, reject) => {\r\n79 |             timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);\r\n80 |         });\r\n81 | \r\n82 |         return Promise.race([promise, timeoutPromise]).finally(() => {\r\n83 |             if (timeoutId) {\r\n84 |                 clearTimeout(timeoutId);\r\n85 |             }\r\n86 |         });\r\n87 |     }\r\n88 | \r\n89 |     private async runWithConcurrency<T, R>(\r\n90 |         items: T[],\r\n91 |         limit: number,\r\n92 |         task: (item: T, index: number) => Promise<R>\r\n93 |     ): Promise<R[]> {\r\n94 |         if (items.length === 0) {\r\n95 |             return [];\r\n96 |         }\r\n97 | \r\n98 |         if (limit <= 1) {\r\n99 |             const results: R[] = [];\r\n100 |             for (let i = 0; i < items.length; i++) {\r\n101 |                 results.push(await task(items[i], i));\r\n102 |             }\r\n103 |             return results;\r\n104 |         }\r\n105 | \r\n106 |         const results = new Array<R>(items.length);\r\n107 |         let nextIndex = 0;\r\n108 |         const workerCount = Math.min(limit, items.length);\r\n109 | \r\n110 |         const workers = Array.from({ length: workerCount }, async () => {\r\n111 |             while (true) {\r\n112 |                 const currentIndex = nextIndex++;\r\n113 |                 if (currentIndex >= items.length) {\r\n114 |                     break;\r\n115 |                 }\r\n116 |                 results[currentIndex] = await task(items[currentIndex], currentIndex);\r\n117 |             }\r\n118 |         });\r\n119 | \r\n120 |         await Promise.all(workers);\r\n121 |         return results;\r\n122 |     }\r\n123 | \r\n124 |     private buildToolSignature(toolCalls: NonNullable<LLMResponse['tool_calls']>): string {\r\n125 |         try {\r\n126 |             return JSON.stringify(\r\n127 |                 toolCalls.map((call) => ({\r\n128 |                     name: call.function.name,\r\n129 |                     arguments: call.function.arguments,\r\n130 |                 }))\r\n131 |             );\r\n132 |         } catch (_) {\r\n133 |             return '';\r\n134 |         }\r\n135 |     }\r\n136 | \r\n137 |     /**\r\n138 |      * 运行 Agent 处理用户查询\r\n139 |      * @param sessionId 会话 ID\r\n140 |      * @param userId 用户 ID\r\n141 |      * @param query 用户查询\r\n142 |      * @param options 选项\r\n143 |      * @returns Agent 响应\r\n144 |      */\r\n145 |     async run(\r\n146 |         query: string,\r\n147 |         options?: { silent?: boolean; tools?: ToolSchema[] }\r\n148 |     ): Promise<AgentResponse | null> {\r\n149 | \r\n150 |      \r\n151 |         try {\r\n152 | \r\n153 |             // 3. 获取工具 schemas（优先级：传入参数 > 默认配置 > ToolRegistry 全部）\r\n154 |             const tools = options?.tools ?? this.defaultTools ?? [];\r\n155 | \r\n156 |             // 4. LLM 调用循环（处理工具调用）\r\n157 |             let i = 0; // 防止无限循环\r\n158 |             let finalResponse: AgentResponse | null = null;\r\n159 |             let lastToolSignature: string | null = null;\r\n160 |             let repeatedToolCalls = 0;\r\n161 |   \r\n162 |   \r\n163 |             this.sessionManager.addMessage({\r\n164 |                 role: 'user',\r\n165 |                 type: 'text',\r\n166 |                 content: query\r\n167 |             });\r\n168 | \r\n169 |             while (i < this.maxLoop) {\r\n170 |                 i++; // 在循环开始时递增计数器\r\n171 | \r\n172 |                 const llmMessages = await this.sessionManager.getMessages();\r\n173 | \r\n174 |                 const spinner = this.logger.spinner(`Thinking-${i}...`);\r\n175 |                 let llmResponse: Awaited<ReturnType<LLMProvider['generate']>> = null;\r\n176 |                 try {\r\n177 |                     // 调用 LLM\r\n178 |                     llmResponse = await this.llmProvider.generate([\r\n179 |                         {\r\n180 |                             role: 'system',\r\n181 |                             content: this.systemPrompt,\r\n182 |                         },\r\n183 |                         ...llmMessages\r\n184 |                     ], {\r\n185 |                         model: process.env.AI_MODEL,\r\n186 |                         tools: tools.length > 0 ? tools : undefined,\r\n187 |                         max_tokens: this.maxOutputTokens,\r\n188 |                     });\r\n189 |                     // console.log( this.systemPrompt)\r\n190 |                 } catch (error) {\r\n191 |                     const errorMsg = error instanceof Error ? error.message : String(error);\r\n192 | \r\n193 |                     spinner.fail(`Thinking-${i} failed`);\r\n194 | \r\n195 |                     this.logger.error(`LLM error: ${errorMsg}`);\r\n196 |                       this.sessionManager.addMessage({\r\n197 |                         role: 'assistant',\r\n198 |                         type: 'text',\r\n199 |                         content: errorMsg\r\n200 |                     });\r\n201 | \r\n202 |                     return {\r\n203 |                         content: errorMsg,\r\n204 |                         role: 'assistant',\r\n205 |                     };\r\n206 |                 }\r\n207 | \r\n208 |                 if (!llmResponse) {\r\n209 |                     const errorMsg = 'LLM returned null response';\r\n210 |                     this.logger.error(errorMsg);\r\n211 |                     spinner.fail(`Thinking-${i} failed`);\r\n212 | \r\n213 |                    this.sessionManager.addMessage({\r\n214 |                         role: 'assistant',\r\n215 |                         type: 'text',\r\n216 |                         content: errorMsg\r\n217 |                     });\r\n218 | \r\n219 |                     return {\r\n220 |                         content: errorMsg,\r\n221 |                         role: 'assistant',\r\n222 |                     };\r\n223 |                 }\r\n224 |                 spinner.succeed(`Thinking-${i} end`);\r\n225 | \r\n226 |                 // 检查是否有工具调用\r\n227 |                 if (llmResponse.tool_calls && llmResponse.tool_calls.length > 0) {\r\n228 |                     const toolSignature = this.buildToolSignature(llmResponse.tool_calls);\r\n229 |                     if (toolSignature && toolSignature === lastToolSignature) {\r\n230 |                         repeatedToolCalls += 1;\r\n231 |                     } else {\r\n232 |                         repeatedToolCalls = 0;\r\n233 |                         lastToolSignature = toolSignature;\r\n234 |                     }\r\n235 | \r\n236 |                     if (this.noProgressLimit > 0 && repeatedToolCalls >= this.noProgressLimit) {\r\n237 |                         const errorMsg = `Repeated tool_calls detected for ${this.noProgressLimit + 1} iterations, aborting to prevent loop.`;\r\n238 |                         this.logger.error(errorMsg);\r\n239 |                         this.sessionManager.addMessage({\r\n240 |                                 role: 'assistant',\r\n241 |                                 type: 'text',\r\n242 |                                 content: errorMsg\r\n243 |                          });\r\n244 | \r\n245 |                         return {\r\n246 |                             content: errorMsg,\r\n247 |                             role: 'assistant',\r\n248 |                         };\r\n249 |                     }\r\n250 | \r\n251 |                     // 添加 assistant 消息（包含 tool_calls）\r\n252 |                     this.sessionManager.addMessage({\r\n253 |                         role: 'assistant',\r\n254 |                         content: llmResponse.content,\r\n255 |                         type: 'tool_call',\r\n256 |                         tool_calls: llmResponse.tool_calls,\r\n257 |                     });\r\n258 | \r\n259 |                     this.logger.info(`Tool tips: ${llmResponse.content}`);\r\n260 | \r\n261 |                     const toolCalls = llmResponse.tool_calls;\r\n262 |                     const toolConcurrency = Math.min(this.toolConcurrency, toolCalls.length);\r\n263 | \r\n264 |                     const results = await this.runWithConcurrency(toolCalls, toolConcurrency, async (toolCall) => {\r\n265 |                         const { id,function: fn } = toolCall;\r\n266 |                         try {\r\n267 |                             // 解析参数（带容错处理）\r\n268 |                             let args: unknown;\r\n269 |                             try {\r\n270 |                                 args = JSON.parse(fn.arguments);\r\n271 |                             } catch (parseError) {\r\n272 |                                 // JSON 解析失败 - 记录详细信息并返回友好的错误信息\r\n273 |                                 const truncatedArgs = fn.arguments.length > 200\r\n274 |                                     ? fn.arguments.slice(0, 200) + '...'\r\n275 |                                     : fn.arguments;\r\n276 |                                 const parseErrorMsg = parseError instanceof Error ? parseError.message : String(parseError);\r\n277 |                                 const errorMsg = `Invalid JSON in tool parameters: ${parseErrorMsg}\\nReceived: ${truncatedArgs}`;\r\n278 |                                 this.logger.error(errorMsg);\r\n279 |                                 return {\r\n280 |                                     toolCall,\r\n281 |                                     result: `Error: Failed to parse tool arguments. The JSON was malformed. Please try again with properly formatted parameters.`,\r\n282 |                                     error: errorMsg,\r\n283 |                                     id,\r\n284 |                                 };\r\n285 |                             }\r\n286 | \r\n287 |                             const spinner = this.logger.spinner(`Tool ${fn.name}(...)`);\r\n288 |                             // 执行工具\r\n289 |                             let result: string;\r\n290 |                             try {\r\n291 |                                 result = await this.withTimeout(\r\n292 |                                     ToolRegistry.execute(fn.name, args),\r\n293 |                                     this.toolTimeoutMs,\r\n294 |                                     `Tool ${fn.name} timed out after ${this.toolTimeoutMs}ms`\r\n295 |                                 );\r\n296 |                                 spinner.succeed(`Tool ${fn.name} completed`);\r\n297 |                             } catch (error) {\r\n298 |                                 spinner.fail(`Tool ${fn.name} failed`);\r\n299 |                                 throw error;\r\n300 |                             }\r\n301 | \r\n302 |                             if (!options?.silent) {\r\n303 |                                 this.logger.info(`Tool ${fn.name} result: ${formatToolResult(fn.name, result)}`);\r\n304 |                             }\r\n305 | \r\n306 |                             // 返回成功结果\r\n307 |                             return { toolCall, result, error: undefined ,id};\r\n308 |                         } catch (error) {\r\n309 |                             const errorMsg = error instanceof Error ? error.message : String(error);\r\n310 |                             this.logger.error(`Tool execution error: ${errorMsg}`);\r\n311 | \r\n312 |                             // 返回错误结果\r\n313 |                             return { toolCall, result: `Error: ${errorMsg}`, error: errorMsg,id };\r\n314 |                         }\r\n315 |                     });\r\n316 | \r\n317 |                     // 按原始顺序添加工具结果消息\r\n318 |                     for (const { toolCall, result, error: _error } of results) {\r\n319 |                         const { id } = toolCall;\r\n320 | \r\n321 |                         this.sessionManager.addMessage({\r\n322 |                             role: 'tool',\r\n323 |                             content: result,\r\n324 |                             type: 'tool',\r\n325 |                             tool_call_id: id,\r\n326 |                         });\r\n327 |                     }\r\n328 | \r\n329 |                     // 继续循环，让 LLM 基于工具结果生成响应\r\n330 |                     continue;\r\n331 |                 }\r\n332 | \r\n333 |                 // 没有工具调用，这是最终响应\r\n334 |                 this.sessionManager.addMessage({\r\n335 |                     role: 'assistant',\r\n336 |                     type: 'text',\r\n337 |                     content: llmResponse.content,\r\n338 |                 });\r\n339 | \r\n340 |                 finalResponse = {\r\n341 |                     content: llmResponse.content,\r\n342 |                     role: 'assistant',\r\n343 |                 };\r\n344 | \r\n345 |                 break;\r\n346 |             }\r\n347 | \r\n348 |             if (i >= this.maxLoop) {\r\n349 |                 this.logger.error('Max iterations reached, possible infinite loop');\r\n350 |                 this.sessionManager.addMessage({\r\n351 |                         role: 'assistant',\r\n352 |                         type: 'text',\r\n353 |                         content: 'Max iterations reached, possible infinite loop'\r\n354 |                  });\r\n355 | \r\n356 |                 return {\r\n357 |                     content: 'Max iterations reached, possible infinite loop',\r\n358 |                     role: 'assistant',\r\n359 |                 };\r\n360 |             }\r\n361 | \r\n362 |     \r\n363 | \r\n364 |             return finalResponse;\r\n365 | \r\n366 |         } catch (error) {\r\n367 |             const errorMsg = error instanceof Error ? error.message : String(error);\r\n368 |             this.logger.error(`Agent error: ${errorMsg}`);\r\n369 |              this.sessionManager.addMessage({\r\n370 |                         role: 'assistant',\r\n371 |                         type: 'text',\r\n372 |                         content: errorMsg\r\n373 |            });\r\n374 |             return {\r\n375 |                 content: errorMsg,\r\n376 |                 role: 'assistant',\r\n377 |             };\r\n378 |         }\r\n379 |     }\r\n380 | \r\n381 | }\r\n382 | ",
  "type": "tool",
  "tool_call_id": "call_-7958781586376257629"
}
```
```
{
  "role": "tool",
  "content": "--- FILE: src/tool/index.ts ---\nRange: 1 - 132\n\n1 | /**\r\n2 |  * Tool Registry\r\n3 |  *\r\n4 |  * 工具注册中心，负责管理所有可用的工具\r\n5 |  *\r\n6 |  * @example\r\n7 |  * ```ts\r\n8 |  * import { ToolRegistry } from './index';\r\n9 |  *\r\n10 |  * // 获取所有工具\r\n11 |  * const tools = ToolRegistry.getAll();\r\n12 |  *\r\n13 |  * // 根据名称获取工具\r\n14 |  * const bashTool = ToolRegistry.get('bash');\r\n15 |  *\r\n16 |  * // 执行工具\r\n17 |  * const result = await bashTool.execute({ command: 'ls' });\r\n18 |  * ```\r\n19 |  */\r\n20 | \r\n21 | import { ToolRegistry } from './registry';\r\n22 | import BashTool from './bash';\r\n23 | import GlobTool from './glob';\r\n24 | import { ReadFileTool } from './file';\r\n25 | import { WriteFileTool } from './file';\r\n26 | import GrepTool from './grep';\r\n27 | import { SurgicalEditTool } from './surgical';\r\n28 | import { BatchReplaceTool } from './batch-replace';\r\n29 | import { TodoReadTool } from './todo';\n30 | import { TodoWriteTool } from './todo';\n31 | import { initializeMcp } from '../mcp/index';\n32 | import { WebSearchTool } from './web-search';\n33 | import { SkillTool, initializeSkills } from '../skills';\n34 | import TaskTool from './task';\n35 | \r\n36 | // =============================================================================\r\n37 | // Tool Registry\r\n38 | // =============================================================================\r\n39 | \r\n40 | export { ToolRegistry } from './registry';\r\n41 | \r\n42 | // =============================================================================\r\n43 | // Default Tools Registration\r\n44 | // =============================================================================\r\n45 | \r\n46 | /**\r\n47 |  * 初始化并注册所有默认工具\r\n48 |  *\r\n49 |  * 在应用启动时调用此函数\r\n50 |  */\r\n51 | export function registerDefaultTools(): void {\r\n52 | \r\n53 |     ToolRegistry.register([\r\n54 |         new BashTool(),\r\n55 |         new GlobTool(),\r\n56 |         new GrepTool(),\r\n57 |         new ReadFileTool(),\r\n58 |         new WriteFileTool(),\r\n59 |         new SurgicalEditTool(),\r\n60 |         new BatchReplaceTool(),\n61 |         new TodoReadTool(),\n62 |         new TodoWriteTool(),\n63 |         new WebSearchTool(),\n64 |         new SkillTool(),\n65 |         new TaskTool()\n66 |     ]);\n67 | }\n68 | \r\n69 | /**\r\n70 |  * 初始化并注册所有工具（包括 MCP 服务器工具）\r\n71 |  *\r\n72 |  * 在应用启动时调用此函数，异步加载 MCP 服务器\r\n73 |  *\r\n74 |  * @param configPath - MCP 配置文件路径（可选）\r\n75 |  * @returns MCP 管理器实例\r\n76 |  *\r\n77 |  * @example\r\n78 |  * ```ts\r\n79 |  * import { registerDefaultToolsAsync } from './tool';\r\n80 |  *\r\n81 |  * // 使用默认配置路径\r\n82 |  * await registerDefaultToolsAsync();\r\n83 |  *\r\n84 |  * // 或指定配置文件路径\r\n85 |  * await registerDefaultToolsAsync('./my-mcp-config.json');\r\n86 |  * ```\r\n87 |  */\r\n88 | export async function registerDefaultToolsAsync(configPath?: string) {\r\n89 |     // 初始化技能加载器（在注册 SkillTool 之前）\r\n90 |     try {\r\n91 |         await initializeSkills();\r\n92 |     } catch (error) {\r\n93 |         console.warn('[Skills] Failed to initialize skills:', error);\r\n94 |     }\r\n95 | \r\n96 |     // 注册内置工具\r\n97 |     registerDefaultTools();\r\n98 | \r\n99 |     // 初始化 MCP 服务器（如果配置文件存在）\r\n100 |     try {\r\n101 |         const manager = await initializeMcp(configPath);\r\n102 |         const servers = manager.getConnectedServers();\r\n103 |         const totalTools = manager.getTotalToolsCount();\r\n104 | \r\n105 |         if (servers.length > 0) {\r\n106 |             console.log(`[MCP] Loaded ${totalTools} tools from ${servers.length} server(s)`);\r\n107 |         }\r\n108 | \r\n109 |         return manager;\r\n110 |     } catch (error) {\r\n111 |         // MCP 加载失败不应该阻止应用启动\r\n112 |         if (error instanceof Error && !error.message.includes('not found')) {\r\n113 |             console.warn('[MCP] Failed to load MCP servers:', error.message);\r\n114 |         }\r\n115 |         return null;\r\n116 |     }\r\n117 | }\r\n118 | \r\n119 | // =============================================================================\r\n120 | // Exports\r\n121 | // =============================================================================\r\n122 | \r\n123 | export { BaseTool } from './base';\r\n124 | export { default as BashTool } from './bash';\n125 | export { getBashParser } from './bash-parser';\n126 | export type { CommandInfo, SecurityIssue, ParseResult } from './bash-parser';\n127 | export { BatchReplaceTool } from './batch-replace';\n128 | export { default as TaskTool } from './task';\n129 | \n130 | export { initializeSkills, getSkillLoader } from '../skills/loader';\n131 | export type { Skill, SkillMetadata, SkillLoaderOptions } from '../skills/types';\n132 | ",
  "type": "tool",
  "tool_call_id": "call_-7958781586376257628"
}
```
```
{
  "role": "tool",
  "content": "--- FILE: src/skills/index.ts ---\nRange: 1 - 61\n\n1 | /**\r\n2 |  * ============================================================================\r\n3 |  * Skills Module\r\n4 |  * ============================================================================\r\n5 |  *\r\n6 |  * 技能系统模块 - 提供领域知识扩展和专门工作流程\r\n7 |  *\r\n8 |  * @example\r\n9 |  * ```ts\r\n10 |  * import { initializeSkills, getSkillLoader, createSkillTool } from './skills';\r\n11 |  *\r\n12 |  * // 初始化技能系统\r\n13 |  * await initializeSkills({ hotReload: true });\r\n14 |  *\r\n15 |  * // 获取技能加载器\r\n16 |  * const loader = getSkillLoader();\r\n17 |  * const skills = loader.getAllMetadata();\r\n18 |  *\r\n19 |  * // 创建技能工具\r\n20 |  * const skillTool = createSkillTool({ includeDescription: true });\r\n21 |  * ```\r\n22 |  *\r\n23 |  * @module skills\r\n24 |  */\r\n25 | \r\n26 | // Types\r\n27 | export type {\r\n28 |     Skill,\r\n29 |     SkillFile,\r\n30 |     SkillMetadata,\r\n31 |     SkillLoaderOptions,\r\n32 |     SkillFrontmatter\r\n33 | } from './types';\r\n34 | \r\n35 | // Loader\r\n36 | export {\r\n37 |     SkillLoader,\r\n38 |     getSkillLoader,\r\n39 |     initializeSkills\r\n40 | } from './loader';\r\n41 | \r\n42 | // Parser\r\n43 | export {\r\n44 |     parseSkillMarkdown,\r\n45 |     parseSkillMarkdownFull,\r\n46 |     extractFileReferences,\r\n47 |     extractShellCommands,\r\n48 |     formatSkillContent\r\n49 | } from './parser';\r\n50 | \r\n51 | // Tools - 新的 API\r\n52 | export {\r\n53 |     SkillTool,\r\n54 |     createSkillTool,\r\n55 |     defaultSkillTool,\r\n56 |     simpleSkillTool,\r\n57 |     type SkillToolResult\r\n58 | } from './skill-tool';\r\n59 | \r\n60 | \r\n61 | ",
  "type": "tool",
  "tool_call_id": "call_-7958781586376257627"
}
```
```
{
  "role": "tool",
  "content": "--- FILE: src/session-v2/index.ts ---\nRange: 1 - 113\n\n1 | import path from \"node:path\";\n2 | import { LLMProvider, Message } from \"../providers/base\";\n3 | import fs, { mkdir } from 'node:fs/promises';\n4 | import { Compaction } from \"./compaction\";\n5 | \n6 | export class SessionManager {\n7 |   id: string;\n8 |   messageList: Message[];\n9 |   sessionPath: string;\n10 |   private saveQueue: Promise<void> = Promise.resolve();\n11 |   maxOutputTokens: number;\n12 |   maxTokens: number;\n13 |   llmProvider: LLMProvider;\n14 | \n15 |   constructor({\n16 |     sessionId,\n17 |     llmProvider\n18 |   }: {\n19 |     sessionId: string,\n20 |     llmProvider: LLMProvider\n21 |   }) {\n22 |     this.id = sessionId;\n23 |     this.messageList = []\n24 |     this.sessionPath = path.join('.memory', this.id);\n25 |     this.maxOutputTokens = llmProvider.maxOutputTokens;\n26 |     this.maxTokens = llmProvider.maxTokens\n27 |     this.llmProvider = llmProvider;\n28 |   }\n29 | \n30 |   async init() {\n31 |     await mkdir(this.sessionPath, { recursive: true });\n32 |     try {\n33 |       const filePath = path.join(this.sessionPath, 'messages.json');\n34 |       const stats = await fs.stat(filePath);\n35 | \n36 |       if (stats.isFile()) {\n37 |         const content = await fs.readFile(filePath, {\n38 |           encoding: 'utf-8'\n39 |         });\n40 | \n41 |         const messageList = JSON.parse(content.trim());\n42 |         if (messageList.length) {\n43 |           this.messageList = messageList;\n44 |         }\n45 |       }\n46 |     } catch (_:any) {\n47 |       // 文件不存在或其他错误，忽略\n48 |       console.log(\"NOT FOUND HISTORY\")\n49 |     }\n50 |   }\n51 | \n52 |   addMessage(message: Message) {\n53 |     this.messageList.push(message);\n54 |     // Fire-and-forget：加入保存队列，不阻塞调用方\n55 |     this.save(message);\n56 |   }\n57 | \n58 |   async compact() {\n59 |     const compaction = new Compaction({\n60 |       maxOutputTokens: this.maxOutputTokens,\n61 |       maxTokens: this.maxTokens,\n62 |       llmProvider: this.llmProvider\n63 |     });\n64 | \n65 |     const token = compaction.getToken(this.messageList);\n66 |     console.log(`TOKEN: ${token.totalUsed}/${token.usableLimit}\\n`);\n67 |     \n68 |     return await compaction.compact(this.messageList);\n69 |   }\n70 | \n71 |   private save(message: Message) {\n72 |     // 使用 Promise 链确保保存顺序，防止竞态条件\n73 |     this.saveQueue = this.saveQueue.then(async () => {\n74 |       try {\n75 |         await fs.writeFile(\n76 |           path.join(this.sessionPath, 'messages.json'),\n77 |           JSON.stringify(this.messageList, null, 2)\n78 |         );\n79 |         await fs.appendFile(\n80 |           path.join(this.sessionPath, 'cache.md'),\n81 |           `\\`\\`\\`\\n${JSON.stringify(message, null, 2)}\\n\\`\\`\\`\\n`,\n82 |           { flag: 'a' }\n83 |         );\n84 |       } catch (err) {\n85 |         console.error('Session save error:', err);\n86 |       }\n87 |     });\n88 |   }\n89 | \n90 |   async getMessages(): Promise<Message[]> {\n91 |     // if (this.messageList.length < 10) {\n92 |     //   return this.messageList;\n93 |     // }\n94 | \n95 |     const result = await this.compact();\n96 | \n97 |     this.messageList = result.list;\n98 | \n99 |     if (result.isCompacted && result.summaryMessage) {\n100 |       this.save(result.summaryMessage)\n101 |     }\n102 | \n103 |     return this.messageList\n104 |   }\n105 | \n106 |   async clearAll() {\n107 |     this.messageList = [];\n108 |     await fs.writeFile(\n109 |       path.join(this.sessionPath, 'messages.json'),\n110 |       '[]'\n111 |     );\n112 |   }\n113 | }",
  "type": "tool",
  "tool_call_id": "call_-7958781586376257626"
}
```
```
{
  "role": "assistant",
  "content": "",
  "type": "tool_call",
  "tool_calls": [
    {
      "function": {
        "arguments": "{\"filePath\":\"src/cli/index.ts\"}",
        "name": "read_file"
      },
      "id": "call_-7958576974130790694",
      "index": 0,
      "type": "function"
    },
    {
      "function": {
        "arguments": "{\"filePath\":\"src/mcp/index.ts\"}",
        "name": "read_file"
      },
      "id": "call_-7958576974130790693",
      "index": 1,
      "type": "function"
    },
    {
      "function": {
        "arguments": "{\"filePath\":\"src/providers/base.ts\"}",
        "name": "read_file"
      },
      "id": "call_-7958576974130790692",
      "index": 2,
      "type": "function"
    }
  ]
}
```
```
{
  "role": "tool",
  "content": "--- FILE: src/cli/index.ts ---\nRange: 1 - 6\n\n1 | /**\r\n2 |  * CLI 模块导出\r\n3 |  */\r\n4 | export { CLI } from './CLI';\r\n5 | export type { CLIConfig } from './CLI';\r\n6 | ",
  "type": "tool",
  "tool_call_id": "call_-7958576974130790694"
}
```
```
{
  "role": "tool",
  "content": "--- FILE: src/mcp/index.ts ---\nRange: 1 - 42\n\n1 | /**\r\n2 |  * MCP Module\r\n3 |  *\r\n4 |  * Model Context Protocol (MCP) 客户端模块\r\n5 |  * 支持连接第三方 MCP 服务器并使用其工具\r\n6 |  */\r\n7 | \r\n8 | // =============================================================================\r\n9 | // Public API\r\n10 | // =============================================================================\r\n11 | \r\n12 | export * from './types';\r\n13 | export * from './client';\r\n14 | export * from './tool-adapter';\r\n15 | export * from './manager';\r\n16 | export * from './config-loader';\r\n17 | export * from './json-schema-to-zod';\r\n18 | \r\n19 | // =============================================================================\r\n20 | // Convenience Exports\r\n21 | // =============================================================================\r\n22 | \r\n23 | export { initializeMcp, getMcpManager } from './manager';\r\n24 | export { loadMcpConfig, findConfigFile } from './config-loader';\r\n25 | export { McpClient, ConnectionState } from './client';\r\n26 | export { McpToolAdapter, createToolAdapters } from './tool-adapter';\r\n27 | export { jsonSchemaToZod } from './json-schema-to-zod';\r\n28 | \r\n29 | // =============================================================================\r\n30 | // Types\r\n31 | // =============================================================================\r\n32 | \r\n33 | export type {\r\n34 |   McpServerConfig,\r\n35 |   McpConnectionInfo,\r\n36 |   Tool,\r\n37 |   ToolCallRequest,\r\n38 |   ToolCallResponse,\r\n39 | } from './types';\r\n40 | \r\n41 | export type { McpConfigFile as ConfigFile } from './config-loader';\r\n42 | ",
  "type": "tool",
  "tool_call_id": "call_-7958576974130790693"
}
```
```
{
  "role": "tool",
  "content": "--- FILE: src/providers/base.ts ---\nRange: 1 - 77\n\n1 | export interface ProviderConfig {\r\n2 |   /** API key or credentials */\r\n3 |   apiKey?: string\r\n4 |   /** Base URL for API */\r\n5 |   baseURL?: string\r\n6 |   /** Model name */\r\n7 |   model?: string\r\n8 |   /** Additional options */\r\n9 |   [key: string]: unknown\r\n10 | }\r\n11 | export interface ToolSchema {\r\n12 |   type: 'function';\r\n13 |   function: {\r\n14 |     name: string;\r\n15 |     description: string;\r\n16 |     strict?: boolean;\r\n17 |     parameters: Record<string, unknown>;\r\n18 |   };\r\n19 | }\r\n20 | \r\n21 | export interface LLMOptions {\r\n22 |   model?: string\r\n23 |   max_tokens?: number\r\n24 |   temperature?: number,\r\n25 |   system_prompt?: string\r\n26 |   tools?: ToolSchema[]\r\n27 | }\r\n28 | export type Message = {\r\n29 |   role: 'user' | 'system' | 'assistant' | 'tool';\r\n30 |   content: string;\r\n31 |   type?: 'text' | 'tool' | 'tool_call'| 'summary';\r\n32 |   /** Tool call ID (required for tool response messages) */\r\n33 |   tool_call_id?: string;\r\n34 |   /** Tool calls (for assistant messages that request tool execution) */\r\n35 |   tool_calls?: Array<{\r\n36 |     id: string;\r\n37 |     type: 'function';\r\n38 |     function: {\r\n39 |       name: string;\r\n40 |       arguments: string;\r\n41 |     };\r\n42 |   }>;\r\n43 | }\r\n44 | \r\n45 | export type LLMResponse = {\r\n46 |   content: string;\r\n47 |   role:'assistant';\r\n48 |   type?: 'text' | 'tool' | 'tool_call';\r\n49 |   tool_calls?: {\r\n50 |     id: string;\r\n51 |     type: 'function';\r\n52 |     function: {\r\n53 |       name: string;\r\n54 |       arguments: string;\r\n55 |     };\r\n56 |   }[];\r\n57 |   usage: {\r\n58 |     prompt_tokens: number;\r\n59 |     completion_tokens: number;\r\n60 |     total_tokens: number;\r\n61 |   };\r\n62 | }\r\n63 | export abstract class LLMProvider{\r\n64 |    protected constructor(\r\n65 |     protected readonly config: ProviderConfig\r\n66 |   ) {}\r\n67 |   \r\n68 |   abstract maxOutputTokens:number;\r\n69 |   abstract maxTokens:number;\r\n70 |   /**\r\n71 |    * 从提供商生成响应\r\n72 |    * @param prompt The input prompt for the model\r\n73 |    * @returns A promise that resolves to the model's response\r\n74 |    */\r\n75 |   abstract generate(messages: Message[], options?: LLMOptions): Promise<LLMResponse|null>\r\n76 | }\r\n77 | ",
  "type": "tool",
  "tool_call_id": "call_-7958576974130790692"
}
```
```
{
  "role": "assistant",
  "content": "",
  "type": "tool_call",
  "tool_calls": [
    {
      "function": {
        "arguments": "{\"filePath\":\"src/storage/models/message.ts\"}",
        "name": "read_file"
      },
      "id": "call_-7958515779435460481",
      "index": 0,
      "type": "function"
    },
    {
      "function": {
        "arguments": "{\"filePath\":\"src/storage/models/session.ts\"}",
        "name": "read_file"
      },
      "id": "call_-7958515779435460480",
      "index": 1,
      "type": "function"
    }
  ]
}
```
```
{
  "role": "tool",
  "content": "--- FILE: src/storage/models/message.ts ---\nRange: 1 - 53\n\n1 | /**\r\n2 |  * Message 数据库模型\r\n3 |  */\r\n4 | import mongoose from 'mongoose';\r\n5 | \r\n6 | const messageSchema = new mongoose.Schema({\r\n7 |     sessionId: {\r\n8 |         type: String,\r\n9 |         required: true,\r\n10 |         index: true,\r\n11 |     },\r\n12 |     userId: {\r\n13 |         type: String,\r\n14 |         required: true,\r\n15 |         index: true,\r\n16 |     },\r\n17 |     content: {\r\n18 |         type: String,\r\n19 |     },\r\n20 |     role: {\r\n21 |         type: String,\r\n22 |         enum: ['user', 'system', 'assistant', 'tool'],\r\n23 |         required: true,\r\n24 |     },\r\n25 |     type: {\r\n26 |         type: String,\r\n27 |         enum: ['text', 'tool', 'tool_call','summary'],\r\n28 |         default: 'text',\r\n29 |     },\r\n30 |     /** Tool call ID (required for tool response messages) */\r\n31 |     toolCallId: {\r\n32 |         type: String,\r\n33 |         required: false,\r\n34 |     },\r\n35 |     /** Tool calls (serialized as JSON string) */\r\n36 |     toolCalls: {\r\n37 |         type: String,\r\n38 |         required: false,\r\n39 |     },\r\n40 |     createdAt: {\r\n41 |         type: Date,\r\n42 |         default: Date.now,\r\n43 |         index: true,\r\n44 |     },\r\n45 | }, {\r\n46 |     timestamps: true,\r\n47 | });\r\n48 | \r\n49 | // 复合索引优化查询\r\n50 | messageSchema.index({ sessionId: 1, createdAt: 1 });\r\n51 | \r\n52 | export const MessageData = mongoose.model('Message', messageSchema);\r\n53 | ",
  "type": "tool",
  "tool_call_id": "call_-7958515779435460481"
}
```
```
{
  "role": "tool",
  "content": "--- FILE: src/storage/models/session.ts ---\nRange: 1 - 23\n\n1 | /**\r\n2 |  * Session 数据库模型\r\n3 |  */\r\n4 | import mongoose from 'mongoose';\r\n5 | \r\n6 | const sessionSchema = new mongoose.Schema({\r\n7 |     sessionId: {\r\n8 |         type: String,\r\n9 |         required: true,\r\n10 |         unique: true,\r\n11 |         index: true,\r\n12 |     },\r\n13 |     userId: {\r\n14 |         type: String,\r\n15 |         required: true,\r\n16 |         index: true,\r\n17 |     },\r\n18 | }, {\r\n19 |     timestamps: true,\r\n20 | });\r\n21 | \r\n22 | export const SessionModel = mongoose.model('Session', sessionSchema);\r\n23 | ",
  "type": "tool",
  "tool_call_id": "call_-7958515779435460480"
}
```
```
{
  "role": "assistant",
  "content": "",
  "type": "tool_call",
  "tool_calls": [
    {
      "function": {
        "arguments": "{\"pattern\":\"skills/**/*\"}",
        "name": "glob"
      },
      "id": "call_-7958618755573419904",
      "index": 0,
      "type": "function"
    }
  ]
}
```
```
{
  "role": "tool",
  "content": "skills/planning-with-files/examples.md\nskills/planning-with-files/reference.md\nskills/planning-with-files/SKILL.md\nskills/ui-ux-pro-max/SKILL.md\nskills/git-commit/SKILL.md\nskills/planning-with-files/scripts/check-complete.ps1\nskills/planning-with-files/scripts/check-complete.sh\nskills/planning-with-files/scripts/init-session.ps1\nskills/planning-with-files/scripts/init-session.sh\nskills/planning-with-files/scripts/session-catchup.py\nskills/planning-with-files/templates/findings.md\nskills/planning-with-files/templates/progress.md\nskills/planning-with-files/templates/task_plan.md\nskills/ui-ux-pro-max/scripts/core.py\nskills/ui-ux-pro-max/scripts/design_system.py\nskills/ui-ux-pro-max/scripts/search.py\nskills/ui-ux-pro-max/data/charts.csv\nskills/ui-ux-pro-max/data/colors.csv\nskills/ui-ux-pro-max/data/icons.csv\nskills/ui-ux-pro-max/data/landing.csv\nskills/ui-ux-pro-max/data/products.csv\nskills/ui-ux-pro-max/data/prompts.csv\nskills/ui-ux-pro-max/data/react-performance.csv\nskills/ui-ux-pro-max/data/styles.csv\nskills/ui-ux-pro-max/data/typography.csv\nskills/ui-ux-pro-max/data/ui-reasoning.csv\nskills/ui-ux-pro-max/data/ux-guidelines.csv\nskills/ui-ux-pro-max/data/web-interface.csv\nskills/ui-ux-pro-max/scripts/__pycache__/core.cpython-313.pyc\nskills/ui-ux-pro-max/scripts/__pycache__/design_system.cpython-313.pyc\nskills/ui-ux-pro-max/data/stacks/flutter.csv\nskills/ui-ux-pro-max/data/stacks/html-tailwind.csv\nskills/ui-ux-pro-max/data/stacks/jetpack-compose.csv\nskills/ui-ux-pro-max/data/stacks/nextjs.csv\nskills/ui-ux-pro-max/data/stacks/nuxt-ui.csv\nskills/ui-ux-pro-max/data/stacks/nuxtjs.csv\nskills/ui-ux-pro-max/data/stacks/react-native.csv\nskills/ui-ux-pro-max/data/stacks/react.csv\nskills/ui-ux-pro-max/data/stacks/shadcn.csv\nskills/ui-ux-pro-max/data/stacks/svelte.csv\nskills/ui-ux-pro-max/data/stacks/swiftui.csv\nskills/ui-ux-pro-max/data/stacks/vue.csv",
  "type": "tool",
  "tool_call_id": "call_-7958618755573419904"
}
```
```
{
  "role": "assistant",
  "type": "text",
  "content": "---\n\n## 项目结构分析总结\n\n### 目录树结构\n\n```\nai-agent-v2/\n├── .gitignore\n├── .mcp.json                 # MCP 配置文件\n├── .mcp.json.example\n├── .env.development          # 开发环境配置\n├── .npmrc\n├── CLAUDE.md                 # Claude Code 指导文档\n├── customPrompt.md           # 动态生成的提示词\n├── env.example\n├── eslint.config.js\n├── ESLINT_SETUP.md\n├── package.json\n├── pnpm-lock.yaml\n├── test.js\n├── tsconfig.json\n├── vitest.config.ts\n│\n├── dist/                     # 编译输出目录（构建生成）\n│\n├── docs/                     # 文档目录\n│   ├── compaction-analysis.md\n│   ├── CROSS_PLATFORM.md\n│   ├── PROJECT_ANALYSIS.md\n│   └── PROMPTS.md\n│\n├── skills/                   # 技能系统目录\n│   ├── git-commit/\n│   │   └── SKILL.md\n│   ├── planning-with-files/\n│   │   ├── SKILL.md\n│   │   ├── examples.md\n│   │   ├── reference.md\n│   │   ├── templates/\n│   │   │   ├── findings.md\n│   │   │   ├── progress.md\n│   │   │   └── task_plan.md\n│   │   └── scripts/\n│   │       ├── check-complete.ps1\n│   │       ├── check-complete.sh\n│   │       ├── init-session.ps1\n│   │       ├── init-session.sh\n│   │       └── session-catchup.py\n│   └── ui-ux-pro-max/\n│       ├── SKILL.md\n│       ├── data/            # UI/UX 数据文件（18个CSV）\n│       │   ├── charts.csv\n│       │   ├── colors.csv\n│       │   ├── icons.csv\n│       │   ├── landing.csv\n│       │   ├── products.csv\n│       │   ├── prompts.csv\n│       │   ├── react-performance.csv\n│       │   ├── styles.csv\n│       │   ├── typography.csv\n│       │   ├── ui-reasoning.csv\n│       │   ├── ux-guidelines.csv\n│       │   ├── web-interface.csv\n│       │   └── stacks/      # 技术栈数据（10个CSV）\n│       └── scripts/         # Python 脚本\n│           ├── core.py\n│           ├── design_system.py\n│           └── search.py\n│\n├── src/                      # 源代码根目录\n│   ├── index.ts              # 主入口文件 (1-125)\n│   ├── codeCompressor.ts     # 代码压缩工具\n│   │\n│   ├── agent/                # Agent 模块\n│   │   ├── index.ts          # 旧版 Agent (1-382)\n│   │   ├── index-eventbus.ts # EventBus 集成版 Agent\n│   │   ├── export.ts\n│   │   └── hooks/            # Agent 钩子系统\n│   │       ├── README.md\n│   │       ├── index.ts\n│   │       ├── examples.ts\n│   │       └── integration-example.ts\n│   │\n│   ├── cli/                  # CLI 模块\n│   │   ├── index.ts          # 导出文件\n│   │   ├── CLI.ts            # CLI 主类\n│   │   ├── commands/         # 命令处理器\n│   │   │   ├── index.ts\n│   │   │   ├── clear.ts\n│   │   │   ├── exit.ts\n│   │   │   ├── help.ts\n│   │   │   ├── history.ts\n│   │   │   ├── session.ts\n│   │   │   └── types.ts\n│   │   └── utils/            # CLI 工具\n│   │       ├── index.ts\n│   │       ├── format.ts\n│   │       ├── input.ts\n│   │       ├── reader.ts\n│   │       └── smart-input.ts\n│   │\n│   ├── examples/             # 示例代码\n│   │   └── log-demo.ts\n│   │\n│   ├── mcp/                  # MCP 客户端模块\n│   │   ├── README.md\n│   │   ├── client.ts\n│   │   ├── config-loader.ts\n│   │   ├── index.ts\n│   │   ├── json-schema-to-zod.ts\n│   │   ├── manager.ts\n│   │   ├── tool-adapter.ts\n│   │   └── types.ts\n│   │\n│   ├── prompts/              # 提示词模块\n│   │   ├── operator.ts       # 操作员提示词\n│   │   └── system.ts         # 系统提示词\n│   │\n│   ├── providers/             # LLM 提供商\n│   │   ├── base.ts           # 基类定义 (1-77)\n│   │   └── openai.ts         # OpenAI 兼容实现\n│   │\n│   ├── session-v2/            # 会话管理模块\n│   │   ├── index.ts          # SessionManager (1-113)\n│   │   └── compaction.ts     # 消息压缩\n│   │\n│   ├── skills/                # 技能系统\n│   │   ├── index.ts          # 导出文件 (1-61)\n│   │   ├── loader.ts\n│   │   ├── parser.ts\n│   │   ├── skill-tool.ts\n│   │   └── types.ts\n│   │\n│   ├── storage/               # 存储模块\n│   │   ├── memory.ts         # 内存存储\n│   │   ├── mongoose.ts       # MongoDB 连接\n│   │   └── models/\n│   │       ├── message.ts    # Message 模型 (1-53)\n│   │       └── session.ts    # Session 模型 (1-23)\n│   │\n│   ├── tool/                  # 工具系统\n│   │   ├── index.ts          # 注册中心 (1-132)\n│   │   ├── base.ts\n│   │   ├── registry.ts\n│   │   ├── bash.ts\n│   │   ├── bash-parser.ts\n│   │   ├── bash.test.ts\n│   │   ├── batch-replace.ts\n│   │   ├── file.ts\n│   │   ├── glob.ts\n│   │   ├── grep.ts\n│   │   ├── index.test.ts\n│   │   ├── rollback.ts\n│   │   ├── surgical.ts\n│   │   ├── task.ts\n│   │   ├── todo.ts\n│   │   ├── todowrite.ts\n│   │   └── web-search.ts\n│   │\n│   └── util/                  # 工具模块\n│       ├── backup-manager.ts\n│       ├── event-bus-agent.ts\n│       ├── event-bus-session-integration.ts\n│       ├── event-bus.test.ts\n│       ├── event-bus-README.md\n│       ├── event-bus.ts\n│       ├── log-format.ts\n│       ├── log.ts\n│       └── platform-cmd.ts\n│\n└── .memory/                  # 会话数据目录（运行时生成）\n```\n\n### 关键统计\n\n- **源代码文件**: 62 个 `.ts` 文件\n- **配置文件**: 2 个 (`package.json`, `tsconfig.json`)\n- **技能定义**: 3 个技能 (git-commit, planning-with-files, ui-ux-pro-max)\n- **数据文件**: 28 个 CSV 数据文件 (ui-ux-pro-max)\n- **脚本文件**: 6 个 Shell/Python 脚本\n- **文档文件**: 12 个 Markdown 文件\n\n### 架构概览\n\n**模块分层**:\n1. **CLI Layer** (`src/cli/`) - 交互式命令行，readline 历史支持\n2. **Agent** (`src/agent/`) - 编排 LLM 调用和会话管理\n3. **Tools** (`src/tool/`) - 13+ 内置工具 + MCP 集成 + Skills\n4. **Providers** (`src/providers/`) - LLM 提供商抽象\n5. **Storage** (`src/storage/`) - MongoDB 持久化 + 内存存储\n6. **Session** (`src/session-v2/`) - 会话管理 + 消息压缩\n\n**入口文件**: `src/index.ts` (package.json:8 - `main: \"index.js\"`)\n\n**环境变量**: 需要 `DEEPSEEK_API_KEY` 和 `DEEPSEEK_BASE_URL`\n\n**构建输出**: `dist/` 目录 (tsconfig.json:13)\n\n### 依赖分析\n\n**运行时依赖** (package.json:43-62):\n- `@tavily/core` - Web 搜索\n- `chalk`, `ora` - CLI 美化\n- `dockerode` - Docker 集成\n- `execa` - 进程执行\n- `fast-glob` - 文件模式匹配\n- `mongoose` - MongoDB\n- `prompts` - 交互式输入\n- `tree-sitter` - 代码解析\n- `zod` - Schema 验证\n- `@mcpc-tech/ripgrep-napi` - 快速搜索\n\n**开发依赖**: TypeScript, ESLint, Vitest, tsx\n\n### 工具清单\n\n**内置工具** (src/tool/index.ts:51-66):\n- `bash` - Shell 命令执行\n- `glob` - 文件模式匹配\n- `grep` - 代码搜索\n- `read_file`, `write_file` - 文件读写\n- `surgical_edit`, `batch_replace` - 代码编辑\n- `todo`, `todowrite` - 任务管理\n- `web_search` - 网络搜索\n- `skill` - 技能系统\n- `task` - 任务工具\n\n**MCP 集成**: 支持第三方 MCP 服务器工具\n\n**Skills**: `git-commit`, `planning-with-files`, `ui-ux-pro-max`"
}
```
