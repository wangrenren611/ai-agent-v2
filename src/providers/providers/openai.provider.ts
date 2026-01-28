/**
 * OpenAI Provider（新架构）
 * 现基于通用 OpenAICompatibleProvider，复用 openai.ts 同步的请求/流处理逻辑。
 */

import { OpenAIAdapter } from '../adapters/openai-adapter';
import { OpenAICompatibleProvider, OpenAICompatibleConfig } from './openai-compatible.base';



export interface OpenAIProviderConfig extends OpenAICompatibleConfig {
  organization?: string;
}

export class OpenAIProvider extends OpenAICompatibleProvider {
  constructor(config: OpenAIProviderConfig) {
    super(
      new OpenAIAdapter({
        endpointPath: '/chat/completions',
        organization: config.organization,
        apiKeyHeader: config.apiKeyHeader,
        apiKeyPrefix: config.apiKeyPrefix,
        defaultHeaders: config.defaultHeaders,
      }),
      config,
    );
  }
}


