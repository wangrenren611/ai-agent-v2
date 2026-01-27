/**
 * Provider Registry Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
// Import from index to trigger auto-registration
import { ProviderRegistry, ProviderType, BaseProviderConfig, PROVIDER_METADATA } from './index';

describe('ProviderRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clear all environment variables
    delete process.env.OPENAI_API_KEY;
    delete process.env.KIMI_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.GLM_API_KEY;
    delete process.env.MINIMAX_API_KEY;
    delete process.env.MINIMAX_GROUP_ID;
    delete process.env.QWEN_API_KEY;
    delete process.env.AI_MODEL;
  });

  describe('register and listProviders', () => {
    it('should have all providers auto-registered from index.ts', () => {
      const providers = ProviderRegistry.listProviders();

      expect(providers.length).toBeGreaterThanOrEqual(6);
      expect(providers).toContain(ProviderType.OPENAI);
      expect(providers).toContain(ProviderType.KIMI);
      expect(providers).toContain(ProviderType.DEEPSEEK);
      expect(providers).toContain(ProviderType.GLM);
      expect(providers).toContain(ProviderType.MINIMAX);
      expect(providers).toContain(ProviderType.QWEN);
    });

    it('should check if providers are registered', () => {
      expect(ProviderRegistry.isRegistered(ProviderType.OPENAI)).toBe(true);
      expect(ProviderRegistry.isRegistered(ProviderType.KIMI)).toBe(true);
      expect(ProviderRegistry.isRegistered(ProviderType.DEEPSEEK)).toBe(true);
      expect(ProviderRegistry.isRegistered(ProviderType.GLM)).toBe(true);
      expect(ProviderRegistry.isRegistered(ProviderType.MINIMAX)).toBe(true);
      expect(ProviderRegistry.isRegistered(ProviderType.QWEN)).toBe(true);
    });
  });

  describe('getMetadata', () => {
    it('should return metadata for provider type', () => {
      const metadata = ProviderRegistry.getMetadata(ProviderType.OPENAI);
      expect(metadata).toEqual(PROVIDER_METADATA[ProviderType.OPENAI]);
    });

    it('should return metadata for all provider types', () => {
      const openai = ProviderRegistry.getMetadata(ProviderType.OPENAI);
      const kimi = ProviderRegistry.getMetadata(ProviderType.KIMI);
      const deepseek = ProviderRegistry.getMetadata(ProviderType.DEEPSEEK);
      const glm = ProviderRegistry.getMetadata(ProviderType.GLM);
      const minimax = ProviderRegistry.getMetadata(ProviderType.MINIMAX);
      const qwen = ProviderRegistry.getMetadata(ProviderType.QWEN);

      expect(openai.type).toBe(ProviderType.OPENAI);
      expect(kimi.type).toBe(ProviderType.KIMI);
      expect(deepseek.type).toBe(ProviderType.DEEPSEEK);
      expect(glm.type).toBe(ProviderType.GLM);
      expect(minimax.type).toBe(ProviderType.MINIMAX);
      expect(qwen.type).toBe(ProviderType.QWEN);
    });
  });

  describe('create', () => {
    it('should create provider from config', () => {
      const provider = ProviderRegistry.create({
        type: ProviderType.OPENAI,
        apiKey: 'sk-test',
      });

      expect(provider).toBeDefined();
      expect(provider.config.apiKey).toBe('sk-test');
    });

    it('should merge config with metadata defaults', () => {
      const provider = ProviderRegistry.create({
        type: ProviderType.OPENAI,
        apiKey: 'sk-test',
        model: 'custom-model',
        temperature: 0.5,
      });

      expect(provider.config.model).toBe('custom-model');
      expect(provider.config.temperature).toBe(0.5);
      expect(provider.config.baseURL).toBe(PROVIDER_METADATA[ProviderType.OPENAI].baseURL);
    });

    it('should respect custom baseURL', () => {
      const customURL = 'https://custom.api.com/v1';
      const provider = ProviderRegistry.create({
        type: ProviderType.OPENAI,
        apiKey: 'sk-test',
        baseURL: customURL,
      });

      expect(provider.config.baseURL).toBe(customURL);
    });

    it('should throw error for unknown provider type', () => {
      expect(() => {
        ProviderRegistry.create({
          type: 'unknown' as ProviderType,
          apiKey: 'sk-test',
        });
      }).toThrow();
    });
  });

  describe('createFromEnv', () => {
    it('should create provider from explicit type', () => {
      process.env.OPENAI_API_KEY = 'sk-openai-test';

      const provider = ProviderRegistry.createFromEnv(ProviderType.OPENAI);

      expect(provider).toBeDefined();
      expect(provider.config.apiKey).toBe('sk-openai-test');
    });

    it('should auto-detect from AI_MODEL environment variable', () => {
      process.env.AI_MODEL = 'kimi-k2.5';
      process.env.KIMI_API_KEY = 'sk-kimi-test';

      const provider = ProviderRegistry.createFromEnv();

      expect(provider).toBeDefined();
      expect(provider.config.apiKey).toBe('sk-kimi-test');
    });

    it('should detect provider from model name patterns', () => {
      process.env.AI_MODEL = 'deepseek-chat';
      process.env.DEEPSEEK_API_KEY = 'sk-deepseek-test';

      const provider = ProviderRegistry.createFromEnv();

      expect(provider).toBeDefined();
      expect(provider.config.apiKey).toBe('sk-deepseek-test');
    });

    it('should fall back to checking API keys in priority order', () => {
      process.env.DEEPSEEK_API_KEY = 'sk-deepseek-test';

      const provider = ProviderRegistry.createFromEnv();

      expect(provider).toBeDefined();
      expect(provider.config.apiKey).toBe('sk-deepseek-test');
    });

    it('should use custom baseURL from environment', () => {
      process.env.DEEPSEEK_API_KEY = 'sk-test';
      process.env.DEEPSEEK_BASE_URL = 'https://custom.deepseek.com';

      const provider = ProviderRegistry.createFromEnv(ProviderType.DEEPSEEK);

      expect(provider.config.baseURL).toBe('https://custom.deepseek.com');
    });

    it('should use model from AI_MODEL environment variable', () => {
      process.env.DEEPSEEK_API_KEY = 'sk-test';
      process.env.AI_MODEL = 'deepseek-coder';

      const provider = ProviderRegistry.createFromEnv(ProviderType.DEEPSEEK);

      expect(provider.config.model).toBe('deepseek-coder');
    });

    it('should throw error when no credentials found', () => {
      expect(() => {
        ProviderRegistry.createFromEnv();
      }).toThrow();
    });

    it('should handle MiniMax with groupId', () => {
      process.env.MINIMAX_API_KEY = 'sk-minimax-test';
      process.env.MINIMAX_GROUP_ID = 'group-123';

      const provider = ProviderRegistry.createFromEnv(ProviderType.MINIMAX);

      expect(provider.config.apiKey).toBe('sk-minimax-test');
      expect((provider.config as any).groupId).toBe('group-123');
    });
  });

  describe('auto-detection patterns', () => {
    it('should detect Kimi from model name', () => {
      process.env.AI_MODEL = 'kimi-k2.5';
      process.env.KIMI_API_KEY = 'sk-test';

      const provider = ProviderRegistry.createFromEnv();
      expect(provider).toBeDefined();

      delete process.env.AI_MODEL;
      delete process.env.KIMI_API_KEY;
    });

    it('should detect DeepSeek from model name', () => {
      process.env.AI_MODEL = 'deepseek-chat';
      process.env.DEEPSEEK_API_KEY = 'sk-test';

      const provider = ProviderRegistry.createFromEnv();
      expect(provider).toBeDefined();

      delete process.env.AI_MODEL;
      delete process.env.DEEPSEEK_API_KEY;
    });

    it('should detect GLM from model name', () => {
      process.env.AI_MODEL = 'glm-4-plus';
      process.env.GLM_API_KEY = 'sk-test';

      const provider = ProviderRegistry.createFromEnv();
      expect(provider).toBeDefined();

      delete process.env.AI_MODEL;
      delete process.env.GLM_API_KEY;
    });

    it('should detect MiniMax from model name', () => {
      process.env.AI_MODEL = 'abab6.5s-chat';
      process.env.MINIMAX_API_KEY = 'sk-test';

      const provider = ProviderRegistry.createFromEnv();
      expect(provider).toBeDefined();

      delete process.env.AI_MODEL;
      delete process.env.MINIMAX_API_KEY;
    });

    it('should detect Qwen from model name', () => {
      process.env.AI_MODEL = 'qwen-plus';
      process.env.QWEN_API_KEY = 'sk-test';

      const provider = ProviderRegistry.createFromEnv();
      expect(provider).toBeDefined();

      delete process.env.AI_MODEL;
      delete process.env.QWEN_API_KEY;
    });

    it('should detect OpenAI from model name', () => {
      process.env.AI_MODEL = 'gpt-4o';
      process.env.OPENAI_API_KEY = 'sk-test';

      const provider = ProviderRegistry.createFromEnv();
      expect(provider).toBeDefined();

      delete process.env.AI_MODEL;
      delete process.env.OPENAI_API_KEY;
    });
  });
});
