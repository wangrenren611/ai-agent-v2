# 配置方式总结

## 🎯 两种配置方式

### ✅ 方式 1: 系统环境变量（推荐，类似 Claude Code）

**特点**：
- 一个 API Key 用于所有项目
- 类似 Claude Code 的配置方式
- 配置简单，全局生效

**快速开始**：

```bash
# 方法 1: 使用配置脚本
./scripts/setup-env.sh

# 方法 2: 手动配置
export ANTHROPIC_API_KEY="your-api-key"
export AI_MODEL="glm-4.7"
pnpm dev
```

**详细文档**：[docs/ENVIRONMENT_VARIABLES.md](./docs/ENVIRONMENT_VARIABLES.md)

---

### 方式 2: 项目级别配置（.env 文件）

**特点**：
- 项目隔离，不同项目不同配置
- 便于版本控制和团队协作
- 更安全（不会影响其他项目）

**快速开始**：

```bash
# 1. 复制示例文件
cp .env.development.example .env.development

# 2. 编辑配置文件
nano .env.development

# 3. 填入 API Key
AI_MODEL=glm-4.7
GLM_API_KEY=your-api-key-here

# 4. 运行
pnpm dev
```

**详细文档**：
- [docs/QUICK_START.md](./docs/QUICK_START.md) - 快速开始
- [docs/API_KEY_CONFIGURATION.md](./docs/API_KEY_CONFIGURATION.md) - 完整配置指南

---

## 🚀 如何选择？

| 场景 | 推荐方式 |
|------|---------|
| **个人开发，多个项目共享** | 系统环境变量 |
| **团队协作，项目隔离** | 项目级别配置 |
| **测试不同模型** | 系统环境变量（快速切换） |
| **生产环境** | 系统环境变量 |

---

## 📋 快速参考

### 使用环境变量（类似 Claude Code）

```bash
# 设置环境变量
export ANTHROPIC_API_KEY="your-api-key"
export AI_MODEL="glm-4.7"

# 运行
pnpm dev
```

### 使用 .env 文件

```bash
# 编辑 .env.development
nano .env.development

# 添加配置
AI_MODEL=glm-4.7
GLM_API_KEY=your-api-key-here

# 运行
pnpm dev
```

---

## 📖 完整文档

| 文档 | 用途 |
|------|------|
| [docs/ENVIRONMENT_VARIABLES.md](./docs/ENVIRONMENT_VARIABLES.md) | 系统环境变量配置（类似 Claude Code） |
| [docs/QUICK_START.md](./docs/QUICK_START.md) | 项目级别配置快速开始 |
| [docs/API_KEY_CONFIGURATION.md](./docs/API_KEY_CONFIGURATION.md) | 完整配置指南 |
| [docs/CONFIGURATION_SUMMARY.md](./docs/CONFIGURATION_SUMMARY.md) | 配置总结和常见问题 |

---

## 🛠️ 配置工具

### 环境变量配置

```bash
# 配置向导（推荐）
./scripts/setup-env.sh

# 测试配置
./scripts/test-config.sh
```

### 项目级别配置

```bash
# 复制示例
cp .env.development.example .env.development

# 测试配置
./scripts/test-config.sh
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

### 检查 .env 文件

```bash
# 查看配置
cat .env.development | grep API_KEY

# 运行测试
./scripts/test-config.sh
```

---

## 💡 推荐配置

### 个人开发：系统环境变量

```bash
export ANTHROPIC_API_KEY="your-glm-api-key"
export AI_MODEL="glm-4.7"
```

### 团队协作：.env 文件

```bash
# .env.development (本地，不提交到 Git）
AI_MODEL=glm-4.7
GLM_API_KEY=your-api-key-here
```

**.gitignore**:
```bash
.env
.env.development
.env.production
```

---

**需要帮助？** 查看完整文档或运行配置向导！
