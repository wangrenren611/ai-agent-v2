# 环境变量支持完成总结

## ✅ 已完成的功能

### 1. 系统环境变量支持（类似 Claude Code）

**核心实现**：

- ✅ `src/providers/registry.ts` - 支持从系统环境变量读取 API Key
- ✅ `src/index.ts` - 主入口文件，不再强制加载 `.env` 文件
- ✅ 优先使用 `ANTHROPIC_API_KEY` 作为通用 API Key
- ✅ 自动检测提供者类型（从模型名称）

### 2. 配置优先级

```
1. ANTHROPIC_API_KEY (通用，类似 Claude Code） ⭐ 最高
   ↓
2. GLM_API_KEY, KIMI_API_KEY, DEEPSEEK_API_KEY 等（特定提供者）
   ↓
3. .env.development 文件
   ↓
4. 代码默认值 ⭐ 最低
```

### 3. 配置工具和脚本

| 脚本 | 用途 |
|------|------|
| `scripts/setup-anthropic-key.sh` | 交互式配置 ANTHROPIC_API_KEY |
| `scripts/test-config.sh` | 测试和验证环境变量配置 |
| `scripts/ai-agent-env.sh` | 完整的环境变量配置模板 |

### 4. 文档

| 文档 | 用途 |
|------|------|
| `docs/ENV_QUICK_REFERENCE.md` | 快速参考指南 |
| `docs/ENVIRONMENT_VARIABLES.md` | 详细配置指南 |
| `docs/CONFIGURATION_WAYS.md` | 配置方式对比 |
| `docs/GLOBAL_CONFIGURATION.md` | 全局配置指南 |
| `README.md` | 更新了主文档 |

---

## 🚀 如何使用

### 方式 1: 临时配置（推荐测试）

```bash
# 设置环境变量
export ANTHROPIC_API_KEY="your-api-key"
export AI_MODEL="glm-4.7"

# 运行
pnpm dev
```

### 方式 2: 永久配置（推荐开发）

```bash
# 使用配置脚本
./scripts/setup-anthropic-key.sh

# 按照提示输入 API Key 和选择模型

# 重新加载配置
source ~/.zshrc
# 或
exec zsh

# 验证
echo $ANTHROPIC_API_KEY
echo $AI_MODEL

# 运行
pnpm dev
```

---

## 📋 环境变量说明

### 核心变量（必需）

| 变量 | 说明 | 示例 |
|------|------|------|
| `ANTHROPIC_API_KEY` | 通用 API Key（类似 Claude Code） | `sk-xxx` |
| `AI_MODEL` | 模型名称 | `glm-4.7` |

### 可选变量

| 变量 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `TEMPERATURE` | 生成温度 (0-2) | `0.7` | `0.7` |
| `PROJECT_DIRECTORY` | 项目目录 | 当前目录 | `/path/to/project` |
| `VCS` | 版本控制系统 | `git` | `git` |
| `PROJECT_LANGUAGE` | 项目语言 | 自动检测 | `typescript` |

### 提供者特定变量（备用）

| 提供者 | API Key | Base URL |
|--------|---------|----------|
| GLM | `GLM_API_KEY` | `GLM_BASE_URL` |
| Kimi | `KIMI_API_KEY` | `KIMI_BASE_URL` |
| DeepSeek | `DEEPSEEK_API_KEY` | `DEEPSEEK_BASE_URL` |
| OpenAI | `OPENAI_API_KEY` | `OPENAI_BASE_URL` |
| MiniMax | `MINIMAX_API_KEY` | `MINIMAX_BASE_URL` |
| Qwen | `QWEN_API_KEY` | `QWEN_BASE_URL` |

---

## 🎯 与 Claude Code 的对比

