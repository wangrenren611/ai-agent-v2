# Ink 深度解析：React 构建交互式 CLI 完全指南

> 🌈 Ink - React for interactive command-line apps
>
> 官网: https://term.ink | GitHub: https://github.com/vadimdemedes/ink

---

## 目录

1. [项目概述](#一项目概述)
2. [核心设计思想](#二核心设计思想)
3. [架构详解](#三架构详解)
4. [组件系统](#四组件系统)
5. [Hooks 系统](#五hooks-系统)
6. [高级使用模式](#六高级使用模式)
7. [性能优化](#七性能优化)
8. [可访问性](#八可访问性)
9. [生态系统](#九生态系统)
10. [测试与调试](#十测试与调试)
11. [实战案例](#十一实战案例)
12. [最佳实践](#十二最佳实践)

---

## 一、项目概述

### 1.1 什么是 Ink

Ink 是一个 **React 自定义渲染器**，专门用于构建交互式命令行应用。它将 React 的组件化 UI 构建体验引入终端环境，使开发者能够使用熟悉的 JSX/React 语法来创建强大的 CLI 界面。

### 1.2 核心特性

| 特性 | 描述 |
|------|------|
| **组件化** | 使用 React 组件构建 CLI UI |
| **Flexbox 布局** | 基于 Yoga 布局引擎的完整 Flexbox 支持 |
| **Hooks 系统** | 完整的 React Hooks 支持，加上 CLI 专用 Hooks |
| **焦点管理** | 内置 Tab 导航和焦点控制系统 |
| **可访问性** | 屏幕阅读器支持和 ARIA 规范实现 |
| **性能优化** | 节流渲染、增量渲染、虚拟列表支持 |

### 1.3 项目数据

```
Stars:     34.4k+
Forks:     821+
License:   MIT
Authors:   Vadym Demedes, Sindre Sorhus
```

### 1.4 谁在使用 Ink

- **Claude Code** - Anthropic 的 AI 编程工具
- **GitHub Copilot CLI** - GitHub 的 CLI 助手
- **Cloudflare Wrangler** - Cloudflare Workers CLI
- **Gatsby** - 现代网站框架
- **Prisma** - 数据层 ORM
- **Shopify CLI** - Shopify 开发工具
- **Twilio SIGNAL** - Twilio 会议 CLI

---

## 二、核心设计思想

### 2.1 React 自定义渲染器架构

Ink 不是对 React 的简单封装，而是实现了完整的 **React 自定义渲染器**。类似于 React DOM（浏览器渲染）和 React Native（移动端渲染），Ink 是 React 在终端环境的渲染实现。

```
React Core (声明式组件、Hooks、Context)
        ↓
    React Reconciler (协调算法)
        ↓
    Ink Renderer (自定义 Host Config)
        ↓
    Terminal Output (ANSI 转义序列)
```

### 2.2 核心架构原则

#### 原则 1：一切皆 Flexbox

在 Ink 中，**每个元素都是 Flexbox 容器**。可以想象成浏览器中每个 `<div>` 都有 `display: flex`。

```tsx
// 不需要显式设置 display，默认就是 flex
<Box justifyContent="center" alignItems="center">
  <Text>居中内容</Text>
</Box>
```

#### 原则 2：文本必须包裹

所有文本内容必须在 `<Text>` 组件内。这是 Ink 的强制要求，确保正确处理样式和布局。

```tsx
// ❌ 错误：文本未包裹
<Box>Hello World</Box>

// ✅ 正确：文本包裹在 Text 中
<Box><Text>Hello World</Text></Box>
```

#### 原则 3：同步渲染

与 ReactDOM 的异步渲染不同，Ink 使用同步更新确保即时视觉反馈，这对于 CLI 应用至关重要。

```tsx
// Ink 内部使用同步更新
updateContainerSync(tree, root);
flushSyncWork();
```

#### 原则 4：节流渲染

为防止过度重渲染，Ink 默认将渲染限制在 30 FPS。

```tsx
render(<App />, {
  maxFps: 30  // 可配置
});
```

---

## 三、架构详解

### 3.1 四层架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户代码层                               │
│                  (React Components)                          │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Orchestration 层                           │
│  - Ink 类管理渲染生命周期                                     │
│  - 创建自定义 DOM 树                                         │
│  - 配置渲染节流 (30 FPS)                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  Reconciliation 层                           │
│  - React Reconciler Host Config                             │
│  - createInstance()    → 创建 DOMElement                    │
│  - commitUpdate()      → 更新属性                            │
│  - resetAfterCommit()  → 触发布局计算                        │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Layout Engine 层                           │
│  - Yoga Flexbox 布局引擎                                     │
│  - 计算尺寸和位置                                            │
│  - 处理文本换行和内边距                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  Output Generation 层                        │
│  - 生成 ANSI 转义序列                                        │
│  - 处理光标位置                                              │
│  - 输出缓冲管理                                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                    Terminal Output
```

### 3.2 DOMElement 与 YogaNode 的关系

每个 `DOMElement`（Ink 的 DOM 节点）都有一个对应的 `yogaNode`：

```tsx
class DOMElement {
  nodeName: string;        // 'box' | 'text'
  attributes: object;      // 组件属性
  children: DOMElement[];  // 子节点
  yogaNode: Yoga.Node;     // Yoga 布局节点
  textCache: string;       // 缓存的文本内容
}
```

### 3.3 渲染流程

```tsx
// 1. 初始化
const ink = new Ink(options);
const root = new DOMElement('root');
const container = createContainer(root);

// 2. 渲染组件
updateContainerSync(<App />, container);

// 3. React 协调过程
// Reconciler 调用 Host Config 方法：
// - createInstance(type, props) → DOMElement
// - createTextInstance(text) → Text Node
// - appendChild(parent, child)
// - commitUpdate(instance, updatePayload)

// 4. 布局计算
calculateLayout(root, terminalWidth);

// 5. 生成输出
const output = renderer(root);
logUpdate(output); // 使用 stdout 光标控制更新显示
```

---

## 四、组件系统

### 4.1 组件层次结构

```
render()
  ├─ <Box>        # 布局容器（类似 div）
  ├─ <Text>       # 文本节点（样式化文本）
  ├─ <Newline>    # 换行符
  ├─ <Spacer>     # 弹性空间填充
  ├─ <Static>     # 静态输出（固定内容）
  └─ <Transform>  # 输出转换（文本处理）
```

### 4.2 Box 组件

Box 是 Ink 的核心布局组件，相当于浏览器的 `<div>` + Flexbox。

#### 基本用法

```tsx
import { Box, Text } from 'ink';

const BasicBox = () => (
  <Box padding={2} margin={1}>
    <Text>Hello World</Text>
  </Box>
);
```

#### 尺寸属性

```tsx
<Box
  // 固定尺寸
  width={20}
  height={5}

  // 百分比尺寸（相对于父容器）
  width="50%"
  height="50%"

  // 最小尺寸
  minWidth={10}
  minHeight={3}
>
  <Text>Content</Text>
</Box>
```

#### 内边距 (Padding)

```tsx
<Box paddingTop={1}>        {/* 上内边距 */}
<Box paddingBottom={1}>     {/* 下内边距 */}
<Box paddingLeft={1}>       {/* 左内边距 */}
<Box paddingRight={1}>      {/* 右内边距 */}
<Box paddingX={1}>          {/* 水平内边距 */}
<Box paddingY={1}>          {/* 垂直内边距 */}
<Box padding={1}>           {/* 所有方向 */}
```

#### 外边距 (Margin)

```tsx
<Box marginTop={1}>         {/* 上外边距 */}
<Box marginBottom={1}>      {/* 下外边距 */}
<Box marginLeft={1}>        {/* 左外边距 */}
<Box marginRight={1}>       {/* 右外边距 */}
<Box marginX={1}>           {/* 水平外边距 */}
<Box marginY={1}>           {/* 垂直外边距 */}
<Box margin={1}>            {/* 所有方向 */}
```

#### 间距 (Gap)

```tsx
<Box gap={1}>               {/* 行和列间距 */}
<Box columnGap={1}>         {/* 列间距 */}
<Box rowGap={1}>            {/* 行间距 */}
```

#### Flex 属性

```tsx
<Box
  // Flex 增长/收缩/基础
  flexGrow={1}
  flexShrink={0}
  flexBasis="auto"

  // 方向和换行
  flexDirection="row"       // row | row-reverse | column | column-reverse
  flexWrap="nowrap"         // nowrap | wrap | wrap-reverse

  // 对齐
  justifyContent="flex-start"  // flex-start | center | flex-end | space-between | space-around | space-evenly
  alignItems="flex-start"      // flex-start | center | flex-end
  alignSelf="auto"             // auto | flex-start | center | flex-end
>
  <Text>Content</Text>
</Box>
```

#### 边框属性

```tsx
<Box
  // 边框样式
  borderStyle="single"      // single | double | round | bold | singleDouble | doubleSingle | classic

  // 边框颜色
  borderColor="green"
  borderTopColor="red"
  borderRightColor="blue"
  borderBottomColor="yellow"
  borderLeftColor="cyan"

  // 边框显示/隐藏
  border={true}
  borderTop={true}
  borderRight={true}
  borderBottom={true}
  borderLeft={true}

  // 自定义边框样式
  borderStyle={{
    topLeft: '╭',
    top: '─',
    topRight: '╮',
    right: '│',
    bottomRight: '╯',
    bottom: '─',
    bottomLeft: '╰',
    left: '│'
  }}
>
  <Text>Bordered Box</Text>
</Box>
```

#### 背景颜色

```tsx
<Box backgroundColor="blue">
  <Text color="white">Blue background with white text</Text>
</Box>
```

#### 可见性控制

```tsx
<Box display="flex">   {/* 显示 */}
<Box display="none">   {/* 隐藏 */}
```

#### 溢出控制

```tsx
<Box
  overflow="hidden"       // visible | hidden
  overflowX="hidden"      // 水平溢出
  overflowY="hidden"      // 垂直溢出
>
  <Text>Content that might overflow</Text>
</Box>
```

### 4.3 Text 组件

Text 组件用于显示和样式化文本。

#### 基本用法

```tsx
import { Text } from 'ink';

const BasicText = () => (
  <Text>Hello World</Text>
);
```

#### 颜色属性

```tsx
<Text color="green">Green text</Text>
<Text color="#005cc5">Hex color</Text>
<Text color="rgb(232, 131, 136)">RGB color</Text>

// 背景颜色
<Text backgroundColor="white" color="black">
  Inverted colors
</Text>
```

#### 文本样式

```tsx
<Text bold>粗体文本</Text>
<Text italic>斜体文本</Text>
<Text underline>下划线文本</Text>
<Text strikethrough>删除线文本</Text>
<Text inverse>反转颜色</Text>
<Text dimColor>变暗文本</Text>
```

#### 文本换行

```tsx
<Box width={10}>
  <Text wrap="wrap">            {/* 默认：换行 */}
    Hello World
  </Text>
  {/* 输出: Hello\nWorld */}

  <Text wrap="truncate">        {/* 截断（末尾） */}
    Hello World
  </Text>
  {/* 输出: Hello… */}

  <Text wrap="truncate-middle"> {/* 截断（中间） */}
    Hello World
  </Text>
  {/* 输出: He…ld */}

  <Text wrap="truncate-start">  {/* 截断（开头） */}
    Hello World
  </Text>
  {/* 输出: …World */}
</Box>
```

### 4.4 Newline 组件

插入换行符。

```tsx
import { Newline } from 'ink';

const Example = () => (
  <Text>
    <Text color="green">Line 1</Text>
    <Newline />
    <Text color="red">Line 2</Text>
    <Newline count={2} />  {/* 插入多个换行 */}
    <Text color="blue">Line 3</Text>
  </Text>
);
```

### 4.5 Spacer 组件

弹性空间填充，自动占据剩余空间。

```tsx
import { Spacer } from 'ink';

const HorizontalSpacer = () => (
  <Box>
    <Text>Left</Text>
    <Spacer />
    <Text>Right</Text>
  </Box>
  {/* 输出: Left                    Right */}
);

const VerticalSpacer = () => (
  <Box flexDirection="column" height={10}>
    <Text>Top</Text>
    <Spacer />
    <Text>Bottom</Text>
  </Box>
  {/* Top 和 Bottom 之间有弹性空间 */}
);
```

### 4.6 Static 组件

永久渲染输出，不受重新渲染影响。适合显示已完成的任务、日志等。

```tsx
import { Static } from 'ink';

const TaskRunner = () => {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTasks(prev => [...prev, {
        id: prev.length,
        title: `Task ${prev.length + 1}`
      }]);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <Static items={tasks} style={{ padding: 1 }}>
        {(task) => (
          <Box key={task.id}>
            <Text color="green">✓ {task.title}</Text>
          </Box>
        )}
      </Static>

      <Box marginTop={1}>
        <Text dimColor>Completed: {tasks.length} tasks</Text>
      </Box>
    </>
  );
};
```

**重要特性：**
- `items` 数组中的新项目会被渲染
- 已渲染的项目不会重新渲染（性能优化）
- 适合展示累积性的输出（日志、完成的任务）

### 4.7 Transform 组件

转换子组件的输出字符串。

```tsx
import { Transform } from 'ink';

// 大写转换
const Uppercase = () => (
  <Transform transform={(output) => output.toUpperCase()}>
    <Text>Hello World</Text>
  </Transform>
  {/* 输出: HELLO WORLD */}
);

// 悬挂缩进
const HangingIndent = ({ children, indent = 4 }) => (
  <Transform
    transform={(line, index) =>
      index === 0 ? line : ' '.repeat(indent) + line
    }
  >
    {children}
  </Transform>
);

// 使用
const Example = () => (
  <Box width={20}>
    <HangingIndent indent={4}>
      <Text>
        This is a long text that will wrap across multiple lines,
        and all lines except the first will be indented.
      </Text>
    </HangingIndent>
  </Box>
);
```

---

## 五、Hooks 系统

### 5.1 useInput

捕获用户键盘输入。

#### 基本用法

```tsx
import { useInput } from 'ink';

const UserInput = () => {
  useInput((input, key) => {
    // input: 用户输入的字符（字符串）
    // key: 特殊键信息对象

    if (input === 'q') {
      // 用户按了 'q' 键
    }

    if (key.return) {
      // 用户按了回车键
    }
  });

  return <Text>Press any key...</Text>;
};
```

#### key 对象详解

```tsx
interface KeyInfo {
  // 方向键
  leftArrow: boolean;
  rightArrow: boolean;
  upArrow: boolean;
  downArrow: boolean;

  // 特殊键
  return: boolean;      // 回车键
  escape: boolean;      // ESC 键
  tab: boolean;         // Tab 键
  backspace: boolean;   // 退格键
  delete: boolean;      // Delete 键
  pageUp: boolean;      // Page Up
  pageDown: boolean;    // Page Down

  // 修饰键
  ctrl: boolean;        // Ctrl 键
  shift: boolean;       // Shift 键
  meta: boolean;        // Meta/Win/Command 键
}
```

#### 完整示例：方向控制

```tsx
import { useState } from 'react';
import { useInput, Box, Text } from 'ink';

const PositionControl = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [log, setLog] = useState([]);

  useInput((input, key) => {
    // 方向键控制
    if (key.leftArrow) {
      setPosition(p => ({ ...p, x: Math.max(0, p.x - 1) }));
    }
    if (key.rightArrow) {
      setPosition(p => ({ ...p, x: p.x + 1 }));
    }
    if (key.upArrow) {
      setPosition(p => ({ ...p, y: Math.max(0, p.y - 1) }));
    }
    if (key.downArrow) {
      setPosition(p => ({ ...p, y: p.y + 1 }));
    }

    // 回车记录位置
    if (key.return) {
      setLog(prev => [...prev, `Position: (${position.x}, ${position.y})`]);
    }

    // 退出
    if (input === 'q' || (input === 'c' && key.ctrl)) {
      process.exit(0);
    }
  });

  return (
    <Box flexDirection="column">
      <Box height={10} width={30}>
        <Box paddingLeft={position.x} paddingTop={position.y}>
          <Text color="cyan">●</Text>
        </Box>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Position: ({position.x}, {position.y})</Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {log.slice(-5).map((entry, i) => (
          <Text key={i} dimColor>{entry}</Text>
        ))}
      </Box>
      <Text dimColor marginTop={1}>
        Arrow keys: Move | Enter: Log | Q/Ctrl+C: Quit
      </Text>
    </Box>
  );
};
```

#### isActive 选项

控制输入处理是否激活：

```tsx
useInput((input, key) => {
  // 只在 active 为 true 时处理
  if (input === 'q') exit();
}, {
  isActive: isActive  // 可选，默认 true
});
```

### 5.2 useFocus & useFocusManager

焦点管理系统，实现 Tab 导航和程序化焦点控制。

#### useFocus Hook

使组件可聚焦：

```tsx
import { useFocus } from 'ink';

const FocusableInput = ({ id, autoFocus = false }) => {
  const { isFocused } = useFocus({
    id,           // 用于程序化聚焦
    autoFocus,    // 自动聚焦
    isActive: true // 是否参与焦点系统
  });

  return (
    <Text color={isFocused ? 'cyan' : 'gray'}>
      {isFocused ? '> ' : '  '}Input field
    </Text>
  );
};
```

#### useFocusManager Hook

全局焦点控制：

```tsx
import { useFocusManager } from 'ink';

const FocusControls = () => {
  const {
    focusNext,      // 聚焦下一个
    focusPrevious,  // 聚焦上一个
    focus,          // 聚焦指定 ID
    enableFocus,    // 启用焦点系统
    disableFocus    // 禁用焦点系统
  } = useFocusManager();

  useInput((input, key) => {
    if (key.tab) focusNext();
    if (key.shift && key.tab) focusPrevious();
    if (input === '1') focus('email-field');
    if (input === 'd') disableFocus();
    if (input === 'e') enableFocus();
  });

  return <Text>Focus controls active</Text>;
};
```

#### 完整表单示例

```tsx
import { useState } from 'react';
import { useFocus, useFocusManager, useInput, Box, Text } from 'ink';

const FormInput = ({ label, id, value, onChange }) => {
  const { isFocused } = useFocus({ id });
  const localValue = value || '';

  useInput((input, key) => {
    if (!isFocused) return;

    if (key.backspace || key.delete) {
      onChange(localValue.slice(0, -1));
    } else if (input && !key.ctrl && !key.meta && input.length === 1) {
      onChange(localValue + input);
    }
  });

  return (
    <Box>
      <Text color={isFocused ? 'cyan' : 'white'}>
        {isFocused ? '→ ' : '  '}
        {label}: {localValue}
        {isFocused && <Text dimColor>█</Text>}
      </Text>
    </Box>
  );
};

const Form = () => {
  const [values, setValues] = useState({
    username: '',
    email: '',
    password: ''
  });

  const handleChange = (field) => (value) => {
    setValues(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Box flexDirection="column">
      <Text bold marginBottom={1}>User Registration</Text>
      <FormInput
        id="username"
        label="Username"
        autoFocus
        value={values.username}
        onChange={handleChange('username')}
      />
      <FormInput
        id="email"
        label="Email"
        value={values.email}
        onChange={handleChange('email')}
      />
      <FormInput
        id="password"
        label="Password"
        value={values.password}
        onChange={handleChange('password')}
      />
      <Text dimColor marginTop={1}>Tab: Switch fields</Text>
    </Box>
  );
};
```

### 5.3 useApp

应用控制，主要是退出功能。

```tsx
import { useApp } from 'ink';

const AutoExit = () => {
  const { exit } = useApp();

  useEffect(() => {
    const timer = setTimeout(() => {
      exit();  // 退出应用
      // exit(new Error('Timeout'));  // 带错误退出
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return <Text>Will exit in 5 seconds...</Text>;
};
```

### 5.4 useStdin

访问标准输入流。

```tsx
import { useStdin } from 'ink';

const StdinExample = () => {
  const { stdin, isRawModeSupported, setRawMode } = useStdin();

  useEffect(() => {
    if (!isRawModeSupported) {
      console.log('Raw mode not supported');
      return;
    }

    setRawMode(true);

    return () => setRawMode(false);
  }, []);

  return <Text>Stdin: {isRawModeSupported ? 'supported' : 'not supported'}</Text>;
};
```

### 5.5 useStdout

访问标准输出流，直接写入不影响 Ink 渲染。

```tsx
import { useStdout } from 'ink';

const StdoutExample = () => {
  const { stdout, write } = useStdout();

  useEffect(() => {
    // 直接写入 stdout
    write('Direct stdout message\n');
  }, []);

  return <Text>Ink UI</Text>;
};
```

### 5.6 useStderr

访问标准错误流。

```tsx
import { useStderr } from 'ink';

const StderrExample = () => {
  const { stderr, write } = useStderr();

  useEffect(() => {
    write('Error message to stderr\n');
  }, []);

  return <Text>Check stderr for messages</Text>;
};
```

### 5.7 useIsScreenReaderEnabled

检测屏幕阅读器是否启用。

```tsx
import { useIsScreenReaderEnabled } from 'ink';

const ScreenReaderExample = () => {
  const isEnabled = useIsScreenReaderEnabled();

  return (
    <Box aria-label={isEnabled ? 'Screen reader active' : undefined}>
      <Text>
        {isEnabled
          ? 'Screen reader is enabled'
          : 'Screen reader is disabled'
        }
      </Text>
    </Box>
  );
};
```

---

## 六、高级使用模式

### 6.1 多页面路由系统

```tsx
import { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';

// 页面组件
const HomePage = ({ onNavigate }) => (
  <Box flexDirection="column">
    <Text bold>Home Page</Text>
    <Text marginTop={1}>Press 's' for Settings</Text>
    <Text>Press 'a' for About</Text>
  </Box>
);

const SettingsPage = ({ onNavigate, onBack }) => (
  <Box flexDirection="column">
    <Text bold>Settings Page</Text>
    <Text marginTop={1}>Press 'b' to go back</Text>
  </Box>
);

const AboutPage = ({ onNavigate, onBack }) => (
  <Box flexDirection="column">
    <Text bold>About Page</Text>
    <Text marginTop={1}>Version 1.0.0</Text>
    <Text>Press 'b' to go back</Text>
  </Box>
);

// 路由器
const Router = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [history, setHistory] = useState(['home']);

  const navigate = useCallback((page) => {
    setHistory(prev => [...prev, page]);
    setCurrentPage(page);
  }, []);

  const goBack = useCallback(() => {
    if (history.length > 1) {
      const newHistory = history.slice(0, -1);
      setHistory(newHistory);
      setCurrentPage(newHistory[newHistory.length - 1]);
    }
  }, [history]);

  const pages = {
    home: <HomePage onNavigate={navigate} />,
    settings: <SettingsPage onNavigate={navigate} onBack={goBack} />,
    about: <AboutPage onNavigate={navigate} onBack={goBack} />
  };

  useInput((input, key) => {
    if (input === 's') navigate('settings');
    if (input === 'a') navigate('about');
    if (input === 'b') goBack();
    if (input === 'q' || (input === 'c' && key.ctrl)) {
      process.exit(0);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderBottom={true} marginBottom={1}>
        <Text bold>My CLI App</Text>
        <Text dimColor> | Page: {currentPage}</Text>
      </Box>
      {pages[currentPage]}
      <Text dimColor marginTop={1}>
        [S]ettings [A]bout [B]ack [Q]uit
      </Text>
    </Box>
  );
};
```

### 6.2 表单验证系统

```tsx
import { useState, useCallback } from 'react';
import { Box, Text, useFocus } from 'ink';

// 验证规则
const validators = {
  required: (value) => value.length > 0 ? null : 'This field is required',
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Invalid email',
  minLength: (min) => (value) => value.length >= min ? null : `Must be at least ${min} characters`,
  maxLength: (max) => (value) => value.length <= max ? null : `Must be at most ${max} characters`
};

// 输入框组件
const ValidatedInput = ({
  label,
  id,
  value,
  error,
  touched,
  onChange,
  onBlur,
  autoFocus = false
}) => {
  const { isFocused } = useFocus({ id, autoFocus });

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color={isFocused ? 'cyan' : 'white'}>
          {isFocused ? '→ ' : '  '}
          {label}: {value}
          {isFocused && <Text dimColor>█</Text>}
        </Text>
      </Box>
      {touched && error && (
        <Text color="red" marginLeft={2}>
          ⚠ {error}
        </Text>
      )}
    </Box>
  );
};

// 表单组件
const Form = () => {
  const [values, setValues] = useState({
    username: '',
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = useCallback((name, value) => {
    switch (name) {
      case 'username':
        return validators.required(value) || validators.minLength(3)(value);
      case 'email':
        return validators.required(value) || validators.email(value);
      case 'password':
        return validators.required(value) || validators.minLength(8)(value);
      default:
        return null;
    }
  }, []);

  const handleChange = useCallback((name) => (value) => {
    setValues(prev => ({ ...prev, [name]: value }));

    if (touched[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: validateField(name, value)
      }));
    }
  }, [touched, validateField]);

  const handleBlur = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({
      ...prev,
      [name]: validateField(name, values[name])
    }));
  }, [values, validateField]);

  const handleSubmit = useCallback(() => {
    // 标记所有字段为 touched
    const allTouched = Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {});
    setTouched(allTouched);

    // 验证所有字段
    const newErrors = {};
    let isValid = true;

    for (const [name, value] of Object.entries(values)) {
      const error = validateField(name, value);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);

    if (isValid) {
      console.log('Form submitted:', values);
    }
  }, [values, validateField]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold marginBottom={1}>Registration Form</Text>

      <ValidatedInput
        id="username"
        label="Username"
        value={values.username}
        error={errors.username}
        touched={touched.username}
        onChange={handleChange('username')}
        onBlur={() => handleBlur('username')}
        autoFocus
      />

      <ValidatedInput
        id="email"
        label="Email"
        value={values.email}
        error={errors.email}
        touched={touched.email}
        onChange={handleChange('email')}
        onBlur={() => handleBlur('email')}
      />

      <ValidatedInput
        id="password"
        label="Password"
        value={values.password}
        error={errors.password}
        touched={touched.password}
        onChange={handleChange('password')}
        onBlur={() => handleBlur('password')}
      />

      <Text dimColor marginTop={1}>
        Tab: Navigate | Enter: Submit
      </Text>
    </Box>
  );
};
```

### 6.3 虚拟列表（处理大数据）

```tsx
import { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';

const VirtualList = ({
  items,
  itemHeight = 1,
  visibleCount = 10,
  onSelect
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + visibleCount,
      items.length
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, visibleCount, items.length]);

  // 可见项目
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [items, visibleRange]);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex(i => Math.max(0, i - 1));
      setScrollTop(t => Math.max(0, t - itemHeight));
    }
    if (key.downArrow) {
      setSelectedIndex(i => Math.min(items.length - 1, i + 1));
      setScrollTop(t =>
        Math.min(
          (items.length - visibleCount) * itemHeight,
          t + itemHeight
        )
      );
    }
    if (key.return && onSelect) {
      onSelect(items[selectedIndex]);
    }
  });

  return (
    <Box flexDirection="column">
      <Box borderStyle="single" height={visibleCount * itemHeight}>
        <Box marginTop={-visibleRange.startIndex * itemHeight} flexDirection="column">
          {visibleItems.map((item, index) => (
            <Box
              key={visibleRange.startIndex + index}
              height={itemHeight}
              backgroundColor={
                visibleRange.startIndex + index === selectedIndex
                  ? 'blue'
                  : undefined
              }
            >
              <Text color={
                visibleRange.startIndex + index === selectedIndex
                  ? 'white'
                  : undefined
              }>
                {item}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
      <Text dimColor marginTop={1}>
        ↑↓: Navigate | Enter: Select | {selectedIndex + 1}/{items.length}
      </Text>
    </Box>
  );
};

// 使用示例
const LargeListExample = () => {
  const items = useMemo(() =>
    Array.from({ length: 1000 }, (_, i) => `Item ${i + 1}`),
    []
  );

  const handleSelect = (item) => {
    console.log(`Selected: ${item}`);
  };

  return (
    <VirtualList
      items={items}
      visibleCount={10}
      onSelect={handleSelect}
    />
  );
};
```

### 6.4 进度条组件

```tsx
import { useEffect, useState } from 'react';
import { Box, Text } from 'ink';

const ProgressBar = ({
  percent = 0,
  width = 30,
  color = 'green',
  label = ''
}) => {
  const filledWidth = Math.floor((percent / 100) * width);
  const emptyWidth = width - filledWidth;

  return (
    <Box>
      {label && <Text>{label} </Text>}
      <Text color={color}>{'█'.repeat(filledWidth)}</Text>
      <Text dimColor>{'░'.repeat(emptyWidth)}</Text>
      <Text> {Math.round(percent)}%</Text>
    </Box>
  );
};

// 使用示例
const DownloadProgress = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(p => Math.min(100, p + 1));
    }, 50);

    return () => clearInterval(timer);
  }, []);

  return (
    <Box flexDirection="column">
      <Text bold marginBottom={1}>Download Progress</Text>
      <ProgressBar percent={progress} label="File:" />
      <ProgressBar percent={progress * 0.8} label="Speed:" color="blue" />
    </Box>
  );
};
```

### 6.5 加载动画

```tsx
import { useEffect, useState } from 'react';
import { Text } from 'ink';

const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

const Spinner = ({
  text = 'Loading...',
  color = 'cyan',
  interval = 80
}) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame(f => (f + 1) % frames.length);
    }, interval);

    return () => clearInterval(timer);
  }, [interval]);

  return (
    <Text color={color}>
      {frames[frame]} {text}
    </Text>
  );
};

// 使用示例
const LoadingExample = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <Spinner text="Processing..." />;
  }

  return <Text color="green">✓ Complete!</Text>;
};
```

### 6.6 确认对话框

```tsx
import { useState, useEffect } from 'react';
import { Box, Text, useFocus } from 'ink';

