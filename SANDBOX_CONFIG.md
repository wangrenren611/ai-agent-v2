# 沙箱配置示例

本文件展示如何配置和使用沙箱功能。

## 环境变量配置

在 `.env.development` 或 `.env.production` 中配置沙箱行为：

```bash
# 沙箱模式 (none | docker | auto)
# - none: 直接在宿主机执行（无隔离）
# - docker: 强制使用 Docker 容器（推荐）
# - auto: 自动检测，优先 Docker，降级到直接执行
SANDBOX_MODE=docker

# Docker 镜像名称（可选，默认: alpine:3.18）
# 支持任何符合 Docker 命名规范的镜像
DOCKER_IMAGE=node:18-alpine

# Docker 网络策略（可选）
# - none: 无网络（默认，最安全）
# - bridge: 桥接网络（允许访问外部网络）
# - host: 主机网络（完全访问，不推荐）
SANDBOX_NETWORK=none

# 只读挂载点（逗号分隔，可选）
# 这些目录在容器中只读，防止修改
# 示例: node_modules, .git
SANDBOX_READONLY_MOUNTS=node_modules,.git

# Docker Socket 路径（可选）
# Linux: /var/run/docker.sock
# macOS: /var/run/docker.sock
# Windows: //./pipe/docker_engine
DOCKER_SOCKET_PATH=/var/run/docker.sock
```

## 配置示例

### 开发环境（推荐 Docker 沙箱）

```bash
# .env.development
SANDBOX_MODE=docker
DOCKER_IMAGE=node:18-alpine
SANDBOX_NETWORK=none
SANDBOX_READONLY_MOUNTS=node_modules,.git
DOCKER_SOCKET_PATH=/var/run/docker.sock
```

### 生产环境（无沙箱，快速执行）

```bash
# .env.production
SANDBOX_MODE=none
```

### CI/CD 环境（完全隔离）

```bash
# CI 环境变量
SANDBOX_MODE=docker
DOCKER_IMAGE=node:18-alpine
SANDBOX_NETWORK=bridge
SANDBOX_READONLY_MOUNTS=node_modules,.git,src/test
```

## 安全级别对比

| 沙箱模式 | 安全级别 | 适用场景 | 性能影响 |
|----------|---------|---------|----------|
| **none** | ⭐ | 本地开发、CI | 无 |
| **docker (none 网络)** | ⭐⭐⭐⭐ | 生产环境、处理用户代码 | ~10% (启动开销) |
| **docker (bridge 网络)** | ⭐⭐⭐ | 需要网络访问的任务 | ~15% (启动+网络开销) |

## 使用示例

### 示例 1: 基本文件操作

```bash
# 命令
bash -c "ls -la && cat package.json"

# Docker 沙箱执行结果
$ ls -la && cat package.json
-rw-r--r-- 1 user user 1234 Jan 1 12:00 package.json
{
  "name": "ai-agent-v2",
  "version": "1.0.0"
}

[Sandbox: Docker container a1b2c3d4e5f]
Duration: 1523ms
```

### 示例 2: 安装依赖

```bash
# 命令
bash -c "npm install --save-dev"

# Docker 沙箱结果
[Sandbox: Docker container a1b2c3d4e5f]
Running npm install...
+ package.json
+ node_modules/...

Duration: 15234ms
```

### 示例 3: 运行测试

```bash
# 命令
bash -c "npm test"

# Docker 沙箱结果
[Sandbox: Docker container a1b2c3d4e5f]

> ai-agent-v2@1.0.0 test
  src/tool/bash.test.ts 10:19
    ✓ should execute command
  src/tool/bash.test.ts 15:23
    ✓ should handle cd command
  2/2 passed (3ms)

Duration: 12345ms
```

## 故障排查

### Docker 不可用

```
错误: Docker is not available
原因: 
  1. Docker 未安装
  2. Docker daemon 未运行
  3. DOCKER_SOCKET_PATH 配置错误

解决方法:
  1. 安装 Docker: https://docs.docker.com/get-docker/
  2. 启动 Docker: sudo systemctl start docker
  3. 检查 Socket 路径
```

### 容器执行失败

```
错误: Container execution failed with exit code 127
原因:
  1. 镜像不包含所需的命令
  2. 工作目录权限问题
  3. 超时

解决方法:
  1. 使用基础镜像（alpine:3.18）
  2. 检查工作目录权限
  3. 增加超时时间（BashTool.timeout）
```

### 只读挂载点权限错误

```
错误: Permission denied: /workspace/node_modules
原因:
  1. 挂载点路径不存在
  2. Docker 守护进程权限不足

解决方法:
  1. 确保挂载点存在
  2. 检查 Docker 用户权限
  3. 使用绝对路径
```

## 高级配置

### 自定义 Docker 镜像

```bash
# 使用自定义镜像，包含特定工具
DOCKER_IMAGE=mycompany/ai-agent-tools:latest

# 镜像应包含:
# - bash 或 sh
# - 常用命令: ls, cat, grep, find
# - 可选: Node.js, Python, git
```

### 资源限制

```bash
# 注意: 当前实现使用固定资源限制
# 可以通过修改 src/sandbox/docker-executor.ts 来自定义

# 限制 CPU 为 0.5 核
cpus=0.5

# 限制内存为 256MB
memory=256m

# 限制磁盘为 500MB
disk=500m
```

## 性能优化建议

1. **使用轻量级镜像**
   - `alpine:3.18` (5MB) vs `ubuntu:22.04` (72MB)
   - 启动速度快 3-5 倍

2. **缓存 Docker 层**
   - 构建时使用 `--cache-from`
   - 预先拉取基础镜像

3. **重用容器**
   - 避免频繁创建/删除
   - 考虑实现容器池

4. **本地构建镜像**
   - 使用特定于项目的工具镜像
   - 减少拉取时间
