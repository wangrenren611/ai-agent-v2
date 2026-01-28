# API Key 配置总结

## 📚 文档索引

| 文档 | 用途 |
|------|------|
| [快速开始](./QUICK_START.md) | 新手快速配置指南 |
| [完整配置指南](./API_KEY_CONFIGURATION.md) | 详细的配置说明和示例 |
| [本总结](./CONFIGURATION_SUMMARY.md) | 快速参考和常见问题 |

---

## 🚀 三分钟快速配置

### 步骤 1: 复制配置文件

```bash
cp .env.development.example .env.development
```

### 步骤 2: 选择一个提供者并填入 API Key

#### 使用 GLM (推荐新手）

```bash
# 在 .env.development 中
AI_MODEL=glm-4.7
GLM_API_KEY=your-api-key-here
GLM_BASE_URL=https://open.bigmodel.cn/api/coding/paas/v4
```

#### 使用 Kimi

```bash
# 在 .env.development 中
AI_MODEL=kimi-k2.5
KIMI_API_KEY=your-api-key-here
KIMI_BASE_URL=https://api.moonshot.cn/v1
```

#### 使用 DeepSeek

```bash
# 在 .env.development 中
AI_MODEL=deepseek-chat
DEEPSEEK_API_KEY=your-api-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

### 步骤 3: 运行

```bash
pnpm dev
```

---

## 📋 支持的提供者

| 提供者 | API Key | 默认模型 | 适用场景 |
|--------|---------|---------|---------|
| **GLM** | `GLM_API_KEY` | glm-4-plus | 综合、中文任务 |
| **Kimi** | `KIMI_API_KEY` | kimi-k2.5 | 长文本（256K上下文） |
| **DeepSeek** | `DEEPSEEK_API_KEY` | deepseek-chat | 编程任务 |
| **OpenAI** | `OPENAI_API_KEY` | gpt-4o-mini | 英文任务 |
| **MiniMax** | `MINIMAX_API_KEY` | abab6.5s-chat | 特定应用 |
| **Qwen** | `QWEN_API_KEY` | qwen-plus | 阿里云生态 |

### 获取 API Key

| 提供者 | 注册地址 |
|--------|---------|
| GLM | https://open.bigmodel.cn/usercenter/apikeys |
| Kimi | https://platform.moonshot.cn/console/api-keys |
| DeepSeek | https://platform.deepseek.com/api_keys |
| OpenAI | https://platform.openai.com/api-keys |
| MiniMax | https://api.minimax.chat/user-center/basic-information/interface-key |
| Qwen | https://dashscope.console.aliyun.com/apiKey |

---

## 🔧 配置方法

### 方法 1: 手动编辑（推荐）

```bash
# 1. 复制示例文件
cp .env.development.example .env.development

# 2. 编辑文件
nano .env.development

# 3. 填入 API Key
# 例如：
# GLM_API_KEY=your-key-here

# 4. 运行
pnpm dev
```

### 方法 2: 使用配置脚本

```bash
# 运行配置向导
./scripts/config-provider.sh

# 按照提示选择提供者并输入 API Key
```

### 方法 3: 命令行临时配置

```bash
# 临时使用 GLM
GLM_API_KEY=your-key pnpm dev

# 临时使用 Kimi
KIMI_API_KEY=your-key pnpm dev
```

---

## 📝 环境变量说明

### 必需变量

所有提供者都需要配置其 API Key：

- `GLM_API_KEY` - GLM 提供者的 API Key
- `KIMI_API_KEY` - Kimi 提供者的 API Key
- `DEEPSEEK_API_KEY` - DeepSeek 提供者的 API Key
- `OPENAI_API_KEY` - OpenAI 提供者的 API Key
- `MINIMAX_API_KEY` - MiniMax 提供者的 API Key（还需要 `MINIMAX_GROUP_ID`）
- `QWEN_API_KEY` - Qwen 提供者的 API Key

### 可选变量

```bash
# 选择模型
AI_MODEL=glm-4.7

