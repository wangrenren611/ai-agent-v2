# Agent Hook 系统

基于 EventBus 的 Agent 钩子系统，提供灵活的事件驱动架构。

## 概述

Agent Hook 系统允许你在 Agent 执行的关键节点插入自定义逻辑，实现：
- **日志记录** - 详细记录执行过程
- **性能监控** - 检测慢操作和性能瓶颈
- **安全检查** - 防止恶意输入和注入攻击
- **成本控制** - 监控 API 调用成本
- **缓存优化** - 缓存重复的 LLM 调用和工具结果
- **数据验证** - 验证输入输出格式
- **限流控制** - 防止滥用和过载

## 快速开始

### 1. 使用 EventBus 集成的 Agent

```typescript
import Agent from './index-eventbus';
import { HookManager } from './hooks';

// 创建 Agent（使用 EventBus 版本）
const agent = new Agent({
    llmProvider: /* your LLM provider */,
    sessionManager: /* your session manager */,
    enableEventLogging: true, // 启用事件日志
});

// 创建钩子管理器
const hookManager = new HookManager();

// 注册默认插件
hookManager.registerDefaultPlugins(agent);

// 运行 Agent
const response = await agent.run('What is the weather today?');
```

### 2. 注册单个钩子

```typescript
import { AgentHook } from '../../util/event-bus-agent';

// 注册运行前钩子
const handlerId = agent.registerHook(AgentHook.BEFORE_RUN, (data) => {
    console.log(`Processing query: ${data.query}`);
}, { priority: 10 });

// 注册 LLM 调用后钩子
agent.registerHook(AgentHook.AFTER_LLM_CALL, (data) => {
    console.log(`LLM call completed in ${data.duration}ms`);
}, { priority: 50 });

// 移除钩子
agent.unregisterHook(AgentHook.BEFORE_RUN, handlerId);
```

### 3. 使用预定义插件

```typescript
import { 
    LoggingHookPlugin, 
    PerformanceHookPlugin, 
    SecurityHookPlugin,
    CacheHookPlugin 
} from './hooks';

// 创建插件实例
const loggingPlugin = new LoggingHookPlugin();
const performancePlugin = new PerformanceHookPlugin('PerfMonitor', 3000, 8000);
const securityPlugin = new SecurityHookPlugin();
const cachePlugin = new CacheHookPlugin('ResponseCache', 10 * 60 * 1000); // 10分钟缓存

// 注册插件
loggingPlugin.registerAllHooks(agent);
performancePlugin.registerAllHooks(agent);
securityPlugin.registerAllHooks(agent);
cachePlugin.registerAllHooks(agent);
```

## 可用钩子

### 生命周期钩子
- `AgentHook.BEFORE_RUN` - Agent 运行前
- `AgentHook.AFTER_RUN` - Agent 运行后
- `AgentHook.ON_ERROR` - 发生错误时

### LLM 钩子
- `AgentHook.BEFORE_LLM_CALL` - LLM 调用前
- `AgentHook.AFTER_LLM_CALL` - LLM 调用后
- `AgentHook.ON_LLM_RESPONSE` - 收到 LLM 响应时

### 工具钩子
- `AgentHook.BEFORE_TOOL_CALL` - 工具调用前
- `AgentHook.AFTER_TOOL_CALL` - 工具调用后
- `AgentHook.ON_TOOL_ERROR` - 工具调用错误时

### 消息钩子
- `AgentHook.BEFORE_MESSAGE_ADD` - 添加消息前
- `AgentHook.AFTER_MESSAGE_ADD` - 添加消息后

### 循环钩子
- `AgentHook.BEFORE_LOOP_ITERATION` - 循环迭代前
- `AgentHook.AFTER_LOOP_ITERATION` - 循环迭代后

### 性能钩子
- `AgentHook.ON_PERFORMANCE_METRICS` - 性能指标可用时

## 预定义插件

### LoggingHookPlugin
记录 Agent 执行过程中的关键事件。

```typescript
const plugin = new LoggingHookPlugin('CustomLogger');
plugin.registerAllHooks(agent);
```

### PerformanceHookPlugin
监控性能并报告慢操作。

```typescript
const plugin = new PerformanceHookPlugin(
    'PerfMonitor',
    5000, // 慢工具阈值（毫秒）
    10000 // 慢 LLM 阈值（毫秒）
);
plugin.registerAllHooks(agent);
```

