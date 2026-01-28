# 快速开始 - API Key 配置

## 方法 1: 手动配置（推荐）

### 步骤 1: 复制示例文件

```bash
cp .env.example .env.development
```

### 步骤 2: 编辑配置文件

```bash
# 使用你喜欢的编辑器
nano .env.development
# 或
vim .env.development
# 或
code .env.development
```

### 步骤 3: 填入 API Key

选择一个提供者，填入相应的配置：

#### 使用 GLM (推荐新手）

```bash
AI_MODEL=glm-4.7
TEMPERATURE=0.7

GLM_API_KEY=your-api-key-here
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
```

#### 使用 Kimi

```bash
AI_MODEL=kimi-k2.5
TEMPERATURE=0.7

KIMI_API_KEY=your-api-key-here
KIMI_BASE_URL=https://api.moonshot.cn/v1
```

#### 使用 DeepSeek

```bash
AI_MODEL=deepseek-chat
TEMPERATURE=0.7

DEEPSEEK_API_KEY=your-api-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

### 步骤 4: 运行

```bash
# 开发模式
pnpm dev

# 或 CLI 模式
pnpm dev:cli-v2-ink
```

---

## 方法 2: 使用配置脚本

```bash
# 运行配置向导
./scripts/config-provider.sh

# 按照提示输入 API Key 和其他配置
```

---

## 方法 3: 命令行配置（临时）

```bash
# 使用 GLM
AI_MODEL=glm-4.7 GLM_API_KEY=your-key pnpm dev

# 使用 Kimi
AI_MODEL=kimi-k2.5 KIMI_API_KEY=your-key pnpm dev
```

---

## 支持的提供者

| 提供者 | 获取 API Key |
|--------|------------|
| OpenAI | https://platform.openai.com/api-keys |
| Kimi | https://platform.moonshot.cn/console/api-keys |
| DeepSeek | https://platform.deepseek.com/api_keys |
| GLM | https://open.bigmodel.cn/usercenter/apikeys |
| MiniMax | https://api.minimax.chat/user-center/basic-information/interface-key |
| Qwen | https://dashscope.console.aliyun.com/apiKey |

---

## 验证配置

运行以下命令验证配置是否正确：

```bash
# 检查环境变量
cat .env.development | grep API_KEY

# 或运行开发模式，查看是否报错
pnpm dev
```

---

## 常见问题

### Q: 我应该使用哪个提供者？

**新手推荐**：
- **GLM (Zhipu AI)**: 性能好，支持中文，API 稳定
- **Kimi (Moonshot AI)**: 上下文大（256K），适合长文本
- **DeepSeek**: 代码能力强，适合编程任务

**英文任务**: OpenAI (GPT-4o)

### Q: 配置不生效？

1. 检查文件名是否正确：`.env.development` （不是 `.env.development.txt`）
2. 检查是否在正确的目录下
3. 重启终端或运行 `source .env.development`

### Q: API Key 格式错误？

确保：
- 没有多余的空格
- 没有引号
- 完整复制，没有截断

### Q: 如何获取 API Key？

查看上方"支持的提供者"表格中的链接，注册后即可获取。

---

## 下一步

配置完成后：

1. 📖 阅读 [完整配置指南](./API_KEY_CONFIGURATION.md)
2. 🚀 运行 `pnpm dev` 启动应用
3. 💡 查看 [项目文档](../README.md)

---

**需要帮助？** 查看 [完整文档](./API_KEY_CONFIGURATION.md)
