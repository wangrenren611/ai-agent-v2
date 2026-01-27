/**
 * Provider Integration Tests
 *
 * Tests for the complete provider architecture including:
 * - ProviderRegistry auto-detection and factory
 * - Cross-provider compatibility
 * - End-to-end scenarios
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
// Import from index to trigger auto-registration
import { ProviderRegistry, ProviderType, BaseProviderConfig, Message } from './index.js';

// Mock fetch for all tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Provider Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ProviderRegistry integration', () => {
    it('should auto-register all providers on import', () => {
      // All providers should be available after importing the index
      expect(ProviderRegistry.listProviders()).toContain(ProviderType.OPENAI);
      expect(ProviderRegistry.listProviders()).toContain(ProviderType.KIMI);
      expect(ProviderRegistry.listProviders()).toContain(ProviderType.DEEPSEEK);
      expect(ProviderRegistry.listProviders()).toContain(ProviderType.GLM);
      expect(ProviderRegistry.listProviders()).toContain(ProviderType.MINIMAX);
      expect(ProviderRegistry.listProviders()).toContain(ProviderType.QWEN);
    });

    it('should create provider from config with correct defaults', () => {
      const openaiProvider = ProviderRegistry.create({
        type: ProviderType.OPENAI,
        apiKey: 'sk-test',
      });

      const kimiProvider = ProviderRegistry.create({
        type: ProviderType.KIMI,
        apiKey: 'sk-test',
      });

      const deepseekProvider = ProviderRegistry.create({
        type: ProviderType.DEEPSEEK,
        apiKey: 'sk-test',
      });

      // Each provider should have its own defaults
      expect(openaiProvider.model).toBe('gpt-4o-mini');
      expect(kimiProvider.model).toBe('kimi-k2.5');
      expect(deepseekProvider.model).toBe('deepseek-chat');
    });

    it('should respect custom baseURL in config', () => {
      const provider = ProviderRegistry.create({
        type: ProviderType.OPENAI,
        apiKey: 'sk-test',
        baseURL: 'https://custom.openai.com/v1',
      });

      expect(provider.config.baseURL).toBe('https://custom.openai.com/v1');
    });

    it('should auto-detect provider from AI_MODEL environment variable', () => {
      process.env.AI_MODEL = 'kimi-k2.5';
      process.env.KIMI_API_KEY = 'sk-kimi-test';

      const provider = ProviderRegistry.createFromEnv();

      expect(provider.config.apiKey).toBe('sk-kimi-test');
      expect(provider.config.model).toBe('kimi-k2.5');
    });

    it('should detect provider from model name patterns', () => {
      const testCases = [
        { model: 'deepseek-chat', envKey: 'DEEPSEEK_API_KEY', expectedModel: 'deepseek-chat' },
        { model: 'glm-4-plus', envKey: 'GLM_API_KEY', expectedModel: 'glm-4-plus' },
        { model: 'abab6.5s-chat', envKey: 'MINIMAX_API_KEY', expectedModel: 'abab6.5s-chat' },
        { model: 'qwen-plus', envKey: 'QWEN_API_KEY', expectedModel: 'qwen-plus' },
      ];

      testCases.forEach(({ model, envKey, expectedModel }) => {
        process.env.AI_MODEL = model;
        process.env[envKey] = 'sk-test';

        const provider = ProviderRegistry.createFromEnv();

        expect(provider.config.model).toBe(expectedModel);

        delete process.env.AI_MODEL;
        delete process.env[envKey];
      });
    });
  });

  describe('Cross-provider compatibility', () => {
    it('should handle same message format across all providers', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' },
      ];

      // Test that all providers can handle the same message format
      const providers = [
        ProviderType.OPENAI,
        ProviderType.KIMI,
        ProviderType.DEEPSEEK,
        ProviderType.GLM,
        ProviderType.QWEN,
      ];

      for (const providerType of providers) {
        const envKey = `${providerType.toUpperCase()}_API_KEY`;
        process.env[envKey] = 'sk-test';

        const provider = ProviderRegistry.createFromEnv(providerType);

        // Mock successful response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: { role: 'assistant', content: 'Response' },
              finish_reason: 'stop',
            }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
        });

        const result = await provider.generate(messages);

        expect(result).toBeDefined();
        expect(result?.content).toBe('Response');

        delete process.env[envKey];
        mockFetch.mockReset();
      }
    });

    it('should handle tool calls across providers', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Run command' },
      ];

      const tools = [
        {
          type: 'function' as const,
          function: {
            name: 'bash',
            description: 'Run bash commands',
            parameters: { type: 'object' },
          },
        },
      ];

      // Test providers that support tools
      const providers = [ProviderType.OPENAI, ProviderType.KIMI, ProviderType.DEEPSEEK];

      for (const providerType of providers) {
        const envKey = `${providerType.toUpperCase()}_API_KEY`;
        process.env[envKey] = 'sk-test';

        const provider = ProviderRegistry.createFromEnv(providerType);

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                role: 'assistant',
                content: 'Running command',
                tool_calls: [{
                  id: 'call_123',
                  type: 'function' as const,
                  function: { name: 'bash', arguments: '{}' },
                }],
              },
              finish_reason: 'tool_calls',
            }],
            usage: { prompt_tokens: 15, completion_tokens: 10, total_tokens: 25 },
          }),
        });

        const result = await provider.generate(messages, { tools });

        expect(result?.tool_calls).toBeDefined();
        expect(result?.tool_calls).toHaveLength(1);
        expect(result?.tool_calls?.[0].type).toBe('function');

        delete process.env[envKey];
        mockFetch.mockReset();
      }
    });

    it('should handle streaming across providers', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Say hello' }];

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"id":"1","choices":[{"index":0,"delta":{"content":"Hello"}}]}\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n'));
          controller.close();
        },
      });

      const providers = [ProviderType.OPENAI, ProviderType.KIMI, ProviderType.DEEPSEEK];

      for (const providerType of providers) {
        const envKey = `${providerType.toUpperCase()}_API_KEY`;
        process.env[envKey] = 'sk-test';

        const provider = ProviderRegistry.createFromEnv(providerType);

        mockFetch.mockResolvedValueOnce({
          ok: true,
          body: stream,
        });

        const result = await provider.generate(messages, { stream: true });

        expect(result?.content).toBe('Hello');

        delete process.env[envKey];
        mockFetch.mockReset();
      }
    });
  });

  describe('Provider-specific configurations', () => {
    it('should handle GLM custom endpoint path', () => {
      process.env.GLM_API_KEY = 'sk-test';
      const provider = ProviderRegistry.createFromEnv(ProviderType.GLM);

      expect(provider.config.baseURL).toBe('https://open.bigmodel.cn/api/paas/v4');

      delete process.env.GLM_API_KEY;
    });

    it('should handle MiniMax groupId in auth', () => {
      process.env.MINIMAX_API_KEY = 'sk-test';
      process.env.MINIMAX_GROUP_ID = 'group-123';

      const provider = ProviderRegistry.createFromEnv(ProviderType.MINIMAX);

      expect((provider.config as any).groupId).toBe('group-123');

      delete process.env.MINIMAX_API_KEY;
      delete process.env.MINIMAX_GROUP_ID;
    });
  });

  describe('Error handling consistency', () => {
    it('should handle API errors consistently across providers', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];

      const providers = [ProviderType.OPENAI, ProviderType.KIMI, ProviderType.DEEPSEEK];

      for (const providerType of providers) {
        const envKey = `${providerType.toUpperCase()}_API_KEY`;
        process.env[envKey] = 'sk-test';

        const provider = ProviderRegistry.createFromEnv(providerType);

        // Mock 401 error
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => 'Unauthorized',
        });

        await expect(provider.generate(messages)).rejects.toThrow();

        delete process.env[envKey];
        mockFetch.mockReset();
      }
    });

    it('should retry on transient errors across providers', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];

      const providers = [ProviderType.OPENAI, ProviderType.KIMI];

      for (const providerType of providers) {
        const envKey = `${providerType.toUpperCase()}_API_KEY`;
        process.env[envKey] = 'sk-test';

        const provider = ProviderRegistry.createFromEnv(providerType);

        // First call fails, second succeeds
        mockFetch
          .mockRejectedValueOnce(new Error('ECONNRESET'))
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              choices: [{
                message: { role: 'assistant', content: 'Success' },
                finish_reason: 'stop',
              }],
              usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
            }),
          });

        const result = await provider.generate(messages);

        expect(result?.content).toBe('Success');

        delete process.env[envKey];
        mockFetch.mockReset();
      }
    });
  });

  describe('Metadata consistency', () => {
    it('should have consistent metadata structure across providers', () => {
      const providers = [
        ProviderType.OPENAI,
        ProviderType.KIMI,
        ProviderType.DEEPSEEK,
        ProviderType.GLM,
        ProviderType.MINIMAX,
        ProviderType.QWEN,
      ];

      providers.forEach((type) => {
        const metadata = ProviderRegistry.getMetadata(type);

        expect(metadata.type).toBe(type);
        expect(metadata.name).toBeDefined();
        expect(metadata.baseURL).toBeDefined();
        expect(metadata.defaultModel).toBeDefined();
        expect(metadata.maxTokens).toBeGreaterThan(0);
        expect(metadata.maxOutputTokens).toBeGreaterThan(0);
        expect(metadata.supportsStreaming).toBe(true);
        expect(metadata.supportsTools).toBe(true);
        expect(metadata.defaultTimeout).toBeGreaterThan(0);
        expect(metadata.defaultMaxRetries).toBeGreaterThan(0);
      });
    });

    it('should have unique base URLs for each provider', () => {
      const providers = [
        ProviderType.OPENAI,
        ProviderType.KIMI,
        ProviderType.DEEPSEEK,
        ProviderType.GLM,
        ProviderType.MINIMAX,
        ProviderType.QWEN,
      ];

      const baseUrls = providers.map((type) =>
        ProviderRegistry.getMetadata(type).baseURL
      );

      const uniqueUrls = new Set(baseUrls);
      expect(uniqueUrls.size).toBe(baseUrls.length);
    });

    it('should have unique default models for each provider', () => {
      const providers = [
        ProviderType.OPENAI,
        ProviderType.KIMI,
        ProviderType.DEEPSEEK,
        ProviderType.GLM,
        ProviderType.MINIMAX,
        ProviderType.QWEN,
      ];

      const models = providers.map((type) =>
        ProviderRegistry.getMetadata(type).defaultModel
      );

      const uniqueModels = new Set(models);
      expect(uniqueModels.size).toBe(models.length);
    });
  });

  describe('End-to-end scenarios', () => {
    it('should switch between providers seamlessly', async () => {
      const messages: Message[] = [{ role: 'user', content: 'Hello' }];

      // Start with OpenAI
      process.env.OPENAI_API_KEY = 'sk-openai';
      let provider = ProviderRegistry.createFromEnv();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OpenAI response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        }),
      });

      let result = await provider.generate(messages);
      expect(result?.content).toBe('OpenAI response');

      delete process.env.OPENAI_API_KEY;
      mockFetch.mockReset();

      // Switch to Kimi
      process.env.KIMI_API_KEY = 'sk-kimi';
      provider = ProviderRegistry.createFromEnv();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'Kimi response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        }),
      });

      result = await provider.generate(messages);
      expect(result?.content).toBe('Kimi response');

      delete process.env.KIMI_API_KEY;
    });

    it('should handle provider-specific options', async () => {
      process.env.DEEPSEEK_API_KEY = 'sk-deepseek';
      const provider = ProviderRegistry.createFromEnv();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      });

      await provider.generate([{ role: 'user', content: 'Hi' }], {
        model: 'deepseek-coder',
        temperature: 0.3,
        max_tokens: 2000,
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.model).toBe('deepseek-coder');
      expect(body.temperature).toBe(0.3);
      expect(body.max_tokens).toBe(2000);

      delete process.env.DEEPSEEK_API_KEY;
    });
  });
});
