/**
 * DeepSeek Provider Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DeepSeekProvider } from './deepseek.provider.js';
import { BaseProviderConfig, Message } from '../../base.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('DeepSeekProvider', () => {
  let provider: DeepSeekProvider;
  const config: BaseProviderConfig = {
    apiKey: 'sk-deepseek-test',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clean environment variables
    delete process.env.AI_MODEL;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.OPENAI_API_KEY; // Also clean this
    provider = new DeepSeekProvider(config);
  });

  afterEach(() => {
    // Clean environment variables
    delete process.env.AI_MODEL;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  describe('constructor', () => {
    it('should initialize with DeepSeek defaults', () => {
      expect(provider.baseURL).toBe('https://api.deepseek.com');
      expect(provider.model).toBe('deepseek-chat');
      expect(provider.maxTokens).toBe(128000);
      expect(provider.maxOutputTokens).toBe(8192);
    });

    it('should use custom config values', () => {
      const p = new DeepSeekProvider({
        apiKey: 'sk-test',
        baseURL: 'https://custom.deepseek.com',
        model: 'deepseek-coder',
      });

      expect(p.baseURL).toBe('https://custom.deepseek.com');
      expect(p.model).toBe('deepseek-coder');
    });

    it('should initialize adapter and HTTP client', () => {
      expect(provider.adapter).toBeDefined();
      expect(provider.httpClient).toBeDefined();
    });
  });

  describe('generate', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hello DeepSeek' },
    ];

    it('should make successful API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: { role: 'assistant', content: 'Hello from DeepSeek!' },
            finish_reason: 'stop',
          }],
          usage: { prompt_tokens: 5, completion_tokens: 4, total_tokens: 9 },
        }),
      });

      const result = await provider.generate(messages);

      expect(result?.content).toBe('Hello from DeepSeek!');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should use correct endpoint URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      });

      await provider.generate(messages);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe('https://api.deepseek.com/v1/chat/completions');
    });

    it('should use DeepSeek authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      });

      await provider.generate(messages);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers.get('Authorization')).toBe('Bearer sk-deepseek-test');
    });

    it('should handle streaming responses', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"id":"1","choices":[{"index":0,"delta":{"content":"DeepSeek"}}]}\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const result = await provider.generate(messages, { stream: true });

      expect(result?.content).toBe('DeepSeek');
    });

    it('should handle tool calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              role: 'assistant',
              content: 'Using tool',
              tool_calls: [{
                id: 'call_123',
                type: 'function' as const,
                function: { name: 'bash', arguments: '{"command":"ls"}' },
              }],
            },
            finish_reason: 'tool_calls',
          }],
          usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
        }),
      });

      const result = await provider.generate(messages);

      expect(result?.tool_calls).toHaveLength(1);
      expect(result?.tool_calls?.[0].function.name).toBe('bash');
    });

    it('should use custom model from options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      });

      await provider.generate(messages, { model: 'deepseek-coder' });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.model).toBe('deepseek-coder');
    });

    it('should support DeepSeek coder model', () => {
      const p = new DeepSeekProvider({
        apiKey: 'sk-test',
        model: 'deepseek-coder',
      });

      expect(p.model).toBe('deepseek-coder');
    });
  });

  describe('properties', () => {
    it('should expose model property', () => {
      expect(provider.model).toBe('deepseek-chat');
    });

    it('should expose maxTokens property', () => {
      expect(provider.maxTokens).toBe(128000);
    });

    it('should expose maxOutputTokens property', () => {
      expect(provider.maxOutputTokens).toBe(8192);
    });
  });

  describe('large context handling', () => {
    it('should support large context window', () => {
      expect(provider.maxTokens).toBe(128000);
    });

    it('should handle long messages', async () => {
      const longContent = 'a'.repeat(10000);
      const messages: Message[] = [
        { role: 'user', content: longContent },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10000, completion_tokens: 5, total_tokens: 10005 },
        }),
      });

      const result = await provider.generate(messages);

      expect(result).toBeDefined();
      expect(result?.usage.prompt_tokens).toBe(10000);
    });
  });

  describe('adapter integration', () => {
    it('should use OpenAIAdapter for standard transformations', async () => {
      // Clean environment variables before this specific test
      delete process.env.AI_MODEL;
      delete process.env.OPENAI_API_KEY;
      delete process.env.DEEPSEEK_API_KEY;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'Response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      });

      // Create fresh provider instance for this test
      const testProvider = new DeepSeekProvider({ apiKey: 'sk-deepseek-test' });
      await testProvider.generate([{ role: 'user', content: 'Hi' }]);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.model).toBe('deepseek-chat');
    });
  });
});
