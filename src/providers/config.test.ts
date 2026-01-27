/**
 * Configuration System Tests
 */

import { describe, it, expect } from 'vitest';
import {
  ProviderType,
  BaseProviderConfig,
  OpenAIConfig,
  KimiConfig,
  DeepSeekConfig,
  GLMConfig,
  MiniMaxConfig,
  QwenConfig,
  ProviderMetadata,
  PROVIDER_METADATA,
  getProviderMetadata,
  getProviderTypes,
} from './config.js';

describe('ProviderType', () => {
  it('should have all provider types', () => {
    expect(ProviderType.OPENAI).toBe('openai');
    expect(ProviderType.KIMI).toBe('kimi');
    expect(ProviderType.DEEPSEEK).toBe('deepseek');
    expect(ProviderType.GLM).toBe('glm');
    expect(ProviderType.MINIMAX).toBe('minimax');
    expect(ProviderType.QWEN).toBe('qwen');
  });
});

describe('Provider Configurations', () => {
  describe('BaseProviderConfig', () => {
    it('should accept base config fields', () => {
      const config: BaseProviderConfig = {
        apiKey: 'sk-test',
        baseURL: 'https://api.test.com/v1',
        model: 'test-model',
        maxTokens: 100000,
        maxOutputTokens: 4000,
        temperature: 0.7,
        timeout: 60000,
        maxRetries: 3,
        debug: true,
      };

      expect(config.apiKey).toBe('sk-test');
      expect(config.baseURL).toBe('https://api.test.com/v1');
      expect(config.temperature).toBe(0.7);
    });
  });

  describe('OpenAIConfig', () => {
    it('should have type discriminator', () => {
      const config: OpenAIConfig = {
        type: ProviderType.OPENAI,
        apiKey: 'sk-test',
        organization: 'org-123',
      };

      expect(config.type).toBe(ProviderType.OPENAI);
      expect(config.organization).toBe('org-123');
    });
  });

  describe('KimiConfig', () => {
    it('should have type discriminator', () => {
      const config: KimiConfig = {
        type: ProviderType.KIMI,
        apiKey: 'sk-test',
      };

      expect(config.type).toBe(ProviderType.KIMI);
    });
  });

  describe('DeepSeekConfig', () => {
    it('should have type discriminator', () => {
      const config: DeepSeekConfig = {
        type: ProviderType.DEEPSEEK,
        apiKey: 'sk-test',
      };

      expect(config.type).toBe(ProviderType.DEEPSEEK);
    });
  });

  describe('GLMConfig', () => {
    it('should have type discriminator', () => {
      const config: GLMConfig = {
        type: ProviderType.GLM,
        apiKey: 'sk-test',
      };

      expect(config.type).toBe(ProviderType.GLM);
    });
  });

  describe('MiniMaxConfig', () => {
    it('should have type discriminator and groupId', () => {
      const config: MiniMaxConfig = {
        type: ProviderType.MINIMAX,
        apiKey: 'sk-test',
        groupId: 'group-123',
      };

      expect(config.type).toBe(ProviderType.MINIMAX);
      expect(config.groupId).toBe('group-123');
    });
  });

  describe('QwenConfig', () => {
    it('should have type discriminator', () => {
      const config: QwenConfig = {
        type: ProviderType.QWEN,
        apiKey: 'sk-test',
      };

      expect(config.type).toBe(ProviderType.QWEN);
    });
  });
});

