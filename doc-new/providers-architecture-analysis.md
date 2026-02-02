# Providers 模块深度分析与重构建议

> 本文档基于现有代码的深度分析，提供架构设计优化建议和重构方向指导。
>
> **文档版本**: v1.0
> **分析日期**: 2026-01-31
> **分析范围**: `src/providers/` 目录全部代码

---

## 目录

- [一、现有代码结构概览](#一现有代码结构概览)
- [二、设计问题分析](#二设计问题分析)
- [三、架构设计建议](#三架构设计建议)
- [四、重构建议](#四重构建议)
- [五、最佳实践建议](#五最佳实践建议)
- [六、重构检查清单](#六重构检查清单)

---

## 一、现有代码结构概览

### 1.1 当前目录结构

```
src/providers/
├── index.ts                          # 主导出文件 (90行)
├── types.ts                          # 统一类型定义 (273行)
├── provider.ts                       # LLMProvider 抽象基类 (15行)
├── openai-compatible.ts              # OpenAI 兼容 Provider 实现 (219行)
├── registry.ts                       # Provider 注册表和模型配置 (339行)
│
├── adapters/                         # 适配器实现目录 (存在重复)
│   ├── index.ts                      # 适配器导出 (10行)
│   ├── base.ts                       # BaseAPIAdapter (旧版, 88行)
│   ├── base-adapter.ts               # BaseAPIAdapter (新版, 171行)
│   ├── standard.ts                   # StandardAdapter (旧版, 72行)
│   ├── standard-adapter.ts           # StandardAdapter (新版, 148行)
│   ├── openai.ts                     # OpenAIAdapter (旧版, 79行)
│   ├── openai-adapter.ts             # OpenAIAdapter (新版, 127行)
│   ├── minimax.ts                    # MiniMaxAdapter (旧版, 50行)
│   ├── minimax-adapter.ts            # MiniMaxAdapter (新版, 114行)
│   ├── glm.ts                        # GLMAdapter (旧版, 27行)
│   └── glm-adapter.ts                # GLMAdapter (新版, 90行)
│
├── http/                             # HTTP 客户端目录 (新版)
│   ├── index.ts
│   ├── client.ts                     # HTTPClient (164行)
│   └── stream-parser.ts              # StreamParser (135行)
│
├── utils/                            # 工具类目录 (旧版)
│   ├── http-client.ts                # HTTPClient (236行)
│   ├── stream-parser.ts              # StreamParser (178行)
│   └── errors.ts                     # 错误类型定义 (139行)
│
└── providers/                        # 旧版 providers 目录
    ├── base.ts                       # LLMProvider 基类 (133行)
    └── openai-compatible.base.ts     # OpenAICompatibleProvider (224行)
```

**代码量统计**:

| 模块 | 文件数 | 代码行数 | 重复率 |
|-----|-------|---------|-------|
| 适配器 | 10 | ~976行 | ~50% |
| HTTP 客户端 | 2 | ~400行 | 100% |
| 流式解析 | 2 | ~313行 | 100% |
| Provider | 3 | ~476行 | ~30% |
| **总计** | **22** | **~3000行** | **~50%** |

### 1.2 继承关系图

```
                   ┌─────────────────┐
                   │  LLMProvider    │ (provider.ts)
                   │  (abstract)     │
                   └────────┬────────┘
                            │
                            │ (被忽略，未继承)
                            │
            ┌───────────────┴────────────────┐
            │                                │
    ┌───────▼──────────┐          ┌─────────▼──────────┐
    │ OpenAICompatible │          │ OpenAICompatible   │
    │    Provider      │          │     Provider       │
    │  (openai-        │          │  (providers/       │
    │   compatible.ts) │          │   openai-compatible│
    └───────┬──────────┘          │    .base.ts)       │
            │                     └─────────┬──────────┘
            │                               │
    ┌───────▼───────────────────────────────▼──────────┐
    │              Adapter Pattern                     │
    │  ┌────────────────────────────────────────┐     │
    │  │         BaseAPIAdapter (abstract)      │     │
    │  │  (两个版本: base.ts, base-adapter.ts)  │     │
    │  └───────────────────┬────────────────────┘     │
    │                      │                          │
    │  ┌───────────────────┼────────────────────┐    │
    │  │                   │                    │    │
    │┌─▼───────────┐  ┌────▼─────┐    ┌────────▼──┐  │
    ││  Standard   │  │  OpenAI  │    │  MiniMax  │  │
    ││  Adapter    │  │ Adapter  │    │  Adapter  │  │
    │└─────────────┘  └──────────┘    │  GLM      │  │
    │                                  │  Adapter  │  │
    │                                  └───────────┘  │
    └────────────────────────────────────────────────┘
```

### 1.3 模块依赖关系

```
                    ┌──────────────────┐
                    │   Application    │
                    │   (Agent/Session)│
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ ProviderRegistry │
                    │   (registry.ts)  │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼─────────┐  ┌──────▼──────┐
│  OpenAI-       │  │   ModelConfigs   │  │   Models    │
│  Compatible    │◄─┤   (MODEL_CONFIGS)│  │ (访问器)    │
│  Provider      │  └──────────────────┘  └─────────────┘
└───────┬────────┘
        │
        ├─────────────────┐
        │                 │
┌───────▼─────────┐  ┌────▼─────────┐
│   HTTPClient    │  │   Adapter    │
│  (http/client)  │  │ (adapters/)  │
└─────────────────┘  └──────────────┘
        │                 │
        └────────┬────────┘
                 │
         ┌───────▼──────────┐
         │  StreamParser    │
         │(http/stream-     │
         │   parser.ts)     │
         └──────────────────┘
```

### 1.4 调用链分析

```
用户请求生成
     │
     ▼
ProviderRegistry.createFromEnv(modelId)
     │
     ├─► MODEL_CONFIGS[modelId]        // 获取模型配置
     │
     ├─► process.env[envApiKey]        // 从环境变量获取 API Key
     │
     ├─► createAdapter(provider)       // 创建适配器
     │        │
     │        ├─► 'glm' ─► GLMAdapter
     │        ├─► 'minimax' ─► MiniMaxAdapter
     │        └─► 其他 ─► OpenAIAdapter
     │
     └─► new OpenAICompatibleProvider(config, adapter)
              │
              └─► provider.generate(messages, options)
                       │
                       ├─► adapter.transformRequest()  // 适配器转换请求
                       │
                       ├─► httpClient.fetch()          // HTTP 请求
                       │        │
                       │        ├─► retry logic        // 重试逻辑
                       │        └─► timeout            // 超时处理
                       │
                       ├─► adapter.transformResponse() // 适配器转换响应
                       │
                       └─► LLMResponse                 // 返回响应
```

---

## 二、设计问题分析

### 2.1 关键问题汇总

| 问题类型 | 严重程度 | 影响范围 | 修复难度 |
|---------|---------|---------|---------|
| **代码重复** | 🔴 高 | 适配器、HTTP、流式解析 | 中 |
| **架构不一致** | 🔴 高 | 类型系统、继承关系 | 高 |
| **目录混乱** | 🟡 中 | 整体可维护性 | 低 |
| **类型定义分散** | 🟡 中 | 类型安全性 | 中 |
| **导入路径混乱** | 🟡 中 | 开发体验 | 低 |
| **文件命名不规范** | 🟢 低 | 代码可读性 | 低 |

### 2.2 详细问题说明

#### 问题 1: 代码重复 (Critical)

**适配器重复 - 6个文件 × 2个版本 = 12个实现**

```typescript
// ========== 旧版: adapters/base.ts (88行) ==========
export abstract class BaseAPIAdapter {
  abstract transformRequest(
    messages: Message[],
    options: TransformOptions
  ): Record<string, unknown>;

  abstract transformResponse(response: unknown): Record<string, unknown>;

  abstract getHeaders(apiKey: string): Headers;

  abstract getEndpointPath(): string;

  protected isMessageUsable(msg: { ... }): boolean { /* ... */ }
  protected cleanMessage(msg: Message): { ... } { /* ... */ }
}

// ========== 新版: adapters/base-adapter.ts (171行) ==========
export abstract class BaseAPIAdapter {
  abstract transformRequest(
    messages: Message[],
    options?: LLMOptions
  ): APIRequestBody;

  abstract transformResponse(response: unknown): APIResponse;

  abstract getHeaders(apiKey: string, config?: Record<string, unknown>): Headers;

  abstract getEndpointPath(): string;

  protected isMessageUsable(msg: { ... }): boolean { /* ... */ }
  protected cleanMessage(msg: Message): { ... } { /* ... */ }
}

// 差异:
// 1. transformRequest 返回类型不同 (Record vs APIRequestBody)
// 2. transformResponse 返回类型不同 (Record vs APIResponse)
// 3. getHeaders 参数不同
// 4. 新版使用了更多的类型定义
```

**HTTP 客户端重复**

```typescript
// ========== utils/http-client.ts (236行) ==========
export class HTTPClient {
  readonly defaultTimeout: number;
  readonly maxRetries: number;
  // ... 完整实现

  async fetch(url: string, options: RequestInitWithOptions = {}): Promise<Response> {
    // 使用 while 循环实现重试
    let attempt = 0;
    while (attempt <= maxRetries) {
      // ...
    }
  }
}

// ========== http/client.ts (164行) ==========
export class HTTPClient {
  readonly defaultTimeout: number;
  readonly maxRetries: number;
  // ... 完整实现

  async fetch(url: string, options: RequestInitWithOptions = {}): Promise<Response> {
    // 使用 for 循环实现重试
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // ...
    }
  }
}

// 差异:
// 1. 重试循环实现方式不同 (while vs for)
// 2. 初始超时默认值不同 (1000*60*10 vs 600_000)
// 3. 错误处理细节略有差异
```

**影响分析**:

| 影响维度 | 具体影响 |
|---------|---------|
| **维护成本** | Bug 修复需要同时修改两处 |
| **代码一致性** | 两个版本可能产生不同的行为 |
| **类型安全** | 类型定义不一致可能导致类型错误 |
| **测试覆盖** | 需要为两个版本分别编写测试 |

#### 问题 2: 架构不一致 (Critical)

**`LLMProvider` 基类未被使用**

```typescript
// ========== provider.ts: 定义的抽象基类 ==========
import type { BaseProviderConfig, LLMResponse, LLMOptions, Message } from './types';

export abstract class LLMProvider {
  abstract readonly config: BaseProviderConfig;

  /**
   * 生成响应
   */
  abstract generate(
    messages: Message[],
    options?: LLMOptions
  ): Promise<LLMResponse | null>;
}

// ========== openai-compatible.ts: 实际实现 ==========
export class OpenAICompatibleProvider {
  // ❌ 未继承 LLMProvider
  readonly config: OpenAICompatibleConfig;
  private httpClient: HTTPClient;
  private adapter: any;

  constructor(config: OpenAICompatibleConfig, adapter?: any) {
    // ...
  }

  async generate(
    messages: Message[],
    options?: LLMOptions
  ): Promise<LLMResponse | null> {
    // ...
  }
}

// ========== providers/openai-compatible.base.ts: 另一个实现 ==========
export class OpenAICompatibleProvider extends LLMProvider {
  // ✅ 这里继承了 LLMProvider
  readonly httpClient: HTTPClient;
  // ...
}
```

**问题影响**:

1. **类型系统无法保证接口一致性**
   ```typescript
   // 这样写不会报错，但实际上应该有统一的接口
   const provider1 = new OpenAICompatibleProvider(config1);
   const provider2 = new SomeOtherProvider(config2);

   // 无法保证两个 Provider 有相同的接口
   ```

2. **无法通过多态使用不同 Provider**
   ```typescript
   // 想要这样使用，但不行
   function useProvider(provider: LLMProvider) {
     return provider.generate(messages);
   }

   // 因为 OpenAICompatibleProvider 不是 LLMProvider 的子类
   ```

3. **违反了里氏替换原则 (LSP)**

#### 问题 3: 类型定义重复

```typescript
// ========== types.ts: 统一类型定义 ==========
export interface APIRequestBody {
  model: string;
  messages: Array<{ role: string; content?: unknown; ... }>;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: Array<{ ... }>;
  [key: string]: unknown;
}

export interface APIResponse {
  content: string | unknown;
  reasoning_content?: string;
  tool_calls?: Array<{ ... }>;
  finish_reason?: string;
  usage: { ... };
}

// ========== base-adapter.ts: 重复定义 ==========
export interface APIRequestBody {
  model: string;
  messages: Array<{ role: string; content?: unknown; ... }>;
  max_tokens?: number | undefined;
  temperature?: number | undefined;
  stream?: boolean | undefined;
  tools?: Array<{ ... }> | undefined;
  [key: string]: unknown;
}

export interface APIResponse {
  content: string | unknown;
  reasoning_content?: string;
  tool_calls?: Array<{ ... }>;
  finish_reason?: string;
  usage: { ... };
}

// 差异: 可选性标记 (? vs | undefined)
```

#### 问题 4: 导入路径混乱

```typescript
// ========== registry.ts: 导入新版 ==========
import { OpenAIAdapter } from './adapters/openai-adapter';
import { MiniMaxAdapter } from './adapters/minimax-adapter';
import { GLMAdapter } from './adapters/glm-adapter';
import type { BaseAPIAdapter } from './adapters/base-adapter';

// ========== index.ts: 同时导出两个版本 ==========
export { BaseAPIAdapter, type TransformOptions } from './adapters/base';         // 旧版
export { StandardAdapter } from './adapters/standard';                           // 旧版
export { OpenAIAdapter } from './adapters/openai';                               // 旧版
export { OpenAIAdapter } from './adapters/openai-adapter';                       // 新版
export { MiniMaxAdapter } from './adapters/minimax';                             // 旧版
export { MiniMaxAdapter } from './adapters/minimax-adapter';                     // 新版
export { GLMAdapter } from './adapters/glm';                                     // 旧版
export { GLMAdapter } from './adapters/glm-adapter';                             // 新版

// ❌ 问题: 同时导出同名类，使用时不确定使用的是哪个版本
```

#### 问题 5: 目录结构混乱

```
src/providers/
├── http/                    # HTTP 功能 (新版)
│   ├── client.ts
│   └── stream-parser.ts
│
├── utils/                   # 工具类 (旧版，功能重叠)
│   ├── http-client.ts       # 与 http/client.ts 功能相同
│   ├── stream-parser.ts     # 与 http/stream-parser.ts 功能相同
│   └── errors.ts            # 错误定义 (唯一)
│
└── providers/               # 旧版 Provider 目录
    ├── base.ts
    └── openai-compatible.base.ts

// 问题:
// 1. http/ 和 utils/ 功能重叠
// 2. providers/ 是旧目录，应该删除
// 3. 错误定义在 utils/ 中，应该放在 core/
```

### 2.3 现有代码优点

尽管存在上述问题，现有代码也有一些值得保留的设计：

| 优点 | 说明 |
|-----|------|
| **适配器模式** | 使用适配器模式很好地处理了不同 Provider 的差异 |
| **注册表模式** | `ProviderRegistry` 提供了统一的模型配置管理 |
| **错误分类** | 清晰的错误类型层次结构 (`LLMError` -> `LLMRetryableError`, `LLMPermanentError`) |
| **重试机制** | HTTP 客户端内置了指数退避的重试逻辑 |
| **流式处理** | `StreamParser` 统一处理 SSE 格式的流式响应 |
| **环境变量配置** | 通过环境变量灵活配置不同 Provider |

---

## 三、架构设计建议

### 3.1 推荐目录结构

```
src/providers/
├── index.ts                          # 统一导出入口
│
├── core/                             # 核心抽象层
│   ├── types.ts                      # 统一类型定义
│   ├── provider.ts                   # LLMProvider 抽象基类
│   ├── errors.ts                     # 错误类型定义
│   └── constants.ts                  # 常量定义
│
├── infrastructure/                   # 基础设施层
│   ├── index.ts
│   │
│   ├── http/
│   │   ├── index.ts
│   │   ├── client.ts                 # HTTP 客户端接口
│   │   ├── fetch-client.ts           # Fetch API 实现
│   │   ├── stream-parser.ts          # 流式解析器
│   │   └── types.ts                  # HTTP 相关类型
│   │
│   ├── retry/
│   │   ├── index.ts
│   │   ├── strategy.ts               # 重试策略接口
│   │   ├── exponential-backoff.ts    # 指数退避实现
│   │   └── circuit-breaker.ts        # 熔断器实现
│   │
│   └── observability/
│       ├── index.ts
│       ├── logger.ts                 # 日志接口
│       ├── metrics.ts                # 指标收集
│       └── tracer.ts                 # 追踪功能
│
├── adapters/                         # 适配器层
│   ├── index.ts
│   ├── base.ts                       # BaseAPIAdapter 抽象基类
│   ├── factory.ts                    # 适配器工厂
│   ├── openai.ts                     # OpenAI 适配器
│   ├── minimax.ts                    # MiniMax 适配器
│   ├── glm.ts                        # GLM 适配器
│   ├── standard.ts                   # 标准适配器
│   └── validators/
│       ├── index.ts
│       ├── request-validator.ts      # 请求验证
│       └── response-validator.ts     # 响应验证
│
├── providers/                        # Provider 实现
│   ├── index.ts
│   ├── base.ts                       # BaseProvider 抽象类
│   ├── openai-compatible.ts          # OpenAI 兼容实现
│   └── factory.ts                    # Provider 工厂
│
├── registry/                         # 注册与配置
│   ├── index.ts
│   ├── models.ts                     # 模型配置定义
│   ├── registry.ts                   # 模型注册表
│   ├── config-loader.ts              # 配置加载器
│   └── env-resolver.ts               # 环境变量解析器
│
├── config/                           # 配置文件
│   ├── models.ts                     # 模型配置数据
│   └── features.ts                   # 特性定义
│
└── __tests__/                        # 测试目录
    ├── unit/
    │   ├── adapters/
    │   ├── providers/
    │   ├── infrastructure/
    │   └── registry/
    ├── integration/
    │   └── api/
    └── fixtures/
        └── responses/
```

### 3.2 分层架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│                   (Agent / Session Manager)                  │
│                                                                 │
│  职责: 业务逻辑编排，不直接依赖 Provider 实现                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Provider Registry Layer                   │
│                                                                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │           ProviderRegistry (Factory)               │    │
│  │                                                     │    │
│  │  + createFromEnv(modelId): Provider                │    │
│  │  + create(modelId, config): Provider               │    │
│  │  + listModels(): ModelConfig[]                     │    │
│  │  + getModelConfig(modelId): ModelConfig            │    │
│  │  + getSupportedProviders(): ProviderType[]         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                                 │
│  职责: Provider 创建、模型配置管理                                │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                      Provider Layer                          │
│                                                                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │              LLMProvider<T> (abstract)              │    │
│  │                                                     │    │
│  │  + readonly config: T                               │    │
│  │  + generate(): Promise<LLMResponse>                │    │
│  │  + stream(): AsyncIterable<StreamChunk>            │    │
│  │  + healthCheck(): Promise<boolean>                 │    │
│  │  + getSupportedFeatures(): readonly Feature[]      │    │
│  └──────────────────────────┬─────────────────────────┘    │
│                             │                                   │
│  ┌──────────────────────────▼─────────────────────────┐    │
│  │         OpenAICompatibleProvider<T>                │    │
│  │                                                     │    │
│  │  - config: T                                       │    │
│  │  - adapter: BaseAPIAdapter                         │    │
│  │  - httpClient: HttpClient                          │    │
│  │  - retryPolicy: RetryPolicy                        │    │
│  │  - validator: Validator                            │    │
│  └────────────────────────────────────────────────────┘    │
│                                                                 │
│  职责: 实现 LLMProvider 接口，协调各组件完成请求处理                │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                      Adapter Layer                           │
│                                                                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │            BaseAPIAdapter (abstract)               │    │
│  │                                                     │    │
│  │  + transformRequest(): APIRequestBody              │    │
│  │  + transformResponse(): APIResponse                │    │
│  │  + getHeaders(): Headers                           │    │
│  │  + getEndpointPath(): string                       │    │
│  │  + validateRequest(): ValidationResult            │    │
│  │  + validateResponse(): ValidationResult           │    │
│  └──────────────────────────┬─────────────────────────┘    │
│                             │                                │
│       ┌─────────┬───────────┼───────────┬─────────┐        │
│       ▼         ▼           ▼           ▼         ▼        │
│   OpenAI  Standard   MiniMax      GLM    Custom...         │
│  Adapter   Adapter    Adapter    Adapter   Adapter         │
│                                                                 │
│  职责: 处理不同 Provider 的 API 差异                                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                  Infrastructure Layer                        │
│                                                                 │
│  ┌─────────────────────┐  ┌────────────────────────────┐   │
│  │    HttpClient       │  │     StreamParser           │   │
│  │                      │  │                             │   │
│  │  - request()        │  │  - parseSSE()               │   │
│  │  - get()            │  │  - parseChunk()             │   │
│  │  - post()           │  │  - processChunk()           │   │
│  │  - stream()         │  │                             │   │
│  └─────────────────────┘  └────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Error Handling                        │    │
│  │                                                     │    │
│  │  LLMError (base)                                    │    │
│  │  ├── LLMRetryableError                              │    │
│  │  │   ├── LLMRateLimitError                          │    │
│  │  │   └── LLMTimeoutError                            │    │
│  │  └── LLMPermanentError                              │    │
│  │      ├── LLMAuthError                               │    │
│  │      ├── LLMNotFoundError                           │    │
│  │      └── LLMBadRequestError                         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                                 │
│  职责: 提供底层基础设施能力                                            │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 核心接口设计

```typescript
/**
 * ============================================================================
 * 核心类型定义 (core/types.ts)
 * ============================================================================
 */

/**
 * Provider 配置接口
 */
export interface ProviderConfig {
  readonly apiKey: string;
  readonly baseURL: string;
  readonly model: string;
  readonly timeout?: number;
  readonly maxRetries?: number;
  readonly maxTokens?: number;
  readonly maxOutputTokens?: number;
  readonly temperature?: number;
  readonly debug?: boolean;
}

/**
 * 模型配置接口
 */
export interface ModelConfig {
  readonly id: ModelId;
  readonly provider: ProviderType;
  readonly name: string;
  readonly displayName: string;
  readonly baseURL: string;
  readonly endpointPath: string;
  readonly model: string;
  readonly maxTokens: number;
  readonly maxOutputTokens: number;
  readonly features: readonly Feature[];
  readonly envApiKey: string;
  readonly envBaseURL: string;
}

/**
 * Provider 类型
 */
export type ProviderType = 'kimi' | 'deepseek' | 'glm' | 'minimax' | 'openai';

/**
 * 模型 ID 类型
 */
export type ModelId =
  // GLM 系列
  | 'glm-4.7' | 'glm-4.6' | 'glm-4-flash'
  // MiniMax 系列
  | 'minimax-2.1' | 'minimax-2'
  // Kimi 系列
  | 'kimi-k2.5'
  // DeepSeek 系列
  | 'deepseek-chat'
  // OpenAI 系列
  | 'gpt-4o' | 'gpt-4o-mini';

/**
 * 特性类型
 */
export type Feature =
  | 'streaming'
  | 'function-calling'
  | 'vision'
  | 'reasoning'
  | 'json-mode';

/**
 * 消息角色
 */
export type MessageRole = 'user' | 'system' | 'assistant' | 'tool';

/**
 * 消息内容
 */
export type MessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export type MessageContent = string | MessageContentPart[];

/**
 * 消息接口
 */
export interface Message {
  readonly role: MessageRole;
  readonly content: MessageContent;
  readonly tool_calls?: readonly ToolCall[];
  readonly tool_call_id?: string;
  readonly reasoning_content?: string;
}

/**
 * 工具调用
 */
export interface ToolCall {
  readonly id: string;
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly arguments: string;
  };
}

/**
 * 工具 Schema
 */
export interface ToolSchema {
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly description: string;
    readonly strict?: boolean;
    readonly parameters: Record<string, unknown>;
  };
}

/**
 * LLM 选项
 */
export interface LLMOptions {
  readonly maxTokens?: number;
  readonly maxOutputTokens?: number;
  readonly temperature?: number;
  readonly stream?: boolean;
  readonly tools?: readonly ToolSchema[];
  readonly abortSignal?: AbortSignal;
  readonly system_prompt?: string;
}

/**
 * Token 使用情况
 */
export interface TokenUsage {
  readonly prompt_tokens: number;
  readonly completion_tokens: number;
  readonly total_tokens: number;
}

/**
 * LLM 响应
 */
export interface LLMResponse {
  readonly content: string;
  readonly role: 'assistant';
  readonly type?: 'text' | 'tool' | 'tool_call';
  readonly tool_calls?: readonly ToolCall[];
  readonly finishReason?: string;
  readonly usage: TokenUsage;
}

/**
 * 流式 Chunk
 */
export interface StreamChunk {
  readonly content?: string;
  readonly tool_calls?: readonly StreamToolCall[];
  readonly finish_reason?: string;
}

export interface StreamToolCall {
  readonly index: number;
  readonly delta: {
    readonly type?: 'function';
    readonly function?: {
      readonly name?: string;
      readonly arguments?: string;
    };
  };
}

/**
 * ============================================================================
 * Provider 抽象基类 (core/provider.ts)
 * ============================================================================
 */

/**
 * LLM Provider 抽象基类
 *
 * @template TConfig Provider 配置类型
 */
export abstract class LLMProvider<TConfig extends ProviderConfig = ProviderConfig> {
  /**
   * Provider 配置 (只读)
   */
  abstract readonly config: TConfig;

  /**
   * 生成响应 (同步模式)
   *
   * @param messages 消息列表
   * @param options 选项
   * @returns LLM 响应
   */
  abstract generate(
    messages: readonly Message[],
    options?: LLMOptions
  ): Promise<LLMResponse>;

  /**
   * 生成响应 (流式模式)
   *
   * @param messages 消息列表
   * @param options 选项
   * @returns 异步迭代器
   */
  abstract stream(
    messages: readonly Message[],
    options?: LLMOptions
  ): AsyncIterable<StreamChunk>;

  /**
   * 健康检查
   *
   * @returns 是否健康
   */
  abstract healthCheck(): Promise<boolean>;

  /**
   * 获取支持的特性
   *
   * @returns 特性列表
   */
  abstract getSupportedFeatures(): readonly Feature[];
}

/**
 * ============================================================================
 * API 适配器抽象基类 (adapters/base.ts)
 * ============================================================================
 */

/**
 * API 请求体接口
 */
export interface APIRequestBody {
  readonly model: string;
  readonly messages: readonly APIMessage[];
  readonly max_tokens?: number;
  readonly temperature?: number;
  readonly stream?: boolean;
  readonly tools?: readonly APITool[];
  readonly [key: string]: unknown;
}

export interface APIMessage {
  readonly role: string;
  readonly content?: unknown;
  readonly tool_call_id?: string;
  readonly tool_calls?: readonly APIToolCall[];
  readonly reasoning_content?: string;
}

export interface APIToolCall {
  readonly id: string;
  readonly type: string;
  readonly function: {
    readonly name: string;
    readonly arguments: string;
  };
}

export interface APITool {
  readonly type: string;
  readonly function: {
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, unknown>;
  };
}

/**
 * API 响应接口
 */
export interface APIResponse {
  readonly content: string | unknown;
  readonly reasoning_content?: string;
  readonly tool_calls?: readonly APIToolCall[];
  readonly finish_reason?: string;
  readonly usage: {
    readonly prompt_tokens: number;
    readonly completion_tokens: number;
    readonly total_tokens: number;
  };
}

/**
 * 转换上下文
 */
export interface TransformContext {
  readonly model: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly stream?: boolean;
  readonly tools?: readonly ToolSchema[];
}

/**
 * API 凭证
 */
export interface ApiCredentials {
  readonly apiKey: string;
  readonly organization?: string;
  readonly groupId?: string;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors?: readonly string[];
}

/**
 * Base API Adapter 抽象基类
 */
export abstract class BaseAPIAdapter {
  /**
   * 转换请求
   *
   * @param messages 消息列表
   * @param context 转换上下文
   * @returns API 请求体
   */
  abstract transformRequest(
    messages: readonly Message[],
    context: TransformContext
  ): APIRequestBody;

  /**
   * 转换响应
   *
   * @param response 原始响应
   * @returns 标准 API 响应
   */
  abstract transformResponse(response: unknown): APIResponse;

  /**
   * 获取请求头
   *
   * @param credentials API 凭证
   * @returns Headers 对象
   */
  abstract getHeaders(credentials: ApiCredentials): Headers;

  /**
   * 获取端点路径
   *
   * @returns 端点路径
   */
  abstract getEndpointPath(): string;

  /**
   * 验证响应格式
   *
   * @param response 原始响应
   * @returns 验证结果
   */
  abstract validateResponse(response: unknown): ValidationResult;

  /**
   * 检查消息是否可用
   *
   * @param msg 消息
   * @returns 是否可用
   */
  protected isMessageUsable(
    msg: { role: string; content?: unknown; tool_call_id?: string; tool_calls?: readonly unknown[] }
  ): boolean {
    if (!msg) return false;

    const hasContent =
      msg.content !== undefined &&
      msg.content !== null &&
      (typeof msg.content !== 'string' || msg.content !== '') &&
      (!Array.isArray(msg.content) || msg.content.length > 0);

    const hasToolCalls = Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0;
    const hasToolCallId = Boolean(msg.tool_call_id);

    return hasContent || hasToolCalls || hasToolCallId;
  }

  /**
   * 清理消息 (移除内部字段)
   *
   * @param msg 消息
   * @returns 清理后的消息
   */
  protected cleanMessage(msg: Message): APIMessage {
    const cleaned: APIMessage = {
      role: msg.role,
      content: msg.content || '',
    };

    if (msg.tool_call_id) {
      cleaned.tool_call_id = msg.tool_call_id;
    }

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      cleaned.tool_calls = msg.tool_calls as APIToolCall[];
    }

    if (msg.reasoning_content) {
      cleaned.reasoning_content = msg.reasoning_content;
    }

    return cleaned;
  }
}
```

### 3.4 数据流设计

```
┌─────────────────────────────────────────────────────────────────┐
│                        请求流程                                  │
└─────────────────────────────────────────────────────────────────┘

用户请求
  │
  ▼
┌─────────────────┐
│ ProviderRegistry│
│  .createFromEnv │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  1. 加载配置                                                   │
│     ┌─────────────────────────────────────────────────┐     │
│     │ MODEL_CONFIGS[modelId] → ModelConfig            │     │
│     │ process.env[envApiKey] → apiKey                  │     │
│     │ process.env[envBaseURL] → baseURL                │     │
│     └─────────────────────────────────────────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  2. 创建适配器                                                 │
│     ┌─────────────────────────────────────────────────┐     │
│     │ AdapterFactory.create(providerType)              │     │
│     │   │                                                │     │
│     │   ├─► 'glm' ─► GLMAdapter                        │     │
│     │   ├─► 'minimax' ─► MiniMaxAdapter                │     │
│     │   └─► 其他 ─► OpenAIAdapter                      │     │
│     └─────────────────────────────────────────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  3. 创建 Provider                                             │
│     ┌─────────────────────────────────────────────────┐     │
│     │ new OpenAICompatibleProvider(config, adapter)    │     │
│     └─────────────────────────────────────────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  4. 执行请求                                                   │
│     ┌─────────────────────────────────────────────────┐     │
│     │ provider.generate(messages, options)             │     │
│     └─────────────────────────────────────────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│transform     │ │HTTP Client   │ │transform     │
│Request       │ │.fetch()      │ │Response      │
└──────────────┘ └──────────────┘ └──────────────┘
         │               │               │
         └───────────────┼───────────────┘
                         ▼
                   ┌──────────────┐
                   │LLMResponse   │
                   └──────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        响应流程                                  │
└─────────────────────────────────────────────────────────────────┘

API 原始响应
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│  1. 解析响应                                                   │
│     ┌─────────────────────────────────────────────────┐     │
│     │ response.json() → unknown                       │     │
│     └─────────────────────────────────────────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  2. 验证响应                                                   │
│     ┌─────────────────────────────────────────────────┐     │
│     │ adapter.validateResponse(data)                  │     │
│     │   ├─► 检查必需字段                                │     │
│     │   ├─► 检查数据类型                                │     │
│     │   └─► 返回 ValidationResult                      │     │
│     └─────────────────────────────────────────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  3. 转换响应                                                   │
│     ┌─────────────────────────────────────────────────┐     │
│     │ adapter.transformResponse(data)                 │     │
│     │   ├─► 提取 content                               │     │
│     │   ├─► 提取 tool_calls                            │     │
│     │   ├─► 提取 usage                                 │     │
│     │   └─► 提取 finish_reason                         │     │
│     └─────────────────────────────────────────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  4. 构建标准响应                                               │
│     ┌─────────────────────────────────────────────────┐     │
│     │ {                                                 │     │
│     │   content: string,                               │     │
│     │   role: 'assistant',                             │     │
│     │   tool_calls?: ToolCall[],                       │     │
│     │   finishReason?: string,                         │     │
│     │   usage: TokenUsage                              │     │
│     │ }                                                 │     │
│     └─────────────────────────────────────────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                   ┌──────────────┐
                   │返回给用户     │
                   └──────────────┘
```

---

## 四、重构建议

### 4.1 短期重构计划 (Phase 1: 清理重复)

#### 目标

- 消除代码重复
- 统一导入路径
- 清理无效文件

#### 步骤

**步骤 1: 删除旧版文件**

```bash
# 删除旧版适配器
rm src/providers/adapters/base.ts
rm src/providers/adapters/standard.ts
rm src/providers/adapters/openai.ts
rm src/providers/adapters/minimax.ts
rm src/providers/adapters/glm.ts

# 删除旧版 providers 目录
rm -rf src/providers/providers/

# 删除旧版 utils (保留 errors.ts，移动到 core/)
rm src/providers/utils/http-client.ts
rm src/providers/utils/stream-parser.ts

# 创建 core 目录并移动错误定义
mkdir -p src/providers/core
mv src/providers/utils/errors.ts src/providers/core/errors.ts
```

**步骤 2: 重命名文件 (可选，如果希望去掉 -adapter 后缀)**

```bash
cd src/providers/adapters

# 重命名文件
mv base-adapter.ts base.ts
mv standard-adapter.ts standard.ts
mv openai-adapter.ts openai.ts
mv minimax-adapter.ts minimax.ts
mv glm-adapter.ts glm.ts
```

**步骤 3: 更新 adapters/index.ts**

```typescript
/**
 * Adapters 模块导出
 */

// 核心适配器
export { BaseAPIAdapter } from './base';
export type { TransformContext, ApiCredentials, ValidationResult, APIRequestBody, APIResponse } from './base';

// 标准适配器
export { StandardAdapter } from './standard';

// Provider 适配器
export { OpenAIAdapter } from './openai';
export { MiniMaxAdapter } from './minimax';
export { GLMAdapter } from './glm';

// 工厂
export { AdapterFactory } from './factory';
```

**步骤 4: 更新 registry.ts 导入**

```typescript
// registry.ts
import { OpenAIAdapter } from './adapters/openai';
import { MiniMaxAdapter } from './adapters/minimax';
import { GLMAdapter } from './adapters/glm';
import type { BaseAPIAdapter } from './adapters/base';
```

**步骤 5: 更新主 index.ts**

```typescript
/**
 * Providers 模块
 */

// =============================================================================
// 核心类型
// =============================================================================
export type {
  // 基础类型
  BaseProviderConfig,
  ProviderConfig,

  // 消息类型
  Message,
  MessageRole,
  MessageContent,
  MessageContentPart,

  // 工具类型
  ToolCall,
  ToolSchema,

  // 选项和响应
  LLMOptions,
  LLMResponse,
  StreamChunk,
  StreamCallback,
  StreamCallbacks,

  // 模型配置
  ModelConfig,
  ModelId,
  ProviderType,

  // HTTP 类型
  HttpClientOptions,
  RequestInitWithOptions,
} from './core/types';

// =============================================================================
// Provider 基类
// =============================================================================
export { LLMProvider } from './core/provider';

// =============================================================================
// Provider 实现
// =============================================================================
export { OpenAICompatibleProvider } from './providers/openai-compatible';
export type { OpenAICompatibleConfig } from './providers/openai-compatible';

// =============================================================================
// Provider 注册表
// =============================================================================
export { ProviderRegistry, MODEL_CONFIGS, Models } from './registry/registry';

// =============================================================================
// 适配器
// =============================================================================
export { BaseAPIAdapter } from './adapters/base';
export { StandardAdapter } from './adapters/standard';
export { OpenAIAdapter } from './adapters/openai';
export { MiniMaxAdapter } from './adapters/minimax';
export { GLMAdapter } from './adapters/glm';

// =============================================================================
// HTTP 客户端
// =============================================================================
export { HTTPClient } from './infrastructure/http/client';
export { StreamParser } from './infrastructure/http/stream-parser';
export type { HttpClientOptions, RequestInitWithOptions } from './infrastructure/http/types';

// =============================================================================
// 错误处理
// =============================================================================
export {
  LLMError,
  LLMRetryableError,
  LLMRateLimitError,
  LLMPermanentError,
  LLMAuthError,
  LLMNotFoundError,
  LLMBadRequestError,
  LLMAbortedError,
  createErrorFromStatus,
  isRetryableError,
  isPermanentError,
  isAbortedError,
} from './core/errors';
```

**步骤 6: 修复 LLMProvider 继承关系**

```typescript
// providers/openai-compatible.ts
import { LLMProvider } from '../core/provider';
import type { ProviderConfig, LLMOptions, LLMResponse, Message, Feature } from '../core/types';

export interface OpenAICompatibleConfig extends ProviderConfig {
  organization?: string;
  apiKeyHeader?: string;
  apiKeyPrefix?: string;
  defaultHeaders?: Record<string, string>;
  extraBody?: Record<string, unknown>;
  enableReasoningSplit?: boolean;
}

export class OpenAICompatibleProvider extends LLMProvider<OpenAICompatibleConfig> {
  readonly config: OpenAICompatibleConfig;
  private httpClient: HTTPClient;
  private adapter: BaseAPIAdapter;

  constructor(config: OpenAICompatibleConfig, adapter?: BaseAPIAdapter) {
    // 现在正确继承抽象基类
    super(); // 如果 LLMProvider 需要 constructor

    this.config = {
      ...config,
      baseURL: config.baseURL.replace(/\/$/, ''),
    };
    this.adapter = adapter ?? new OpenAIAdapter();
    this.httpClient = new HTTPClient({
      timeout: config.timeout,
      maxRetries: config.maxRetries,
      debug: config.debug,
    });
  }

  async generate(messages: Message[], options?: LLMOptions): Promise<LLMResponse> {
    // 实现...
  }

  async *stream(messages: Message[], options?: LLMOptions): AsyncIterable<StreamChunk> {
    // 实现...
  }

  async healthCheck(): Promise<boolean> {
    // 实现...
  }

  getSupportedFeatures(): readonly Feature[] {
    // 从配置或 ModelConfig 获取
    return [];
  }
}
```

**步骤 7: 运行测试确保没有破坏性更改**

```bash
# 运行类型检查
pnpm typecheck

# 运行测试
pnpm test

# 运行构建
pnpm build
```

### 4.2 中期重构计划 (Phase 2: 结构优化)

#### 目标

- 实现清晰的分层结构
- 引入依赖注入
- 分离关注点
- 提高可测试性

#### 步骤

**1. 创建目录结构**

```bash
cd src/providers

# 创建新的目录结构
mkdir -p core
mkdir -p infrastructure/http
mkdir -p infrastructure/retry
mkdir -p infrastructure/observability
mkdir -p providers
mkdir -p registry
```

**2. 移动和重组文件**

```bash
# 移动核心文件
mv provider.ts core/
mv types.ts core/
mv errors.ts core/

# 移动基础设施文件
mv http/client.ts infrastructure/http/
mv http/stream-parser.ts infrastructure/http/
mv http/index.ts infrastructure/http/

# 移动适配器文件 (已存在)
# adapters/* 保持不变

# 移动 Provider 实现
mv openai-compatible.ts providers/
# 创建 providers/index.ts

# 移动注册表文件
mv registry.ts registry/registry.ts
# 创建 registry/index.ts
```

**3. 引入依赖注入容器**

```typescript
// infrastructure/di/container.ts

interface ServiceIdentifier<T> {
  readonly token: unique symbol;
}

class DIContainer {
  private services = new Map<unknown, unknown>();

  register<T>(identifier: ServiceIdentifier<T>, factory: () => T): void {
    this.services.set(identifier, factory());
  }

  get<T>(identifier: ServiceIdentifier<T>): T {
    const service = this.services.get(identifier);
    if (!service) {
      throw new Error(`Service not found: ${String(identifier.token)}`);
    }
    return service as T;
  }

  has<T>(identifier: ServiceIdentifier<T>): boolean {
    return this.services.has(identifier);
  }
}

// 服务标识符
export const HttpClient = Symbol('HttpClient') as ServiceIdentifier<HTTPClient>;
export const StreamParser = Symbol('StreamParser') as ServiceIdentifier<StreamParser>;
export const AdapterFactory = Symbol('AdapterFactory') as ServiceIdentifier<AdapterFactory>;

export { DIContainer };
```

**4. 创建适配器工厂**

```typescript
// adapters/factory.ts

import type { ProviderType } from '../core/types';
import { BaseAPIAdapter } from './base';
import { StandardAdapter } from './standard';
import { OpenAIAdapter } from './openai';
import { MiniMaxAdapter } from './minimax';
import { GLMAdapter } from './glm';

export class AdapterFactory {
  private cache = new Map<string, BaseAPIAdapter>();

  create(provider: ProviderType): BaseAPIAdapter {
    if (this.cache.has(provider)) {
      return this.cache.get(provider)!;
    }

    let adapter: BaseAPIAdapter;

    switch (provider) {
      case 'glm':
        adapter = new GLMAdapter();
        break;
      case 'minimax':
        adapter = new MiniMaxAdapter();
        break;
      case 'kimi':
      case 'deepseek':
      case 'openai':
      default:
        adapter = new OpenAIAdapter();
    }

    this.cache.set(provider, adapter);
    return adapter;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
```

**5. 实现配置加载器**

```typescript
// registry/config-loader.ts

import type { ModelId, ModelConfig, ProviderConfig } from '../core/types';
import { MODEL_CONFIGS } from './models';

export class ConfigLoadError extends Error {
  constructor(message: string, public readonly missingKey?: string) {
    super(message);
    this.name = 'ConfigLoadError';
  }
}

export class ConfigLoader {
  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  loadModelConfig<T extends ModelId>(modelId: T): ModelConfig {
    const config = MODEL_CONFIGS[modelId];
    if (!config) {
      throw new ConfigLoadError(`Unknown model: ${modelId}`);
    }
    return config;
  }

  loadProviderConfig<T extends ModelId>(modelId: T): ProviderConfig {
    const modelConfig = this.loadModelConfig(modelId);

    const apiKey = this.env[modelConfig.envApiKey];
    if (!apiKey) {
      throw new ConfigLoadError(
        `Missing API key for ${modelId}. Please set ${modelConfig.envApiKey} environment variable.`,
        modelConfig.envApiKey
      );
    }

    const baseURL = this.env[modelConfig.envBaseURL] || modelConfig.baseURL;

    return {
      apiKey,
      baseURL,
      model: modelConfig.model,
      maxTokens: modelConfig.maxTokens,
      maxOutputTokens: modelConfig.maxOutputTokens,
      temperature: 0.7,
    };
  }

  hasRequiredConfig(modelId: ModelId): boolean {
    try {
      this.loadProviderConfig(modelId);
      return true;
    } catch {
      return false;
    }
  }
}
```

**6. 实现装饰器模式**

```typescript
// infrastructure/http/decorators.ts

import type { HttpClient } from './types';

/**
 * 重试装饰器
 */
export class RetryableClient implements HttpClient {
  constructor(
    private readonly base: HttpClient,
    private readonly maxRetries: number = 3
  ) {}

  async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.base.request<T>(url, options);
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.maxRetries && this.isRetryable(error)) {
          await this.delay(Math.pow(2, attempt) * 1000);
          continue;
        }
        throw error;
      }
    }

    throw lastError;
  }

  private isRetryable(error: unknown): boolean {
    // 实现重试判断逻辑
    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 缓存装饰器
 */
export class CachedClient implements HttpClient {
  private cache = new Map<string, { data: unknown; expires: number }>();

  constructor(
    private readonly base: HttpClient,
    private readonly ttl: number = 60000 // 1 minute
  ) {}

  async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const cacheKey = this.getCacheKey(url, options);

    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data as T;
    }

    const response = await this.base.request<T>(url, options);

    this.cache.set(cacheKey, {
      data: response,
      expires: Date.now() + this.ttl,
    });

    return response;
  }

  private getCacheKey(url: string, options: RequestInit): string {
    return `${url}:${JSON.stringify(options)}`;
  }

  clear(): void {
    this.cache.clear();
  }
}
```

### 4.3 长期重构计划 (Phase 3: 架构升级)

#### 目标

- 实现插件系统
- 支持中间件模式
- 增强可观测性
- 支持异步迭代

#### 步骤

**1. 实现插件系统**

```typescript
// core/plugin.ts

export interface ProviderPlugin {
  readonly name: string;
  readonly version: string;

  initialize?(context: PluginContext): void | Promise<void>;

  onRequest?(context: RequestContext): void | Promise<void>;
  onResponse?(context: ResponseContext): void | Promise<void>;
  onError?(error: Error, context: ErrorContext): void | Promise<void>;
  onDestroy?(): void | Promise<void>;
}

export interface PluginContext {
  readonly provider: LLMProvider;
  readonly config: ProviderConfig;
}

export interface RequestContext {
  readonly messages: readonly Message[];
  readonly options?: LLMOptions;
  metadata: Map<string, unknown>;
}

export interface ResponseContext {
  readonly response: LLMResponse;
  readonly request: RequestContext;
  metadata: Map<string, unknown>;
}

export interface ErrorContext {
  readonly error: Error;
  readonly request: RequestContext;
  metadata: Map<string, unknown>;
}

/**
 * 可扩展的 Provider
 */
export class ExtensibleProvider extends LLMProvider {
  private plugins: ProviderPlugin[] = [];
  private initialized = false;

  use(plugin: ProviderPlugin): this {
    this.plugins.push(plugin);
    this.initialized = false;
    return this;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    const context: PluginContext = {
      provider: this,
      config: this.config,
    };

    for (const plugin of this.plugins) {
      await plugin.initialize?.(context);
    }

    this.initialized = true;
  }

  override async generate(
    messages: readonly Message[],
    options?: LLMOptions
  ): Promise<LLMResponse> {
    await this.ensureInitialized();

    const requestContext: RequestContext = {
      messages,
      options,
      metadata: new Map(),
    };

    // 执行 onRequest 钩子
    for (const plugin of this.plugins) {
      await plugin.onRequest?.(requestContext);
    }

    try {
      const response = await super.generate(messages, options);

      const responseContext: ResponseContext = {
        response,
        request: requestContext,
        metadata: requestContext.metadata,
      };

      // 执行 onResponse 钩子
      for (const plugin of this.plugins) {
        await plugin.onResponse?.(responseContext);
      }

      return response;
    } catch (error) {
      const errorContext: ErrorContext = {
        error: error as Error,
        request: requestContext,
        metadata: requestContext.metadata,
      };

      // 执行 onError 钩子
      for (const plugin of this.plugins) {
        await plugin.onError?.(errorContext);
      }

      throw error;
    }
  }

  override async destroy(): Promise<void> {
    for (const plugin of this.plugins) {
      await plugin.onDestroy?.();
    }
    this.plugins = [];
    this.initialized = false;
  }
}

// 使用示例
const provider = new ExtensibleProvider(config)
  .use(new LoggingPlugin())
  .use(new CachePlugin())
  .use(new MetricsPlugin())
  .use(new CircuitBreakerPlugin());
```

**2. 实现中间件模式**

```typescript
// infrastructure/middleware/pipeline.ts

export type ProviderMiddleware = (
  request: ProviderRequest,
  next: (req: ProviderRequest) => Promise<ProviderResponse>
) => Promise<ProviderResponse>;

export interface ProviderRequest {
  readonly messages: readonly Message[];
  readonly options?: LLMOptions;
  readonly metadata: Map<string, unknown>;
}

export interface ProviderResponse {
  readonly response: LLMResponse;
  readonly metadata: Map<string, unknown>;
}

export class MiddlewarePipeline {
  private middlewares: ProviderMiddleware[] = [];

  use(middleware: ProviderMiddleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  async execute(
    request: ProviderRequest,
    handler: (req: ProviderRequest) => Promise<ProviderResponse>
  ): Promise<ProviderResponse> {
    let index = 0;

    const next = async (req: ProviderRequest): Promise<ProviderResponse> => {
      if (index >= this.middlewares.length) {
        return handler(req);
      }
      const middleware = this.middlewares[index++];
      return middleware(req, next);
    };

    return next(request);
  }

  clear(): void {
    this.middlewares = [];
  }
}

// 内置中间件示例

// 日志中间件
export const loggingMiddleware: ProviderMiddleware = async (req, next) => {
  console.log('[Request]', req);
  const start = Date.now();

  const response = await next(req);

  const duration = Date.now() - start;
  console.log('[Response]', { duration, response });

  return response;
};

// 缓存中间件
export const cacheMiddleware = (cache: Map<string, ProviderResponse>): ProviderMiddleware => {
  return async (req, next) => {
    const key = JSON.stringify(req);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const response = await next(req);
    cache.set(key, response);

    return response;
  };
};

// 重试中间件
export const retryMiddleware = (maxRetries: number): ProviderMiddleware => {
  return async (req, next) => {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await next(req);
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError;
  };
};

// 使用示例
const pipeline = new MiddlewarePipeline()
  .use(loggingMiddleware)
  .use(cacheMiddleware(new Map()))
  .use(retryMiddleware(3));

const response = await pipeline.execute(
  { messages, options, metadata: new Map() },
  async (req) => {
    return { response: await provider.generate(req.messages, req.options), metadata: new Map() };
  }
);
```

**3. 实现可观测性**

```typescript
// infrastructure/observability/metrics.ts

export interface MetricsCollector {
  increment(name: string, value?: number, tags?: Record<string, string>): void;
  timing(name: string, value: number, tags?: Record<string, string>): void;
  gauge(name: string, value: number, tags?: Record<string, string>): void;
}

export class LoggerMetricsCollector implements MetricsCollector {
  constructor(private readonly logger: Console = console) {}

  increment(name: string, value = 1, tags?: Record<string, string>): void {
    this.logger.log('[Metric Increment]', { name, value, tags });
  }

  timing(name: string, value: number, tags?: Record<string, string>): void {
    this.logger.log('[Metric Timing]', { name, value, tags });
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.logger.log('[Metric Gauge]', { name, value, tags });
  }
}

// 使用示例
const metrics = new LoggerMetricsCollector();

metrics.increment('provider.request.count', 1, { provider: 'glm', model: 'glm-4.7' });
metrics.timing('provider.request.duration', 1234, { provider: 'glm' });
metrics.gauge('provider.active.connections', 5, { provider: 'glm' });
```

```typescript
// infrastructure/observability/tracer.ts

export interface Span {
  setTag(key: string, value: unknown): void;
  log(fields: Record<string, unknown>): void;
  finish(finishTime?: number): void;
}

export interface Tracer {
  startSpan(name: string, options?: SpanOptions): Span;
}

export interface SpanOptions {
  readonly childOf?: Span;
  readonly tags?: Record<string, unknown>;
}

export class NoOpTracer implements Tracer {
  startSpan(): Span {
    return {
      setTag() {},
      log() {},
      finish() {},
    };
  }
}

export class ConsoleTracer implements Tracer {
  startSpan(name: string, options?: SpanOptions): Span {
    const start = Date.now();

    console.log('[Span Start]', { name, options });

    return {
      setTag(key, value) {
        console.log('[Span Tag]', { key, value });
      },
      log(fields) {
        console.log('[Span Log]', fields);
      },
      finish(finishTime) {
        const duration = (finishTime || Date.now()) - start;
        console.log('[Span Finish]', { name, duration });
      },
    };
  }
}

// 使用示例
const tracer = new ConsoleTracer();

const span = tracer.startSpan('provider.generate', {
  tags: { provider: 'glm', model: 'glm-4.7' }
});

try {
  const response = await provider.generate(messages, options);
  span.setTag('success', true);
  return response;
} catch (error) {
  span.setTag('error', error);
  throw error;
} finally {
  span.finish();
}
```

---

## 五、最佳实践建议

### 5.1 代码组织原则

| 原则 | 说明 | 应用示例 |
|-----|------|---------|
| **单一职责 (SRP)** | 每个类/模块只有一个改变的理由 | `HTTPClient` 只负责 HTTP 通信，`StreamParser` 只负责流解析 |
| **开闭原则 (OCP)** | 对扩展开放，对修改关闭 | 使用 `Adapter` 模式添加新 Provider，无需修改现有代码 |
| **里氏替换 (LSP)** | 子类可以替换父类使用 | 所有 `Provider` 实现必须正确实现 `LLMProvider` 接口 |
| **接口隔离 (ISP)** | 细粒度接口，避免胖接口 | 分离 `HttpClient` 和 `RetryPolicy` 接口 |
| **依赖倒置 (DIP)** | 依赖抽象而非具体实现 | 依赖 `BaseAPIAdapter` 而非具体适配器 |

### 5.2 命名规范

```typescript
// ✅ 好的命名
class OpenAIAdapter extends BaseAPIAdapter { }
interface ProviderConfig { }
type MessageRole = 'user' | 'assistant' | 'system';
const MODEL_CONFIGS: Record<string, ModelConfig> = {};
function createProvider() { }

// ❌ 避免的命名
class OpenAI { }  // 太泛化
interface Config { }  // 太模糊
type Role = string;  // 不够具体
const configs: any = {};  // 缺乏类型
function do() { }  // 动词不明确
```

**命名约定**:

| 类型 | 约定 | 示例 |
|-----|------|-----|
| 类 | PascalCase | `OpenAIAdapter`, `HTTPClient` |
| 接口 | PascalCase, I 前缀可选 | `ProviderConfig`, `IHttpClient` |
| 类型 | PascalCase | `MessageRole`, `ModelId` |
| 常量 | UPPER_SNAKE_CASE | `MODEL_CONFIGS`, `DEFAULT_TIMEOUT` |
| 函数 | camelCase | `createProvider`, `transformRequest` |
| 私有成员 | camelCase, _ 前缀 | `_httpClient`, `internalMethod` |

### 5.3 错误处理策略

```typescript
// core/errors.ts

/**
 * Provider 错误基类
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider: string,
    public readonly recoverable: boolean,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ProviderError';
    Error.captureStackTrace?.(this, ProviderError);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      provider: this.provider,
      recoverable: this.recoverable,
      originalError: this.originalError?.message,
    };
  }
}

/**
 * 可重试错误
 */
export class RetryableError extends ProviderError {
  constructor(
    message: string,
    provider: string,
    public readonly retryAfter?: number,
    originalError?: Error
  ) {
    super(message, 'RETRYABLE', provider, true, originalError);
    this.name = 'RetryableError';
  }
}

/**
 * 永久错误
 */
export class PermanentError extends ProviderError {
  constructor(
    message: string,
    provider: string,
    public readonly statusCode?: number,
    originalError?: Error
  ) {
    super(message, 'PERMANENT', provider, false, originalError);
    this.name = 'PermanentError';
  }
}

/**
 * 使用示例
 */
try {
  const response = await provider.generate(messages);
} catch (error) {
  if (error instanceof ProviderError) {
    // 记录结构化错误信息
    logger.error({
      ...error.toJSON(),
      timestamp: new Date().toISOString(),
    });

    if (error.recoverable) {
      // 实现重试逻辑
      return retry(() => provider.generate(messages));
    } else {
      // 永久错误，向上抛出
      throw error;
    }
  }

  // 未知错误，包装后抛出
  throw new ProviderError(
    'Unknown error occurred',
    'UNKNOWN',
    'unknown',
    true,
    error as Error
  );
}
```

### 5.4 测试策略

```typescript
// __tests__/unit/adapters/openai.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { OpenAIAdapter } from '@/providers/adapters/openai';
import type { Message } from '@/providers/core/types';

describe('OpenAIAdapter', () => {
  let adapter: OpenAIAdapter;

  beforeEach(() => {
    adapter = new OpenAIAdapter();
  });

  describe('transformRequest', () => {
    it('should transform basic message correctly', () => {
      const messages: Message[] = [{
        role: 'user',
        content: 'Hello',
      }];

      const result = adapter.transformRequest(messages, {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
      });

      expect(result).toEqual({
        model: 'gpt-4',
        messages: [{
          role: 'user',
          content: 'Hello',
        }],
        temperature: 0.7,
        max_tokens: 1000,
        reasoning_split: true,
      });
    });

    it('should include tools when provided', () => {
      const messages: Message[] = [{
        role: 'user',
        content: 'What is the weather?',
      }];

      const tools = [{
        type: 'function' as const,
        function: {
          name: 'get_weather',
          description: 'Get current weather',
          parameters: { type: 'object' },
        },
      }];

      const result = adapter.transformRequest(messages, {
        model: 'gpt-4',
        tools,
      });

      expect(result.tools).toEqual(tools);
    });

    it('should handle tool_call messages with reasoning_content', () => {
      const messages: Message[] = [{
        role: 'assistant',
        content: '',
        tool_calls: [{
          id: 'call_123',
          type: 'function',
          function: {
            name: 'get_weather',
            arguments: '{"location": "Tokyo"}',
          },
        }],
      }];

      const result = adapter.transformRequest(messages, {
        model: 'gpt-4',
      });

      expect(result.messages[0]).toHaveProperty('reasoning_content');
    });
  });

  describe('transformResponse', () => {
    it('should extract content correctly', () => {
      const apiResponse = {
        choices: [{
          message: {
            role: 'assistant',
            content: 'Hello!',
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      const result = adapter.transformResponse(apiResponse);

      expect(result.content).toBe('Hello!');
      expect(result.finish_reason).toBe('stop');
      expect(result.usage.total_tokens).toBe(15);
    });

    it('should throw on empty choices', () => {
      const apiResponse = { choices: [] };

      expect(() => {
        adapter.transformResponse(apiResponse);
      }).toThrow('Empty choices in response');
    });
  });

  describe('getHeaders', () => {
    it('should include Bearer token', () => {
      const headers = adapter.getHeaders({
        apiKey: 'sk-test123',
      });

      expect(headers.get('Authorization')).toBe('Bearer sk-test123');
    });

    it('should include organization when provided', () => {
      const headers = adapter.getHeaders({
        apiKey: 'sk-test123',
        organization: 'org-123',
      });

      expect(headers.get('OpenAI-Organization')).toBe('org-123');
    });
  });
});
```

### 5.5 文档规范

```typescript
/**
 * OpenAI API Adapter
 *
 * Handles the standard OpenAI API format used by most providers:
 * - OpenAI
 * - Kimi (Moonshot AI)
 * - DeepSeek
 * - Qwen
 *
 * @example
 * ```typescript
 * const adapter = new OpenAIAdapter({
 *   organization: 'org-123',
 *   apiKeyHeader: 'x-api-key',
 *   apiKeyPrefix: '',
 * });
 *
 * const request = adapter.transformRequest(messages, {
 *   model: 'gpt-4',
 *   temperature: 0.7,
 * });
 * ```
 *
 * @remarks
 * This adapter adds the `reasoning_split` flag by default for Kimi compatibility.
 * Set `enableReasoningSplit` to `false` to disable this behavior.
 *
 * @see {@link https://platform.openai.com/docs/api-reference | OpenAI API Reference}
 */
export class OpenAIAdapter extends StandardAdapter {
  /**
   * Creates a new OpenAI adapter
   *
   * @param options - Adapter configuration options
   * @param options.endpointPath - Custom endpoint path (default: '/chat/completions')
   * @param options.organization - OpenAI organization ID
   * @param options.apiKeyHeader - Custom API key header name
   * @param options.apiKeyPrefix - API key prefix (default: 'Bearer')
   * @param options.defaultHeaders - Additional static headers
   */
  constructor(options: OpenAIAdapterOptions = {}) {
    // ...
  }

  /**
   * Transforms a request to OpenAI format
   *
   * @param messages - The messages to send
   * @param options - Transform options
   * @returns The transformed request body
   *
   * @throws {@link ValidationError} If message format is invalid
   */
  transformRequest(
    messages: readonly Message[],
    options: OpenAITransformOptions
  ): APIRequestBody {
    // ...
  }
}
```

---

## 六、重构检查清单

### Phase 1: 清理重复代码

- [ ] 删除 `adapters/base.ts`
- [ ] 删除 `adapters/standard.ts`
- [ ] 删除 `adapters/openai.ts`
- [ ] 删除 `adapters/minimax.ts`
- [ ] 删除 `adapters/glm.ts`
- [ ] 删除 `providers/` 目录
- [ ] 删除 `utils/http-client.ts`
- [ ] 删除 `utils/stream-parser.ts`
- [ ] 移动 `errors.ts` 到 `core/`
- [ ] 更新 `adapters/index.ts`
- [ ] 更新 `registry.ts` 导入
- [ ] 更新主 `index.ts`
- [ ] 运行类型检查 (`pnpm typecheck`)
- [ ] 运行测试 (`pnpm test`)
- [ ] 运行构建 (`pnpm build`)

### Phase 2: 结构优化

- [ ] 创建 `core/` 目录
- [ ] 创建 `infrastructure/` 目录
- [ ] 创建 `providers/` 目录
- [ ] 创建 `registry/` 目录
- [ ] 移动文件到新目录结构
- [ ] 重命名适配器文件 (去掉 -adapter 后缀)
- [ ] 让 `OpenAICompatibleProvider` 继承 `LLMProvider`
- [ ] 实现依赖注入容器
- [ ] 实现适配器工厂
- [ ] 实现配置加载器
- [ ] 更新所有导入路径
- [ ] 运行完整测试套件

### Phase 3: 架构升级

- [ ] 实现插件系统
- [ ] 实现中间件管道
- [ ] 添加日志插件
- [ ] 添加缓存插件
- [ ] 添加指标收集
- [ ] 添加分布式追踪
- [ ] 实现熔断器
- [ ] 实现健康检查
- [ ] 添加流式响应支持 (AsyncIterable)
- [ ] 编写完整文档
- [ ] 性能测试和优化

---

## 附录

### A. 文件映射表

| 旧路径 | 新路径 | 说明 |
|-------|-------|------|
| `adapters/base.ts` | ~~删除~~ | 旧版适配器基类 |
| `adapters/base-adapter.ts` | `adapters/base.ts` | 新版适配器基类 |
| `adapters/standard.ts` | ~~删除~~ | 旧版标准适配器 |
| `adapters/standard-adapter.ts` | `adapters/standard.ts` | 新版标准适配器 |
| `adapters/openai.ts` | ~~删除~~ | 旧版 OpenAI 适配器 |
| `adapters/openai-adapter.ts` | `adapters/openai.ts` | 新版 OpenAI 适配器 |
| `adapters/minimax.ts` | ~~删除~~ | 旧版 MiniMax 适配器 |
| `adapters/minimax-adapter.ts` | `adapters/minimax.ts` | 新版 MiniMax 适配器 |
| `adapters/glm.ts` | ~~删除~~ | 旧版 GLM 适配器 |
| `adapters/glm-adapter.ts` | `adapters/glm.ts` | 新版 GLM 适配器 |
| `provider.ts` | `core/provider.ts` | Provider 抽象基类 |
| `types.ts` | `core/types.ts` | 核心类型定义 |
| `utils/errors.ts` | `core/errors.ts` | 错误类型定义 |
| `http/client.ts` | `infrastructure/http/client.ts` | HTTP 客户端 |
| `http/stream-parser.ts` | `infrastructure/http/stream-parser.ts` | 流式解析器 |
| `openai-compatible.ts` | `providers/openai-compatible.ts` | Provider 实现 |
| `registry.ts` | `registry/registry.ts` | 注册表 |

### B. 依赖关系图

```
core/
├── provider.ts
│   └── depends on: types.ts
├── types.ts
│   └── depends on: (none)
└── errors.ts
    └── depends on: types.ts

adapters/
├── base.ts
│   └── depends on: core/types.ts
├── standard.ts
│   └── depends on: base.ts
├── openai.ts
│   └── depends on: standard.ts
├── minimax.ts
│   └── depends on: standard.ts
└── glm.ts
    └── depends on: standard.ts

infrastructure/
├── http/
│   ├── client.ts
│   │   └── depends on: core/errors.ts
│   └── stream-parser.ts
│       └── depends on: core/types.ts
└── retry/
    └── strategy.ts
        └── depends on: core/errors.ts

providers/
└── openai-compatible.ts
    └── depends on:
        - core/provider.ts
        - core/types.ts
        - adapters/*
        - infrastructure/http/*

registry/
└── registry.ts
    └── depends on:
        - core/types.ts
        - adapters/*
        - providers/*
```

### C. 迁移指南

**从旧代码迁移到新结构:**

1. 更新导入语句
   ```typescript
   // 旧导入
   import { BaseAPIAdapter } from '@/providers/adapters/base-adapter';
   import { HTTPClient } from '@/providers/http/client';

   // 新导入
   import { BaseAPIAdapter } from '@/providers/adapters/base';
   import { HTTPClient } from '@/providers/infrastructure/http/client';
   ```

2. 更新 Provider 创建
   ```typescript
   // 旧方式
   const provider = ProviderRegistry.createFromEnv('glm-4.7');

   // 新方式 (支持额外配置)
   const provider = ProviderRegistry.createFromEnv('glm-4.7', {
     timeout: 120000,
     debug: true,
   });
   ```

3. 更新错误处理
   ```typescript
   // 旧方式
   if (error instanceof LLMRetryableError) { ... }

   // 新方式 (更明确的错误类型)
   if (error instanceof RetryableError) { ... }
   ```

---

*文档结束*