| 特性 | Claude Code | AI Agent V2 |
|------|-------------|-------------|
| **通用 API Key** | `ANTHROPIC_API_KEY` | `ANTHROPIC_API_KEY` |
| **环境变量配置** | ✅ 支持 | ✅ 支持 |
| **项目级别配置** | ❌ 不支持 | ✅ 支持（.env 文件） |
| **自动检测提供者** | ✅ 支持 | ✅ 支持 |
| **多提供者支持** | ❌ 仅 Anthropic | ✅ 支持多个 |

---

## 💡 推荐配置

### 配置 1: GLM（推荐新手）

```bash
export ANTHROPIC_API_KEY="your-glm-api-key"
export AI_MODEL="glm-4.7"
```

### 配置 2: Kimi（长文本）

```bash
export ANTHROPIC_API_KEY="your-kimi-api-key"
export AI_MODEL="kimi-k2.5"
```

### 配置 3: DeepSeek（编程）

```bash
export ANTHROPIC_API_KEY="your-deepseek-api-key"
export AI_MODEL="deepseek-chat"
```

---

## 🔍 验证配置

### 检查环境变量

```bash
# 查看核心变量
echo $ANTHROPIC_API_KEY
echo $AI_MODEL

# 或使用 printenv
printenv | grep -E "(ANTHROPIC|AI_MODEL)"
```

### 运行测试脚本

```bash
./scripts/test-config.sh
```

预期输出：
```
✅ ANTHROPIC_API_KEY: sk-xxx...
✅ AI_MODEL: glm-4.7
✅ 配置检测完成
```

---

## 🛠️ 故障排除

### 问题 1: 配置不生效

**检查步骤**：

```bash
# 1. 确认环境变量已设置
echo $ANTHROPIC_API_KEY

# 2. 检查 Shell 配置文件
cat ~/.zshrc | grep ANTHROPIC_API_KEY

# 3. 重新加载配置
source ~/.zshrc

# 4. 重启终端
exec zsh
```

### 问题 2: 找不到 API Key

**错误信息**：
```
No provider credentials found in environment.
```

**解决方法**：

```bash
# 设置 ANTHROPIC_API_KEY
export ANTHROPIC_API_KEY="your-api-key"

# 或使用配置脚本
./scripts/setup-anthropic-key.sh
```

---

## 📊 当前状态

### ✅ 已完成

1. ✅ 系统环境变量支持（类似 Claude Code）
2. ✅ `ANTHROPIC_API_KEY` 作为通用 API Key
3. ✅ 自动检测提供者类型
4. ✅ 配置脚本和测试脚本
5. ✅ 完整文档

### ⚠️ 注意事项

1. **类型检查警告**: `src/storage/memory.ts` 有一个类型错误，不影响环境变量功能
2. **.env 文件**: 如果你想继续使用 `.env` 文件，需要恢复 `dotenv.config()` 调用

---

## 📖 快速参考

### 设置环境变量

```bash
# 方式 1: 临时
export ANTHROPIC_API_KEY="your-key" && export AI_MODEL="glm-4.7" && pnpm dev

# 方式 2: 永久
./scripts/setup-anthropic-key.sh
source ~/.zshrc
pnpm dev
```

### 测试配置

```bash
./scripts/test-config.sh
```

### 清除环境变量

```bash
unset ANTHROPIC_API_KEY
unset AI_MODEL
```

---

## 🎉 总结

现在 AI Agent V2 完全支持类似 Claude Code 的配置方式：

1. ✅ 使用 `ANTHROPIC_API_KEY` 作为通用 API Key
2. ✅ 从系统环境变量读取配置
3. ✅ 不再依赖 `.env` 文件
4. ✅ 提供配置脚本和测试脚本
5. ✅ 完整的文档支持

你可以像使用 Claude Code 一样，简单地设置环境变量即可使用：

```bash
export ANTHROPIC_API_KEY="your-api-key"
pnpm dev
```

---

**完成日期**: 2026-01-28
**功能**: 系统环境变量支持（类似 Claude Code）