describe('PROVIDER_METADATA', () => {
  it('should have metadata for all providers', () => {
    expect(PROVIDER_METADATA[ProviderType.OPENAI]).toBeDefined();
    expect(PROVIDER_METADATA[ProviderType.KIMI]).toBeDefined();
    expect(PROVIDER_METADATA[ProviderType.DEEPSEEK]).toBeDefined();
    expect(PROVIDER_METADATA[ProviderType.GLM]).toBeDefined();
    expect(PROVIDER_METADATA[ProviderType.MINIMAX]).toBeDefined();
    expect(PROVIDER_METADATA[ProviderType.QWEN]).toBeDefined();
  });

  it('should have required metadata fields for OpenAI', () => {
    const metadata = PROVIDER_METADATA[ProviderType.OPENAI];

    expect(metadata.type).toBe(ProviderType.OPENAI);
    expect(metadata.name).toBe('OpenAI');
    expect(metadata.baseURL).toBe('https://api.openai.com/v1');
    expect(metadata.defaultModel).toBe('gpt-4o-mini');
    expect(metadata.maxTokens).toBeGreaterThan(0);
    expect(metadata.maxOutputTokens).toBeGreaterThan(0);
    expect(metadata.supportsStreaming).toBe(true);
    expect(metadata.supportsTools).toBe(true);
    expect(metadata.defaultTimeout).toBeGreaterThan(0);
    expect(metadata.defaultMaxRetries).toBeGreaterThan(0);
  });

  it('should have correct metadata for Kimi', () => {
    const metadata = PROVIDER_METADATA[ProviderType.KIMI];

    expect(metadata.type).toBe(ProviderType.KIMI);
    expect(metadata.name).toBe('Kimi (Moonshot AI)');
    expect(metadata.baseURL).toBe('https://api.moonshot.cn/v1');
    expect(metadata.defaultModel).toBe('kimi-k2.5');
    expect(metadata.maxTokens).toBe(256000);
  });

  it('should have correct metadata for DeepSeek', () => {
    const metadata = PROVIDER_METADATA[ProviderType.DEEPSEEK];

    expect(metadata.type).toBe(ProviderType.DEEPSEEK);
    expect(metadata.name).toBe('DeepSeek');
    expect(metadata.baseURL).toBe('https://api.deepseek.com');
    expect(metadata.defaultModel).toBe('deepseek-chat');
  });

  it('should have correct metadata for GLM', () => {
    const metadata = PROVIDER_METADATA[ProviderType.GLM];

    expect(metadata.type).toBe(ProviderType.GLM);
    expect(metadata.name).toBe('GLM (Zhipu AI)');
    expect(metadata.baseURL).toBe('https://open.bigmodel.cn/api/paas/v4');
    expect(metadata.defaultModel).toBe('glm-4-plus');
  });

  it('should have correct metadata for MiniMax', () => {
    const metadata = PROVIDER_METADATA[ProviderType.MINIMAX];

    expect(metadata.type).toBe(ProviderType.MINIMAX);
    expect(metadata.name).toBe('MiniMax');
    expect(metadata.baseURL).toBe('https://api.minimax.chat/v1');
    expect(metadata.defaultModel).toBe('abab6.5s-chat');
  });

  it('should have correct metadata for Qwen', () => {
    const metadata = PROVIDER_METADATA[ProviderType.QWEN];

    expect(metadata.type).toBe(ProviderType.QWEN);
    expect(metadata.name).toBe('Qwen (Alibaba)');
    expect(metadata.baseURL).toBe('https://dashscope.aliyuncs.com/compatible-mode/v1');
    expect(metadata.defaultModel).toBe('qwen-plus');
  });
});

describe('getProviderMetadata', () => {
  it('should return correct metadata for each provider type', () => {
    const openaiMetadata = getProviderMetadata(ProviderType.OPENAI);
    expect(openaiMetadata.type).toBe(ProviderType.OPENAI);

    const kimiMetadata = getProviderMetadata(ProviderType.KIMI);
    expect(kimiMetadata.type).toBe(ProviderType.KIMI);
  });
});

describe('getProviderTypes', () => {
  it('should return all provider types', () => {
    const types = getProviderTypes();

    expect(types).toHaveLength(6);
    expect(types).toContain(ProviderType.OPENAI);
    expect(types).toContain(ProviderType.KIMI);
    expect(types).toContain(ProviderType.DEEPSEEK);
    expect(types).toContain(ProviderType.GLM);
    expect(types).toContain(ProviderType.MINIMAX);
    expect(types).toContain(ProviderType.QWEN);
  });
});

describe('Type narrowing with discriminated unions', () => {
  it('should narrow type based on type field', () => {
    const configs: ProviderConfig[] = [
      { type: ProviderType.OPENAI, apiKey: 'sk-1', organization: 'org-1' },
      { type: ProviderType.MINIMAX, apiKey: 'sk-2', groupId: 'group-1' },
    ];

    configs.forEach((config) => {
      if (config.type === ProviderType.OPENAI) {
        // TypeScript knows this is OpenAIConfig
        expect(config.organization).toBeDefined();
      } else if (config.type === ProviderType.MINIMAX) {
        // TypeScript knows this is MiniMaxConfig
        expect(config.groupId).toBeDefined();
      }
    });
  });
});
