# API Key 配置指南

本指南详细说明如何配置各种 LLM 提供者的 API Key。

## 目录

- [支持的 LLM 提供者](#支持的-llm-提供者)
- [快速开始](#快速开始)
- [环境变量配置](#环境变量配置)
- [使用示例](#使用示例)
- [常见问题](#常见问题)

---

## 支持的 LLM 提供者

系统支持以下 6 种 LLM 提供者：

| 提供者 | 提供商名称 | 默认模型 | 上下文窗口 |
|--------|-----------|----------|----------|
| OpenAI | OpenAI | gpt-4o-mini | 128K |
| Kimi | Moonshot AI | kimi-k2.5 | 256K |
| DeepSeek | DeepSeek | deepseek-chat | 128K |
| GLM | Zhipu AI | glm-4-plus | 128K |
| MiniMax | MiniMax | abab6.5s-chat | 24K |
| Qwen | Alibaba | qwen-plus | 128K |

---

## 快速开始

### 1. 创建环境配置文件

根据你的运行环境，创建相应的 `.env` 文件：

```bash
# 开发环境（默认）
.env.development

# 生产环境
.env.production
```

### 2. 配置 API Key

选择一种或多种提供者，配置相应的环境变量。

---

## 环境变量配置

### 通用配置

```bash
# 选择要使用的模型（可选）
AI_MODEL=glm-4.7

# 生成温度（0-2，默认 0.7）
TEMPERATURE=0.7
```

### OpenAI

```bash
# API Key（必需）
OPENAI_API_KEY=sk-your-openai-api-key-here

# 自定义 Base URL（可选）
OPENAI_BASE_URL=https://api.openai.com/v1
```

### Kimi (Moonshot AI)

```bash
# API Key（必需）
KIMI_API_KEY=sk-your-kimi-api-key-here

# 自定义 Base URL（可选）
KIMI_BASE_URL=https://api.moonshot.cn/v1
```

### DeepSeek

```bash
# API Key（必需）
DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here

# 自定义 Base URL（可选）
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

### GLM (Zhipu AI)

```bash
# API Key（必需）
GLM_API_KEY=your-glm-api-key-here

# 自定义 Base URL（可选）
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
```

### MiniMax

```bash
# API Key（必需）
MINIMAX_API_KEY=sk-your-minimax-api-key-here

# Group ID（必需）
MINIMAX_GROUP_ID=your-minimax-group-id

# 自定义 Base URL（可选）
MINIMAX_BASE_URL=https://api.minimax.chat/v1
```

### Qwen (Alibaba)

```bash
# API Key（必需）
QWEN_API_KEY=sk-your-qwen-api-key-here

# 自定义 Base URL（可选）
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
```

---

## 使用示例

### 示例 1：使用 GLM 提供者

**环境变量配置 (.env.development)**

```bash
# 使用 GLM
AI_MODEL=glm-4.7

# API Key
GLM_API_KEY=610bd1d093804268a5bd49bdaed4ffd4.eye0EsjDVkh4l1GB

# Base URL（可选，使用默认值）
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
```

**代码使用 (src/index.ts)**

```typescript
import { ProviderRegistry, ProviderType } from './providers';

// 方法 1：直接指定提供者类型
const llmProvider = ProviderRegistry.createFromEnv(ProviderType.GLM);

// 方法 2：自动检测（从 AI_MODEL 环境变量）
const llmProvider = ProviderRegistry.createFromEnv();
```

### 示例 2：使用 Kimi 提供者

**环境变量配置 (.env.development)**

```bash
# 使用 Kimi
AI_MODEL=kimi-k2.5

# API Key
KIMI_API_KEY=sk-LQrNwzgpNZsusgCN4NPeF2wQFmzsjYWJcH0mDKMe0fnxPMvY

# Base URL（可选，使用默认值）
KIMI_BASE_URL=https://api.moonshot.cn/v1
```

**代码使用**

```typescript
import { ProviderRegistry, ProviderType } from './providers';

// 自动检测
const llmProvider = ProviderRegistry.createFromEnv();
```

### 示例 3：使用多个提供者（动态切换）

```typescript
import { ProviderRegistry, ProviderType } from './providers';
import { Agent } from './agent';

// 创建多个提供者实例
const glmProvider = ProviderRegistry.createFromEnv(ProviderType.GLM);
const kimiProvider = ProviderRegistry.createFromEnv(ProviderType.KIMI);

// 使用 GLM 创建 Agent
const glmAgent = new Agent({
    model: 'glm-4.7',
    llmProvider: glmProvider,
    systemPrompt: '你是一个 AI 助手...',
    temperature: 0.1,
});

// 使用 Kimi 创建另一个 Agent
const kimiAgent = new Agent({
    model: 'kimi-k2.5',
    llmProvider: kimiProvider,
    systemPrompt: '你是一个 AI 助手...',
    temperature: 0.7,
});
```

### 示例 4：自定义配置

```typescript
import { ProviderRegistry } from './providers';
import { GLMConfig, ProviderType } from './providers';

const customConfig: GLMConfig = {
    type: ProviderType.GLM,
    apiKey: 'your-api-key',
    baseURL: 'https://custom-base-url.com/v1',
    model: 'glm-4-plus',
    temperature: 0.3,
    maxTokens: 64000,
    maxOutputTokens: 4096,
    timeout: 120000, // 120秒超时
    maxRetries: 5,
};

const llmProvider = ProviderRegistry.create(customConfig);
```

---

## 环境变量加载机制

### 1. 加载顺序

项目使用 `dotenv` 从以下文件加载环境变量：

```typescript
const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${env}`, override: true });
```

**文件优先级**：

1. `.env.development` （开发环境）
2. `.env.production` （生产环境）

### 2. 运行环境设置

**方式 1：通过命令行参数**

```bash
# 开发环境
NODE_ENV=development pnpm dev

# 生产环境
NODE_ENV=production pnpm build
```

**方式 2：通过环境变量**

```bash
export NODE_ENV=development
pnpm dev
```

### 3. 提供者检测顺序

`ProviderRegistry.createFromEnv()` 按以下顺序自动检测提供者：

1. **检查 AI_MODEL 环境变量**
   - 包含 "kimi" 或 "moonshot" → Kimi
   - 包含 "deepseek" → DeepSeek
   - 包含 "glm" 或 "zhipu" → GLM
   - 包含 "abab" 或 "minimax" → MiniMax
   - 包含 "qwen" 或 "dashscope" → Qwen
   - 包含 "gpt" → OpenAI

2. **检查 API Key 环境变量**（如果 AI_MODEL 未设置）
   - DEEPSEEK_API_KEY
   - KIMI_API_KEY
   - GLM_API_KEY
   - MINIMAX_API_KEY
   - QWEN_API_KEY
   - OPENAI_API_KEY

---

## 常见问题

### Q1: 如何切换不同的模型？

**方法 1：修改 AI_MODEL 环境变量**

```bash
# 在 .env.development 中
AI_MODEL=kimi-k2.5

# 或者命令行覆盖
AI_MODEL=glm-4.7 pnpm dev
```

**方法 2：在代码中指定**

```typescript
const agent = new Agent({
    model: 'kimi-k2.5', // 直接指定模型
    llmProvider,
    // ...
});
```

### Q2: 如何验证 API Key 是否有效？

```typescript
import { ProviderRegistry, ProviderType } from './providers';

try {
    const provider = ProviderRegistry.createFromEnv(ProviderType.GLM);
    console.log('Provider created successfully:', provider);
} catch (error) {
    console.error('Failed to create provider:', error.message);
}
```

### Q3: 如何设置自定义 Base URL？

**方式 1：环境变量**

```bash
GLM_BASE_URL=https://custom-gateway.com/v1
```

**方式 2：代码配置**

```typescript
const config: GLMConfig = {
    type: ProviderType.GLM,
    apiKey: 'your-api-key',
    baseURL: 'https://custom-gateway.com/v1',
};

const provider = ProviderRegistry.create(config);
```

### Q4: 如何调整生成参数？

```typescript
const agent = new Agent({
    // 温度（0-2，越高越随机）
    temperature: 0.1,  // 更稳定
    // temperature: 0.7,  // 更有创造性

    // 最大输出 token 数
    maxOutputTokens: 4096,

    // 最大上下文窗口
    maxTokens: 128000,

    // 请求超时（毫秒）
    // （在 ProviderConfig 中设置）
});
```

### Q5: MiniMax 需要 Group ID，如何获取？

1. 登录 [MiniMax 控制台](https://api.minimax.chat/)
2. 进入"开发者设置"或"API 密钥"
3. 复制 Group ID

```bash
# 在 .env 中配置
MINIMAX_API_KEY=sk-xxx
MINIMAX_GROUP_ID=your-group-id
```

### Q6: 如何处理 API Key 泄露？

**立即行动**：

1. 登录相应平台的控制台
2. 撤销或删除泄露的 API Key
3. 生成新的 API Key
4. 更新 `.env` 文件
5. 确保 `.env` 文件已添加到 `.gitignore`

**安全建议**：

```bash
# .gitignore
.env
.env.local
.env.*.local
```

### Q7: 支持哪些模型？

**OpenAI**: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo

**Kimi**: kimi-k2.5, kimi-k2-0905-preview, kimi-k1.5

**DeepSeek**: deepseek-chat, deepseek-coder

**GLM**: glm-4-plus, glm-4, glm-4-flash, glm-3-turbo

**MiniMax**: abab6.5s-chat, abab6-chat

**Qwen**: qwen-plus, qwen-turbo, qwen-max

---

## 完整配置示例

### 开发环境配置 (.env.development)

```bash
# ============================================================================
# LLM Provider Configuration
# ============================================================================

# 选择使用的模型（可选，系统会自动检测）
AI_MODEL=glm-4.7

# 生成温度
TEMPERATURE=0.7

# ============================================================================
# GLM Configuration (当前使用)
# ============================================================================

GLM_API_KEY=610bd1d093804268a5bd49bdaed4ffd4.eye0EsjDVkh4l1GB
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4

# ============================================================================
# 其他提供者配置（备用）
# ============================================================================

# Kimi
# KIMI_API_KEY=sk-xxx
# KIMI_BASE_URL=https://api.moonshot.cn/v1
# AI_MODEL=kimi-k2.5

# DeepSeek
# DEEPSEEK_API_KEY=sk-xxx
# DEEPSEEK_BASE_URL=https://api.deepseek.com
# AI_MODEL=deepseek-chat

# MiniMax
# MINIMAX_API_KEY=sk-xxx
# MINIMAX_GROUP_ID=xxx
# MINIMAX_BASE_URL=https://api.minimax.chat/v1
# AI_MODEL=abab6.5s-chat

# ============================================================================
# 其他配置
# ============================================================================

# Web Search API (Tavily)
TAVILY_API_KEY=tvly-xxx

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db

# Agent 配置
AGENT_MAX_LOOP=10
AGENT_MAX_TOOLS=8
AGENT_TIMEOUT=60000
AGENT_ENABLE_BACKUP=true
AGENT_MAX_BACKUPS=5
```

---

## 参考资源

- [OpenAI API 文档](https://platform.openai.com/docs)
- [Kimi API 文档](https://platform.moonshot.cn/docs)
- [DeepSeek API 文档](https://platform.deepseek.com/api-docs/)
- [GLM API 文档](https://open.bigmodel.cn/dev/api)
- [MiniMax API 文档](https://api.minimax.chat/document)
- [Qwen API 文档](https://help.aliyun.com/zh/dashscope/developer-reference/compatibility-of-openai-with-dashscope)

---

## 技术支持

如有问题，请参考以下资源：

1. 查看项目 README
2. 查看 `src/providers/config.ts` 了解默认配置
3. 查看 `src/providers/registry.ts` 了解提供者注册机制
4. 查看示例代码 `src/examples/`

---

**最后更新**: 2026-01-28
