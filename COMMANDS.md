# 命令系统文档

## 概述

这是一个类似 Claude Code 的命令系统，支持通过 `/` 前缀执行各种命令。

## 架构

```
src/cli/commands/
├── types.ts           # 类型定义
├── registry.ts        # 命令注册表
├── parser.ts          # 命令解析器
├── executor.ts        # 命令执行器
├── index.ts           # 入口文件（导出和初始化）
├── core/              # 核心命令
│   ├── help.ts
│   ├── clear.ts
│   ├── exit.ts
│   └── version.ts
├── session/           # 会话命令
│   └── index.ts
├── model/             # 模型命令
│   └── index.ts
├── file/              # 文件命令
│   └── index.ts
└── memory/            # 记忆命令
    └── index.ts
```

## 核心组件

### 1. 类型定义 (`types.ts`)

- `Command`: 命令接口
- `CommandContext`: 命令执行上下文
- `CommandHandler`: 命令处理器类型
- `CommandResult`: 命令执行结果
- `CommandCategory`: 命令分类枚举

### 2. 命令注册表 (`registry.ts`)

管理所有命令的注册和查询：
- `register(command)`: 注册命令
- `get(name)`: 获取命令（支持别名）
- `getAll()`: 获取所有命令
- `getByCategory(category)`: 按分类获取命令

### 3. 命令解析器 (`parser.ts`)

解析用户输入，识别命令：
- `parse(input)`: 解析输入字符串
- `isCommand(input)`: 检查是否为命令

### 4. 命令执行器 (`executor.ts`)

执行命令并处理结果：
- `execute(input, context)`: 执行输入（自动识别命令）
- `executeCommand(command, args, context)`: 执行指定命令

## 可用命令

### 核心命令

| 命令 | 别名 | 描述 | 用法 |
|------|------|------|------|
| `/help` | `/h`, `/?` | 显示帮助信息 | `/help [command]` |
| `/clear` | `/cls`, `/reset` | 清除对话历史 | `/clear` |
| `/exit` | `/quit`, `/q` | 退出应用 | `/exit` |
| `/version` | `/v` | 显示版本信息 | `/version` |

### 会话命令

| 命令 | 别名 | 描述 | 用法 |
|------|------|------|------|
| `/session` | `/s` | 管理会话 | `/session [list\|switch\|new] [id]` |

- `/session` - 显示当前会话
- `/session list` - 列出所有会话
- `/session switch <id>` - 切换到指定会话
- `/session new [id]` - 创建新会话

### 模型命令

| 命令 | 别名 | 描述 | 用法 |
|------|------|------|------|
| `/model` | `/m` | 管理模型 | `/model [list\|switch] [name]` |

- `/model` - 显示当前模型
- `/model list` - 列出可用模型
- `/model switch <name>` - 切换模型

### 文件命令

| 命令 | 描述 | 用法 |
|------|------|------|
| `/file` | 文件操作 | `/file [save\|load\|export] [path]` |

- `/file save [path]` - 保存对话到文件
- `/file load <path>` - 从文件加载对话
- `/file export [path]` - 导出对话为 Markdown

### 记忆命令

| 命令 | 别名 | 描述 | 用法 |
|------|------|------|------|
| `/memory` | `/mem` | 管理记忆 | `/memory [on\|off\|clear\|show]` |

- `/memory` - 显示记忆状态
- `/memory on` - 启用记忆
- `/memory off` - 禁用记忆
- `/memory clear` - 清除记忆
- `/memory show` - 显示记忆状态

## 如何添加新命令

1. 在对应目录（或新建目录）创建命令文件：

```typescript
import type { Command, CommandHandler, CommandContext } from '../types.js';
import { CommandCategory } from '../types.js';
import { successResult } from '../executor.js';

const handler: CommandHandler = async (context: CommandContext, args?: string[]) => {
  // 实现命令逻辑
  return successResult('Command executed');
};

export const myCommand: Command = {
  id: 'my-command',
  name: '/mycommand',
  aliases: ['/mc'],
  description: 'My custom command',
  usage: '/mycommand [args]',
  category: CommandCategory.CORE,
  handler,
};

export default myCommand;
```

2. 在 `src/cli/commands/index.ts` 中注册：

```typescript
import { myCommand } from './my-command/index.js';

export function registerDefaultCommands(): void {
  // ... 其他命令
  commandRegistry.register(myCommand);
}
```

## 设计原则

1. **单一职责**: 每个命令文件只包含一个命令
2. **可扩展**: 易于添加新命令和分类
3. **类型安全**: 完整的 TypeScript 类型支持
4. **清晰分离**: 解析、注册、执行职责明确
5. **简洁易读**: 代码结构清晰，易于理解和维护

## 集成到 CLI

命令系统已集成到 CLI 输入处理中：

1. 用户输入通过 `AppContextProvider` 处理
2. 自动识别命令（以 `/` 开头）
3. 执行命令并处理结果
4. 非命令输入作为普通消息发送给 AI

## 上下文

命令执行时可访问以下上下文：

```typescript
interface CommandContext {
  input: string;           // 用户输入
  sessionId?: string;      // 会话 ID
  userId?: string;         // 用户 ID
  model?: string;          // 当前模型
  messages?: any[];        // 消息历史
  memoryEnabled?: boolean; // 记忆状态
  setSessionId?: (id: string) => void;  // 设置会话 ID
  setModel?: (model: string) => void;   // 设置模型
  setMemory?: (enabled: boolean) => void; // 设置记忆状态
  clearMessages?: () => void;           // 清除消息
}
```

## 示例

### 查看帮助

```
> /help
```

### 清除对话

```
> /clear
```

### 切换模型

```
> /model switch OpenAI
```

### 保存对话

```
> /file save ./my-conversation.json
```

### 导出对话

```
> /file export ./conversation.md
```

### 退出应用

```
> /exit
```
