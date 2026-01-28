# 系统环境变量配置指南 (Claude Code 风格）

## 📖 概述

现在 AI Agent 支持**类似 Claude Code**的配置方式：直接从系统环境变量读取 API Key，无需 `.env` 文件。

---

## 🎯 两种配置方式

| 方式 | 优先级 | 说明 | 适用场景 |
|------|--------|------|---------|
| **系统环境变量** | ⭐⭐⭐ 最高 | 类似 Claude Code，直接从 Shell 读取 | 推荐、全局共享 |
| **.env 文件** | ⭐⭐ 较低 | 项目级别的配置文件 | 多项目隔离 |

---

## 🚀 快速开始

### 方法 1: 使用配置脚本（推荐）

```bash
# 运行配置向导
./scripts/setup-env.sh

# 按照提示输入 API Key
# 1. 输入 API Key
# 2. 选择模型
# 3. 设置温度（可选）
# 4. 重新加载 Shell 配置

# 验证配置
echo $ANTHROPIC_API_KEY
echo $AI_MODEL

# 运行 AI Agent
pnpm dev
```

### 方法 2: 手动配置

#### macOS/Linux (zsh)

```bash
# 编辑 Shell 配置
nano ~/.zshrc

# 添加以下内容（在文件末尾）
# ============================================================================
# AI Agent Configuration (类似 Claude Code）
# ============================================================================

export ANTHROPIC_API_KEY="your-api-key-here"
export AI_MODEL="glm-4.7"
export TEMPERATURE="0.7"

# 保存并退出 (Ctrl+X, Y, Enter)

# 重新加载配置
source ~/.zshrc

# 或重启终端
exec zsh
```

#### macOS/Linux (bash)

```bash
# 编辑 Shell 配置
nano ~/.bash_profile

# 添加以下内容（同上）
# [添加配置内容]

# 保存并退出

# 重新加载配置
source ~/.bash_profile
```

### 方法 3: 临时配置（测试用）

```bash
# 仅在当前终端会话有效
export ANTHROPIC_API_KEY="your-api-key"
export AI_MODEL="glm-4.7"

# 运行 AI Agent
pnpm dev

# 关闭终端后失效
```

---

## 📋 环境变量说明

### 核心变量

| 变量名 | 说明 | 默认值 | 示例 |
|--------|------|--------|------|
| `ANTHROPIC_API_KEY` | **通用 API Key**（类似 Claude Code） | 必需 | `sk-xxx` |
| `AI_MODEL` | 选择的模型 | `glm-4.7` | `glm-4.7` |
| `TEMPERATURE` | 生成温度 (0-2) | `0.7` | `0.7` |

### 提供者特定变量（备用）

如果你不想使用 `ANTHROPIC_API_KEY`，可以使用特定提供者的 API Key：

| 提供者 | API Key 变量 | Base URL 变量 |
|--------|-------------|---------------|
| GLM | `GLM_API_KEY` | `GLM_BASE_URL` |
| Kimi | `KIMI_API_KEY` | `KIMI_BASE_URL` |
| DeepSeek | `DEEPSEEK_API_KEY` | `DEEPSEEK_BASE_URL` |
| OpenAI | `OPENAI_API_KEY` | `OPENAI_BASE_URL` |
| MiniMax | `MINIMAX_API_KEY` | `MINIMAX_BASE_URL` |
| Qwen | `QWEN_API_KEY` | `QWEN_BASE_URL` |

**优先级**：
1. `ANTHROPIC_API_KEY` （最高）
2. 提供者特定的 API Key
3. `.env` 文件（最低）

---

## 🔍 配置优先级

系统按照以下优先级查找 API Key：

```
1. ANTHROPIC_API_KEY (全局通用，类似 Claude Code） ⭐ 最高
   ↓
2. GLM_API_KEY (GLM 专用）
3. KIMI_API_KEY (Kimi 专用）
4. DEEPSEEK_API_KEY (DeepSeek 专用）
5. OPENAI_API_KEY (OpenAI 专用）
6. MINIMAX_API_KEY (MiniMax 专用）
7. QWEN_API_KEY (Qwen 专用）
   ↓
8. .env.development 文件
   ↓
9. 代码中的默认值 ⭐ 最低
```

### 配置示例

#### 使用 ANTHROPIC_API_KEY（推荐）

```bash
export ANTHROPIC_API_KEY="your-glm-api-key"
export AI_MODEL="glm-4.7"
```

**说明**：
- 类似 Claude Code 的方式
- 一个 API Key 用于所有提供者
- 根据模型名称自动选择提供者

#### 使用特定提供者的 API Key

```bash
export GLM_API_KEY="your-glm-api-key"
export AI_MODEL="glm-4.7"
```

**说明**：
- 特定于 GLM 提供者
- 不会自动选择其他提供者

---

## 💡 推荐配置

### 配置 1: GLM（推荐新手）

```bash
export ANTHROPIC_API_KEY="your-glm-api-key"
export AI_MODEL="glm-4.7"
export TEMPERATURE="0.7"
```

**优势**：
- 性能优秀
- 支持中文
- API 稳定

### 配置 2: Kimi（长文本）

```bash
export ANTHROPIC_API_KEY="your-kimi-api-key"
export AI_MODEL="kimi-k2.5"
export TEMPERATURE="0.7"
```

**优势**：
- 上下文大（256K tokens）
- 适合长文档分析

### 配置 3: DeepSeek（编程）

```bash
export ANTHROPIC_API_KEY="your-deepseek-api-key"
export AI_MODEL="deepseek-chat"
export TEMPERATURE="0.7"
```

**优势**：
- 代码能力强
- 支持编程任务

