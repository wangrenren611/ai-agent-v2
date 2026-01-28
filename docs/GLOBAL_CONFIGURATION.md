# 全局环境变量配置指南

## 📖 概述

当前项目的配置是**项目级别**的（`.env.development`），这是推荐的配置方式。如果你需要在多个项目中使用相同配置，可以考虑设置**全局环境变量**。

---

## 🎯 配置方式对比

| 特性 | 项目级别 | 全局环境变量 |
|------|---------|-------------|
| 安全性 | ✅ 更安全 | ⚠️ 风险较高 |
| 隔离性 | ✅ 项目隔离 | ❌ 全局共享 |
| 便于多项目 | ✅ 支持不同配置 | ❌ 所有项目相同 |
| 团队协作 | ✅ 可版本控制 | ❌ 无法版本控制 |
| 配置复杂度 | ✅ 简单 | ⚠️ 需编辑 shell 配置 |

---

## 💡 推荐：保持项目级别配置

### 原因

1. **安全性更好**
   - `.env.development` 仅当前项目可见
   - 全局环境变量所有进程都可访问

2. **便于管理多个项目**
   ```
   project-a/.env.development  # 使用 GLM
   project-b/.env.development  # 使用 Kimi
   ```

3. **便于版本控制**
   ```bash
   # .gitignore
   .env
   .env.development
   .env.production
   ```

4. **便于团队协作**
   - 可以提供 `.env.example` 模板
   - 每个开发者用自己的 `.env.development`

---

## 🚀 如果需要全局配置

### 方式 1: 临时配置（推荐测试用）

仅在当前终端会话有效，关闭终端后失效：

```bash
# 设置全局变量
export GLM_API_KEY="your-api-key-here"
export AI_MODEL="glm-4.7"
export TEMPERATURE="0.7"

# 验证
echo $GLM_API_KEY

# 运行项目
pnpm dev
```

### 方式 2: 永久配置

#### macOS/Linux (zsh - 推荐）

```bash
# 1. 复制配置脚本
cp scripts/ai-agent-env.sh ~/.ai-agent-env.sh

# 2. 编辑配置，填入你的 API Key
nano ~/.ai-agent-env.sh

# 3. 在 ~/.zshrc 中添加加载命令
echo 'source ~/.ai-agent-env.sh' >> ~/.zshrc

# 4. 重新加载配置
source ~/.zshrc

# 5. 验证
echo $GLM_API_KEY
```

#### macOS/Linux (bash)

```bash
# 1. 复制配置脚本
cp scripts/ai-agent-env.sh ~/.ai-agent-env.sh

# 2. 编辑配置，填入你的 API Key
nano ~/.ai-agent-env.sh

# 3. 在 ~/.bash_profile 中添加加载命令
echo 'source ~/.ai-agent-env.sh' >> ~/.bash_profile

# 4. 重新加载配置
source ~/.bash_profile

# 5. 验证
echo $GLM_API_KEY
```

### 方式 3: 直接编辑 shell 配置

#### 编辑 ~/.zshrc

```bash
# 打开配置文件
nano ~/.zshrc

# 在文件末尾添加以下内容
# ============================================================================
# AI Agent Configuration
# ============================================================================

export AI_MODEL="glm-4.7"
export TEMPERATURE="0.7"

# GLM (Zhipu AI)
export GLM_API_KEY="your-api-key-here"
export GLM_BASE_URL="https://open.bigmodel.cn/api/coding/paas/v4"

# Kimi (Moonshot AI)
export KIMI_API_KEY="your-api-key-here"
export KIMI_BASE_URL="https://api.moonshot.cn/v1"

# 保存并退出 (Ctrl+X, Y, Enter)
```

重新加载配置：

```bash
source ~/.zshrc
```

#### 编辑 ~/.bash_profile 或 ~/.bashrc

```bash
# 打开配置文件
nano ~/.bash_profile

# 在文件末尾添加（同上）
# [添加配置内容]

# 保存并退出
source ~/.bash_profile
```

