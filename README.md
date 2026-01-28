# AI Agent V2

一个基于 Node.js/TypeScript 的现代化多会话 AI Agent 系统，支持多种 LLM 提供者。

## ✨ 特性

- 🧠 **多 LLM 支持**: OpenAI、Kimi、DeepSeek、GLM、MiniMax、Qwen
- 🛠️ **工具系统**: 支持代码执行、文件操作、Web 搜索等
- 🔧 **MCP 集成**: Model Context Protocol 支持
- 📊 **会话管理**: 智能历史压缩，支持长时间对话
- 🔒 **沙箱环境**: Docker 容器安全执行代码
- 📈 **可观测性**: Langfuse 集成，追踪 LLM 调用
- 🎨 **现代化 CLI**: 基于 Ink + React 的终端界面
- ⚙️ **灵活配置**: 支持环境变量（类似 Claude Code）和 .env 文件

## 🚀 快速开始

### 前置要求

- Node.js >= 18
- pnpm

### 安装

```bash
# 克隆仓库
git clone <repository-url>
cd ai-agent-v2

# 安装依赖
pnpm install
```

## ⚙️ 配置 API Key

### 方式 1: 系统环境变量（推荐，类似 Claude Code）

```bash
# 设置环境变量（类似 Claude Code）
export ANTHROPIC_API_KEY="your-api-key"
export AI_MODEL="glm-4.7"

# 运行
pnpm dev
```

**详细文档**: [docs/ENVIRONMENT_VARIABLES_COMPLETE.md](./docs/ENVIRONMENT_VARIABLES_COMPLETE.md)

### 方式 2: 项目级别配置（.env 文件）

```bash
# 复制示例文件
cp .env.development.example .env.development

# 编辑配置
nano .env.development

# 运行
pnpm dev
```

### 配置对比

| 特性 | 系统环境变量 | 项目级别配置 |
|------|-------------|--------------|
| 全局共享 | ✅ 是 | ❌ 否 |
| 项目隔离 | ❌ 否 | ✅ 是 |
| 配置复杂度 | ✅ 简单 | ⚠️ 需管理文件 |
| 团队协作 | ❌ 困难 | ✅ 容易 |

**更多详情**: [docs/CONFIGURATION_WAYS.md](./docs/CONFIGURATION_WAYS.md)

## 📋 支持的 LLM 提供者

| 提供者 | API Key 环境变量 | 默认模型 | 适用场景 |
|--------|-----------------|----------|---------|
| **GLM** | `GLM_API_KEY` | glm-4-plus | 综合、中文任务 |
| **Kimi** | `KIMI_API_KEY` | kimi-k2.5 | 长文本（256K上下文） |
| **DeepSeek** | `DEEPSEEK_API_KEY` | deepseek-chat | 编程任务 |
| **OpenAI** | `OPENAI_API_KEY` | gpt-4o-mini | 英文任务 |
| **MiniMax** | `MINIMAX_API_KEY` | abab6.5s-chat | 特定应用 |
| **Qwen** | `QWEN_API_KEY` | qwen-plus | 阿里云生态 |

**注意**: 使用 `ANTHROPIC_API_KEY` 作为通用 API Key（类似 Claude Code）

### 获取 API Key

| 提供者 | 注册地址 |
|--------|---------|
| GLM | https://open.bigmodel.cn/usercenter/apikeys |
| Kimi | https://platform.moonshot.cn/console/api-keys |
| DeepSeek | https://platform.deepseek.com/api_keys |
| OpenAI | https://platform.openai.com/api-keys |
| MiniMax | https://api.minimax.chat/user-center/basic-information/interface-key |
| Qwen | https://dashscope.console.aliyun.com/apiKey |

## 🏃 运行

```bash
# 开发模式
pnpm dev

# CLI 模式（带交互界面）
pnpm dev:cli-v2-ink

# Demo 模式
pnpm dev:demo

# 类型检查
pnpm typecheck

# 运行测试
pnpm test
```

## 🛠️ 开发

### 可用命令

```bash
# 类型检查
pnpm typecheck

# Lint
pnpm lint

# Lint 自动修复
pnpm lint:fix

# 构建
pnpm build

# 开发模式
pnpm dev
pnpm dev:demo
pnpm dev:cli-v2-ink

# 测试
pnpm test
pnpm test:ui
```

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 单个文件不超过 480 行
- 使用 Zod 进行参数验证

## 📁 项目结构

```
src/
├── agent/              # Agent 核心逻辑
├── providers/          # LLM 提供者
├── tool/              # 工具系统
├── session-v2/        # 会话管理
├── context/           # Agent 上下文
├── skills/            # 技能系统
├── mcp/               # MCP 集成
├── sandbox/           # Docker 沙箱
├── observability/      # Langfuse 可观测性
├── util/              # 工具函数
├── cli-v2-ink/       # React CLI UI
└── types/             # 类型定义
```

## 📚 文档

