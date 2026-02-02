# Bug 修复：Agent 工具调用不工作

## 问题描述

Agent 无法调用工具，LLM 返回的 XML 格式工具调用（如 `<web_fetch>{...}</web_fetch>`）没有被正确解析和执行。

## 根本原因

重构后的 `Agent` 类虽然保存了工具配置，但没有将工具传递给 `AgentRunner`：

```typescript
// Agent.ts
constructor(config: AgentConfig) {
  this.tools = config.tools || [];  // 保存了工具
  // ...
  this.runner = this.initRunner();  // 但 Runner 没有收到工具
}

// initRunner 中没有传递 tools
private initRunner(): AgentRunner {
  return new AgentRunner(
    {
      // ... 其他配置
      // 缺少 tools 配置
    },
    { errorHandler, toolExecutor }
  );
}
```

`AgentRunner.gatherTools()` 只从运行时选项获取工具：

```typescript
private gatherTools(options: AgentRunOptions): ToolSchema[] {
  return options.tools || [];  // 返回空数组
}
```

## 修复方案

### 1. 修改 `AgentRunnerConfig` 接口

```typescript
export interface AgentRunnerConfig {
  llmProvider: LLMProvider;
  sessionManager: SessionManager;
  systemPrompt: string;
  maxLoop: number;
  temperature: number;
  maxOutputTokens: number;
  tools?: ToolSchema[];  // 新增：工具配置
}
```

### 2. 修改 `Agent.initRunner()` 方法

```typescript
private initRunner(): AgentRunner {
  return new AgentRunner(
    {
      llmProvider: this.config.llmProvider,
      sessionManager: this.sessionManager,
      systemPrompt: this.config.systemPrompt,
      maxLoop: this.config.maxLoop ?? DEFAULT_MAX_LOOP,
      temperature: this.config.temperature || this.config.llmProvider.config.temperature,
      maxOutputTokens: this.config.maxOutputTokens || this.config.llmProvider.config.maxOutputTokens,
      tools: this.tools,  // 传递工具
    },
    {
      errorHandler: new ErrorHandler({ ... }),
      toolExecutor: new ToolExecutor(),
    }
  );
}
```

### 3. 修改 `AgentRunner.gatherTools()` 方法

```typescript
private gatherTools(options: AgentRunOptions): ToolSchema[] {
  // 优先使用运行时传入的工具，其次使用配置的工具
  return options.tools || this.config.tools || [];
}
```

## 验证

修复后，工具调用流程：

1. `Agent.run()` 调用 `AgentRunner.run()`
2. `AgentRunner.gatherTools()` 返回 `this.config.tools`（来自 Agent 配置）
3. `callLLM()` 将工具传递给 LLM Provider
4. LLM 返回包含 `tool_calls` 的响应
5. `executeTools()` 执行工具调用

## 文件变更

- `src/agent/Agent.ts` - 在 `initRunner()` 中传递 `tools`
- `src/agent/core/AgentRunner.ts` - 添加 `tools` 到配置，修改 `gatherTools()`

## 测试建议

```typescript
// 测试工具调用
const agent = new Agent({
  llmProvider,
  systemPrompt,
  tools: [/* 工具列表 */],  // 配置工具
});

const response = await agent.run('使用 web_fetch 获取 https://example.com');
// 应该触发 web_fetch 工具调用
```
