/**
 * Provider Architecture Edge Cases and Error Handling Tests
 *
 * Tests for edge cases, error scenarios, and boundary conditions
 * across the entire provider architecture.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
// Import from index to trigger auto-registration
import { ProviderRegistry, ProviderType, Message } from './index';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Provider Architecture - Edge Cases', () => {
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

  describe('Configuration edge cases', () => {
    it('should handle empty API key gracefully', () => {
      expect(() => {
        ProviderRegistry.create({
          type: ProviderType.OPENAI,
          apiKey: '',
        });
      }).not.toThrow();
    });

    it('should handle undefined optional parameters', () => {
      const provider = ProviderRegistry.create({
        type: ProviderType.OPENAI,
        apiKey: 'sk-test',
        // All other params undefined
      });

      expect(provider).toBeDefined();
      expect(provider.config.apiKey).toBe('sk-test');
    });

    it('should handle zero values for numeric parameters', () => {
      const provider = ProviderRegistry.create({
        type: ProviderType.OPENAI,
        apiKey: 'sk-test',
        temperature: 0,
        maxTokens: 0,
      });

      expect(provider.config.temperature).toBe(0);
    });

    it('should handle very large token limits', () => {
      const provider = ProviderRegistry.create({
        type: ProviderType.KIMI,
        apiKey: 'sk-test',
        maxTokens: 1000000,
        maxOutputTokens: 100000,
      });

      expect(provider.config.maxTokens).toBe(1000000);
    });
  });

  describe('Message handling edge cases', () => {
    it('should handle empty message array', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const provider = ProviderRegistry.createFromEnv();

      const result = await provider.generate([]);

      expect(result).toBeNull();

      delete process.env.OPENAI_API_KEY;
    });

    it('should handle very long message content', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const provider = ProviderRegistry.createFromEnv();

      const longContent = 'a'.repeat(100000);
      const messages: Message[] = [
        { role: 'user', content: longContent },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 100000, completion_tokens: 2, total_tokens: 100002 },
        }),
      });

      const result = await provider.generate(messages);

      expect(result).toBeDefined();

      delete process.env.OPENAI_API_KEY;
    });

    it('should handle messages with special characters', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const provider = ProviderRegistry.createFromEnv();

      const specialContent = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
      const messages: Message[] = [
        { role: 'user', content: specialContent },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
        }),
      });

      const result = await provider.generate(messages);

      expect(result).toBeDefined();

      delete process.env.OPENAI_API_KEY;
    });

    it('should handle unicode and emoji content', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const provider = ProviderRegistry.createFromEnv();

      const unicodeContent = 'Hello 世界 🌍🚀';
      const messages: Message[] = [
        { role: 'user', content: unicodeContent },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
        }),
      });

      const result = await provider.generate(messages);

      expect(result).toBeDefined();

      delete process.env.OPENAI_API_KEY;
    });

    it('should handle messages with tool_call_id but no tool_calls', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const provider = ProviderRegistry.createFromEnv();

      const messages: Message[] = [
        { role: 'user', content: 'Run command' },
        {
          role: 'tool',
          content: 'Command output',
          tool_call_id: 'call_123',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'Done' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 15, completion_tokens: 2, total_tokens: 17 },
        }),
      });

      const result = await provider.generate(messages);

      expect(result).toBeDefined();

      delete process.env.OPENAI_API_KEY;
    });

    it('should handle assistant messages with tool_calls', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const provider = ProviderRegistry.createFromEnv();

      const messages: Message[] = [
        { role: 'user', content: 'Run command' },
        {
          role: 'assistant',
          content: 'Running...',
          tool_calls: [
            {
              id: 'call_123',
              type: 'function',
              function: { name: 'bash', arguments: 'ls' },
            },
          ],
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'Done' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 20, completion_tokens: 2, total_tokens: 22 },
        }),
      });

      const result = await provider.generate(messages);

      expect(result).toBeDefined();

      delete process.env.OPENAI_API_KEY;
    });
  });

  describe('Streaming edge cases', () => {
    it('should handle empty stream', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const provider = ProviderRegistry.createFromEnv();

      const stream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const result = await provider.generate([{ role: 'user', content: 'Hi' }], {
        stream: true,
      });

      // Should handle gracefully
      expect(result).toBeDefined();

      delete process.env.OPENAI_API_KEY;
    });

    it('should handle stream with only [DONE]', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const provider = ProviderRegistry.createFromEnv();

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: [DONE]\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const result = await provider.generate([{ role: 'user', content: 'Hi' }], {
        stream: true,
      });

      expect(result?.content).toBe('');

      delete process.env.OPENAI_API_KEY;
    });

    it('should handle stream with malformed JSON chunks', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const provider = ProviderRegistry.createFromEnv();

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: invalid json\n'));
          controller.enqueue(encoder.encode('data: {"id":"1","choices":[{"index":0,"delta":{"content":"Valid"}}]}\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const result = await provider.generate([{ role: 'user', content: 'Hi' }], {
        stream: true,
      });

      // Should skip invalid chunks and process valid ones
      expect(result?.content).toBe('Valid');

      delete process.env.OPENAI_API_KEY;
    });

    it('should handle split SSE data chunks', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const provider = ProviderRegistry.createFromEnv();

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Split "data: " and JSON across chunks
          controller.enqueue(encoder.encode('data: '));
          controller.enqueue(encoder.encode('{"id":"1","choices":[{"index":0,"delta":{"content":"Hi"}}]}\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const result = await provider.generate([{ role: 'user', content: 'Hello' }], {
        stream: true,
      });

      expect(result?.content).toBe('Hi');

      delete process.env.OPENAI_API_KEY;
    });
  });

  describe('Response parsing edge cases', () => {
    it('should handle response with null content', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const provider = ProviderRegistry.createFromEnv();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: { role: 'assistant', content: null },
            finish_reason: 'stop',
          }],
          usage: { prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 },
        }),
      });

      const result = await provider.generate([{ role: 'user', content: 'Hi' }]);

      expect(result?.content).toBe('');

      delete process.env.OPENAI_API_KEY;
    });

    it('should handle response with empty choices array', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const provider = ProviderRegistry.createFromEnv();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [],
        }),
      });

      await expect(
        provider.generate([{ role: 'user', content: 'Hi' }])
      ).rejects.toThrow('Empty choices in response');

      delete process.env.OPENAI_API_KEY;
    });

    it('should handle response with missing usage', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const provider = ProviderRegistry.createFromEnv();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: { role: 'assistant', content: 'OK' },
            finish_reason: 'stop',
          }],
        }),
      });

      const result = await provider.generate([{ role: 'user', content: 'Hi' }]);

      expect(result?.usage).toEqual({
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      });

      delete process.env.OPENAI_API_KEY;
    });

    it('should handle response with missing finish_reason', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const provider = ProviderRegistry.createFromEnv();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: { role: 'assistant', content: 'OK' },
          }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      });

      const result = await provider.generate([{ role: 'user', content: 'Hi' }]);

      expect(result?.finishReason).toBeUndefined();

      delete process.env.OPENAI_API_KEY;
    });
  });

  describe('Network and retry edge cases', () => {
    it('should handle immediate retry success', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const provider = ProviderRegistry.createFromEnv();

      mockFetch
        .mockRejectedValueOnce(new Error('Connection reset'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { role: 'assistant', content: 'Success' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
          }),
        });

      const result = await provider.generate([{ role: 'user', content: 'Hi' }]);

      expect(result?.content).toBe('Success');
      expect(mockFetch).toHaveBeenCalledTimes(2);

      delete process.env.OPENAI_API_KEY;
    });

    it('should give up after max retries', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const provider = ProviderRegistry.createFromEnv();

      mockFetch.mockRejectedValue(new Error('Persistent error'));

      await expect(
        provider.generate([{ role: 'user', content: 'Hi' }])
      ).rejects.toThrow();

      // Initial attempt + 3 retries = 4 total calls
      expect(mockFetch).toHaveBeenCalledTimes(4);

      delete process.env.OPENAI_API_KEY;
    });

    it('should handle mixed success and failure', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const provider = ProviderRegistry.createFromEnv();

      const messages: Message[] = [
        { role: 'user', content: 'First' },
        { role: 'user', content: 'Second' },
      ];

      // First request fails, second succeeds, third fails, fourth succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { role: 'assistant', content: 'Response 1' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
          }),
        })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { role: 'assistant', content: 'Response 2' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
          }),
        });

      const result1 = await provider.generate([messages[0]]);
      const result2 = await provider.generate([messages[1]]);

      expect(result1?.content).toBe('Response 1');
      expect(result2?.content).toBe('Response 2');

      delete process.env.OPENAI_API_KEY;
    });
  });

  describe('Provider switching edge cases', () => {
    it('should handle rapid provider switching', async () => {
      const providers = [
        { type: ProviderType.OPENAI, env: 'OPENAI_API_KEY' },
        { type: ProviderType.KIMI, env: 'KIMI_API_KEY' },
        { type: ProviderType.DEEPSEEK, env: 'DEEPSEEK_API_KEY' },
      ];

      for (const { type, env } of providers) {
        process.env[env] = `sk-${type.toLowerCase()}`;

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { role: 'assistant', content: `Response from ${type}` }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
          }),
        });

        const provider = ProviderRegistry.createFromEnv(type);
        const result = await provider.generate([{ role: 'user', content: 'Hi' }]);

        expect(result?.content).toBe(`Response from ${type}`);

        delete process.env[env];
        mockFetch.mockReset();
      }
    });

    it('should handle configuration changes between requests', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const provider = ProviderRegistry.createFromEnv();

      // First request with default config
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      });

      await provider.generate([{ role: 'user', content: 'Hi' }]);

      // Second request with different options
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      });

      await provider.generate([{ role: 'user', content: 'Hi' }], {
        model: 'gpt-4',
        temperature: 0.3,
        max_tokens: 1000,
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);

      delete process.env.OPENAI_API_KEY;
    });
  });

  describe('Concurrent request handling', () => {
    it('should handle multiple concurrent requests', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const provider = ProviderRegistry.createFromEnv();

      // Setup mock to respond to all requests
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      });

      const requests = Array.from({ length: 5 }, (_, i) =>
        provider.generate([{ role: 'user', content: `Request ${i}` }])
      );

      const results = await Promise.all(requests);

      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result?.content).toBe('Response');
      });

      expect(mockFetch).toHaveBeenCalledTimes(5);

      delete process.env.OPENAI_API_KEY;
    });
  });
});
