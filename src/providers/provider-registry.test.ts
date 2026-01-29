import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ProviderRegistry, ProviderType, PROVIDER_METADATA } from './provider-registry';

describe('ProviderRegistry', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createFromEnv', () => {
    it('should create GLM provider from environment', () => {
      process.env.GLM_API_KEY = 'test-key';
      const provider = ProviderRegistry.createFromEnv(ProviderType.GLM);
      expect(provider).toBeDefined();
      expect(provider.config.model).toBe('glm-4.7');
    });

    it('should auto-detect provider when type not specified', () => {
      process.env.DEEPSEEK_API_KEY = 'test-key';
      const provider = ProviderRegistry.createFromEnv();
      expect(provider).toBeDefined();
    });

    it('should throw error when no API key found', () => {
      delete process.env.GLM_API_KEY;
      delete process.env.DEEPSEEK_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.KIMI_API_KEY;
      delete process.env.MINIMAX_API_KEY;
      delete process.env.QWEN_API_KEY;
      expect(() => ProviderRegistry.createFromEnv()).toThrow();
    });

    it('should respect detection priority order', () => {
      process.env.OPENAI_API_KEY = 'openai-key';
      process.env.DEEPSEEK_API_KEY = 'deepseek-key';
      const provider = ProviderRegistry.createFromEnv();
      // Should detect OpenAI first due to priority
      expect(provider.config.model).toBe('gpt-4o');
    });

    it('should create provider with custom baseURL from env', () => {
      const customBaseURL = 'https://custom.example.com/v1';
      process.env.GLM_API_BASE = customBaseURL;
      process.env.GLM_API_KEY = 'test-key';
      const provider = ProviderRegistry.createFromEnv(ProviderType.GLM);
      expect(provider.config.baseURL).toBe(customBaseURL);
    });
  });

  describe('create', () => {
    it('should create OpenAI provider', () => {
      const provider = ProviderRegistry.create(ProviderType.OPENAI, {
        apiKey: 'test-key',
        baseURL: 'https://api.openai.com/v1',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 128000,
        maxOutputTokens: 8000,
      });
      expect(provider).toBeDefined();
      expect(provider.config.model).toBe('gpt-4o');
    });

    it('should create Kimi provider', () => {
      const provider = ProviderRegistry.create(ProviderType.KIMI, {
        apiKey: 'test-key',
        baseURL: 'https://api.kimi.ai/v1',
        model: 'kimi-3.5',
        temperature: 0.7,
        maxTokens: 2048000,
        maxOutputTokens: 8000,
      });
      expect(provider).toBeDefined();
      expect(provider.config.model).toBe('kimi-3.5');
    });

    it('should create DeepSeek provider', () => {
      const provider = ProviderRegistry.create(ProviderType.DEEPSEEK, {
        apiKey: 'test-key',
        baseURL: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
        temperature: 0.7,
        maxTokens: 64000,
        maxOutputTokens: 8000,
      });
      expect(provider).toBeDefined();
      expect(provider.config.model).toBe('deepseek-chat');
    });

    it('should create GLM provider', () => {
      const provider = ProviderRegistry.create(ProviderType.GLM, {
        apiKey: 'test-key',
        baseURL: 'https://open.bigmodel.cn/api/coding/paas/v4',
        model: 'glm-4.7',
        temperature: 0.7,
        maxTokens: 128000,
        maxOutputTokens: 8000,
      });
      expect(provider).toBeDefined();
      expect(provider.config.model).toBe('glm-4.7');
    });

    it('should create MiniMax provider with groupId', () => {
      process.env.MINIMAX_GROUP_ID = 'test-group-id';
      const provider = ProviderRegistry.create(ProviderType.MINIMAX, {
        apiKey: 'test-key',
        baseURL: 'https://api.minimaxi.com/v1',
        model: 'MiniMax-M2.1',
        temperature: 0.7,
        maxTokens: 200000,
        maxOutputTokens: 8000,
      });
      expect(provider).toBeDefined();
      expect(provider.config.model).toBe('MiniMax-M2.1');
    });

    it('should create Qwen provider', () => {
      const provider = ProviderRegistry.create(ProviderType.QWEN, {
        apiKey: 'test-key',
        baseURL: 'https://api.qwen.cn/v1',
        model: 'qwen-3.5',
        temperature: 0.7,
        maxTokens: 128000,
        maxOutputTokens: 8000,
      });
      expect(provider).toBeDefined();
      expect(provider.config.model).toBe('qwen-3.5');
    });

    it('should throw error for unknown provider type', () => {
      expect(() =>
        ProviderRegistry.create('unknown' as ProviderType, {
          apiKey: 'test-key',
          baseURL: 'https://api.example.com/v1',
          model: 'test-model',
          temperature: 0.7,
          maxTokens: 8000,
          maxOutputTokens: 8000,
        })
      ).toThrow('Unknown provider type');
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

    it('should have correct metadata for GLM', () => {
      const glm = PROVIDER_METADATA[ProviderType.GLM];
      expect(glm.name).toBe('GLM (智谱)');
      expect(glm.defaultModel).toBe('glm-4.7');
      expect(glm.baseURL).toBe('https://open.bigmodel.cn/api/coding/paas/v4');
      expect(glm.endpointPath).toBe('/chat/completions');
      expect(glm.envApiKey).toBe('GLM_API_KEY');
      expect(glm.envBaseURL).toBe('GLM_API_BASE');
      // Check models exist
      expect(glm.models['glm-4.7']).toBeDefined();
      expect(glm.models['glm-4.6']).toBeDefined();
      expect(glm.models['glm-vl']).toBeDefined();
      // Check default model config
      expect(glm.models['glm-4.7'].maxTokens).toBe(128000);
      expect(glm.models['glm-4.7'].features).toContain('streaming');
      expect(glm.models['glm-4.7'].features).toContain('function-calling');
      expect(glm.models['glm-4.7'].features).toContain('vision');
    });

    it('should have correct metadata for MiniMax', () => {
      const minimax = PROVIDER_METADATA[ProviderType.MINIMAX];
      expect(minimax.name).toBe('MiniMax');
      expect(minimax.defaultModel).toBe('MiniMax-M2.1');
      expect(minimax.baseURL).toBe('https://api.minimaxi.com/v1');
      expect(minimax.endpointPath).toBe('/v1/text/chatcompletion_v2');
      expect(minimax.envApiKey).toBe('MINIMAX_API_KEY');
      expect(minimax.envBaseURL).toBe('MINIMAX_API_BASE');
      expect(minimax.models['MiniMax-M2.1'].maxTokens).toBe(200000);
    });

    it('should have correct metadata for all provider types', () => {
      const metadata = [
        PROVIDER_METADATA[ProviderType.OPENAI],
        PROVIDER_METADATA[ProviderType.KIMI],
        PROVIDER_METADATA[ProviderType.DEEPSEEK],
        PROVIDER_METADATA[ProviderType.GLM],
        PROVIDER_METADATA[ProviderType.MINIMAX],
        PROVIDER_METADATA[ProviderType.QWEN],
      ];

      metadata.forEach(m => {
        expect(m).toHaveProperty('type');
        expect(m).toHaveProperty('name');
        expect(m).toHaveProperty('models');
        expect(m).toHaveProperty('defaultModel');
        expect(m).toHaveProperty('baseURL');
        expect(m).toHaveProperty('endpointPath');
        expect(m).toHaveProperty('envApiKey');
        expect(m).toHaveProperty('envBaseURL');
        // Check models is an object with at least one model
        expect(typeof m.models).toBe('object');
        expect(Object.keys(m.models).length).toBeGreaterThan(0);
      });
    });

    it('should list all models for a provider', () => {
      const glmModels = ProviderRegistry.listModels(ProviderType.GLM);
      expect(glmModels.length).toBe(5); // glm-4.7, glm-4.6, glm-vl, glm-4-flash, glm-4-air
      expect(glmModels.some(m => m.name === 'glm-4.7')).toBe(true);
      expect(glmModels.some(m => m.name === 'glm-vl')).toBe(true);
    });

    it('should get model config for a specific model', () => {
      const glm47Config = ProviderRegistry.getModelConfig(ProviderType.GLM, 'glm-4.7');
      expect(glm47Config).toBeDefined();
      expect(glm47Config?.name).toBe('glm-4.7');
      expect(glm47Config?.displayName).toBe('GLM-4.7');
      expect(glm47Config?.maxTokens).toBe(128000);
    });
  });

  describe('listProviders', () => {
    it('should return all provider metadata', () => {
      const providers = ProviderRegistry.listProviders();
      expect(providers).toHaveLength(6);
      expect(providers.every(p => p.name)).toBe(true);
    });
  });

  describe('getMetadata', () => {
    it('should return metadata for specified provider', () => {
      const metadata = ProviderRegistry.getMetadata(ProviderType.OPENAI);
      expect(metadata.type).toBe(ProviderType.OPENAI);
      expect(metadata.name).toBe('OpenAI');
    });
  });
});
