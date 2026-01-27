/**
 * Kimi Provider Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KimiProvider } from './kimi.provider.js';
import { BaseProviderConfig, Message } from '../../base.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('KimiProvider', () => {
  let provider: KimiProvider;
  const config: BaseProviderConfig = {
    apiKey: 'sk-kimi-test',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new KimiProvider(config);
  });

  describe('constructor', () => {
    it('should initialize with Kimi defaults', () => {
      expect(provider.baseURL).toBe('https://api.moonshot.cn/v1');
      expect(provider.model).toBe('kimi-k2.5');
      expect(provider.maxTokens).toBe(256000);
      expect(provider.maxOutputTokens).toBe(8000);
    });

    it('should use custom config values', () => {
      const p = new KimiProvider({
        apiKey: 'sk-test',
        baseURL: 'https://custom.kimi.com/v1',
        model: 'kimi-k2-0905-preview',
      });

      expect(p.baseURL).toBe('https://custom.kimi.com/v1');
      expect(p.model).toBe('kimi-k2-0905-preview');
    });

    it('should initialize adapter and HTTP client', () => {
      expect(provider.adapter).toBeDefined();
      expect(provider.httpClient).toBeDefined();
    });
  });

  describe('generate', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hello Kimi' },
    ];

    it('should make successful API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: { role: 'assistant', content: 'Hello from Kimi!' },
            finish_reason: 'stop',
          }],
          usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        }),
      });

      const result = await provider.generate(messages);

      expect(result?.content).toBe('Hello from Kimi!');
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
      expect(callArgs[0]).toBe('https://api.moonshot.cn/v1/v1/chat/completions');
    });

    it('should use Kimi authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      });

      await provider.generate(messages);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers.get('Authorization')).toBe('Bearer sk-kimi-test');
    });

    it('should handle streaming responses', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"id":"1","choices":[{"index":0,"delta":{"content":"Kimi"}}]}\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const result = await provider.generate(messages, { stream: true });

      expect(result?.content).toBe('Kimi');
    });

    it('should use custom model from options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      });

      await provider.generate(messages, { model: 'kimi-k2-0905-preview' });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.model).toBe('kimi-k2-0905-preview');
    });
  });

  describe('properties', () => {
    it('should expose model property', () => {
      expect(provider.model).toBe('kimi-k2.5');
    });

    it('should expose maxTokens property', () => {
      expect(provider.maxTokens).toBe(256000);
    });

    it('should expose maxOutputTokens property', () => {
      expect(provider.maxOutputTokens).toBe(8000);
    });
  });
});
