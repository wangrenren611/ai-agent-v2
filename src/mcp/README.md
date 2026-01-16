# MCP Integration

本项目集成了 **Model Context Protocol (MCP)** 客户端功能，可以连接第三方 MCP 服务器并使用其工具。

## 什么是 MCP?

Model Context Protocol (MCP) 是一个开放协议，让 AI 助手能够连接外部数据源和工具。通过 MCP，您可以：

- 使用第三方开发的工具服务器
- 扩展 Agent 的能力（如文件系统、搜索、API 调用等）
- 统一的接口管理所有工具

## 快速开始

### 1. 创建配置文件

在项目根目录创建 `.mcp.json` 文件：

```json
{
  "mcpServers": [
    {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"],
      "enabled": true
    },
    {
      "name": "brave-search",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "${BRAVE_API_KEY}"
      },
      "enabled": true
    }
  ]
}
```

### 2. 在代码中初始化

```typescript
import { registerDefaultToolsAsync } from './tool';

// 自动加载 .mcp.json 中的所有服务器
await registerDefaultToolsAsync();
```

### 3. Agent 自动使用 MCP 工具

初始化后，Agent 会自动发现并使用 MCP 服务器提供的工具：

```typescript
const agent = new Agent({
  // MCP 工具已自动注册到 ToolRegistry
  // Agent 可以直接调用，如: filesystem/read_file
});
```

## 配置格式

### 服务器配置

每个 MCP 服务器配置包含：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 服务器唯一标识符 |
| `command` | string | 是 | 启动命令（如 `npx`、`node`） |
| `args` | string[] | 否 | 命令参数 |
| `env` | object | 否 | 环境变量 |
| `enabled` | boolean | 否 | 是否启用（默认 true） |

### 环境变量

支持 `${VAR_NAME}` 格式引用环境变量：

```json
{
  "env": {
    "API_KEY": "${MY_API_KEY}",
    "HOME_DIR": "${HOME}"
  }
}
```

### 配置文件搜索路径

如果不指定配置文件路径，系统会按以下顺序搜索：

1. `.mcp.json`
2. `mcp.json`
3. `.mcp/config.json`
4. `.claude/mcp.json`
5. `.config/mcp.json`

## 常用 MCP 服务器

### 文件系统服务器

```json
{
  "name": "filesystem",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/directory"]
}
```

### Brave 搜索

```json
{
  "name": "brave-search",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-brave-search"],
  "env": {
    "BRAVE_API_KEY": "${BRAVE_API_KEY}"
  }
}
```

### GitHub

```json
{
  "name": "github",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_TOKEN": "${GITHUB_TOKEN}"
  }
}
```

### Google Drive

```json
{
  "name": "google-drive",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-gdrive"],
  "env": {
    "GDRIVE_API_KEY": "${GDRIVE_API_KEY}",
    "GDRIVE_TOKEN": "${GDRIVE_TOKEN}"
  }
}
```

更多服务器请访问: [modelcontextprotocol.io](https://modelcontextprotocol.io)

## API 参考

### `registerDefaultToolsAsync(configPath?)`

初始化所有工具（包括 MCP 服务器工具）

```typescript
import { registerDefaultToolsAsync } from './tool';

const manager = await registerDefaultToolsAsync();
const manager = await registerDefaultToolsAsync('./custom-config.json');
```

### `getMcpManager()`

获取 MCP 管理器实例

```typescript
import { getMcpManager } from './mcp';

const manager = getMcpManager();

// 获取连接信息
const connections = manager.getConnectionInfo();

// 断开所有连接
await manager.disconnectAll();
```

### `McpManager`

管理所有 MCP 服务器连接

| 方法 | 说明 |
|------|------|
| `loadAndConnect(configPath?)` | 加载配置并连接所有服务器 |
| `connectServer(config)` | 连接单个服务器 |
| `disconnectServer(name)` | 断开指定服务器 |
| `disconnectAll()` | 断开所有服务器 |
| `getConnectionInfo()` | 获取所有连接信息 |
| `getConnectedServers()` | 获取已连接的服务器名称列表 |
| `getTotalToolsCount()` | 获取所有 MCP 工具总数 |

## 工具命名规范

MCP 工具注册时使用 `{serverName}/{toolName}` 格式：

```typescript
// 例如：
// filesystem/read_file
// filesystem/write_file
// brave-search/search
```

这避免了不同服务器之间的工具名称冲突。

## 故障排查

### MCP 服务器未启动

检查配置文件路径和命令是否正确：

```bash
# 手动测试服务器
npx -y @modelcontextprotocol/server-filesystem /path/to/dir
```

### 环境变量未加载

确认环境变量已设置：

```bash
echo $MY_API_KEY
```

### 工具未注册

查看连接状态：

```typescript
const manager = getMcpManager();
console.log(manager.getConnectionInfo());
```

## 示例配置文件

参考 `.mcp.json.example` 查看完整示例。

---

**Sources:**
- [Model Context Protocol - Transports](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)
- [Model Context Protocol - Architecture Overview](https://modelcontextprotocol.io/docs/learn/architecture)
- [Model Context Protocol - Tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- [MCP Go Implementation](https://github.com/mark3labs/mcp-go)
- [Build Your First MCP Application](https://thesof.medium.com/build-your-first-mcp-application-step-by-step-examples-for-stdio-and-sse-servers-integration-773b187aeaed)
