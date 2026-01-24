```
{
  "role": "user",
  "type": "text",
  "content": "Task: Explore codebase\n\nWork autonomously using the allowed tools.\n\nDo not ask follow-up questions.\n\nReturn a concise summary with findings and file:line references.\n\nWhat is the structure of the current directory? List all main directories and important files."
}
```
```
{
  "content": "I'll explore the codebase structure for you. Let me start by examining the root directory and its contents.",
  "role": "assistant",
  "type": "text",
  "tool_calls": [
    {
      "function": {
        "arguments": "{\"pattern\":\"*\"}",
        "name": "glob"
      },
      "id": "call_-7948041110089474025",
      "index": 0,
      "type": "function"
    },
    {
      "function": {
        "arguments": "{\"pattern\":\".*\"}",
        "name": "glob"
      },
      "id": "call_-7948041110089474024",
      "index": 1,
      "type": "function"
    }
  ],
  "usage": {
    "prompt_tokens": 1071,
    "completion_tokens": 113,
    "total_tokens": 1184
  }
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "agent-scheduler-architecture-continued.md\nagent-scheduler-architecture.md\nclaude-code-multi-agent-analysis.md\nCLAUDE.md\nCompaction深度分析.md\ncustomPrompt.md\nenv.example\neslint.config.js\nESLINT_SETUP.md\nexecution-strategies-deep-dive.md\nhybrid-multi-agent-architecture.md\nmulti-agent-call-chain.md\nmulti-agent-implementation.md\nopenai-request.json\npackage-lock.json\npackage.json\nPERFORMANCE_ANALYSIS_REPORT.md\nPERFORMANCE_OPTIMIZATION_REPORT.md\npnpm-lock.yaml\nSANDBOX_CONFIG.md\ntest.js\ntsconfig.json\nvitest.config.ts",
  "tool_call_id": "call_-7948041110089474025"
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": ".env.development\n.gitignore\n.mcp.json\n.mcp.json.example\n.npmrc",
  "tool_call_id": "call_-7948041110089474024"
}
```
```
{
  "content": "",
  "role": "assistant",
  "type": "text",
  "tool_calls": [
    {
      "function": {
        "arguments": "{\"pattern\":\"*/\"}",
        "name": "glob"
      },
      "id": "call_-7948050799537612106",
      "index": 0,
      "type": "function"
    },
    {
      "function": {
        "arguments": "{\"filePath\":\"package.json\"}",
        "name": "read_file"
      },
      "id": "call_-7948050799537612105",
      "index": 1,
      "type": "function"
    }
  ],
  "usage": {
    "prompt_tokens": 1267,
    "completion_tokens": 40,
    "total_tokens": 1307
  }
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "No files found matching pattern: */ in .",
  "tool_call_id": "call_-7948050799537612106"
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "--- FILE: package.json ---\nRange: 1 - 62\n\n1 | {\r\n2 |   \"name\": \"ai-agent-v2\",\r\n3 |   \"version\": \"1.0.0\",\r\n4 |   \"description\": \"\",\r\n5 |   \"license\": \"ISC\",\r\n6 |   \"author\": \"\",\r\n7 |   \"type\": \"commonjs\",\r\n8 |   \"main\": \"index.js\",\r\n9 |   \"bin\": {\r\n10 |     \"@qps\": \"bin/index.js\"\r\n11 |   },\r\n12 |   \"files\": [\r\n13 |     \"dist\"\r\n14 |   ],\r\n15 |   \"scripts\": {\r\n16 |     \"typecheck\": \"tsc --noEmit\",\r\n17 |     \"lint\": \"eslint . --ext .ts,.js\",\r\n18 |     \"lint:fix\": \"eslint . --ext .ts,.js --fix\",\r\n19 |     \"lint:strict\": \"eslint . --ext .ts,.js --max-warnings 0\",\r\n20 |     \"build\": \"cross-env NODE_ENV=production  tsc\",\r\n21 |     \"dev\": \"cross-env NODE_ENV=development  tsx src/index.ts\",\r\n22 |     \"dev:demo\": \"cross-env NODE_ENV=development  tsx src/index.ts demo\",\r\n23 |     \"dev:cli\": \"cross-env NODE_ENV=development  tsx src/index.ts cli\",\r\n24 |     \"test\": \"vitest run src/tool/grep.test.ts\",\r\n25 |     \"codeCompressor\": \"cross-env NODE_ENV=development  tsx src/codeCompressor.ts\",\r\n26 |     \"test:ui\": \"vitest --ui\",\r\n27 |     \"langfuse:demo\": \"cross-env NODE_ENV=development tsx src/examples/langfuse-demo.ts\"\r\n28 |   },\r\n29 |   \"devDependencies\": {\r\n30 |     \"@eslint/js\": \"^9.39.2\",\r\n31 |     \"@types/node\": \"^22.19.3\",\r\n32 |     \"@types/prompts\": \"^2.4.9\",\r\n33 |     \"@typescript-eslint/eslint-plugin\": \"^8.39.0\",\r\n34 |     \"@typescript-eslint/parser\": \"^8.39.0\",\r\n35 |     \"cross-env\": \"^10.1.0\",\r\n36 |     \"typescript\": \"^5.9.3\",\r\n37 |     \"typescript-eslint\": \"^8.53.0\",\r\n38 |     \"vitest\": \"^3.2.4\"\r\n39 |   },\r\n40 |   \"dependencies\": {\r\n41 |     \"@tavily/core\": \"^0.7.1\",\r\n42 |     \"@vscode/ripgrep\": \"^1.17.0\",\r\n43 |     \"chalk\": \"^5.6.2\",\r\n44 |     \"dockerode\": \"^4.0.9\",\r\n45 |     \"dotenv\": \"^17.2.3\",\r\n46 |     \"execa\": \"^8.0.1\",\r\n47 |     \"fast-glob\": \"^3.3.3\",\r\n48 |     \"gray-matter\": \"^4.0.3\",\r\n49 |     \"iconv-lite\": \"^0.7.2\",\r\n50 |     \"isbinaryfile\": \"^6.0.0\",\r\n51 |     \"json5\": \"^2.2.3\",\r\n52 |     \"langfuse\": \"^3.38.6\",\r\n53 |     \"mongoose\": \"^9.1.3\",\r\n54 |     \"ora\": \"^9.0.0\",\r\n55 |     \"tree-sitter\": \"^0.22.0\",\r\n56 |     \"tree-sitter-bash\": \"^0.23.1\",\r\n57 |     \"tree-sitter-typescript\": \"^0.23.2\",\r\n58 |     \"tsx\": \"^4.21.0\",\r\n59 |     \"zod\": \"^3.24.1\"\r\n60 |   }\r\n61 | }\r\n62 | ",
  "tool_call_id": "call_-7948050799537612105"
}
```
```
{
  "content": "",
  "role": "assistant",
  "type": "text",
  "tool_calls": [
    {
      "function": {
        "arguments": "{\"pattern\":\"src/**\"}",
        "name": "glob"
      },
      "id": "call_-7948050043623325287",
      "index": 0,
      "type": "function"
    },
    {
      "function": {
        "arguments": "{\"pattern\":\"bin/**\"}",
        "name": "glob"
      },
      "id": "call_-7948050043623325286",
      "index": 1,
      "type": "function"
    }
  ],
  "usage": {
    "prompt_tokens": 2114,
    "completion_tokens": 58,
    "total_tokens": 2172
  }
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "src/codeCompressor.ts\nsrc/index.ts\nsrc/agent/export.ts\nsrc/agent/generate.txt\nsrc/agent/index-eventbus.ts\nsrc/agent/index.ts\nsrc/agent/manager.ts\nsrc/cli/CLI.ts\nsrc/cli/index.ts\nsrc/examples/langfuse-demo.ts\nsrc/examples/log-demo.ts\nsrc/mcp/client.ts\nsrc/mcp/config-loader.ts\nsrc/mcp/index.ts\nsrc/mcp/json-schema-to-zod.ts\nsrc/mcp/manager.ts\nsrc/mcp/README.md\nsrc/mcp/tool-adapter.ts\nsrc/mcp/types.ts\nsrc/observability/langfuse.ts\nsrc/prompts/operator.ts\nsrc/prompts/system.ts\nsrc/sandbox/base.ts\nsrc/sandbox/docker-executor.ts\nsrc/sandbox/index.ts\nsrc/sandbox/types.ts\nsrc/providers/base.ts\nsrc/providers/openai.ts\nsrc/session-v2/compaction.edge-cases.test.ts\nsrc/session-v2/compaction.multi-tools.test.ts\nsrc/session-v2/compaction.test.ts\nsrc/session-v2/compaction.ts\nsrc/session-v2/index.ts\nsrc/skills/index.ts\nsrc/skills/loader.ts\nsrc/skills/parser.ts\nsrc/skills/skill-tool.ts\nsrc/skills/types.ts\nsrc/storage/memory.ts\nsrc/storage/mongoose.ts\nsrc/util/backup-manager.ts\nsrc/util/event-bus-agent.ts\nsrc/util/event-bus-README.md\nsrc/util/event-bus-session-integration.ts\nsrc/util/event-bus.test.ts\nsrc/util/event-bus.ts\nsrc/util/log-format.ts\nsrc/util/log.ts\nsrc/util/platform-cmd.ts\nsrc/tool/base.ts\nsrc/tool/bash copy.ts\nsrc/tool/bash-parser.ts\nsrc/tool/bash.test.ts\nsrc/tool/bash.ts\nsrc/tool/batch-replace.ts\nsrc/tool/complete-task.ts\nsrc/tool/explore.ts\nsrc/tool/file.ts\nsrc/tool/glob.ts\nsrc/tool/grep.test.ts\nsrc/tool/grep.ts\nsrc/tool/index.test.ts\nsrc/tool/index.ts\nsrc/tool/registry.ts\nsrc/tool/rollback.ts\nsrc/tool/subagent.ts\nsrc/tool/surgical.ts\nsrc/tool/task.ts\nsrc/tool/todo.ts\nsrc/tool/todowrite.ts\nsrc/tool/web-search.ts\nsrc/agent/hooks/examples.ts\nsrc/agent/hooks/index.ts\nsrc/agent/hooks/integration-example.ts\nsrc/agent/hooks/README.md\nsrc/agent/prompt/compaction.txt\nsrc/agent/prompt/explore.txt\nsrc/agent/prompt/summary.txt\nsrc/agent/prompt/title.txt\nsrc/cli/commands/clear.ts\nsrc/cli/commands/exit.ts\nsrc/cli/commands/help.ts\nsrc/cli/commands/history.ts\nsrc/cli/commands/index.ts\nsrc/cli/commands/session.ts\nsrc/cli/commands/types.ts\nsrc/cli/utils/format.ts\nsrc/cli/utils/index.ts\nsrc/cli/utils/input.ts\nsrc/cli/utils/reader.ts\nsrc/cli/utils/smart-input.ts\nsrc/storage/models/message.ts\nsrc/storage/models/session.ts",
  "tool_call_id": "call_-7948050043623325287"
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "bin/index.js",
  "tool_call_id": "call_-7948050043623325286"
}
```
```
{
  "content": "",
  "role": "assistant",
  "type": "text",
  "tool_calls": [
    {
      "function": {
        "arguments": "{\"filePath\":\"tsconfig.json\"}",
        "name": "read_file"
      },
      "id": "call_-7948036093566863542",
      "index": 0,
      "type": "function"
    },
    {
      "function": {
        "arguments": "{\"filePath\":\"README.md\"}",
        "name": "read_file"
      },
      "id": "call_-7948036093566863541",
      "index": 1,
      "type": "function"
    },
    {
      "function": {
        "arguments": "{\"filePath\":\"CLAUDE.md\"}",
        "name": "read_file"
      },
      "id": "call_-7948036093566863540",
      "index": 2,
      "type": "function"
    }
  ],
  "usage": {
    "prompt_tokens": 2781,
    "completion_tokens": 68,
    "total_tokens": 2849
  }
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "--- FILE: tsconfig.json ---\nRange: 1 - 25\n\n1 | {\r\n2 |   \"exclude\": [\"dist\", \"__tests__\", \"node_modules\"],\r\n3 |   \"compilerOptions\": {\r\n4 |     \"lib\": [\"ESNext\"],\r\n5 |     \"module\": \"CommonJS\",\r\n6 |     \"types\": [\"node\"],\r\n7 |     \"resolveJsonModule\": true,\r\n8 |     \"allowSyntheticDefaultImports\": true,\r\n9 |     \"strict\": true,\r\n10 |     \"strictNullChecks\": true,\r\n11 |     \"skipLibCheck\": true,\r\n12 |     \"declaration\": true,\r\n13 |     \"outDir\": \"./dist\",\r\n14 |     \"rootDir\": \"./src\",\r\n15 |     \"target\": \"ESNext\",\r\n16 |     \"esModuleInterop\": true\r\n17 |   },\r\n18 |   \"include\": [\r\n19 |     \"./src/**/*\",\r\n20 |     \"./typings\",\r\n21 |     \"./typing.d.ts\",\r\n22 |     \"src/tools/todowrite.ts\"\r\n23 | , \"test-model.js\"  ]\r\n24 | }\r\n25 | ",
  "tool_call_id": "call_-7948036093566863542"
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "Error: File not found.",
  "tool_call_id": "call_-7948036093566863541"
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "--- FILE: CLAUDE.md ---\nRange: 1 - 101\n\n1 | # CLAUDE.md\r\n2 | \r\n3 | This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.\r\n4 | \r\n5 | ## Development Commands\r\n6 | \r\n7 | | Command | Description |\r\n8 | |---------|-------------|\r\n9 | | `pnpm typecheck` | Type check without emitting files |\r\n10 | | `pnpm build` | Build for production (outputs to `dist/`) |\r\n11 | | `pnpm dev` | Run CLI interactive mode |\r\n12 | | `pnpm dev:demo` | Run demo mode (non-interactive) |\r\n13 | | `pnpm dev:cli [sessionId]` | Run CLI with optional session ID |\r\n14 | \r\n15 | ## Environment Configuration\r\n16 | \r\n17 | The app uses environment-specific `.env` files loaded by dotenv:\r\n18 | - `.env.development` - Development environment\r\n19 | - `.env.production` - Production environment\r\n20 | \r\n21 | Required environment variables:\r\n22 | - `DEEPSEEK_API_KEY` - API key for LLM provider\r\n23 | - `DEEPSEEK_BASE_URL` - Base URL for LLM API\r\n24 | \r\n25 | ## Architecture Overview\r\n26 | \r\n27 | This is a multi-session AI agent built with **Domain-Driven Design (DDD)** and **Repository Pattern**.\r\n28 | \r\n29 | ```\r\n30 | ┌─────────────────────────────────────────────────────────────┐\r\n31 | │                         CLI Layer                           │\r\n32 | │  (src/cli/) - Interactive commands, readline with history   │\r\n33 | └─────────────────────────────────────────────────────────────┘\r\n34 |                               │\r\n35 | ┌─────────────────────────────────────────────────────────────┐\r\n36 | │                         Agent                               │\r\n37 | │  (src/agent/) - Orchestrates LLM calls and sessions         │\r\n38 | └─────────────────────────────────────────────────────────────┘\r\n39 |                               │\r\n40 |          ┌────────────────────┼────────────────────┐\r\n41 |          │                    │                    │\r\n42 | ┌────────▼─────────┐  ┌───────▼────────┐  ┌───────▼─────────┐\r\n43 | │   Domain Layer   │  │ Application   │  │ Infrastructure  │\r\n44 | │ (src/domain/)    │  │ (src/app/)    │  │ (src/infra/)    │\r\n45 | │ - Session        │  │ SessionMgr    │  │ MessageRepo     │\r\n46 | │ - MessageQueue   │  │               │  │                 │\r\n47 | └──────────────────┘  └───────────────┘  └─────────────────┘\r\n48 | ```\r\n49 | \r\n50 | ### Key Architectural Patterns\r\n51 | \r\n52 | **Lazy-Loading History**: `SessionManager.getMessages()` automatically loads from DB if memory queue is empty. This enables seamless session restoration without explicit load calls.\r\n53 | \r\n54 | **Command Pattern**: CLI commands are modular handlers in `src/cli/commands/`. To add a new command:\r\n55 | 1. Create handler in `commands/` implementing `CommandHandler` interface\r\n56 | 2. Register in `commands/index.ts` registry\r\n57 | 3. No changes needed to main CLI class\r\n58 | \r\n59 | **Mutable Context**: Commands receive `CommandContext` with wrapped values (`{ value: string }`) to allow mutations (sessionId changes, exit flag).\r\n60 | \r\n61 | ### Session Management\r\n62 | \r\n63 | - **Session ID**: User-specified or auto-generated (`session_${timestamp}`)\r\n64 | - **Multi-user**: Each session has a `userId`\r\n65 | - **Memory Queue**: In-memory `MessageQueue` per session for fast access\r\n66 | - **Persistence**: Messages persisted to MongoDB via `MessageRepository`\r\n67 | \r\n68 | ### Code Organization Rules\r\n69 | \r\n70 | **File Size Limit**: No source file should exceed **480 lines**. When a file approaches this limit, split it into smaller, focused modules.\r\n71 | \r\n72 | **Principles**:\r\n73 | - Each file should have a single, clear responsibility\r\n74 | - Extract related functionality into separate modules\r\n75 | - Use barrel files (`index.ts`) for clean imports\r\n76 | - Keep CLI commands and utilities focused and split when needed\r\n77 | \r\n78 | ### CLI Implementation Details\r\n79 | \r\n80 | The CLI uses **Node.js native `readline`** with built-in history support:\r\n81 | - Up/Down arrows navigate input history\r\n82 | - History persisted in `InputHistory` class (max 100 entries)\r\n83 | - Spinner (`ora`) is used during LLM calls - safely terminates before readline resumes\r\n84 | \r\n85 | ### Provider Interface\r\n86 | \r\n87 | To add a new LLM provider, extend `LLMProvider` abstract class from `src/providers/base.ts`:\r\n88 | - Implement `generate(messages, options)` method\r\n89 | - Pass to Agent constructor via `AgentConfig`\r\n90 | \r\n91 | ### Database Models\r\n92 | \r\n93 | - **Message**: `{ sessionId, userId, content, role, type, createdAt }`\r\n94 | - **Session**: `{ sessionId, userId, createdAt, updatedAt }`\r\n95 | \r\n96 | Compound index on `{ sessionId: 1, createdAt: 1 }` optimizes history queries.\r\n97 | \r\n98 | \r\n99 | ### Code File Index\r\n100 | Quickly locate key functions and files\r\n101 | ./ai-agent-v2/projectMap.md",
  "tool_call_id": "call_-7948036093566863540"
}
```
```
{
  "content": "",
  "role": "assistant",
  "type": "text",
  "tool_calls": [
    {
      "function": {
        "arguments": "{\"pattern\":\"**/*.md\"}",
        "name": "glob"
      },
      "id": "call_-7948049047190862725",
      "index": 0,
      "type": "function"
    },
    {
      "function": {
        "arguments": "{\"filePath\":\"src/index.ts\",\"startLine\":1,\"endLine\":50}",
        "name": "read_file"
      },
      "id": "call_-7948049047190862724",
      "index": 1,
      "type": "function"
    }
  ],
  "usage": {
    "prompt_tokens": 4262,
    "completion_tokens": 69,
    "total_tokens": 4331
  }
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "agent-scheduler-architecture-continued.md\nagent-scheduler-architecture.md\nclaude-code-multi-agent-analysis.md\nCLAUDE.md\nCompaction深度分析.md\ncustomPrompt.md\nESLINT_SETUP.md\nexecution-strategies-deep-dive.md\nhybrid-multi-agent-architecture.md\nmulti-agent-call-chain.md\nmulti-agent-implementation.md\nPERFORMANCE_ANALYSIS_REPORT.md\nPERFORMANCE_OPTIMIZATION_REPORT.md\nSANDBOX_CONFIG.md\ndocs/agent-api-routes.md\ndocs/agent-background-tasks.md\ndocs/agent-breakpoint-continuation.md\ndocs/compaction-analysis.md\ndocs/CROSS_PLATFORM.md\ndocs/LANGFUSE_INTEGRATION.md\ndocs/multi-agent-implementation.md\ndocs/PROJECT_ANALYSIS.md\ndocs/PROMPTS.md\ndocs/README.md\nsrc/mcp/README.md\nsrc/util/event-bus-README.md\nskills/git-commit/SKILL.md\nskills/ui-ux-pro-max/SKILL.md\nsrc/agent/hooks/README.md",
  "tool_call_id": "call_-7948049047190862725"
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "--- FILE: src/index.ts ---\nRange: 1 - 50\n\n1 | /**\r\n2 |  * 主入口文件\r\n3 |  * 初始化并启动 AI Agent 应用\r\n4 |  */\r\n5 | import dotenv from 'dotenv';\r\n6 | import { OpenAIProvider } from './providers/openai';\r\n7 | import Agent from './agent';\r\n8 | import { CLI } from './cli';\r\n9 | import { registerDefaultToolsAsync, ToolRegistry } from './tool';\r\n10 | import { SessionManager } from './session-v2';\r\n11 | import { operatorPrompt } from './prompts/operator';\r\n12 | import path from 'path';\r\n13 | import fs from 'fs';\r\n14 | \r\n15 | const env = process.env.NODE_ENV || 'development';\r\n16 | dotenv.config({ path: `.env.${env}`, override: true });\r\n17 | \r\n18 | /**\r\n19 |  * 应用配置\r\n20 |  */\r\n21 | interface AppConfig {\r\n22 |     deepseekApiKey: string;\r\n23 |     deepseekBaseUrl: string;\r\n24 | }\r\n25 | \r\n26 | /**\r\n27 |  * 初始化应用\r\n28 |  */\r\n29 | async function initializeApp(config: AppConfig) {\r\n30 |     // 1. 连接数据库\r\n31 |     // await connectDB();\r\n32 | \r\n33 |     // 2. 初始化工具（包括 MCP 工具）\r\n34 |     await registerDefaultToolsAsync();\r\n35 | \r\n36 |  \r\n37 |     // 5. 初始化 LLM Provider\r\n38 |     const llmProvider = new OpenAIProvider({\r\n39 |         apiKey: config.deepseekApiKey,\r\n40 |         baseURL: config.deepseekBaseUrl,\r\n41 |     });\r\n42 |       \r\n43 | \r\n44 |    const sessionManager = new SessionManager({\r\n45 |        sessionId:new Date().getTime().toString(),\r\n46 |        llmProvider,\r\n47 |    });\r\n48 |    \r\n49 |   await sessionManager.init();\r\n50 | \r",
  "tool_call_id": "call_-7948049047190862724"
}
```
```
{
  "content": "",
  "role": "assistant",
  "type": "text",
  "tool_calls": [
    {
      "function": {
        "arguments": "{\"filePath\":\"docs/README.md\"}",
        "name": "read_file"
      },
      "id": "call_-7948021593755901408",
      "index": 0,
      "type": "function"
    },
    {
      "function": {
        "arguments": "{\"filePath\":\".env.example\"}",
        "name": "read_file"
      },
      "id": "call_-7948021593755901407",
      "index": 1,
      "type": "function"
    }
  ],
  "usage": {
    "prompt_tokens": 4920,
    "completion_tokens": 47,
    "total_tokens": 4967
  }
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "--- FILE: docs/README.md ---\nRange: 1 - 321\n\n1 | # AI Agent 完整实现指南\r\n2 | \r\n3 | 基于 Node.js + TypeScript 的完整多智能体系统实现，包含断点续问和后台任务处理能力。\r\n4 | \r\n5 | ---\r\n6 | \r\n7 | ## 📚 文档目录\r\n8 | \r\n9 | ### 核心文档\r\n10 | \r\n11 | | 文档 | 描述 |\r\n12 | |------|------|\r\n13 | | **[agent-breakpoint-continuation.md](./agent-breakpoint-continuation.md)** | 断点续问完整实现，包含会话模型、会话管理器、LLM 服务 |\r\n14 | | **[agent-background-tasks.md](./agent-background-tasks.md)** | 后台任务完整实现，包含任务模型、任务调度器、Worker 处理器 |\r\n15 | | **[agent-api-routes.md](./agent-api-routes.md)** | REST API 接口设计和前端使用示例 |\r\n16 | \r\n17 | ### 架构设计文档\r\n18 | \r\n19 | | 文档 | 描述 |\r\n20 | |------|------|\r\n21 | | **[agent-scheduler-architecture.md](../agent-scheduler-architecture.md)** | 基于 React Fiber 思想的多智能体调度架构设计 |\r\n22 | | **[agent-scheduler-architecture-continued.md](../agent-scheduler-architecture-continued.md)** | 分布式扩展、性能优化和完整实现 |\r\n23 | \r\n24 | ---\r\n25 | \r\n26 | ## 🚀 快速开始\r\n27 | \r\n28 | ### 1. 环境要求\r\n29 | \r\n30 | - **Node.js**: 18.0 或更高版本\r\n31 | - **MongoDB**: 6.0 或更高版本\r\n32 | - **Redis**: 7.0 或更高版本\r\n33 | \r\n34 | ### 2. 安装依赖\r\n35 | \r\n36 | ```bash\r\n37 | # 克隆项目\r\n38 | git clone <repository-url>\r\n39 | cd ai-agent-v2\r\n40 | \r\n41 | # 安装依赖\r\n42 | npm install\r\n43 | ```\r\n44 | \r\n45 | ### 3. 配置环境变量\r\n46 | \r\n47 | 创建 `.env` 文件：\r\n48 | \r\n49 | ```env\r\n50 | # 应用配置\r\n51 | NODE_ENV=development\r\n52 | PORT=3000\r\n53 | \r\n54 | # MongoDB 配置\r\n55 | MONGODB_URI=mongodb://localhost:27017/agent-app\r\n56 | MONGODB_DB_NAME=agent-app\r\n57 | \r\n58 | # Redis 配置\r\n59 | REDIS_URL=redis://localhost:6379\r\n60 | REDIS_DB=0\r\n61 | \r\n62 | # OpenAI API 配置\r\n63 | OPENAI_API_KEY=your-openai-api-key\r\n64 | OPENAI_MODEL=gpt-3.5-turbo\r\n65 | \r\n66 | # Bull 队列配置\r\n67 | BULL_REDIS_URL=redis://localhost:6379\r\n68 | BULL_DEFAULT_JOB_TIMEOUT=30000\r\n69 | ```\r\n70 | \r\n71 | ### 4. 启动数据库\r\n72 | \r\n73 | ```bash\r\n74 | # 启动 MongoDB\r\n75 | mongod --dbpath /path/to/data\r\n76 | \r\n77 | # 启动 Redis\r\n78 | redis-server\r\n79 | ```\r\n80 | \r\n81 | ### 5. 编译并运行\r\n82 | \r\n83 | ```bash\r\n84 | # 开发模式（自动重启）\r\n85 | npm run dev\r\n86 | \r\n87 | # 生产模式\r\n88 | npm run build\r\n89 | npm start\r\n90 | \r\n91 | # 启动 Worker\r\n92 | npm run start:worker\r\n93 | ```\r\n94 | \r\n95 | ---\r\n96 | \r\n97 | ## 📖 功能特性\r\n98 | \r\n99 | ### 断点续问\r\n100 | \r\n101 | - ✅ **会话持久化**：对话历史自动保存到 MongoDB\r\n102 | - ✅ **Redis 缓存**：热点会话缓存提升访问速度\r\n103 | - ✅ **上下文连续性**：完整对话历史传递给 LLM\r\n104 | - ✅ **会话管理**：创建、恢复、归档、删除会话\r\n105 | \r\n106 | ### 后台任务\r\n107 | \r\n108 | - ✅ **异步执行**：使用 Bull 队列实现任务异步处理\r\n109 | - ✅ **优先级调度**：支持多级优先级任务（URGENT/HIGH/NORMAL/LOW）\r\n110 | - ✅ **任务重试**：失败任务自动重试，支持指数退避\r\n111 | - ✅ **进度追踪**：实时更新任务进度（0-100%）\r\n112 | - ✅ **批量处理**：支持批量任务提交和监控\r\n113 | \r\n114 | ---\r\n115 | \r\n116 | ## 🎯 API 使用示例\r\n117 | \r\n118 | ### 创建会话并发送消息\r\n119 | \r\n120 | ```javascript\r\n121 | // 1. 创建会话\r\n122 | const response = await fetch('http://localhost:3000/api/sessions', {\r\n123 |   method: 'POST',\r\n124 |   headers: { 'Content-Type': 'application/json' },\r\n125 |   body: JSON.stringify({\r\n126 |     userId: 'user-123',\r\n127 |     initialMessage: '你好，请介绍一下自己',\r\n128 |     options: {\r\n129 |       systemPrompt: '你是一个友好的 AI 助手',\r\n130 |       temperature: 0.7,\r\n131 |       maxTokens: 500\r\n132 |     }\r\n133 |   })\r\n134 | }).then(r => r.json());\r\n135 | \r\n136 | const sessionId = response.sessionId;\r\n137 | \r\n138 | // 2. 发送消息\r\n139 | const chatResponse = await fetch(`http://localhost:3000/api/sessions/${sessionId}/chat`, {\r\n140 |   method: 'POST',\r\n141 |   headers: { 'Content-Type': 'application/json' },\r\n142 |   body: JSON.stringify({\r\n143 |     userId: 'user-123',\r\n144 |     message: '你能帮我写一个快速排序算法吗？',\r\n145 |     options: { temperature: 0.3, maxTokens: 2000 }\r\n146 |   })\r\n147 | }).then(r => r.json());\r\n148 | \r\n149 | console.log('助手回复:', chatResponse.message);\r\n150 | ```\r\n151 | \r\n152 | ### 创建后台任务\r\n153 | \r\n154 | ```javascript\r\n155 | // 创建后台任务\r\n156 | const taskResponse = await fetch('http://localhost:3000/api/tasks', {\r\n157 |   method: 'POST',\r\n158 |   headers: { 'Content-Type': 'application/json' },\r\n159 |   body: JSON.stringify({\r\n160 |     userId: 'user-123',\r\n161 |     type: 'chat',\r\n162 |     input: {\r\n163 |       sessionId: 'session-456',\r\n164 |       message: '帮我生成一段代码',\r\n165 |       options: { temperature: 0.3 }\r\n166 |     },\r\n167 |     options: {\r\n168 |       priority: 'high',\r\n169 |       timeout: 60000\r\n170 |     }\r\n171 |   })\r\n172 | }).then(r => r.json());\r\n173 | \r\n174 | const taskId = taskResponse.taskId;\r\n175 | \r\n176 | // 轮询任务状态\r\n177 | setInterval(async () => {\r\n178 |   const task = await fetch(`http://localhost:3000/api/tasks/${taskId}?userId=user-123`)\r\n179 |     .then(r => r.json())\r\n180 |     .then(r => r.task);\r\n181 | \r\n182 |   console.log(`任务状态: ${task.status}, 进度: ${task.progress}%`);\r\n183 | \r\n184 |   if (task.status === 'completed') {\r\n185 |     console.log('任务完成:', task.output);\r\n186 |     clearInterval(interval);\r\n187 |   }\r\n188 | }, 2000);\r\n189 | ```\r\n190 | \r\n191 | 更多 API 使用示例请查看 [agent-api-routes.md](./agent-api-routes.md)。\r\n192 | \r\n193 | ---\r\n194 | \r\n195 | ## 📦 项目结构\r\n196 | \r\n197 | ```\r\n198 | ai-agent-v2/\r\n199 | ├── src/\r\n200 | │   ├── models/                 # 数据模型\r\n201 | │   │   ├── Session.ts          # 会话模型\r\n202 | │   │   └── Task.ts             # 任务模型\r\n203 | │   │\r\n204 | │   ├── services/               # 业务服务\r\n205 | │   │   ├── SessionManager.ts   # 会话管理器\r\n206 | │   │   ├── TaskScheduler.ts    # 任务调度器\r\n207 | │   │   └── LLMService.ts       # LLM 服务\r\n208 | │   │\r\n209 | │   ├── workers/                # 后台 Worker\r\n210 | │   │   └── TaskWorker.ts       # 任务处理器\r\n211 | │   │\r\n212 | │   ├── api/                    # API 路由\r\n213 | │   │   ├── routes.ts           # 路由定义\r\n214 | │   │   └── index.ts            # API 入口\r\n215 | │   │\r\n216 | │   ├── types/                  # TypeScript 类型\r\n217 | │   │   └── index.ts\r\n218 | │   │\r\n219 | │   ├── config/                 # 配置文件\r\n220 | │   │   └── database.ts\r\n221 | │   │\r\n222 | │   └── index.ts                # 应用入口\r\n223 | │\r\n224 | ├── docs/                       # 文档\r\n225 | │   ├── agent-breakpoint-continuation.md\r\n226 | │   ├── agent-background-tasks.md\r\n227 | │   ├── agent-api-routes.md\r\n228 | │   └── README.md              # 本文件\r\n229 | │\r\n230 | ├── dist/                       # 编译输出\r\n231 | ├── tests/                      # 测试文件\r\n232 | ├── .env                        # 环境变量\r\n233 | ├── .gitignore\r\n234 | ├── package.json\r\n235 | ├── tsconfig.json\r\n236 | └── README.md\r\n237 | ```\r\n238 | \r\n239 | ---\r\n240 | \r\n241 | ## 🔧 技术栈\r\n242 | \r\n243 | | 技术 | 版本 | 用途 |\r\n244 | |------|------|------|\r\n245 | | **Node.js** | 18+ | 运行时 |\r\n246 | | **TypeScript** | 5.0+ | 类型安全 |\r\n247 | | **Express** | 4.18+ | Web 框架 |\r\n248 | | **MongoDB** | 6.0+ | 数据持久化 |\r\n249 | | **Mongoose** | 8.0+ | ODM |\r\n250 | | **Redis** | 7.0+ | 缓存/队列 |\r\n251 | | **Bull** | 4.12+ | 任务队列 |\r\n252 | | **OpenAI** | 4.20+ | LLM API |\r\n253 | \r\n254 | ---\r\n255 | \r\n256 | ## 🎓 学习路径\r\n257 | \r\n258 | ### 初学者路径\r\n259 | \r\n260 | 1. 阅读架构设计文档了解整体概念\r\n261 |    - [agent-scheduler-architecture.md](../agent-scheduler-architecture.md)\r\n262 |    \r\n263 | 2. 学习断点续问实现\r\n264 |    - [agent-breakpoint-continuation.md](./agent-breakpoint-continuation.md)\r\n265 |    \r\n266 | 3. 学习后台任务实现\r\n267 |    - [agent-background-tasks.md](./agent-background-tasks.md)\r\n268 |    \r\n269 | 4. 实践 API 调用\r\n270 |    - [agent-api-routes.md](./agent-api-routes.md)\r\n271 | \r\n272 | ### 进阶开发者路径\r\n273 | \r\n274 | 1. 理解 React Fiber 到多智能体架构的映射\r\n275 | 2. 深入研究任务调度算法\r\n276 | 3. 扩展自定义任务类型\r\n277 | 4. 实现分布式架构\r\n278 | \r\n279 | ---\r\n280 | \r\n281 | ## 📊 架构设计\r\n282 | \r\n283 | 本项目的架构设计灵感来源于 React 19 的 Fiber 架构和调度系统：\r\n284 | \r\n285 | ### 核心概念映射\r\n286 | \r\n287 | | React 概念 | Agent 系统实现 |\r\n288 | |------------|----------------|\r\n289 | | Fiber 节点 | AgentTask |\r\n290 | | 时间分片 | Token Budgeting |\r\n291 | | Priority Lanes | TaskPriority |\r\n292 | | Scheduler | TaskScheduler |\r\n293 | | Reconciliation | Task Execution |\r\n294 | \r\n295 | ### 设计原则\r\n296 | \r\n297 | 1. **可中断性**：任务可以被随时中断和恢复\r\n298 | 2. **优先级调度**：高优先级任务优先执行\r\n299 | 3. **批量处理**：多个任务可以批量提交和执行\r\n300 | 4. **状态快照**：支持任务状态持久化和恢复\r\n301 | \r\n302 | 详细架构设计请查看 [agent-scheduler-architecture.md](../agent-scheduler-architecture.md)。\r\n303 | \r\n304 | ---\r\n305 | \r\n306 | ## 🤝 贡献\r\n307 | \r\n308 | 欢迎提交 Issue 和 Pull Request！\r\n309 | \r\n310 | ---\r\n311 | \r\n312 | ## 📄 许可证\r\n313 | \r\n314 | MIT License\r\n315 | \r\n316 | ---\r\n317 | \r\n318 | ## 📮 联系方式\r\n319 | \r\n320 | 如有问题，请提交 Issue。\r\n321 | ",
  "tool_call_id": "call_-7948021593755901408"
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "Error: File not found.",
  "tool_call_id": "call_-7948021593755901407"
}
```
```
{
  "content": "",
  "role": "assistant",
  "type": "text",
  "tool_calls": [
    {
      "function": {
        "arguments": "{\"pattern\":\"skills/**\"}",
        "name": "glob"
      },
      "id": "call_-7948033722745092069",
      "index": 0,
      "type": "function"
    },
    {
      "function": {
        "arguments": "{\"filePath\":\"src/agent/index.ts\",\"startLine\":1,\"endLine\":50}",
        "name": "read_file"
      },
      "id": "call_-7948033722745092068",
      "index": 1,
      "type": "function"
    }
  ],
  "usage": {
    "prompt_tokens": 8011,
    "completion_tokens": 55,
    "total_tokens": 8066
  }
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "skills/git-commit/SKILL.md\nskills/ui-ux-pro-max/SKILL.md\nskills/ui-ux-pro-max/data/charts.csv\nskills/ui-ux-pro-max/data/colors.csv\nskills/ui-ux-pro-max/data/icons.csv\nskills/ui-ux-pro-max/data/landing.csv\nskills/ui-ux-pro-max/data/products.csv\nskills/ui-ux-pro-max/data/prompts.csv\nskills/ui-ux-pro-max/data/react-performance.csv\nskills/ui-ux-pro-max/data/styles.csv\nskills/ui-ux-pro-max/data/typography.csv\nskills/ui-ux-pro-max/data/ui-reasoning.csv\nskills/ui-ux-pro-max/data/ux-guidelines.csv\nskills/ui-ux-pro-max/data/web-interface.csv\nskills/ui-ux-pro-max/scripts/core.py\nskills/ui-ux-pro-max/scripts/design_system.py\nskills/ui-ux-pro-max/scripts/search.py\nskills/ui-ux-pro-max/data/stacks/flutter.csv\nskills/ui-ux-pro-max/data/stacks/html-tailwind.csv\nskills/ui-ux-pro-max/data/stacks/jetpack-compose.csv\nskills/ui-ux-pro-max/data/stacks/nextjs.csv\nskills/ui-ux-pro-max/data/stacks/nuxt-ui.csv\nskills/ui-ux-pro-max/data/stacks/nuxtjs.csv\nskills/ui-ux-pro-max/data/stacks/react-native.csv\nskills/ui-ux-pro-max/data/stacks/react.csv\nskills/ui-ux-pro-max/data/stacks/shadcn.csv\nskills/ui-ux-pro-max/data/stacks/svelte.csv\nskills/ui-ux-pro-max/data/stacks/swiftui.csv\nskills/ui-ux-pro-max/data/stacks/vue.csv\nskills/ui-ux-pro-max/scripts/__pycache__/core.cpython-313.pyc\nskills/ui-ux-pro-max/scripts/__pycache__/design_system.cpython-313.pyc",
  "tool_call_id": "call_-7948033722745092069"
}
```
```
{
  "role": "tool",
  "type": "text",
  "content": "--- FILE: src/agent/index.ts ---\nRange: 1 - 50\n\n1 | /**\r\n2 |  * Agent - AI 代理\r\n3 |  * 负责编排 LLM 调用和会话管理\r\n4 |  *\r\n5 |  * 注意：此文件是旧版 Agent，建议使用 index-eventbus.ts 以获得 EventBus 集成\r\n6 |  * 要启用 EventBus 功能，请导入 './index-eventbus' 而不是此文件\r\n7 |  */\r\n8 | import EventEmitter from \"events\";\r\n9 | import { LLMProvider, LLMResponse, Message, ToolCall, ToolSchema } from \"../providers/base\";\r\n10 | import { ScopedLogger } from \"../util/log\";\r\n11 | import { SessionManager } from \"../session-v2\";\r\n12 | import { ToolRegistry } from \"../tool/registry\";\r\n13 | \r\n14 | export interface AgentConfig {\r\n15 |     llmProvider: LLMProvider;\r\n16 |     sessionManager: SessionManager;\r\n17 |     systemPrompt: string;\r\n18 |     /** 默认工具列表（可选），不传则使用 ToolRegistry 中所有工具 */\r\n19 |     defaultTools?: ToolSchema[];\r\n20 |     /** 最大循环次数，防止无限循环，默认 1024 */\r\n21 |     maxLoop?: number;\r\n22 |     /** 最大 token 数，默认 8000 */\r\n23 |     maxTokens?: number;\r\n24 |     /** 最大输出 token 数，默认 8000 */\r\n25 |     maxOutputTokens?: number;\r\n26 |     /** 工具并发上限，默认 1 */\r\n27 |     toolConcurrency?: number;\r\n28 |     /** 单次工具调用超时（毫秒），默认 300000 (5分钟) */\r\n29 |     toolTimeoutMs?: number;\r\n30 |     /** 连续错误次数上限，默认 2 */\r\n31 |     noProgressLimit?: number;\r\n32 | }\r\n33 | \r\n34 | export interface AgentResponse {\r\n35 |     content: string;\r\n36 |     role: Message['role'];\r\n37 |     type?: Message['type'];\r\n38 | }\r\n39 | \r\n40 | export default class Agent extends EventEmitter {\r\n41 |     private llmProvider: LLMProvider;\r\n42 |     private logger: ScopedLogger;\r\n43 |     private sessionManager: SessionManager;\r\n44 |     private systemPrompt: string;\r\n45 |     private defaultTools: ToolSchema[] | undefined;\r\n46 |     private maxLoop: number;\r\n47 |     maxOutputTokens: number;\r\n48 |     maxTokens: number;\r\n49 |     private noProgressLimit: number;\r\n50 | \r",
  "tool_call_id": "call_-7948033722745092068"
}
```
```
{
  "content": "## Codebase Structure Summary\n\n### Project Overview\n**ai-agent-v2** - A multi-session AI agent system built with TypeScript, featuring Domain-Driven Design (DDD), Repository Pattern, and comprehensive tool integration.\n\n### Main Directories\n\n```\nai-agent-v2/\n├── src/                    # Main source code (70+ files)\n│   ├── agent/             # Agent orchestration and LLM coordination\n│   ├── cli/               # Command-line interface with readline\n│   ├── mcp/               # MCP (Model Context Protocol) integration\n│   ├── observability/     # Langfuse observability integration\n│   ├── prompts/           # System and operator prompts\n│   ├── sandbox/           # Docker execution sandbox\n│   ├── session-v2/        # Session management with compaction\n│   ├── skills/            # Skill loading system\n│   ├── storage/           # MongoDB storage models & repositories\n│   ├── tool/              # 20+ tool implementations\n│   ├── providers/         # LLM provider abstractions\n│   └── util/              # Utilities (event bus, logging, formatting)\n├── bin/                   # CLI executable entry point\n├── docs/                  # Architecture documentation\n├── skills/                # External skill packages (git-commit, ui-ux-pro-max)\n└── tests/                 # Test files\n```\n\n### Key Files\n\n| File | Purpose | Reference |\n|------|---------|-----------|\n| **src/index.ts** | Application entry point | src/index.ts:1-50 |\n| **package.json** | Dependencies & scripts | package.json:1-62 |\n| **tsconfig.json** | TypeScript config | tsconfig.json:1-25 |\n| **CLAUDE.md** | Developer guidance | CLAUDE.md:1-101 |\n| **src/agent/index.ts** | Core Agent class (deprecated) | src/agent/index.ts:1-50 |\n| **src/session-v2/index.ts** | Session manager with compaction | src/session-v2/index.ts |\n| **src/cli/CLI.ts** | Interactive CLI implementation | src/cli/CLI.ts |\n\n### Core Architecture Components\n\n**CLI Layer** (src/cli/)\n- Interactive commands with readline history\n- Command registry pattern in `cli/commands/`\n- Smart input handling\n\n**Agent Layer** (src/agent/)\n- Two implementations: `index.ts` and `index-eventbus.ts`\n- LLM call orchestration\n- Tool execution with concurrency control\n\n**Tool System** (src/tool/)\n- 20+ tools: bash, grep, glob, web-search, file operations, etc.\n- Tool registry for dynamic tool loading\n- MCP tool adapters\n\n**Session Management** (src/session-v2/)\n- Multi-session support with compaction\n- MongoDB persistence via Mongoose\n- Lazy-loading history\n\n**Observability** (src/observability/)\n- Langfuse integration\n- Event bus system (src/util/event-bus.ts)\n\n### Configuration\n\n**Environment Files:**\n- `.env.development` - Development config\n- `.env.example` - Environment variable template (not found)\n- Requires: `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`\n\n**Build Config:**\n- TypeScript with strict mode\n- Output: `dist/` directory\n- Package: `@qps` CLI via `bin/index.js`\n\n### Key Features\n\n1. **Multi-Session Management**: User-specified or auto-generated session IDs\n2. **Message Compaction**: Advanced context management (see docs/compaction-analysis.md)\n3. **Tool Integration**: MCP protocol support, custom tools, subagent delegation\n4. **Sandbox Execution**: Docker-based code execution (src/sandbox/)\n5. **Event-Driven Architecture**: Event bus for agent communication\n6. **Skill System**: External skill loading with parser/loader\n\n### Important Documentation\n\n- **Architecture**: React Fiber-inspired multi-agent scheduling\n- **Breakpoint Continuation**: Session persistence and resumption\n- **Background Tasks**: Async task processing with Bull queues\n- **Performance**: Optimization reports and analysis\n- **API Routes**: REST API design for frontend integration\n\n### Technical Stack\n\n- **Runtime**: Node.js 18+ with CommonJS\n- **Language**: TypeScript 5.9+\n- **Database**: MongoDB via Mongoose 9.1+\n- **LLM**: OpenAI-compatible providers\n- **Tools**: ripgrep, tree-sitter, Docker API\n- **Observability**: Langfuse 3.38+\n- **Testing**: Vitest 3.2+",
  "role": "assistant",
  "type": "text",
  "tool_calls": [],
  "usage": {
    "prompt_tokens": 8992,
    "completion_tokens": 981,
    "total_tokens": 9973
  }
}
```
```
{
  "content": "## Codebase Structure Summary\n\n### Project Overview\n**ai-agent-v2** - A multi-session AI agent system built with TypeScript, featuring Domain-Driven Design (DDD), Repository Pattern, and comprehensive tool integration.\n\n### Main Directories\n\n```\nai-agent-v2/\n├── src/                    # Main source code (70+ files)\n│   ├── agent/             # Agent orchestration and LLM coordination\n│   ├── cli/               # Command-line interface with readline\n│   ├── mcp/               # MCP (Model Context Protocol) integration\n│   ├── observability/     # Langfuse observability integration\n│   ├── prompts/           # System and operator prompts\n│   ├── sandbox/           # Docker execution sandbox\n│   ├── session-v2/        # Session management with compaction\n│   ├── skills/            # Skill loading system\n│   ├── storage/           # MongoDB storage models & repositories\n│   ├── tool/              # 20+ tool implementations\n│   ├── providers/         # LLM provider abstractions\n│   └── util/              # Utilities (event bus, logging, formatting)\n├── bin/                   # CLI executable entry point\n├── docs/                  # Architecture documentation\n├── skills/                # External skill packages (git-commit, ui-ux-pro-max)\n└── tests/                 # Test files\n```\n\n### Key Files\n\n| File | Purpose | Reference |\n|------|---------|-----------|\n| **src/index.ts** | Application entry point | src/index.ts:1-50 |\n| **package.json** | Dependencies & scripts | package.json:1-62 |\n| **tsconfig.json** | TypeScript config | tsconfig.json:1-25 |\n| **CLAUDE.md** | Developer guidance | CLAUDE.md:1-101 |\n| **src/agent/index.ts** | Core Agent class (deprecated) | src/agent/index.ts:1-50 |\n| **src/session-v2/index.ts** | Session manager with compaction | src/session-v2/index.ts |\n| **src/cli/CLI.ts** | Interactive CLI implementation | src/cli/CLI.ts |\n\n### Core Architecture Components\n\n**CLI Layer** (src/cli/)\n- Interactive commands with readline history\n- Command registry pattern in `cli/commands/`\n- Smart input handling\n\n**Agent Layer** (src/agent/)\n- Two implementations: `index.ts` and `index-eventbus.ts`\n- LLM call orchestration\n- Tool execution with concurrency control\n\n**Tool System** (src/tool/)\n- 20+ tools: bash, grep, glob, web-search, file operations, etc.\n- Tool registry for dynamic tool loading\n- MCP tool adapters\n\n**Session Management** (src/session-v2/)\n- Multi-session support with compaction\n- MongoDB persistence via Mongoose\n- Lazy-loading history\n\n**Observability** (src/observability/)\n- Langfuse integration\n- Event bus system (src/util/event-bus.ts)\n\n### Configuration\n\n**Environment Files:**\n- `.env.development` - Development config\n- `.env.example` - Environment variable template (not found)\n- Requires: `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`\n\n**Build Config:**\n- TypeScript with strict mode\n- Output: `dist/` directory\n- Package: `@qps` CLI via `bin/index.js`\n\n### Key Features\n\n1. **Multi-Session Management**: User-specified or auto-generated session IDs\n2. **Message Compaction**: Advanced context management (see docs/compaction-analysis.md)\n3. **Tool Integration**: MCP protocol support, custom tools, subagent delegation\n4. **Sandbox Execution**: Docker-based code execution (src/sandbox/)\n5. **Event-Driven Architecture**: Event bus for agent communication\n6. **Skill System**: External skill loading with parser/loader\n\n### Important Documentation\n\n- **Architecture**: React Fiber-inspired multi-agent scheduling\n- **Breakpoint Continuation**: Session persistence and resumption\n- **Background Tasks**: Async task processing with Bull queues\n- **Performance**: Optimization reports and analysis\n- **API Routes**: REST API design for frontend integration\n\n### Technical Stack\n\n- **Runtime**: Node.js 18+ with CommonJS\n- **Language**: TypeScript 5.9+\n- **Database**: MongoDB via Mongoose 9.1+\n- **LLM**: OpenAI-compatible providers\n- **Tools**: ripgrep, tree-sitter, Docker API\n- **Observability**: Langfuse 3.38+\n- **Testing**: Vitest 3.2+",
  "role": "assistant",
  "type": "text"
}
```
