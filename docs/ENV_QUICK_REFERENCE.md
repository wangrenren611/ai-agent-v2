# 环境变量配置 - 快速参考 (类似 Claude Code）

## ⚡ 1 分钟快速开始

```bash
# 方式 1: 临时配置（测试用）
export ANTHROPIC_API_KEY="your-api-key"
export AI_MODEL="glm-4.7"
pnpm dev
```

---

## 🚀 5 分钟完整配置

### 步骤 1: 获取 API Key

选择一个 LLM 提供者并获取 API Key：

| 提供者 | 获取地址 | 推荐度 |
|--------|---------|--------|
| **GLM** | https://open.bigmodel.cn/usercenter/apikeys | ⭐⭐⭐⭐⭐ |
| Kimi | https://platform.moonshot.cn/console/api-keys | ⭐⭐⭐⭐ |
| DeepSeek | https://platform.deepseek.com/api_keys | ⭐⭐⭐⭐ |
| OpenAI | https://platform.openai.com/api-keys | ⭐⭐⭐ |

### 步骤 2: 配置环境变量

#### 临时配置（推荐测试）

```bash
# 设置环境变量
export ANTHROPIC_API_KEY="your-api-key-here"
export AI_MODEL="glm-4.7"

# 验证
echo $ANTHROPIC_API_KEY
echo $AI_MODEL

# 运行
pnpm dev
```

#### 永久配置（推荐开发）

```bash
# 使用配置脚本
./scripts/setup-anthropic-key.sh

# 按照提示输入:
# 1. API Key
# 2. 选择模型

# 重新加载配置
source ~/.zshrc
# 或
exec zsh

# 验证
echo $ANTHROPIC_API_KEY
```

### 步骤 3: 运行测试

```bash
# 测试配置
./scripts/test-config.sh

# 运行 AI Agent
pnpm dev

# 或运行 CLI 模式
pnpm dev:cli-v2-ink
```

---

## 📋 环境变量清单

### 核心变量（必需）

| 变量 | 说明 | 示例 |
|------|------|------|
| `ANTHROPIC_API_KEY` | **通用 API Key**（类似 Claude Code） | `sk-xxx` |
| `AI_MODEL` | 模型名称 | `glm-4.7` |

### 可选变量

| 变量 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `TEMPERATURE` | 生成温度 (0-2) | `0.7` | `0.7` |
| `PROJECT_DIRECTORY` | 项目目录 | 当前目录 | `/path/to/project` |
| `VCS` | 版本控制系统 | `git` | `git` |
| `PROJECT_LANGUAGE` | 项目语言 | 自动检测 | `typescript` |

### 提供者特定变量（备用）

如果不想用 `ANTHROPIC_API_KEY`：

| 提供者 | API Key | Base URL |
|--------|---------|----------|
| GLM | `GLM_API_KEY` | `GLM_BASE_URL` |
| Kimi | `KIMI_API_KEY` | `KIMI_BASE_URL` |
| DeepSeek | `DEEPSEEK_API_KEY` | `DEEPSEEK_BASE_URL` |
| OpenAI | `OPENAI_API_KEY` | `OPENAI_BASE_URL` |
| MiniMax | `MINIMAX_API_KEY` | `MINIMAX_BASE_URL` |
| Qwen | `QWEN_API_KEY` | `QWEN_BASE_URL` |

---

## 🎯 支持的模型

| 模型 | 提供者 | 特点 |
|------|--------|------|
| `glm-4.7` | GLM | 综合能力，中文优秀 |
| `glm-4-plus` | GLM | 更强性能 |
| `kimi-k2.5` | Kimi | 长文本（256K） |
| `deepseek-chat` | DeepSeek | 编程能力强 |
| `gpt-4o-mini` | OpenAI | 英文任务 |
| `abab6.5s-chat` | MiniMax | 特定应用 |
| `qwen-plus` | Qwen | 阿里云生态 |

---

## ⚙️ 配置脚本

### 快速设置 ANTHROPIC_API_KEY

```bash
./scripts/setup-anthropic-key.sh
```

功能：
- 交互式配置向导
- 自动选择模型
- 自动写入 Shell 配置
- 自动备份原配置

### 测试配置

```bash
./scripts/test-config.sh
```

功能：
- 检查所有环境变量
- 显示配置优先级
- 提供修复建议

---

## 🔄 配置优先级

系统按以下顺序查找 API Key：

```
1. ANTHROPIC_API_KEY (通用，类似 Claude Code） ⭐ 最高
   ↓
2. GLM_API_KEY
3. KIMI_API_KEY
4. DEEPSEEK_API_KEY
5. OPENAI_API_KEY
6. MINIMAX_API_KEY
7. QWEN_API_KEY
   ↓
8. .env.development 文件
   ↓
9. 代码默认值 ⭐ 最低
```

---

## 💡 快速命令

### 设置环境变量

```bash
# GLM
export ANTHROPIC_API_KEY="your-key" && export AI_MODEL="glm-4.7" && pnpm dev

# Kimi
export ANTHROPIC_API_KEY="your-key" && export AI_MODEL="kimi-k2.5" && pnpm dev

# DeepSeek
export ANTHROPIC_API_KEY="your-key" && export AI_MODEL="deepseek-chat" && pnpm dev
```

### 切换模型

```bash
# 临时切换
export AI_MODEL="kimi-k2.5"
pnpm dev
```

### 清除环境变量

```bash
unset ANTHROPIC_API_KEY
unset AI_MODEL
```

---

## 🛠️ 故障排除

### 问题: 配置不生效

**检查步骤**：

```bash
# 1. 验证环境变量
echo $ANTHROPIC_API_KEY
echo $AI_MODEL

# 2. 重新加载 Shell
source ~/.zshrc
# 或
exec zsh

# 3. 重启终端
```

### 问题: 找不到 API Key

**错误**:
```
No provider credentials found in environment.
```

**解决**：

```bash
# 设置 ANTHROPIC_API_KEY
export ANTHROPIC_API_KEY="your-api-key"

# 或使用配置脚本
./scripts/setup-anthropic-key.sh
```

### 问题: 仍然读取 .env 文件

**原因**: 代码中可能有 `dotenv.config()`

**解决**: 检查 `src/index.ts`，应该没有以下代码：

```typescript
// ❌ 删除或注释
// import dotenv from 'dotenv';
// dotenv.config({ path: `.env.${env}`, override: true });
```

---

## 📖 完整文档

- **[docs/ENVIRONMENT_VARIABLES.md](./docs/ENVIRONMENT_VARIABLES.md)** - 详细配置指南
- **[docs/CONFIGURATION_WAYS.md](./docs/CONFIGURATION_WAYS.md)** - 配置方式对比
- **[docs/API_KEY_CONFIGURATION.md](./docs/API_KEY_CONFIGURATION.md)** - 完整配置指南
- **[docs/QUICK_START.md](./docs/QUICK_START.md)** - 项目级别配置

---

## 🔒 安全建议

1. **不要提交 API Key**
   ```bash
   # 确保 .gitignore 包含
   .env
   .env.development
   ```

2. **限制文件权限**
   ```bash
   chmod 600 ~/.zshrc
   ```

3. **使用环境变量管理工具**
   - **direnv**: 项目级别自动加载
   - **envchain**: 加密存储
   - **1Password**: 密码管理器

---

## ✅ 验证配置

运行测试脚本验证配置是否正确：

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

**最后更新**: 2026-01-28
