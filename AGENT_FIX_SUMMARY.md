# Agent 逻辑漏洞修复总结

## 修复时间
2026-01-26

## 问题背景
Agent 在执行过程中遇到空响应时会直接返回成功，导致任务未完成就中断。
从 session 日志可以看到 LLM 返回了空响应（content: "", finishReason: "stop"），
但 Agent 判断为成功并退出循环。

## 修复的漏洞

### ✅ P0-1: 空响应检测 (最严重)
**文件**: `src/agent/index.ts:379-397`

**问题**: 当 LLM 返回 `finishReason: 'stop'` 但 `content: ''` 时，Agent 直接返回成功

**修复**:
```typescript
// 修复前
return { content: llmResponse?.content ?? '', ... };

// 修复后
if (!responseContent || responseContent.trim() === '') {
  consecutiveErrorCount++;
  if (consecutiveErrorCount > this.noProgressLimit) {
    return { content: `Agent stopped: LLM returned ${consecutiveErrorCount} consecutive empty responses` };
  }
  // 添加恢复提示
  this.sessionManager.addMessage({
    role: 'system',
    content: 'The previous response was empty. Please continue with your task...',
  });
  continue;
}
```

---

### ✅ P0-2: Token 异常检测
**文件**: `src/providers/openai.ts:323-330`

**问题**: API 返回异常（所有 token 都是 0）但代码正常返回

**修复**:
```typescript
// 新增检测
if (totalTokens === 0 || (promptTokens === 0 && completionTokens === 0)) {
  throw new Error('API returned zero tokens - possible service malfunction');
}
```

---

### ✅ P0-3: 流式响应空检测优化
**文件**: `src/providers/openai.ts:401-413`

**问题**: 流式响应的空检测过于严格，导致正常场景也抛出错误

**修复**:
```typescript
// 修复前: 总是抛出错误
if (!accumulatedContent && toolCallsMap.size === 0) {
  throw new Error('Stream ended with no content or tool calls');
}

// 修复后: 只发出警告，让 Agent 层处理
if (!accumulatedContent && !hasToolCalls) {
  console.warn('Stream ended with no content or tool calls, finishReason:', finishReason);
}
return {
  content: accumulatedContent || '',
  ...
};
```

---

### ✅ P1-1: 工具错误恢复机制
**文件**: `src/agent/index.ts:352-366`

**问题**: 工具错误后直接 continue，没有错误计数和恢复提示

**修复**:
```typescript
// 修复前
if (toolHasError) {
  this.logger.warn('Tool execution had errors');
  continue;  // 直接继续，没有恢复机制
}

// 修复后
if (toolHasError) {
  consecutiveErrorCount++;  // 计入错误次数
  if (consecutiveErrorCount > this.noProgressLimit) {
    return { content: `Agent stopped: ${consecutiveErrorCount} tool errors` };
  }
  // 添加恢复提示
  this.sessionManager.addMessage({
    role: 'system',
    content: 'Some tools failed. Please try a different approach...',
  });
  continue;
}
```

---

### ✅ P1-2: 参数验证错误信息改进
**文件**: `src/tool/registry/ToolRegistry.ts:215-224`

**问题**: 参数验证失败时只返回简单错误信息，LLM 无法理解如何修正

**修复**:
```typescript
// 修复前
const errors = parsed.error.errors.map(e => e.message).join(', ');
return { error: `Invalid arguments: ${errors}` };

// 修复后
const errorDetails = errors.map((e: any) => {
  const path = e.path?.join('.') || 'root';
  return `"${path}": ${e.message}`;
}).join('; ');
return {
  error: `Invalid arguments for tool "${name}": ${errorDetails}`,
  metadata: {
    received: JSON.stringify(argsObj, null, 2),
    hint: 'Expected valid arguments matching the tool schema',
  }
};
```

---

### ✅ P2-1: 错误消息累积效应优化
**文件**: `src/agent/index.ts:462-472`

**问题**: 错误消息使用 assistant 角色，影响 LLM 后续响应

**修复**:
```typescript
// 修复前
this.sessionManager.addMessage({
  role: 'assistant',  // ❌ 会被 LLM 看作对话内容
  content: `[Error] ${errorMsg}`,
});

// 修复后
this.sessionManager.addMessage({
  role: 'system',  // ✅ 系统提示，对 LLM 影响较小
  content: `[Error] ${errorMsg}. Please try a different approach.`,
});
```

---

### ✅ P2-2: ToolContext 类型修复
**文件**: `src/tool/registry/types.ts:10-16`

**问题**: ToolContext 类型缺少 `allowedTools` 属性

**修复**:
```typescript
export type ToolContext = {
  environment: string;
  platform: string;
  time: string;
  sessionId?: string;
  sessionPath?: string;
  allowedTools?: string[];  // ✅ 新增
};
```

---

## 测试结果

```
✅ 23 个测试通过
❌ 1 个失败 (与本次修复无关，是已存在的 session ID 问题)
```

## 影响分析

### 修复前的问题场景
1. LLM 返回空响应 → Agent 直接返回成功 → 任务未完成
2. API 故障返回 0 tokens → Agent 继续执行 → 无法发现异常
3. 工具错误 → 无恢复机制 → 连续失败导致 LLM 困惑
4. 参数验证错误 → 简单错误信息 → LLM 无法自我修正

### 修复后的改进
1. ✅ 检测空响应并触发恢复机制
2. ✅ 检测 Token 异常，及时发现 API 故障
3. ✅ 工具错误后提供恢复提示和错误计数
4. ✅ 详细的参数验证错误信息
5. ✅ 优化错误消息，减少对 LLM 的影响

## 关键改进点

1. **分层处理**: Provider 层检测严重异常（Token=0），Agent 层处理业务逻辑（空响应）
2. **优雅降级**: 空响应不抛出错误，而是添加系统提示尝试恢复
3. **详细反馈**: 参数验证错误提供字段级别的详细信息
4. **一致性**: 流式和非流式响应使用相同的处理逻辑
