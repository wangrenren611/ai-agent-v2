# 环境变量配置完整指南

## 📖 目录

- [快速开始](#快速开始)
- [配置方式](#配置方式)
- [环境变量说明](#环境变量说明)
- [配置优先级](#配置优先级)
- [支持的模型](#支持的模型)
- [配置示例](#配置示例)
- [故障排除](#故障排除)

---

## 快速开始

### ⚡ 30 秒开始使用

```bash
# 设置环境变量
export ANTHROPIC_API_KEY="your-api-key"
export AI_MODEL="glm-4.7"

# 运行
pnpm dev
```

### 🚀 完整配置流程

```bash
# 1. 运行配置向导
pnpm setup:env

# 2. 按照提示输入 API Key 和选择模型

# 3. 重新加载配置
source ~/.zshrc  # 或 exec zsh

# 4. 验证配置
pnpm test:env

# 5. 运行 AI Agent
pnpm dev
```

---

## 配置方式

### 方式 1: 临时配置（推荐测试）

**适用场景**：临时测试、快速切换模型

```bash
# 设置环境变量
export ANTHROPIC_API_KEY="your-api-key"
export AI_MODEL="glm-4.7"

# 运行
pnpm dev

# 关闭终端后失效
```

**优点**：
- ✅ 快速简单
- ✅ 不修改系统配置
- ✅ 方便测试不同模型

**缺点**：
- ❌ 关闭终端后失效
- ❌ 每次使用需要重新设置

---

### 方式 2: 永久配置（推荐开发）

**适用场景**：日常开发、长期使用

#### macOS/Linux (zsh)

```bash
# 1. 编辑 Shell 配置
nano ~/.zshrc

# 2. 添加以下内容（在文件末尾）
# ============================================================================
# AI Agent Configuration (类似 Claude Code）
# ============================================================================

export ANTHROPIC_API_KEY="your-api-key-here"
export AI_MODEL="glm-4.7"
export TEMPERATURE="0.7"

# 3. 保存并退出 (Ctrl+X, Y, Enter)

# 4. 重新加载配置
source ~/.zshrc

# 5. 验证
echo $ANTHROPIC_API_KEY
echo $AI_MODEL

# 6. 运行
pnpm dev
```

#### macOS/Linux (bash)

```bash
# 1. 编辑 Shell 配置
nano ~/.bash_profile

# 2. 添加以下内容（同上）

# 3. 保存并退出

# 4. 重新加载配置
source ~/.bash_profile

# 5. 运行
pnpm dev
```

**优点**：
- ✅ 配置永久生效
- ✅ 所有终端可用
- ✅ 无需重复设置

**缺点**：
- ❌ 需要编辑 Shell 配置
- ❌ 所有项目共享配置

---

### 方式 3: 使用配置脚本

**适用场景**：不熟悉命令行、需要向导引导

```bash
# 运行配置向导
pnpm setup:env

# 按照提示输入：
# 1. API Key
# 2. 选择模型（1-5）
# 3. 确认配置

# 重新加载配置
source ~/.zshrc

# 验证
pnpm test:env

# 运行
pnpm dev
```

**优点**：
- ✅ 交互式向导
- ✅ 自动备份配置
- ✅ 支持多种 Shell

---

### 方式 4: 项目级别配置（.env 文件）

**适用场景**：团队协作、项目隔离

```bash
# 1. 复制示例文件
cp .env.development.example .env.development

# 2. 编辑配置
nano .env.development

# 3. 填入配置
AI_MODEL=glm-4.7
GLM_API_KEY=your-api-key-here

# 4. 运行
pnpm dev
```

**注意**：
- ⚠️ 确保 `.env.development` 在 `.gitignore` 中
- ⚠️ 不要提交 API Key 到 Git

---

## 环境变量说明

### 核心变量（必需）

#### ANTHROPIC_API_KEY
- **说明**：通用 API Key（类似 Claude Code）
- **示例**：`sk-xxx...`
- **优先级**：⭐ 最高
- **备注**：可用于所有 LLM 提供者

#### AI_MODEL
- **说明**：模型名称
- **示例**：`glm-4.7`, `kimi-k2.5`, `deepseek-chat`
- **默认值**：`gpt-4o`
- **备注**：根据模型名称自动选择提供者

---

### 可选变量

#### TEMPERATURE
- **说明**：生成温度（0-2）
- **默认值**：`0.7`
- **建议**：
  - `0.0-0.3` - 精确输出（代码、事实）
  - `0.4-0.7` - 平衡（推荐）
  - `0.8-1.2` - 创意（写作、头脑风暴）

#### PROJECT_DIRECTORY
- **说明**：项目目录路径
- **默认值**：当前目录
- **示例**：`/Users/username/projects/my-app`

#### VCS
- **说明**：版本控制系统
- **默认值**：`git`
- **可选值**：`git`, `svn`, `hg`

#### PROJECT_LANGUAGE
- **说明**：项目编程语言
- **默认值**：自动检测
- **示例**：`typescript`, `python`, `java`

---

### 提供者特定变量（备用）

如果不想使用 `ANTHROPIC_API_KEY`，可以使用特定提供者的 API Key：

#### GLM (智谱AI)
```bash
GLM_API_KEY="your-glm-api-key"
GLM_BASE_URL="https://open.bigmodel.cn/api/coding/paas/v4"
AI_MODEL="glm-4.7"
```

#### Kimi (月之暗面)
```bash
KIMI_API_KEY="your-kimi-api-key"
KIMI_BASE_URL="https://api.moonshot.cn/v1"
AI_MODEL="kimi-k2.5"
```

#### DeepSeek
```bash
DEEPSEEK_API_KEY="your-deepseek-api-key"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
AI_MODEL="deepseek-chat"
```

#### OpenAI
```bash
OPENAI_API_KEY="your-openai-api-key"
OPENAI_BASE_URL="https://api.openai.com/v1"
AI_MODEL="gpt-4o-mini"
```

#### MiniMax
```bash
MINIMAX_API_KEY="your-minimax-api-key"
MINIMAX_GROUP_ID="your-group-id"
MINIMAX_BASE_URL="https://api.minimax.chat/v1"
AI_MODEL="abab6.5s-chat"
```

#### Qwen (通义千问)
```bash
QWEN_API_KEY="your-qwen-api-key"
QWEN_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
AI_MODEL="qwen-plus"
```

---

## 配置优先级

系统按照以下顺序查找 API Key：

```
1. ANTHROPIC_API_KEY (通用，类似 Claude Code） ⭐ 最高
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
9. 代码默认值 ⭐ 最低
```

### 优先级示例

#### 示例 1: 使用 ANTHROPIC_API_KEY

```bash
export ANTHROPIC_API_KEY="your-glm-key"
export GLM_API_KEY="other-key"

# 将使用 ANTHROPIC_API_KEY
```

#### 示例 2: 提供者特定 Key

```bash
# 没有 ANTHROPIC_API_KEY
export GLM_API_KEY="your-glm-key"

# 将使用 GLM_API_KEY
```

#### 示例 3: .env 文件

```bash
# 没有环境变量
# 有 .env.development 文件

# 将使用 .env.development
```

---

## 支持的模型

### GLM (智谱AI)

| 模型 | 适用场景 | 上下文 |
|------|---------|--------|
| `glm-4.7` | 综合、中文 | 128K |
| `glm-4-plus` | 更强性能 | 128K |
| `glm-4-flash` | 快速响应 | 128K |
| `glm-3-turbo` | 性价比 | 128K |

**推荐**：`glm-4.7`（性价比高）

---

### Kimi (月之暗面)

| 模型 | 适用场景 | 上下文 |
|------|---------|--------|
| `kimi-k2.5` | 长文本、代码 | 256K |
| `kimi-k1.5` | 通用 | 128K |
| `kimi-preview` | 预览版 | 256K |

**推荐**：`kimi-k2.5`（长文本场景）

---

### DeepSeek

| 模型 | 适用场景 | 特点 |
|------|---------|------|
| `deepseek-chat` | 编程、推理 | 代码能力强 |
| `deepseek-coder` | 代码生成 | 专用于代码 |

**推荐**：`deepseek-chat`（编程场景）

---

### OpenAI

| 模型 | 适用场景 | 成本 |
|------|---------|------|
| `gpt-4o` | 高级任务 | 较高 |
| `gpt-4o-mini` | 通用任务 | 较低 |
| `gpt-3.5-turbo` | 基础任务 | 最低 |

**推荐**：`gpt-4o-mini`（性价比高）

---

### MiniMax

| 模型 | 适用场景 |
|------|---------|
| `abab6.5s-chat` | 通用对话 |
| `abab6.5-chat` | 高级对话 |

---

### Qwen (通义千问)

| 模型 | 适用场景 |
|------|---------|
| `qwen-plus` | 通用 |
| `qwen-max` | 高级 |
| `qwen-turbo` | 快速 |

---

## 配置示例

### 示例 1: GLM 通用配置

```bash
# ~/.zshrc 或 ~/.bash_profile
export ANTHROPIC_API_KEY="your-glm-api-key"
export AI_MODEL="glm-4.7"
export TEMPERATURE="0.7"
```

---

### 示例 2: Kimi 长文本配置

```bash
export ANTHROPIC_API_KEY="your-kimi-api-key"
export AI_MODEL="kimi-k2.5"
export TEMPERATURE="0.7"
export PROJECT_DIRECTORY="/Users/username/projects"
```

---

### 示例 3: DeepSeek 编程配置

```bash
export ANTHROPIC_API_KEY="your-deepseek-api-key"
export AI_MODEL="deepseek-chat"
export TEMPERATURE="0.5"
export PROJECT_LANGUAGE="typescript"
```

---

### 示例 4: 项目级别配置 (.env.development)

```bash
# .env.development
AI_MODEL=glm-4.7
GLM_API_KEY=your-glm-api-key-here
TEMPERATURE=0.7
PROJECT_DIRECTORY=/Users/username/projects/my-app
```

---

### 示例 5: 快速切换模型

```bash
# 使用 GLM
export AI_MODEL="glm-4.7"
pnpm dev

# 切换到 Kimi
export AI_MODEL="kimi-k2.5"
pnpm dev

# 切换到 DeepSeek
export AI_MODEL="deepseek-chat"
pnpm dev
```

---

## 故障排除

### 问题 1: 配置不生效

**症状**：
```
No provider credentials found in environment.
```

**解决方法**：

```bash
# 1. 检查环境变量
echo $ANTHROPIC_API_KEY
echo $AI_MODEL

# 2. 重新加载配置
source ~/.zshrc  # 或 exec zsh

# 3. 重启终端

# 4. 运行测试
pnpm test:env
```

---

### 问题 2: API Key 格式错误

**症状**：
```
Error: Invalid API key format
```

**解决方法**：

```bash
# ❌ 错误：包含多余空格或引号
export ANTHROPIC_API_KEY=" sk-xxx "
export ANTHROPIC_API_KEY='sk-xxx'

# ✅ 正确：直接赋值
export ANTHROPIC_API_KEY="sk-xxx"
```

---

### 问题 3: 模型不存在

**症状**：
```
Error: Model 'xxx' not found
```

**解决方法**：

```bash
# 检查模型名称是否正确
echo $AI_MODEL

# 使用支持的模型
export AI_MODEL="glm-4.7"
```

---

### 问题 4: Shell 配置未加载

**症状**：重启终端后配置失效

**解决方法**：

```bash
# 检查 Shell 类型
echo $SHELL

# zsh 用户
nano ~/.zshrc
# 添加配置后保存
source ~/.zshrc

# bash 用户
nano ~/.bash_profile
# 添加配置后保存
source ~/.bash_profile
```

---

### 问题 5: 仍然读取 .env 文件

**症状**：即使设置了环境变量，仍然使用 .env 文件

**解决方法**：

```bash
# 检查 src/index.ts
# 应该没有以下代码：

# ❌ 删除或注释
# import dotenv from 'dotenv';
# dotenv.config({ path: `.env.${env}`, override: true });
```

---

## 快速命令参考

### 设置环境变量

```bash
# GLM
export ANTHROPIC_API_KEY="your-key" && export AI_MODEL="glm-4.7" && pnpm dev

# Kimi
export ANTHROPIC_API_KEY="your-key" && export AI_MODEL="kimi-k2.5" && pnpm dev

# DeepSeek
export ANTHROPIC_API_KEY="your-key" && export AI_MODEL="deepseek-chat" && pnpm dev
```

### 验证配置

```bash
# 查看环境变量
echo $ANTHROPIC_API_KEY
echo $AI_MODEL

# 运行测试脚本
pnpm test:env
```

### 清除环境变量

```bash
unset ANTHROPIC_API_KEY
unset AI_MODEL
```

### 重新加载配置

```bash
# zsh
source ~/.zshrc
# 或
exec zsh

# bash
source ~/.bash_profile
# 或
exec bash
```

---

## 获取 API Key

| 提供者 | 获取地址 |
|--------|---------|
| **GLM** | https://open.bigmodel.cn/usercenter/apikeys |
| **Kimi** | https://platform.moonshot.cn/console/api-keys |
| **DeepSeek** | https://platform.deepseek.com/api_keys |
| **OpenAI** | https://platform.openai.com/api-keys |
| **MiniMax** | https://api.minimax.chat/user-center/basic-information/interface-key |
| **Qwen** | https://dashscope.console.aliyun.com/apiKey |

---

## 安全建议

### 1. 不要提交 API Key

```bash
# 确保 .gitignore 包含
.env
.env.development
.env.production
```

### 2. 限制文件权限

```bash
# 限制 Shell 配置文件权限
chmod 600 ~/.zshrc

# 查看 .env 文件权限
ls -la .env.development
```

### 3. 使用环境变量管理工具

- **direnv**: 项目级别自动加载
  ```bash
  brew install direnv
  echo 'eval "$(direnv hook bash)"' >> ~/.bashrc
  echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc
  ```

- **envchain**: 加密存储敏感信息
  ```bash
  brew install envchain
  envchain --set ai-agent ANTHROPIC_API_KEY
  envchain ai-agent pnpm dev
  ```

- **1Password**: 密码管理器集成
  ```bash
  op inject --in .env.template --out .env
  ```

---

## 相关文档

- [快速参考](./ENV_QUICK_REFERENCE.md)
- [功能总结](./FEATURE_ENVIRONMENT_VARIABLES.md)
- [使用示例](./QUICK_START_EXAMPLES.md)
- [配置方式对比](./CONFIGURATION_WAYS.md)
- [全局配置](./GLOBAL_CONFIGURATION.md)

---

## 需要帮助？

1. 运行配置测试：`pnpm test:env`
2. 查看快速参考：[docs/ENV_QUICK_REFERENCE.md](./docs/ENV_QUICK_REFERENCE.md)
3. 提交 GitHub Issues

---

**最后更新**: 2026-01-28
**版本**: 1.0.0
