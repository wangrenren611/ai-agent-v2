# 跨平台兼容性最佳实践

本文档总结了如何在 Node.js 项目中处理 Windows、macOS 和 Linux 的跨平台兼容性问题。

## 核心策略

### 1. 使用跨平台库

| 功能 | 原生方式 | 推荐库 |
|-----|---------|-------|
| 进程执行 | `spawn`/`exec` | `execa` |
| 文件匹配 | `glob` | `fast-glob` / `globby` |
| 路径操作 | `path` | `path` (Node.js 内置) |
| 文件系统 | `fs` | `fs-extra` |

### 2. 平台检测

```typescript
import { getPlatform } from './util/platform-cmd';

const platform = getPlatform(); // 'windows' | 'mac' | 'linux'
```

### 3. 跨平台命令构建

**❌ 错误：硬编码平台特定命令**
```typescript
const cmd = 'ls -la'; // Windows 上失败
```

**✅ 正确：使用抽象层**
```typescript
import { buildListCommand, buildFindCommand } from './util/platform-cmd';

const listCmd = buildListCommand('.');        // 自动适配平台
const findCmd = buildFindCommand('*.ts', 'src'); // 跨平台查找
```

### 4. 路径处理

**❌ 错误：使用反斜杠**
```typescript
const path = 'src\\util\\file.ts'; // Unix 上失败
```

**✅ 正确：使用 `path` 模块**
```typescript
import path from 'path';

const filePath = path.join('src', 'util', 'file.ts');
// Windows: src\util\file.ts
// Unix:   src/util/file.ts
```

### 5. 工具描述策略

**为不同平台提供定制的描述**

```typescript
class BashTool {
    get description(): string {
        const platform = getPlatform();

        const platformInfo = {
            windows: 'Platform: Windows (cmd.exe). Use: dir, type, cd',
            mac: 'Platform: macOS (zsh). Use: ls, cat, find',
            linux: 'Platform: Linux (bash). Use: ls, cat, find'
        };

        return `${baseDesc}\n\n${platformInfo[platform]}`;
    }
}
```

## 平台差异对照表

### 常用命令

| 功能 | Windows (cmd) | macOS/Linux (bash) |
|-----|--------------|-------------------|
| 列出文件 | `dir` / `dir /a` | `ls -la` |
| 读取文件 | `type file.txt` | `cat file.txt` |
| 查找文件 | `dir /s /b *.ts` | `find . -name "*.ts"` |
| 复制文件 | `copy src dst` | `cp src dst` |
| 移动文件 | `move src dst` | `mv src dst` |
| 删除文件 | `del file.txt` | `rm file.txt` |
| 当前目录 | `cd` (无参数) | `pwd` |
| 环境变量 | `%VAR%` | `$VAR` |
| 重定向输出 | `> file` | `> file` |
| 管道 | ` \| ` (受限) | ` \| ` (完整支持) |

### 路径分隔符

| 平台 | 分隔符 | 根目录 |
|-----|-------|--------|
| Windows | `\` | `C:\` |
| macOS/Linux | `/` | `/` |

**最佳实践**：始终使用 `path` 模块，让 Node.js 自动处理差异。

## 常见陷阱

### 1. 使用 Unix 特定命令

```typescript
// ❌ Windows 上失败
await execute('grep "pattern" file.txt');

// ✅ 使用 search_code 工具
await searchCode('pattern', '*.txt');
```

### 2. 硬编码路径分隔符

```typescript
// ❌ Unix 上失败
const configPath = 'config\\settings.json';

// ✅ 使用 path.join
const configPath = path.join('config', 'settings.json');
```

### 3. 假设特定命令存在

```typescript
// ❌ macOS 上可能不存在
await execute('git');

// ✅ 检查命令是否存在
if (hasCommand('git')) {
    await execute('git status');
}
```

### 4. 忽略编码问题

```typescript
// ❌ Windows 上中文乱码
spawn(cmd, { shell: true });

// ✅ 使用 iconv-lite 处理编码
if (platform === 'windows') {
    const decoded = iconv.decode(buffer, 'cp936');
}
```

## 实现示例

### 跨平台文件查找

```typescript
import { buildFindCommand } from './util/platform-cmd';

// 自动适配平台
const findCmd = buildFindCommand('*.ts', 'src');

// Windows:  dir /s /b "src\*.ts"
// macOS:   find "src" -name "*.ts" -type f
// Linux:   find "src" -name "*.ts" -type f

const result = await execute(findCmd);
```

### 跨平台文件列表

```typescript
import { buildListCommand } from './util/platform-cmd';

const listCmd = buildListCommand('src');

// Windows:  dir /a "src"
// macOS:   ls -la "src"
// Linux:   ls -la "src"

const result = await execute(listCmd);
```

## 测试策略

### 1. 在所有平台上测试

```bash
# Windows
npm test

# macOS
npm test

# Linux (GitHub Actions, GitLab CI, etc.)
npm test
```

### 2. 使用 CI/CD 进行多平台测试

```yaml
# .github/workflows/test.yml
jobs:
  test:
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm test
```

### 3. 平台特定的测试

```typescript
import { getPlatform } from './util/platform-cmd';

describe('Platform-specific tests', () => {
    const platform = getPlatform();

    if (platform === 'windows') {
        it('should handle Windows paths', () => {
            // Windows 特定测试
        });
    } else {
        it('should handle Unix paths', () => {
            // Unix 特定测试
        });
    }
});
```

## 参考资源

- [Node.js `path` 模块文档](https://nodejs.org/api/path.html)
- [execa 文档](https://github.com/sindresorhus/execa)
- [fast-glob 文档](https://github.com/mrmlnc/fast-glob)
- [Node.js 多平台最佳实践](https://nodejs.org/api/os.html)
