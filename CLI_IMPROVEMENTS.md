# CLI UI 优化说明

## 概述

参考 `/Users/wrr/work/opencode/packages/opencode/src/cli` 的实现，对项目的 CLI UI 进行了全面优化。所有改进都保持了使用 `ink` 库，没有更换底层技术栈。

## 主要改进

### 1. 工具信息展示组件 (`src/cli/components/tool-call/`)

**新建文件**: `src/cli/components/tool-call/index.tsx`

**改进内容**:
- 创建了独立的工具调用展示组件 `ToolCall`
- 支持显示工具名称、参数、执行结果和耗时
- 根据执行状态（成功/失败）使用不同颜色标识
- 支持参数和结果内容的预览（限制长度）
- 工具调用列表 `ToolCallList` 用于批量展示多个工具调用

**特性**:
- 成功状态使用绿色图标 `✓`
- 失败状态使用红色图标 `✗`
- 清晰的视觉层次和缩进

### 2. 消息展示组件 (`src/cli/components/message-list/`)

**优化文件**: `src/cli/components/message-list/index.tsx`

**改进内容**:
- 重构了消息展示逻辑，支持分组显示
- 用户消息使用青色标识 `❯ You`
- 助手消息使用绿色标识 `💻 Assistant`
- 工具调用分组展示 `⚡ Tools`
- 支持工具调用与消息的无缝集成
- 集成了新的 `ToolCallList` 组件

**特性**:
- 按角色和类型分组消息
- 工具调用单独分组展示
- Markdown 渲染支持
- 空状态提示

### 3. Loading 组件 (`src/cli/components/Loading/`)

**优化文件**: `src/cli/components/Loading/index.tsx`

**改进内容**:
- 提供了 4 种不同的加载动画样式：
  - `dots`: 经典旋转点动画（默认）
  - `blocks`: Knight Rider 效果扫描条
  - `arrow`: 旋转箭头
  - `pulse`: 脉冲效果

**特性**:
- 可自定义加载文本和颜色
- 流畅的动画效果
- 模块化设计，易于扩展

### 4. 命令功能增强

#### 4.1 命令选择器 (`src/cli/components/command-selector/`)

**优化文件**: `src/cli/components/command-selector/index.tsx`

**改进内容**:
- 优化了命令选择器的 UI 显示
- 添加边框和标题栏
- 显示命令总数
- 支持显示选中命令的描述
- 底部操作提示
- 支持键盘快捷键（↑↓、Ctrl+P/N）

**特性**:
- 模糊匹配命令名称和描述
- 实时搜索过滤
- 键盘导航优化
- 清晰的视觉反馈

#### 4.2 命令结果展示 (`src/cli/components/command-result/`)

**优化文件**: `src/cli/components/command-result/index.tsx`

**改进内容**:
- 增强了命令结果的显示样式
- 支持显示命令执行的数据（JSON 格式化）
- 更清晰的成功/失败标识
- 退出状态的特殊处理

**特性**:
- 成功/失败状态图标
- 支持数据显示
- 自动清除（3 秒）

### 5. 新增组件

#### 5.1 键盘快捷键提示 (`src/cli/components/keybind-hint/`)

**新建文件**: `src/cli/components/keybind-hint/index.tsx`

**功能**:
- 显示常用键盘快捷键
- 默认提示：Ctrl+C、/cmd、↑↓
- 可自定义快捷键列表
- 底部固定显示

#### 5.2 Toast 通知 (`src/cli/components/toast/`)

**新建文件**: `src/cli/components/toast/index.tsx`

**功能**:
- 临时通知显示
- 4 种类型：info、success、warning、error
- 可配置显示时长
- 边框样式
- Context API 支持

### 6. 常量和图标 (`src/cli/utils/constants.ts`)

**改进内容**:
- 添加了 `TOOL` 图标 `⚡`
- 添加了 `ERROR` 图标 `✗`
- 优化了图标集合

### 7. 主应用组件 (`src/cli/app.tsx`)

**改进内容**:
- 集成了新的 `KeybindHint` 组件
- 优化了状态栏显示
- 改进了导航提示
- 整体布局优化

### 8. Welcome 组件 (`src/cli/components/welcome/`)

**优化文件**: `src/cli/components/welcome/index.tsx`

**改进内容**:
- 使用新的 `TOOL` 图标替换旧图标
- 路径长度限制（超过 60 字符时显示 ...）

## 文件变更总结

### 新建文件
- `src/cli/components/tool-call/index.tsx` - 工具调用展示组件
- `src/cli/components/keybind-hint/index.tsx` - 键盘快捷键提示
- `src/cli/components/toast/index.tsx` - Toast 通知组件

### 优化文件
- `src/cli/components/message-list/index.tsx` - 消息列表组件
- `src/cli/components/Loading/index.tsx` - 加载组件
- `src/cli/components/command-selector/index.tsx` - 命令选择器
- `src/cli/components/command-result/index.tsx` - 命令结果
- `src/cli/app.tsx` - 主应用组件
- `src/cli/components/welcome/index.tsx` - 欢迎页
- `src/cli/utils/constants.ts` - 常量定义
- `src/cli/context/index.ts` - Context 导出

## 技术细节

### 保持使用 ink 库
所有组件都基于 React 和 `ink` 库开发，没有更换底层技术栈。

### TypeScript 支持
所有新组件都包含完整的 TypeScript 类型定义，通过了 `pnpm typecheck`。

### 构建验证
- 类型检查通过 ✓
- 生产构建成功 ✓

## 设计原则

参考 OpenCode CLI 的设计：
1. **模块化**: 每个组件职责单一
2. **可扩展**: 易于添加新功能
3. **用户友好**: 清晰的视觉反馈
4. **一致性**: 统一的样式和交互模式

## 使用示例

### 工具调用展示
```tsx
import ToolCallList from './components/tool-call';

// 自动检测工具调用并展示
<MessageList messages={messages} />
```

### 自定义 Loading
```tsx
import Loading from './components/Loading';

// 使用 blocks 样式
<Loading text="Processing..." style="blocks" />
```

### Toast 通知
```tsx
import { ToastProvider, useToast } from './context';

// 在应用中使用
const { show } = useToast();
show({ message: 'Copied to clipboard', variant: 'success' });
```

## 后续建议

1. **键盘快捷键系统**: 考虑添加更完善的快捷键管理（参考 OpenCode 的 `keybind.tsx`）
2. **主题系统**: 支持亮色/暗色主题切换
3. **动画优化**: 进一步优化动画流畅度
4. **无障碍**: 增强屏幕阅读器支持
5. **配置持久化**: 保存用户偏好设置

## 参考

主要参考了 `/Users/wrr/work/opencode/packages/opencode/src/cli` 的以下部分：
- UI 组件设计模式
- 命令系统架构
- 动画效果实现
- 键盘交互处理