const ConfirmDialog = ({
  message,
  onConfirm,
  onCancel
}) => {
  const [selected, setSelected] = useState(0); // 0: Yes, 1: No
  const { isFocused: yesFocused } = useFocus({ id: 'yes', autoFocus: true });
  const { isFocused: noFocused } = useFocus({ id: 'no' });

  useEffect(() => {
    if (yesFocused) setSelected(0);
    if (noFocused) setSelected(1);
  }, [yesFocused, noFocused]);

  const handleConfirm = () => {
    if (selected === 0 && onConfirm) onConfirm();
    if (selected === 1 && onCancel) onCancel();
  };

  useEffect(() => {
    const handleKeyPress = (data) => {
      if (data.key === 'return') {
        handleConfirm();
      }
    };

    process.stdin.on('keypress', handleKeyPress);
    return () => process.stdin.off('keypress', handleKeyPress);
  }, [selected]);

  return (
    <Box borderStyle="round" padding={1}>
      <Box flexDirection="column">
        <Text>{message}</Text>
        <Box marginTop={1}>
          <Text
            color={selected === 0 ? 'green' : 'gray'}
            bold={selected === 0}
          >
            [{selected === 0 ? 'X' : ' '] Yes
          </Text>
          <Text> </Text>
          <Text
            color={selected === 1 ? 'red' : 'gray'}
            bold={selected === 1}
          >
            [{selected === 1 ? 'X' : ' '] No
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
```

---

## 七、性能优化

### 7.1 渲染配置

```tsx
import { render } from 'ink';

render(<App />, {
  maxFps: 30,                   // 限制渲染帧率
  patchConsole: true,           // 拦截 console 输出
  exitOnCtrlC: true,            // Ctrl+C 退出
  debug: false,                 // 调试模式
  incrementalRendering: true,   // 增量渲染
  isScreenReaderEnabled: false  // 屏幕阅读器支持
});
```

### 7.2 使用 useMemo 缓存计算

```tsx
import { useMemo } from 'react';

const ExpensiveList = ({ items }) => {
  // 缓存昂贵的计算
  const processedItems = useMemo(() =>
    items.map(item => ({
      ...item,
      computed: expensiveTransform(item)
    })),
    [items]  // 依赖项
  );

  return (
    <Box flexDirection="column">
      {processedItems.map(item => (
        <Text key={item.id}>{item.computed}</Text>
      ))}
    </Box>
  );
};
```

### 7.3 使用 useCallback 稳定回调

```tsx
import { useCallback } from 'react';

const Parent = () => {
  const [count, setCount] = useState(0);

  // 稳定的回调函数
  const handleClick = useCallback(() => {
    setCount(c => c + 1);
  }, []);  // 空依赖数组，函数永远不会改变

  return <ChildButton onClick={handleClick} />;
};

const ChildButton = React.memo(({ onClick }) => {
  // 只有 props 改变时才重新渲染
  return <Text onPress={onClick}>Click me</Text>;
});
```

### 7.4 React.memo 优化

```tsx
// 防止不必要的重新渲染
const ExpensiveComponent = React.memo(({ data }) => {
  return (
    <Box>
      <Text>{data}</Text>
    </Box>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数
  return prevProps.data === nextProps.data;
});
```

### 7.5 避免过度嵌套

```tsx
// ❌ 不好：过度嵌套
const Bad = () => (
  <Box>
    <Box>
      <Box>
        <Box>
          <Text>Too nested</Text>
        </Box>
      </Box>
    </Box>
  </Box>
);

// ✅ 好：扁平结构
const Good = () => (
  <Box padding={2} margin={1}>
    <Text>Flat structure</Text>
  </Box>
);
```

### 7.6 使用 Static 组件

对于不常变化的内容，使用 `<Static>` 组件避免重复渲染：

```tsx
const LogViewer = () => {
  const [logs, setLogs] = useState([]);

  return (
    <>
      {/* Static 只渲染新项目，已渲染的不会重绘 */}
      <Static items={logs}>
        {(log) => (
          <Box key={log.id}>
            <Text color={log.level === 'error' ? 'red' : 'green'}>
              {log.message}
            </Text>
          </Box>
        )}
      </Static>

      {/* 动态内容 */}
      <Box>
        <Text>Current: {currentStatus}</Text>
      </Box>
    </>
  );
};
```

### 7.7 条件渲染优化

```tsx
// ✅ 使用短路求值
const Conditional = ({ show }) => {
  return show && <Text>Shown</Text>;
};

// ✅ 使用三元运算符
const Conditional = ({ show }) => {
  return show ? <Text>Shown</Text> : <Text>Hidden</Text>;
};

// ❌ 避免在渲染中进行复杂计算
const Bad = ({ items }) => {
  return (
    <Box>
      {items
        .filter(i => i.active)
        .map(i => transform(i))
        .sort((a, b) => a.value - b.value)
        .map(item => <Text key={item.id}>{item.name}</Text>)
      }
    </Box>
  );
};

// ✅ 使用 useMemo 缓存
const Good = ({ items }) => {
  const sortedItems = useMemo(() => {
    return items
      .filter(i => i.active)
      .map(i => transform(i))
      .sort((a, b) => a.value - b.value);
  }, [items]);

  return (
    <Box>
      {sortedItems.map(item => <Text key={item.id}>{item.name}</Text>)}
    </Box>
  );
};
```

---

## 八、可访问性

### 8.1 启用屏幕阅读器支持

```tsx
// 方式 1: 通过环境变量
// INK_SCREEN_READER=true my-cli

// 方式 2: 通过 render 选项
render(<App />, { isScreenReaderEnabled: true });
```

### 8.2 ARIA 属性

```tsx
import { useIsScreenReaderEnabled } from 'ink';

const AccessibleCheckbox = ({ checked, onChange, label }) => {
  const isScreenReaderEnabled = useIsScreenReaderEnabled();

  return (
    <Box
      aria-role="checkbox"
      aria-state={{ checked }}
      aria-label={
        isScreenReaderEnabled
          ? `${checked ? 'Checked' : 'Unchecked'} ${label}`
          : undefined
      }
    >
      <Text>{checked ? '[✓]' : '[ ]'}</Text>
      <Text>{label}</Text>
    </Box>
  );
};
```

### 8.3 支持的 ARIA 属性

```tsx
<Box
  // 角色
  aria-role="button"  // button | checkbox | radio | list | listitem | menu | progressbar | tab | table

  // 状态
  aria-state={{
    checked: true,      // boolean
    disabled: false,    // boolean
    expanded: true,     // boolean
    selected: false     // boolean
  }}

  // 标签
  aria-label="Custom label for screen readers"

  // 隐藏
  aria-hidden={false}
>
  <Text>Content</Text>
</Box>
```

### 8.4 可访问的最佳实践

```tsx
const BestPractices = () => {
  const isScreenReaderEnabled = useIsScreenReaderEnabled();

  return (
    <Box flexDirection="column">
      {/* 1. 提供描述性标签 */}
      <Box
        aria-role="button"
        aria-label="Save changes to file"
      >
        <Text>Save</Text>
      </Box>

      {/* 2. 使用语义化角色 */}
      <Box aria-role="progressbar" aria-state={{ value: 75 }}>
        <Text>Progress: 75%</Text>
      </Box>

      {/* 3. 为屏幕阅读器提供额外信息 */}
      <Text
        aria-label={
          isScreenReaderEnabled
            ? 'Download complete: 5 files, 10MB total'
            : undefined
        }
      >
        ✓ Download complete
      </Text>

      {/* 4. 隐藏装饰性元素 */}
      <Text aria-hidden={true}>──────────</Text>
    </Box>
  );
};
```

---

## 九、生态系统

### 9.1 推荐组合组件

| 组件 | 用途 | 安装 |
|------|------|------|
| `ink-text-input` | 文本输入框 | `npm install ink-text-input` |
| `ink-select-input` | 下拉选择 | `npm install ink-select-input` |
| `ink-multi-select` | 多选列表 | `npm install ink-multi-select` |
| `ink-spinner` | 加载动画 | `npm install ink-spinner` |
| `ink-progress-bar` | 进度条 | `npm install ink-progress-bar` |
| `ink-table` | 表格展示 | `npm install ink-table` |
| `ink-markdown` | Markdown 渲染 | `npm install ink-markdown` |
| `ink-confirm-input` | 确认对话框 | `npm install ink-confirm-input` |
| `ink-tab` | 标签页 | `npm install ink-tab` |
| `ink-divider` | 分隔线 | `npm install ink-divider` |
| `ink-chart` | 图表 | `npm install ink-chart` |
| `ink-virtual-list` | 虚拟列表 | `npm install ink-virtual-list` |

### 9.2 使用第三方组件示例

```tsx
// ink-text-input
import TextInput from 'ink-text-input';

const SearchInput = () => {
  const [value, setValue] = useState('');

  return (
    <Box>
      <Text>Search: </Text>
      <TextInput
        value={value}
        onChange={setValue}
        placeholder="Type to search..."
      />
    </Box>
  );
};

// ink-select-input
import SelectInput from 'ink-select-input';

const items = [
  { label: 'First Option', value: 'first' },
  { label: 'Second Option', value: 'second' },
  { label: 'Third Option', value: 'third' }
];

const SelectExample = () => {
  const handleSelect = (item) => {
    console.log(`Selected: ${item.value}`);
  };

  return (
    <SelectInput items={items} onSelect={handleSelect} />
  );
};
```

---

## 十、测试与调试

### 10.1 使用 ink-testing-library

```bash
npm install --save-dev ink-testing-library
```

```tsx
import { render } from 'ink-testing-library';
import { Text } from 'ink';

test('renders greeting', () => {
  const Component = () => <Text>Hello World</Text>;
  const { lastFrame } = render(<Component />);

  expect(lastFrame()).toEqual('Hello World');
});

test('handles user input', () => {
  const Component = () => {
    const [count, setCount] = useState(0);

    useInput((input, key) => {
      if (input === ' ') setCount(c => c + 1);
    });

    return <Text>Count: {count}</Text>;
  };

  const { lastFrame, stdin } = render(<Component />);

  expect(lastFrame()).toEqual('Count: 0');

  stdin.write(' ');

  expect(lastFrame()).toEqual('Count: 1');
});
```

### 10.2 React DevTools 集成

```bash
# 1. 安装 react-devtools-core
npm install --save-dev react-devtools-core

# 2. 启动 CLI 时设置环境变量
DEV=true my-cli

# 3. 在另一个终端启动 DevTools
npx react-devtools
```

### 10.3 调试模式

```tsx
render(<App />, {
  debug: true  // 每次更新都渲染新输出，不清除之前的
});
```

### 10.4 性能监控

```tsx
render(<App />, {
  onRender: ({ renderTime }) => {
    console.log(`Render time: ${renderTime}ms`);
  }
});
```

---

## 十一、实战案例

### 11.1 CLI 任务管理器

```tsx
import { useState, useEffect } from 'react';
import {
  render,
  Box,
  Text,
  Static,
  useInput,
  useApp
} from 'ink';

interface Task {
  id: number;
  title: string;
  completed: boolean;
}

const TaskManager = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const { exit } = useApp();

  const addTask = (title: string) => {
    setTasks(prev => [...prev, {
      id: Date.now(),
      title,
      completed: false
    }]);
    setInput('');
  };

  const toggleTask = (id: number) => {
    setTasks(prev => prev.map(task =>
      task.id === id
        ? { ...task, completed: !task.completed }
        : task
    ));
  };

  const deleteTask = (id: number) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'active') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });

  useInput((inputChar, key) => {
    if (key.ctrl && inputChar === 'c') {
      exit();
    }

    if (key.return && input.trim()) {
      addTask(input.trim());
    }

    if (inputChar === 'f') {
      const filters: Array<'all' | 'active' | 'completed'> = ['all', 'active', 'completed'];
      const currentIndex = filters.indexOf(filter);
      setFilter(filters[(currentIndex + 1) % filters.length]);
    }
  });

  // 处理输入
  useEffect(() => {
    const handleData = (data: Buffer) => {
      const char = data.toString();
      if (char === '\r') return; // 回车已处理
      if (char === '\x7f') { // 退格
        setInput(prev => prev.slice(0, -1));
      } else if (char.length === 1) {
        setInput(prev => prev + char);
      }
    };

    process.stdin.on('data', handleData);
    return () => process.stdin.off('data', handleData);
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderBottom={true} marginBottom={1}>
        <Text bold>Task Manager</Text>
        <Text dimColor> | Filter: {filter}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text>Add task: </Text>
        <Text color="cyan">{input}</Text>
        <Text dimColor>█</Text>
      </Box>

      <Static items={filteredTasks}>
        {(task) => (
          <Box key={task.id}>
            <Text
              color={task.completed ? 'green' : 'white'}
              dimColor={task.completed}
            >
              {task.completed ? '✓' : '○'} {task.title}
            </Text>
          </Box>
        )}
      </Static>

      {filteredTasks.length === 0 && (
        <Text dimColor>No tasks yet. Add one above!</Text>
      )}

      <Text dimColor marginTop={1}>
        Type: Add task | Enter: Submit | F: Filter | Ctrl+C: Quit
      </Text>
    </Box>
  );
};

render(<TaskManager />);
```

### 11.2 实时日志查看器

```tsx
import { useState, useEffect, useRef } from 'react';
import { Box, Text, Static, useApp } from 'ink';

interface LogEntry {
  id: number;
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
}

const LogViewer = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const logIdRef = useRef(0);

  const addLog = (level: LogEntry['level'], message: string) => {
    const newLog: LogEntry = {
      id: logIdRef.current++,
      timestamp: new Date(),
      level,
      message
    };
    setLogs(prev => [...prev, newLog]);
  };

  useEffect(() => {
    // 模拟日志生成
    const messages = [
      { level: 'info' as const, msg: 'Application started' },
      { level: 'info' as const, msg: 'Connecting to database...' },
      { level: 'warn' as const, msg: 'High memory usage detected' },
      { level: 'error' as const, msg: 'Failed to connect to API' },
      { level: 'info' as const, msg: 'Retrying connection...' },
    ];

    let index = 0;
    const timer = setInterval(() => {
      if (index < messages.length) {
        addLog(messages[index].level, messages[index].msg);
        index++;
      } else {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const filteredLogs = logs.filter(log =>
    filter === 'all' || log.level === filter
  );

  const levelColors = {
    info: 'blue',
    warn: 'yellow',
    error: 'red'
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="single" padding={1} marginBottom={1}>
        <Text bold>Live Log Viewer</Text>
        <Text dimColor> | Filter: {filter}</Text>
        <Text dimColor> | Total: {logs.length}</Text>
      </Box>

      <Box flexDirection="column" height={20}>
        <Static items={filteredLogs}>
          {(log) => (
            <Box key={log.id}>
              <Text dimColor>
                {log.timestamp.toLocaleTimeString()}
              </Text>
              <Text color={levelColors[log.level]}>
                [{' '.repeat(4 - log.level.length)}{log.level.toUpperCase()}]
              </Text>
              <Text> {log.message}</Text>
            </Box>
          )}
        </Static>
      </Box>

      <Text dimColor>Press F to cycle filters</Text>
    </Box>
  );
};
```

---

### 11.3 可滚动命令选择器

**问题**: `ink-select-input` 不支持在有限高度内滚动，当 items 很多时无法选择超出显示范围的选项。

**解决方案**: 创建自定义的可滚动选择组件。

#### 完整实现

```tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';

export interface SelectItem {
  label: string;
  value: any;
  key?: string;
}

interface ScrollableSelectProps {
  items: SelectItem[];
  onSelect: (item: SelectItem) => void;
  onCancel?: () => void;
  visibleCount?: number;
  height?: number;
  maxHeight?: number;
}

export const ScrollableSelect: React.FC<ScrollableSelectProps> = ({
  items,
  onSelect,
  onCancel,
  visibleCount = 5,
  height,
  maxHeight = 10
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  // 计算实际显示高度
  const displayHeight = useMemo(() => {
    if (height) return height;
    return Math.min(visibleCount, maxHeight, items.length);
  }, [height, visibleCount, maxHeight, items.length]);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, scrollTop);
    const endIndex = Math.min(items.length, startIndex + displayHeight);
    return { startIndex, endIndex };
  }, [scrollTop, displayHeight, items.length]);

  // 可见项目
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [items, visibleRange]);

  // 滚动到指定索引
  const scrollToIndex = useCallback((index: number) => {
    const targetIndex = Math.max(0, Math.min(index, items.length - 1));

    if (targetIndex >= visibleRange.startIndex && targetIndex < visibleRange.endIndex) {
      setSelectedIndex(targetIndex);
      return;
    }

    let newScrollTop = targetIndex;
    if (targetIndex >= scrollTop + displayHeight) {
      newScrollTop = targetIndex - displayHeight + 1;
    }
    if (targetIndex < scrollTop) {
      newScrollTop = targetIndex;
    }

    setScrollTop(newScrollTop);
    setSelectedIndex(targetIndex);
  }, [items.length, scrollTop, displayHeight, visibleRange]);

  // 键盘导航
  useInput((input, key) => {
    if (key.upArrow) scrollToIndex(selectedIndex - 1);
    if (key.downArrow) scrollToIndex(selectedIndex + 1);
    if (key.return && items[selectedIndex]) onSelect(items[selectedIndex]);
    if (key.escape && onCancel) onCancel();
    if (key.pageUp) scrollToIndex(selectedIndex - displayHeight);
    if (key.pageDown) scrollToIndex(selectedIndex + displayHeight);
    if (key.home) scrollToIndex(0);
    if (key.end) scrollToIndex(items.length - 1);
  });

  if (items.length === 0) {
    return (
      <Box paddingX={1}>
        <Text dimColor>No items available</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={displayHeight}>
      {/* 选择列表 */}
      <Box flexDirection="column" overflow="hidden">
        {visibleItems.map((item, index) => {
          const globalIndex = visibleRange.startIndex + index;
          const isSelected = globalIndex === selectedIndex;

          return (
            <Box key={item.key || globalIndex}>
              <Text
                color={isSelected ? 'cyan' : 'white'}
                backgroundColor={isSelected ? 'blue' : undefined}
                bold={isSelected}
              >
                {isSelected ? '→ ' : '  '}
                {item.label}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* 滚动指示器 */}
      {items.length > displayHeight && (
        <Box justifyContent="space-between" paddingX={1}>
          <Text dimColor>
            {visibleRange.startIndex > 0 && '▲'}
          </Text>
          <Text dimColor>
            {selectedIndex + 1}/{items.length}
          </Text>
          <Text dimColor>
            {visibleRange.endIndex < items.length && '▼'}
          </Text>
        </Box>
      )}
    </Box>
  );
};
```

#### 使用示例

```tsx
import Input from 'ink-text-input';
import { useState, useRef } from 'react';
import { Box, Text } from 'ink';
import ScrollableSelect, { SelectItem } from './ScrollableSelect';

const CommandInput = () => {
  const [input, setInput] = useState('');
  const [showSelector, setShowSelector] = useState(false);
  const isSelectingRef = useRef(false);

  const commands: SelectItem[] = [
    { label: '/init', value: 'init' },
    { label: '/help', value: 'help' },
    { label: '/settings', value: 'settings' },
    // ... 可以有几十个命令
  ];

  const handleChange = (value: string) => {
    setInput(value);
    setShowSelector(value.startsWith('/'));
  };

  const handleSelect = (item: SelectItem) => {
    setInput(item.label);
    setShowSelector(false);
    isSelectingRef.current = false;
  };

  const handleCancel = () => {
    setShowSelector(false);
    isSelectingRef.current = false;
  };

  return (
    <Box flexDirection="column">
      <Box>
        <Text>{'> '}</Text>
        <Input
          value={input}
          onChange={handleChange}
          placeholder="Enter /command..."
        />
      </Box>

      {showSelector && (
        <Box height={8} flexDirection="column">
          <Box paddingX={1} borderBottom={true} borderColor="gray">
            <Text bold color="cyan">
              Commands (↑↓ navigate, Enter select, Esc cancel)
            </Text>
          </Box>
          <ScrollableSelect
            items={commands}
            onSelect={handleSelect}
            onCancel={handleCancel}
            visibleCount={6}
            height={7}
          />
        </Box>
      )}
    </Box>
  );
};
```

#### 功能特性

| 特性 | 说明 |
|------|------|
| 固定高度 | 在有限空间内显示大量选项 |
| 滚动导航 | 上下键、Page Up/Down、Home/End |
| 视觉反馈 | 滚动指示器显示当前位置和总数 |
| 搜索过滤 | 可配合输入实现命令过滤 |
| 取消操作 | Esc 键关闭选择器 |

#### 键盘快捷键

```
↑/↓         - 移动选择
Page Up/Down- 快速翻页
Home        - 跳到开头
End         - 跳到结尾
Enter       - 确认选择
Esc         - 取消选择
```

---

## 十二、最佳实践

### 12.1 组件设计原则

```tsx
// ✅ 单一职责
const StatusBadge = ({ status }) => {
  const colors = {
    success: 'green',
    error: 'red',
    warning: 'yellow',
    info: 'blue'
  };

  return (
    <Text
      color={colors[status]}
      backgroundColor="black"
      bold
    >
      {status.toUpperCase()}
    </Text>
  );
};

// ✅ 可组合性
const ListItem = ({ children }) => (
  <Box padding={1} borderBottom={true}>
    {children}
  </Box>
);

const List = ({ items }) => (
  <Box flexDirection="column">
    {items.map(item => (
      <ListItem key={item.id}>
        <Text>{item.text}</Text>
      </ListItem>
    ))}
  </Box>
);
```

### 12.2 状态管理模式

```tsx
// ✅ 状态提升
const Parent = () => {
  const [active, setActive] = useState(null);
  return (
    <>
      <Child1 active={active} setActive={setActive} />
      <Child2 active={active} setActive={setActive} />
    </>
  );
};

// ✅ 使用 Context
const DataContext = createContext(null);

const DataProvider = ({ children }) => {
  const [data, setData] = useState(null);
  return (
    <DataContext.Provider value={{ data, setData }}>
      {children}
    </DataContext.Provider>
  );
};

const useData = () => useContext(DataContext);
```

### 12.3 错误处理

```tsx
// ✅ 错误边界
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box padding={1}>
          <Text color="red">Error: {this.state.error?.message}</Text>
        </Box>
      );
    }

    return this.props.children;
  }
}

// 使用
render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
```

### 12.4 代码组织

```
src/
├── components/          # 可复用组件
│   ├── Button.tsx
│   ├── Input.tsx
│   └── index.ts
├── views/              # 页面组件
│   ├── Home.tsx
│   ├── Settings.tsx
│   └── index.ts
├── hooks/              # 自定义 Hooks
│   ├── useKeyPress.ts
│   ├── useForm.ts
│   └── index.ts
├── utils/              # 工具函数
│   ├── format.ts
│   └── validation.ts
└── cli.tsx             # 入口文件
```

### 12.5 TypeScript 集成

```tsx
// ✅ 类型定义
interface BoxProps {
  width?: number | string;
  height?: number | string;
  padding?: number;
  margin?: number;
  children?: React.ReactNode;
}

// ✅ 组件 Props 类型
const MyComponent: React.FC<{
  title: string;
  count: number;
  onAction: () => void;
}> = ({ title, count, onAction }) => {
  return (
    <Box>
      <Text>{title}: {count}</Text>
    </Box>
  );
};

// ✅ 自定义 Hook 类型
const useForm = <T extends Record<string, any>>(
  initialValues: T
) => {
  const [values, setValues] = useState<T>(initialValues);

  // ...

  return { values, setValues };
};
```

---

## 附录

### A. 快速参考

| 需求 | 解决方案 |
|------|---------|
| 创建 CLI 项目 | `npx create-ink-app my-cli --typescript` |
| 布局容器 | `<Box>` |
| 样式化文本 | `<Text color="green" bold>` |
| 用户输入 | `useInput()` |
| 焦点管理 | `useFocus()`, `useFocusManager()` |
| 静态输出 | `<Static items={...}>` |
| 退出应用 | `useApp().exit()` |
| 测试 | `ink-testing-library` |

### B. 常见问题

**Q: 如何调试 Ink 应用？**
```tsx
render(<App />, { debug: true });
```

**Q: 如何提高渲染性能？**
```tsx
render(<App />, {
  maxFps: 30,
  incrementalRendering: true
});
```

**Q: 如何隐藏光标？**
```tsx
useEffect(() => {
  process.stdout.write('\x1B[?25l');
  return () => process.stdout.write('\x1B[?25h');
}, []);
```

### C. 相关资源

- **官方文档**: https://github.com/vadimdemedes/ink
- **官网**: https://term.ink
- **示例代码**: https://github.com/vadimdemedes/ink/tree/master/examples
- **React 文档**: https://react.dev

---

**文档版本**: 1.0.0
**最后更新**: 2025-01-30
**Ink 版本**: 4.x

---

*本文档详细介绍了 Ink 的核心概念、使用方法和最佳实践。如有问题或建议，欢迎反馈。*
