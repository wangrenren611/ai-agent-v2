# Providers 模块重构总结

## 重构目标

- 统一类型定义，消除重复
- 简化架构，清晰分层
- 统一的导出接口
- 更好的类型安全性

## 重构内容

### 1. 文件结构重组

**重构前:**
```
providers/
├── adapters/
│   ├── base-adapter.ts
│   ├── openai-adapter.ts
│   ├── minimax-adapter.ts
│   ├── glm-adapter.ts
│   └── standard-adapter.ts
├── providers/
│   ├── base.ts
│   ├── openai-compatible.base.ts
│   └── errors.ts
├── utils/
│   ├── http-client.ts
│   └── stream-parser.ts
├── provider-registry.ts
```

**重构后:**
```
providers/
├── adapters/
│   ├── index.ts
│   ├── base.ts          (简化基类)
│   ├── standard.ts      (标准适配器)
│   ├── openai.ts        (OpenAI/Kimi/DeepSeek)
│   ├── minimax.ts       (MiniMax)
│   └── glm.ts           (智谱)
├── http/
│   ├── index.ts
│   ├── client.ts        (HTTP客户端)
│   └── stream-parser.ts (流解析)
├── types.ts             (统一类型)
├── provider.ts          (基类)
├── openai-compatible.ts (主Provider)
├── registry.ts          (注册表)
├── errors.ts            (错误类型)
└── index.ts             (统一导出)
```

### 2. 类型定义统一

**重构前:** 类型分散在多个文件中，有重复定义
**重构后:** 所有类型集中在 `types.ts`

```typescript
// 统一的类型定义
export type ProviderType = 'kimi' | 'deepseek' | 'glm' | 'minimax' | 'openai';

export interface Message {
  role: MessageRole;
  content: MessageContent;
  // ...
}
```

### 3. 适配器模式简化

**重构前:**
- 复杂的抽象基类
- 强制返回特定的 APIRequestBody / APIResponse 类型

**重构后:**
- 简化的基类接口
- 返回灵活的 Record<string, unknown>
- 更易于扩展

```typescript
// 简化后的基类
export abstract class BaseAPIAdapter {
  abstract transformRequest(messages: Message[], options: TransformOptions): Record<string, unknown>;
  abstract transformResponse(response: unknown): Record<string, unknown>;
  abstract getHeaders(apiKey: string): Headers;
  abstract getEndpointPath(): string;
}
```

### 4. 统一的导出接口

**重构前:** 需要导入多个文件
```typescript
import { LLMProvider } from './providers/base';
import { OpenAICompatibleProvider } from './providers/openai-compatible.base';
import { ProviderRegistry } from './provider-registry';
```

**重构后:** 统一从索引导入
```typescript
import {
  LLMProvider,
  OpenAICompatibleProvider,
  ProviderRegistry,
  ProviderType,
  HTTPClient,
  StreamParser,
} from './providers';
```

## 使用方式

### 基本使用

```typescript
import { ProviderRegistry, ProviderType } from './providers';

// 从环境变量创建
const provider = ProviderRegistry.createFromEnv('kimi');

// 生成响应
const response = await provider.generate([
  { role: 'user', content: 'Hello' }
], { stream: true });
```

### 自定义配置

```typescript
import { ProviderRegistry, ProviderType } from './providers';

const provider = ProviderRegistry.createFromEnv('kimi', {
  temperature: 0.5,
  maxOutputTokens: 2000,
});
```

## 架构图

```
┌─────────────────────────────────────────────┐
│              ProviderRegistry               │
│         (工厂模式，创建Provider)             │
└─────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│         OpenAICompatibleProvider            │
│    (主Provider，处理请求/响应生命周期)       │
└─────────────────────────────────────────────┘
                     │
     ┌───────────────┼───────────────┐
     ▼               ▼               ▼
┌─────────┐    ┌──────────┐   ┌───────────┐
│ Adapter │    │HTTPClient│   │StreamParser│
│(协议适配)│    │(HTTP请求) │   │(流式解析)  │
└─────────┘    └──────────┘   └───────────┘
```

## 支持的 Provider

| Provider | 类型 | 适配器 |
|----------|------|--------|
| Kimi (Moonshot) | `kimi` | OpenAIAdapter |
| DeepSeek | `deepseek` | OpenAIAdapter |
| OpenAI | `openai` | OpenAIAdapter |
| GLM (智谱) | `glm` | GLMAdapter |
| MiniMax | `minimax` | MiniMaxAdapter |

## 扩展方式

### 添加新的 Provider 类型

1. 在 `types.ts` 添加新的 ProviderType
2. 在 `registry.ts` 添加元数据
3. 如有需要，创建新的 Adapter

### 添加新的 Adapter

```typescript
import { BaseAPIAdapter } from './adapters/base';

export class CustomAdapter extends BaseAPIAdapter {
  transformRequest(messages, options) {
    // 自定义请求转换
  }
  
  transformResponse(response) {
    // 自定义响应转换
  }
  
  getHeaders(apiKey) {
    // 自定义请求头
  }
  
  getEndpointPath() {
    return '/custom/endpoint';
  }
}
```

## 优势

1. **统一类型**: 所有类型定义集中在 `types.ts`，避免重复
2. **简化架构**: 文件结构更清晰，职责更明确
3. **易于扩展**: 添加新 Provider 只需修改少量代码
4. **类型安全**: 更好的 TypeScript 类型推断
5. **统一导出**: 使用者只需导入 `index.ts`
