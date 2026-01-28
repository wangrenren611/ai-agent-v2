# 快速使用示例

## 🚀 30 秒快速开始

```bash
# 设置环境变量
export ANTHROPIC_API_KEY="your-api-key"
export AI_MODEL="glm-4.7"

# 运行
pnpm dev
```

---

## 📝 常见使用场景

### 场景 1: 临时测试 GLM

```bash
export ANTHROPIC_API_KEY="your-glm-key"
export AI_MODEL="glm-4.7"
pnpm dev
```

### 场景 2: 长文本分析（Kimi）

```bash
export ANTHROPIC_API_KEY="your-kimi-key"
export AI_MODEL="kimi-k2.5"
pnpm dev
```

### 场景 3: 编程任务（DeepSeek）

```bash
export ANTHROPIC_API_KEY="your-deepseek-key"
export AI_MODEL="deepseek-chat"
pnpm dev
```

### 场景 4: 快速切换模型

```bash
# 使用 GLM
export AI_MODEL="glm-4.7"
pnpm dev

# 切换到 Kimi
export AI_MODEL="kimi-k2.5"
pnpm dev
```

---

## 🔧 配置示例

### 永久配置（推荐）

```bash
# 运行配置向导
pnpm setup:env

# 按照提示输入：
# API Key: sk-xxx
# 模型: 1 (glm-4.7)

# 重新加载
source ~/.zshrc

# 运行
pnpm dev
```

### 手动配置

#### macOS/Linux (zsh)

```bash
# 编辑配置
nano ~/.zshrc

# 添加以下内容
export ANTHROPIC_API_KEY="your-api-key"
export AI_MODEL="glm-4.7"

# 保存并退出 (Ctrl+X, Y, Enter)

# 重新加载
source ~/.zshrc

# 运行
pnpm dev
```

#### macOS/Linux (bash)

```bash
# 编辑配置
nano ~/.bash_profile

# 添加以下内容（同上）

# 保存并退出

# 重新加载
source ~/.bash_profile

# 运行
pnpm dev
```

---

## 🎯 支持的模型

| 模型 | 提供者 | 适用场景 |
|------|--------|---------|
| `glm-4.7` | GLM | 综合、中文 |
| `glm-4-plus` | GLM | 更强性能 |
| `kimi-k2.5` | Kimi | 长文本（256K） |
| `deepseek-chat` | DeepSeek | 编程 |
| `gpt-4o-mini` | OpenAI | 英文任务 |
| `abab6.5s-chat` | MiniMax | 特定应用 |
| `qwen-plus` | Qwen | 阿里云生态 |

---

## 💡 快速命令

### 设置并运行

```bash
# GLM
export ANTHROPIC_API_KEY="your-key" && export AI_MODEL="glm-4.7" && pnpm dev

# Kimi
export ANTHROPIC_API_KEY="your-key" && export AI_MODEL="kimi-k2.5" && pnpm dev

# DeepSeek
export ANTHROPIC_API_KEY="your-key" && export AI_MODEL="deepseek-chat" && pnpm dev
```

### 测试配置

```bash
# 检查环境变量
echo $ANTHROPIC_API_KEY
echo $AI_MODEL

# 运行测试脚本
pnpm test:env
```

### 清除配置

```bash
# 清除环境变量
unset ANTHROPIC_API_KEY
unset AI_MODEL
```

---

## 🔍 验证配置

### 步骤 1: 检查环境变量

```bash
echo $ANTHROPIC_API_KEY
echo $AI_MODEL
```

预期输出：
```
sk-xxx...
glm-4.7
```

### 步骤 2: 运行测试脚本

```bash
pnpm test:env
```

预期输出：
```
✅ ANTHROPIC_API_KEY: sk-xxx...
✅ AI_MODEL: glm-4.7
✅ 配置检测完成
```

### 步骤 3: 运行 AI Agent

```bash
pnpm dev
```

预期输出：
```
[Agent] Initializing Agent...
[Agent] Configuration source: System environment variables
[ProviderRegistry] Using ANTHROPIC_API_KEY (universal key)
[Agent] Provider created successfully
[Agent] Tools registered
[Agent] Agent started
```

---

## 🛠️ 故障排除

### 问题: 配置不生效

```bash
# 检查环境变量
echo $ANTHROPIC_API_KEY

# 重新加载配置
source ~/.zshrc

# 重启终端
exec zsh
```

### 问题: 找不到 API Key

```bash
# 设置 ANTHROPIC_API_KEY
export ANTHROPIC_API_KEY="your-api-key"

# 或运行配置向导
pnpm setup:env
```

### 问题: 模型不支持

```bash
# 切换到支持的模型
export AI_MODEL="glm-4.7"
pnpm dev
```

---

## 📖 更多文档

- **[快速参考](./ENV_QUICK_REFERENCE.md)** - 快速命令参考
- **[详细配置](./ENVIRONMENT_VARIABLES.md)** - 完整配置指南
- **[功能总结](./FEATURE_ENVIRONMENT_VARIABLES.md)** - 功能特性说明

---

**最后更新**: 2026-01-28