# 生成温度 (0-2)
TEMPERATURE=0.7

# 自定义 Base URL
GLM_BASE_URL=https://custom-url.com/v1

# MiniMax Group ID
MINIMAX_GROUP_ID=your-group-id
```

---

## 🔍 验证配置

### 1. 检查环境变量

```bash
# 查看配置文件
cat .env.development | grep API_KEY

# 或查看特定提供者
cat .env.development | grep GLM_API_KEY
```

### 2. 测试运行

```bash
# 运行开发模式
pnpm dev

# 如果配置正确，会看到 Agent 启动信息
# 如果配置错误，会看到 API Key 相关的错误
```

### 3. 检查代码中的提供者

查看 `src/index.ts`，确认使用的提供者：

```typescript
// 当前使用 GLM
const llmProvider = ProviderRegistry.createFromEnv(ProviderType.GLM);

// 或自动检测
const llmProvider = ProviderRegistry.createFromEnv();
```

---

## ❓ 常见问题

### Q: 如何切换提供者？

**方法 1: 修改 AI_MODEL**

```bash
# 在 .env.development 中
AI_MODEL=kimi-k2.5
```

**方法 2: 修改代码**

```typescript
// 在 src/index.ts 中
const llmProvider = ProviderRegistry.createFromEnv(ProviderType.KIMI);
```

### Q: API Key 哪里获取？

查看上方"支持的提供者"表格中的"注册地址"链接。

### Q: 配置不生效？

1. 检查文件名：应该是 `.env.development`（不是 `.env.development.txt`）
2. 检查格式：确保没有多余空格、引号
3. 重启终端：运行 `source .env.development` 或重启应用

### Q: MiniMax 提示缺少 Group ID？

MiniMax 需要两个配置：

```bash
MINIMAX_API_KEY=sk-xxx
MINIMAX_GROUP_ID=your-group-id
```

Group ID 从 [MiniMax 控制台](https://api.minimax.chat) 获取。

### Q: 如何设置自定义 Base URL？

```bash
# 在 .env.development 中
GLM_BASE_URL=https://your-custom-url.com/v1
```

或在代码中：

```typescript
const config: GLMConfig = {
    type: ProviderType.GLM,
    apiKey: 'your-key',
    baseURL: 'https://custom-url.com/v1',
};
```

### Q: 如何调整生成参数？

```typescript
const agent = new Agent({
    model: 'glm-4.7',
    llmProvider,
    temperature: 0.1,    // 更稳定
    // temperature: 0.7,  // 更有创造性
    maxTokens: 128000,
    maxOutputTokens: 4096,
});
```

---

## 🔒 安全建议

### 1. 不要提交 API Key 到 Git

确保 `.gitignore` 包含：

```gitignore
.env
.env.local
.env.*.local
.env.development
.env.production
```

### 2. 使用环境变量

生产环境使用环境变量，不要硬编码在代码中：

```typescript
// ❌ 错误
const apiKey = 'sk-xxx';

// ✅ 正确
const apiKey = process.env.GLM_API_KEY;
```

### 3. API Key 泄露处理

如果 API Key 泄露：

1. 登录相应平台控制台
2. 撤销旧的 API Key
3. 生成新的 API Key
4. 更新 `.env.development`
5. 不要提交到 Git

---

## 📚 更多资源

- [快速开始](./QUICK_START.md) - 新手快速配置
- [完整配置指南](./API_KEY_CONFIGURATION.md) - 详细说明和示例
- [项目 README](../README.md) - 项目概览
- [项目架构分析](./PROJECT_ANALYSIS.md) - 技术细节

---

## 🆘 需要帮助？

1. 查看文档：[完整配置指南](./API_KEY_CONFIGURATION.md)
2. 检查配置：运行 `cat .env.development | grep API_KEY`
3. 查看错误：运行 `pnpm dev` 查看具体错误信息
4. GitHub Issues: 提问并附上错误信息

---

**最后更新**: 2026-01-28
