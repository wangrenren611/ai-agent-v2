/**
 * Qwen Provider Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QwenProvider } from './qwen.provider.js';
import { BaseProviderConfig, Message } from '../../base.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('QwenProvider', () => {
  let provider: QwenProvider;
  const config: BaseProviderConfig = {
    apiKey: 'sk-qwen-test',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new QwenProvider(config);
  });

  describe('constructor', () => {
    it('should initialize with Qwen defaults', () => {
      expect(provider.baseURL).toBe('https://dashscope.aliyuncs.com/compatible-mode/v1');
      expect(provider.model).toBe('qwen-plus');
      expect(provider.maxTokens).toBe(128000);
      expect(provider.maxOutputTokens).toBe(8192);
    });

    it('should use custom config values', () => {
      const p = new QwenProvider({
        apiKey: 'sk-test',
        baseURL: 'https://custom.qwen.com/v1',
        model: 'qwen-max',
      });

      expect(p.baseURL).toBe('https://custom.qwen.com/v1');
      expect(p.model).toBe('qwen-max');
    });

    it('should initialize adapter and HTTP client', () => {
      expect(provider.adapter).toBeDefined();
      expect(provider.httpClient).toBeDefined();
    });
  });

  describe('generate', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hello Qwen' },
    ];

    it('should make successful API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: { role: 'assistant', content: 'Hello from Qwen!' },
            finish_reason: 'stop',
          }],
          usage: { prompt_tokens: 5, completion_tokens: 4, total_tokens: 9 },
        }),
      });

      const result = await provider.generate(messages);

      expect(result?.content).toBe('Hello from Qwen!');
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
      expect(callArgs[0]).toBe('https://dashscope.aliyuncs.com/compatible-mode/v1/v1/chat/completions');
    });

    it('should use Qwen authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      });

      await provider.generate(messages);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers.get('Authorization')).toBe('Bearer sk-qwen-test');
    });

    it('should handle streaming responses', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"id":"1","choices":[{"index":0,"delta":{"content":"Qwen"}}]}\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const result = await provider.generate(messages, { stream: true });

      expect(result?.content).toBe('Qwen');
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
                function: { name: 'calculator', arguments: '{"expression":"1+1"}' },
              }],
            },
            finish_reason: 'tool_calls',
          }],
          usage: { prompt_tokens: 12, completion_tokens: 10, total_tokens: 22 },
        }),
      });

      const result = await provider.generate(messages);

      expect(result?.tool_calls).toHaveLength(1);
      expect(result?.tool_calls?.[0].function.name).toBe('calculator');
    });

    it('should use custom model from options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      });

      await provider.generate(messages, { model: 'qwen-max' });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.model).toBe('qwen-max');
    });

    it('should support qwen-plus model', () => {
      const p = new QwenProvider({
        apiKey: 'sk-test',
        model: 'qwen-plus',
      });

      expect(p.model).toBe('qwen-plus');
    });

    it('should support qwen-max model', () => {
      const p = new QwenProvider({
        apiKey: 'sk-test',
        model: 'qwen-max',
      });

      expect(p.model).toBe('qwen-max');
    });
  });

  describe('properties', () => {
    it('should expose model property', () => {
      expect(provider.model).toBe('qwen-plus');
    });

    it('should expose maxTokens property', () => {
      expect(provider.maxTokens).toBe(128000);
    });

    it('should expose maxOutputTokens property', () => {
      expect(provider.maxOutputTokens).toBe(8192);
    });
  });

  describe('Dashscope specific features', () => {
    it('should handle Dashscope API format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              role: 'assistant',
              content: 'Response from Alibaba Cloud',
            },
            finish_reason: 'stop',
          }],
          usage: { prompt_tokens: 8, completion_tokens: 6, total_tokens: 14 },
        }),
      });

      const result = await provider.generate([{ role: 'user', content: 'Hi' }]);

      expect(result?.content).toBe('Response from Alibaba Cloud');
    });

    it('should support compatible-mode endpoint', () => {
      expect(provider.baseURL).toBe('https://dashscope.aliyuncs.com/compatible-mode/v1');
    });
  });

  describe('Alibaba Cloud integration', () => {
    it('should work with Alibaba Dashscope API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      });

      await provider.generate([{ role: 'user', content: 'Test' }]);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toContain('dashscope.aliyuncs.com');
    });
  });
});