---

## 🔍 检查当前配置

### 检查项目级别配置

```bash
# 查看配置文件
cat .env.development | grep API_KEY

# 或运行测试脚本
./scripts/test-config.sh
```

### 检查全局环境变量

```bash
# 查看 AI 相关的环境变量
printenv | grep -E "(GLM|KIMI|AI_MODEL)"

# 查看特定变量
echo $GLM_API_KEY
echo $AI_MODEL
```

### 检查配置优先级

当同时存在项目级别和全局配置时：

```typescript
// src/index.ts:11
dotenv.config({ path: `.env.${env}`, override: true });
```

**`override: true`** 表示：
- ✅ 项目级别配置**覆盖**全局配置
- 即：`.env.development` 优先级高于全局环境变量

---

## 🔄 切换配置方式

### 从全局切换到项目级别

```bash
# 1. 注释掉全局配置
nano ~/.zshrc
# 在相关行前添加 #
# export GLM_API_KEY="..."

# 2. 重新加载
source ~/.zshrc

# 3. 确保项目有 .env.development
cat .env.development | grep API_KEY
```

### 从项目级别切换到全局

```bash
# 1. 确认全局配置已设置
echo $GLM_API_KEY

# 2. 删除或重命名项目配置文件
mv .env.development .env.development.backup

# 3. 运行项目
pnpm dev
```

---

## 🛠️ 故障排除

### 问题 1: 配置不生效

**检查步骤**：

```bash
# 1. 确认文件存在
ls -la .env.development

# 2. 检查权限
chmod 644 .env.development

# 3. 查看环境变量
echo $GLM_API_KEY

# 4. 运行测试脚本
./scripts/test-config.sh
```

### 问题 2: 全局变量未加载

**检查步骤**：

```bash
# 1. 确认配置文件正确
cat ~/.zshrc | grep "ai-agent-env"

# 2. 重新加载
source ~/.zshrc

# 3. 验证
echo $GLM_API_KEY
```

### 问题 3: 配置冲突（项目 vs 全局）

**解决方法**：

项目级别配置优先级更高（`override: true`），所以：
- 如果想用全局配置，删除或注释 `.env.development`
- 如果想用项目配置，确保 `.env.development` 存在

---

## 🔒 安全建议

### 1. 不要提交 API Key

```bash
# 确保 .gitignore 包含
.env
.env.development
.env.production
```

### 2. 使用环境变量管理工具

考虑使用：
- **direnv**: 项目级别的自动环境变量加载
- **envchain**: 加密存储敏感信息
- **vault**: 企业级密钥管理

### 示例：使用 direnv

```bash
# 安装 direnv
brew install direnv

# 在项目根目录创建 .envrc
echo 'export GLM_API_KEY="your-api-key"' > .envrc

# 允许项目
direnv allow

# 进入项目目录时自动加载
cd /path/to/project
# direnv: loading .envrc
```

---

## 📋 配置清单

### 项目级别配置检查

- [ ] `.env.development` 文件存在
- [ ] 包含至少一个提供者的 API Key
- [ ] API Key 格式正确（无多余空格、引号）
- [ ] 添加到 `.gitignore`

### 全局配置检查

- [ ] 配置文件已编辑（`~/.zshrc` 或 `~/.bash_profile`）
- [ ] 配置已加载（运行 `source` 命令）
- [ ] 环境变量已设置（运行 `echo $VAR_NAME`）

---

## 📖 相关文档

- [快速开始](./QUICK_START.md)
- [完整配置指南](./API_KEY_CONFIGURATION.md)
- [配置总结](./CONFIGURATION_SUMMARY.md)

---

## 🆘 需要帮助？

1. 运行 `./scripts/test-config.sh` 检查配置
2. 查看 [完整配置指南](./API_KEY_CONFIGURATION.md)
3. 提交 GitHub Issues

---

**最后更新**: 2026-01-28