### 配置相关

- **[docs/ENVIRONMENT_VARIABLES_COMPLETE.md](./docs/ENVIRONMENT_VARIABLES_COMPLETE.md)** - 完整的环境变量配置指南
- **[docs/ENV_QUICK_REFERENCE.md](./docs/ENV_QUICK_REFERENCE.md)** - 快速参考
- **[docs/CONFIGURATION_WAYS.md](./docs/CONFIGURATION_WAYS.md)** - 配置方式对比
- **[docs/FEATURE_ENVIRONMENT_VARIABLES.md](./docs/FEATURE_ENVIRONMENT_VARIABLES.md)** - 功能特性说明

### 项目文档

- **[docs/PROJECT_ANALYSIS.md](./docs/PROJECT_ANALYSIS.md)** - 项目架构深度分析

### 快速开始

- **[docs/QUICK_START_CARD.md](./docs/QUICK_START_CARD.md)** - 快速开始卡片
- **[docs/QUICK_START_EXAMPLES.md](./docs/QUICK_START_EXAMPLES.md)** - 使用示例

### 其他

- **[docs/TASK_COMPLETION_SUMMARY.md](./docs/TASK_COMPLETION_SUMMARY.md)** - 任务完成总结

## 🛠️ 技术栈

- **运行时**: Node.js 18+
- **语言**: TypeScript 5.9+
- **包管理**: pnpm
- **LLM**: OpenAI、Kimi、DeepSeek、GLM、MiniMax、Qwen
- **UI**: Ink (React for CLI)
- **沙箱**: Docker
- **可观测性**: Langfuse

## 🔒 安全建议

1. **不要提交 API Key 到 Git**
   ```bash
   # 确保 .gitignore 包含
   .env
   .env.development
   .env.production
   ```

2. **使用环境变量**
   ```bash
   export ANTHROPIC_API_KEY="your-api-key"
   ```

3. **API Key 泄露处理**
   - 登录相应平台控制台
   - 撤销旧的 API Key
   - 生成新的 API Key
   - 更新配置

## 🎯 核心概念

### Agent 架构

AI Agent 采用模块化架构，包含以下核心组件：

1. **Agent**: 主控制器，协调各个组件
2. **LLM Provider**: 多 LLM 提供者支持
3. **Tool System**: 工具注册和执行
4. **Session Manager**: 会话管理和历史压缩
5. **Context Manager**: 上下文管理
6. **Sandbox**: 代码执行沙箱

### 工具系统

工具系统支持扩展，内置工具包括：

- 📝 **文件操作**: 读写文件、目录遍历
- 🔍 **代码搜索**: 使用 ripgrep 进行代码搜索
- 🐍 **代码执行**: 在 Docker 沙箱中执行代码
- 🌐 **Web 搜索**: 集成 Tavily 搜索 API
- 📊 **数据分析**: 数据处理和可视化

### 会话管理

- 智能历史压缩，减少 token 使用
- 支持多会话并发
- 自动保存会话状态
- 支持会话恢复

## 📖 使用示例

### 基础使用

```bash
# 1. 配置环境变量
export ANTHROPIC_API_KEY="your-api-key"
export AI_MODEL="glm-4.7"

# 2. 运行 AI Agent
pnpm dev
```

### 使用配置脚本

```bash
# 1. 运行配置向导
pnpm setup:env

# 2. 重新加载配置
source ~/.zshrc

# 3. 运行
pnpm dev
```

### 测试配置

```bash
# 运行配置测试
pnpm test:env
```

## 🤝 贡献

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 License

ISC

## 🆘 常见问题

### Q: 如何切换不同的 LLM 提供者？

A: 修改 `AI_MODEL` 环境变量：

```bash
# 使用 GLM
export AI_MODEL="glm-4.7"

# 使用 Kimi
export AI_MODEL="kimi-k2.5"

# 使用 DeepSeek
export AI_MODEL="deepseek-chat"
```

### Q: 如何配置多个提供者？

A: 可以同时配置多个提供者的 API Key：

```bash
export GLM_API_KEY="your-glm-key"
export KIMI_API_KEY="your-kimi-key"
export AI_MODEL="glm-4.7"  # 使用 GLM
```

### Q: 配置不生效怎么办？

A: 检查环境变量：

```bash
echo $ANTHROPIC_API_KEY
echo $AI_MODEL

# 或运行测试
pnpm test:env
```

### Q: 如何启用 Docker 沙箱？

A: 确保 Docker 已安装并运行：

```bash
docker --version
docker ps
```

## 📧 联系方式

如有问题或建议，请通过以下方式联系：

- GitHub Issues
- Email: [your-email]

## 🎯 路线图

- [ ] 支持更多 Agent 功能
- [ ] 增强工具生态系统
- [ ] 优化会话历史压缩
- [ ] 支持分布式部署
- [ ] 提供 Web UI 界面

---

**Made with ❤️ by AI Agent Team**