### ValidationHookPlugin
验证输入输出格式和内容。

```typescript
const plugin = new ValidationHookPlugin();
plugin.registerAllHooks(agent);
```

### StatisticsHookPlugin
收集执行统计信息。

```typescript
const plugin = new StatisticsHookPlugin();
plugin.registerAllHooks(agent);

// 获取统计信息
const stats = plugin.getStats();
console.log(`Total runs: ${stats.totalRuns}`);
```

### CacheHookPlugin
缓存 LLM 响应和工具结果。

```typescript
const plugin = new CacheHookPlugin('ResponseCache', 5 * 60 * 1000); // 5分钟缓存
plugin.registerAllHooks(agent);

// 获取缓存统计
const cacheStats = plugin.getCacheStats();
console.log(`Cache size: ${cacheStats.size}`);

// 清空缓存
plugin.clearCache();
```

## 自定义插件

创建自定义插件：

```typescript
import { AgentHook, AgentHookHandler } from '../../util/event-bus-agent';
import { ScopedLogger } from '../../util/log';

export class CustomHookPlugin {
    private logger: ScopedLogger;

    constructor(loggerName = 'CustomHook') {
        this.logger = new ScopedLogger(loggerName);
    }

    registerAllHooks(agent: any): string[] {
        const handlerIds: string[] = [];

        // 注册钩子
        handlerIds.push(
            agent.registerHook(AgentHook.BEFORE_RUN, (data) => {
                this.logger.info(`Custom: Starting run with query: ${data.query}`);
            }, { priority: 5 })
        );

        handlerIds.push(
            agent.registerHook(AgentHook.AFTER_TOOL_CALL, (data) => {
                if (data.duration > 1000) {
                    this.logger.warn(`Custom: Slow tool ${data.toolName} took ${data.duration}ms`);
                }
            }, { priority: 60 })
        );

        return handlerIds;
    }
}

// 使用自定义插件
const customPlugin = new CustomHookPlugin();
customPlugin.registerAllHooks(agent);
```

## 事件监听

除了钩子系统，你还可以直接监听 EventBus 事件：

```typescript
import { typedEventBus } from '../../util/event-bus';

// 监听 Agent 事件
typedEventBus.on('agent.run.start', (data) => {
    console.log(`Agent run started: ${data.query}`);
});

typedEventBus.on('agent.tool.call.complete', (data) => {
    console.log(`Tool ${data.toolName} completed in ${data.duration}ms`);
});

typedEventBus.on('agent.performance.slow.tool', (data) => {
    console.warn(`Slow tool alert: ${data.toolName} (${data.duration}ms)`);
});
```

## 配置选项

### Agent 配置
```typescript
const agent = new Agent({
    // ... 其他配置
    eventBus: customEventBus, // 自定义 EventBus 实例
    enableEventLogging: true, // 启用事件日志中间件
});
```

### 钩子配置
```typescript
agent.registerHook(AgentHook.BEFORE_RUN, handler, {
    priority: 10,     // 优先级（数字越小优先级越高）
    async: false,     // 是否异步执行
    timeout: 5000,    // 超时时间（毫秒）
});
```

## 最佳实践

1. **优先级管理**：合理设置钩子优先级，确保关键钩子先执行
2. **错误处理**：钩子中的错误不会中断主流程，但应该适当处理
3. **性能考虑**：避免在钩子中执行耗时操作
4. **资源清理**：及时移除不再需要的钩子
5. **测试覆盖**：为自定义钩子编写单元测试

## 示例

查看完整示例：
- `examples.ts` - 各种自定义插件示例
- `index.ts` - 插件实现
- `event-bus-agent.ts` - 事件类型定义

## 迁移指南

从旧版 Agent 迁移：

1. 导入新版 Agent：`import Agent from './index-eventbus';`
2. 添加 EventBus 配置
3. 逐步迁移自定义逻辑到钩子系统
4. 测试确保功能正常

## 故障排除

### 钩子不执行
- 检查钩子是否成功注册
- 验证优先级设置
- 检查是否有错误被静默处理

### 性能问题
- 检查钩子中的耗时操作
- 考虑使用异步钩子
- 监控钩子执行时间

### 事件不触发
- 确认 EventBus 配置正确
- 检查事件名称拼写
- 验证事件数据格式