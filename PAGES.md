# 页面系统文档

## 概述

实现了多级页面导航系统，支持命令详情页、设置页等二级页面。

## 页面列表

### 1. Home (首页)
- 显示欢迎信息
- 显示消息列表
- 显示输入框
- 支持命令输入和模糊匹配

### 2. Help (帮助页面)
- 显示所有命令列表（按分类）
- 支持查看命令详情
- 操作：ESC 返回

### 3. Model Select (模型选择)
- 显示可用模型列表
- 显示当前选中的模型
- 操作：
  - ↑↓ 选择模型
  - Enter 确认选择
  - ESC/Backspace 返回

## 导航系统

### 导航操作
- **ESC**: 返回上一页（非首页时）
- **Backspace**: 返回上一页（非首页时）
- **↑↓ 箭头**: 在列表中导航
- **Enter**: 确认选择

### 页面堆栈
使用历史堆栈管理页面层级，支持多级导航。

## 命令到页面映射

| 命令 | 页面 | 功能 |
|------|------|------|
| `/help` | help | 显示帮助信息 |
| `/model` | model-select | 选择 AI 模型 |

## 扩展新页面

### 1. 创建页面组件

```typescript
// src/cli/pages/your-page/index.tsx
import React from 'react';
import { Box, Text, useInput } from 'ink';

interface YourPageProps {
  onBack: () => void;
  // 其他 props
}

export const YourPage: React.FC<YourPageProps> = ({
  onBack,
}) => {
  const handleKey = (input: string, key: any) => {
    if (key.escape || key.backspace) {
      onBack();
    }
  };

  useInput(handleKey);

  return (
    <Box>
      <Text>Your Page Content</Text>
    </Box>
  );
};
```

### 2. 添加页面 ID 类型

```typescript
// src/cli/context/types.ts
export type PageId =
  | 'home'
  | 'help'
  | 'model-select'
  | 'your-page';  // 添加新页面
```

### 3. 在 App 组件中渲染

```typescript
// src/cli/app.tsx
import YourPage from './pages/your-page';

const renderPage = () => {
  switch (currentPage) {
    case 'your-page':
      return <YourPage onBack={goBack} />;

    // ... 其他页面
  }
};
```

### 4. 添加命令导航到页面

```typescript
// src/cli/commands/your-command.ts
const handler: CommandHandler = async (context: CommandContext) => {
  const navigateToPage = context.navigateToPage as ((pageId: string) => void) | undefined;

  if (navigateToPage) {
    navigateToPage('your-page');
    return successResult('Opening page...');
  }

  return successResult('Navigation not available');
};
```

## 页面生命周期

1. **进入页面**: 通过命令或导航进入
2. **页面渲染**: 显示页面内容
3. **用户交互**: 处理键盘输入
4. **返回/完成**: 返回上一页或完成操作

## Context 扩展

页面可以通过 `CommandContext` 访问：
- `navigateToPage`: 导航到指定页面
- `setModel`: 设置模型
- `setSessionId`: 设置会话 ID
- 其他状态和方法

## 示例

### 查看帮助

```
> /help
[跳转到 help 页面]
按 ESC 返回
```

### 选择模型

```
> /model
[跳转到 model-select 页面]

🤖 Select Model
  > GLM (current) - 智谱 AI 模型
    OpenAI - OpenAI GPT 模型
    Minimax - MiniMax 模型

[↑↓] Select • [Enter] Confirm • [Esc/Backspace] Back
```

### 返回首页

```
[在 help 或 model-select 页面]
按 ESC 或 Backspace
[返回到 home 页面]
```

## 设计原则

1. **一致性**: 所有页面使用相同的导航模式
2. **可访问**: 清晰的键盘操作提示
3. **简洁**: 每个页面职责单一
4. **可扩展**: 易于添加新页面
