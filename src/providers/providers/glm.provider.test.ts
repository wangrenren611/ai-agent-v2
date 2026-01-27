/**
 * GLM Provider Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GLMProvider } from './glm.provider.js';
import { BaseProviderConfig, Message } from '../../base.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GLMProvider', () => {
  let provider: GLMProvider;
  const config: BaseProviderConfig = {
    apiKey: 'sk-glm-test',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new GLMProvider(config);
  });

  describe('constructor', () => {
    it('should initialize with GLM defaults', () => {
      expect(provider.baseURL).toBe('https://open.bigmodel.cn/api/paas/v4');
      expect(provider.model).toBe('glm-4-plus');
      expect(provider.maxTokens).toBe(128000);
      expect(provider.maxOutputTokens).toBe(8192);
    });

    it('should use custom config values', () => {
      const p = new GLMProvider({
        apiKey: 'sk-test',
        baseURL: 'https://custom.glm.com/api/paas/v4',
        model: 'glm-4.7',
      });

      expect(p.baseURL).toBe('https://custom.glm.com/api/paas/v4');
      expect(p.model).toBe('glm-4.7');
    });

    it('should initialize adapter and HTTP client', () => {
      expect(provider.adapter).toBeDefined();
      expect(provider.httpClient).toBeDefined();
    });
  });

  describe('generate', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hello GLM' },
    ];

    it('should make successful API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: { role: 'assistant', content: 'Hello from GLM!' },
            finish_reason: 'stop',
          }],
          usage: { prompt_tokens: 5, completion_tokens: 4, total_tokens: 9 },
        }),
      });

      const result = await provider.generate(messages);

      expect(result?.content).toBe('Hello from GLM!');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should use GLM custom endpoint path', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      });

      await provider.generate(messages);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe('https://open.bigmodel.cn/api/paas/v4/api/paas/v4/chat/completions');
    });

    it('should use standard Bearer authentication', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      });

      await provider.generate(messages);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers.get('Authorization')).toBe('Bearer sk-glm-test');
    });

    it('should handle streaming responses', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"id":"1","choices":[{"index":0,"delta":{"content":"GLM"}}]}\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const result = await provider.generate(messages, { stream: true });

      expect(result?.content).toBe('GLM');
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
                function: { name: 'search', arguments: '{"query":"test"}' },
              }],
            },
            finish_reason: 'tool_calls',
          }],
          usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
        }),
      });

      const result = await provider.generate(messages);

      expect(result?.tool_calls).toHaveLength(1);
      expect(result?.tool_calls?.[0].function.name).toBe('search');
    });

    it('should use custom model from options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      });

      await provider.generate(messages, { model: 'glm-4.7' });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.model).toBe('glm-4.7');
    });

    it('should support glm-4-plus model', () => {
      const p = new GLMProvider({
        apiKey: 'sk-test',
        model: 'glm-4-plus',
      });

      expect(p.model).toBe('glm-4-plus');
    });

    it('should support glm-4.7 model', () => {
      const p = new GLMProvider({
        apiKey: 'sk-test',
        model: 'glm-4.7',
      });

      expect(p.model).toBe('glm-4.7');
    });
  });

  describe('properties', () => {
    it('should expose model property', () => {
      expect(provider.model).toBe('glm-4-plus');
    });

    it('should expose maxTokens property', () => {
      expect(provider.maxTokens).toBe(128000);
    });

    it('should expose maxOutputTokens property', () => {
      expect(provider.maxOutputTokens).toBe(8192);
    });
  });

  describe('custom endpoint handling', () => {
    it('should use custom endpoint path from adapter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      });

      await provider.generate([{ role: 'user', content: 'Hi' }]);

      const callArgs = mockFetch.mock.calls[0];
      // Verify the custom path is used
      expect(callArgs[0]).toContain('/api/paas/v4/chat/completions');
    });
  });

  describe('Zhipu AI specific features', () => {
    it('should handle Zhipu AI response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              role: 'assistant',
              content: 'Response from Zhipu AI',
            },
            finish_reason: 'stop',
          }],
          usage: { prompt_tokens: 8, completion_tokens: 6, total_tokens: 14 },
        }),
      });

      const result = await provider.generate([{ role: 'user', content: 'Hi' }]);

      expect(result?.content).toBe('Response from Zhipu AI');
    });
  });
});
