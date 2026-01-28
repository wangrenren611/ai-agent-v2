# 🚀 快速开始卡片

## ⚡ 30 秒开始使用

```bash
# 1. 设置环境变量
export ANTHROPIC_API_KEY="your-api-key"
export AI_MODEL="glm-4.7"

# 2. 运行
pnpm dev
```

---

## 📋 环境变量清单

### 必需

```bash
ANTHROPIC_API_KEY="your-api-key"
AI_MODEL="glm-4.7"
```

### 可选

```bash
TEMPERATURE="0.7"
PROJECT_DIRECTORY="/path/to/project"
VCS="git"
PROJECT_LANGUAGE="typescript"
```

---

## 🎯 推荐配置

### GLM (推荐新手）
```bash
export ANTHROPIC_API_KEY="your-glm-key"
export AI_MODEL="glm-4.7"
```

### Kimi (长文本）
```bash
export ANTHROPIC_API_KEY="your-kimi-key"
export AI_MODEL="kimi-k2.5"
```

### DeepSeek (编程）
```bash
export ANTHROPIC_API_KEY="your-deepseek-key"
export AI_MODEL="deepseek-chat"
```

---

## 🛠️ 快速命令

### 配置
```bash
pnpm setup:env
```

### 测试
```bash
pnpm test:env
```

### 运行
```bash
pnpm dev
```

---

## ✅ 验证配置

```bash
# 检查环境变量
echo $ANTHROPIC_API_KEY
echo $AI_MODEL

# 运行测试
pnpm test:env
```

---

## 📖 完整文档

- [快速参考](./ENV_QUICK_REFERENCE.md)
- [详细配置](./ENVIRONMENT_VARIABLES.md)
- [使用示例](./QUICK_START_EXAMPLES.md)

---

**提示**: 类似 Claude Code，使用 `ANTHROPIC_API_KEY` 作为通用 API Key！