---

## 🔍 验证配置

### 1. 检查环境变量

```bash
# 查看核心变量
echo "API Key: $ANTHROPIC_API_KEY"
echo "模型: $AI_MODEL"
echo "温度: $TEMPERATURE"

# 或使用 printenv
printenv | grep -E "(ANTHROPIC|AI_MODEL|TEMPERATURE)"
```

### 2. 测试运行

```bash
# 运行开发模式
pnpm dev

# 应该看到：
# [Agent] Initializing Agent...
# [Agent] Configuration source: System environment variables
# [ProviderRegistry] Using ANTHROPIC_API_KEY (universal key)
# [Agent] Provider created successfully
# [Agent] Tools registered
# [Agent] Agent started
```

### 3. 运行配置测试脚本

```bash
# （如果有的话）
./scripts/test-config.sh
```

---

## 🔄 切换配置

### 从 .env 切换到环境变量

```bash
# 1. 设置环境变量
export ANTHROPIC_API_KEY="your-api-key"

# 2. 备份 .env 文件
mv .env.development .env.development.backup

# 3. 运行测试
pnpm dev
```

### 从环境变量切换回 .env

```bash
# 1. 删除环境变量（临时）
unset ANTHROPIC_API_KEY

# 2. 恢复 .env 文件
mv .env.development.backup .env.development

# 3. 修改 src/index.ts 启用 dotenv（如果有注释）
# 添加: import dotenv from 'dotenv';
# 添加: dotenv.config({ path: `.env.${env}`, override: true });
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
# 方法 1: 设置 ANTHROPIC_API_KEY
export ANTHROPIC_API_KEY="your-api-key"

# 方法 2: 或设置特定提供者的 Key
export GLM_API_KEY="your-api-key"

# 验证
echo $ANTHROPIC_API_KEY
```

### 问题 3: 仍然读取 .env 文件

**原因**：`src/index.ts` 中可能仍有 `dotenv.config()`

**解决方法**：

检查 `src/index.ts`，应该没有以下代码：

```typescript
// ❌ 删除或注释掉
// import dotenv from 'dotenv';
// dotenv.config({ path: `.env.${env}`, override: true });
```

---

## 🚀 快速命令参考

### 设置环境变量（临时）

```bash
# GLM
export ANTHROPIC_API_KEY="your-key" && export AI_MODEL="glm-4.7" && pnpm dev

# Kimi
export ANTHROPIC_API_KEY="your-key" && export AI_MODEL="kimi-k2.5" && pnpm dev
```

### 快速切换模型

```bash
# 切换到 GLM
export AI_MODEL="glm-4.7"

# 切换到 Kimi
export AI_MODEL="kimi-k2.5"

# 运行
pnpm dev
```

### 清除环境变量

```bash
# 清除 AI Agent 相关变量
unset ANTHROPIC_API_KEY
unset AI_MODEL
unset TEMPERATURE

# 运行（会使用 .env 或默认值）
pnpm dev
```

---

## 📊 配置对比

### .env 文件方式（旧）

**优点**：
- ✅ 项目隔离
- ✅ 便于版本控制
- ✅ 团队协作友好

**缺点**：
- ❌ 每个项目需要配置
- ❌ 需要管理多个文件

### 环境变量方式（新，类似 Claude Code）

**优点**：
- ✅ 全局共享
- ✅ 简化配置
- ✅ 类似 Claude Code 的体验

**缺点**：
- ❌ 需要编辑 Shell 配置
- ❌ 所有项目共享（可能冲突）

---

## 🔒 安全建议

### 1. Shell 配置文件权限

```bash
# 限制 .zshrc 权限
chmod 600 ~/.zshrc

# 查看权限
ls -la ~/.zshrc
```

### 2. 不要在终端历史中保存

```bash
# 如果不小心在命令行输入了 API Key
# 从历史中删除
history | grep "ANTHROPIC_API_KEY"  # 查找
history -d <line_number>          # 删除指定行
```

### 3. 使用环境变量管理工具

考虑使用：
- **direnv**: 项目级别的自动环境变量加载
- **envchain**: 加密存储敏感信息
- **1Password**: 密码管理器集成

### 4. 使用 .env 文件 + gitignore

如果仍想用 .env 文件：

```bash
# 确保 .gitignore 包含
.env
.env.development
.env.production
```

---

## 📖 完整示例

### macOS (zsh) 完整配置

```bash
# 编辑 ~/.zshrc
nano ~/.zshrc

# 添加以下内容
# ============================================================================
# AI Agent Configuration (类似 Claude Code）
# ============================================================================

# 使用 ANTHROPIC_API_KEY 作为通用 API Key
export ANTHROPIC_API_KEY="your-glm-api-key-here"

# 选择默认模型
export AI_MODEL="glm-4.7"

# 生成温度
export TEMPERATURE="0.7"

# 可选：项目特定配置
export PROJECT_DIRECTORY="$HOME/work/ai-agent-v2"
export VCS="git"
export PROJECT_LANGUAGE="typescript"

# ============================================================================
# End AI Agent Configuration
# ============================================================================

# 保存并退出 (Ctrl+X, Y, Enter)

# 重新加载配置
source ~/.zshrc

# 验证
echo $ANTHROPIC_API_KEY
echo $AI_MODEL

# 运行
pnpm dev
```

---

## 🆘 需要帮助？

1. 运行配置向导：`./scripts/setup-env.sh`
2. 查看项目文档：`docs/API_KEY_CONFIGURATION.md`
3. 检查环境变量：`echo $ANTHROPIC_API_KEY`
4. 提交 GitHub Issues

---

**最后更新**: 2026-01-28
