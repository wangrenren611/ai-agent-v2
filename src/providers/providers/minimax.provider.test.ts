/**
 * MiniMax Provider Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MiniMaxProvider } from './minimax.provider';
import { BaseProviderConfig, Message } from '../../base';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('MiniMaxProvider', () => {
  let provider: MiniMaxProvider;
  const config: BaseProviderConfig & { groupId?: string } = {
    apiKey: 'sk-minimax-test',
    groupId: 'group-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new MiniMaxProvider(config);
  });

  describe('constructor', () => {
    it('should initialize with MiniMax defaults', () => {
      expect(provider.baseURL).toBe('https://api.minimax.chat/v1');
      expect(provider.model).toBe('abab6.5s-chat');
      expect(provider.maxTokens).toBe(24576);
      expect(provider.maxOutputTokens).toBe(4096);
    });

    it('should store groupId', () => {
      expect(provider.groupId).toBe('group-123');
    });

    it('should work without groupId', () => {
      const p = new MiniMaxProvider({ apiKey: 'sk-test' });
      expect(p.groupId).toBeUndefined();
    });

    it('should use custom config values', () => {
      const p = new MiniMaxProvider({
        apiKey: 'sk-test',
        baseURL: 'https://custom.minimax.com/v1',
        model: 'abab6.5s-chat',
        groupId: 'custom-group',
      });

      expect(p.baseURL).toBe('https://custom.minimax.com/v1');
      expect(p.groupId).toBe('custom-group');
    });

    it('should initialize adapter and HTTP client', () => {
      expect(provider.adapter).toBeDefined();
      expect(provider.httpClient).toBeDefined();
    });
  });

  describe('generate', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hello MiniMax' },
    ];

    it('should make successful API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: { role: 'assistant', content: 'Hello from MiniMax!' },
            finish_reason: 'stop',
          }],
          usage: { total_tokens: 10 },
        }),
      });

      const result = await provider.generate(messages);

      expect(result?.content).toBe('Hello from MiniMax!');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should use correct endpoint URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { total_tokens: 7 },
        }),
      });

      await provider.generate(messages);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe('https://api.minimax.chat/v1/v1/text/chatcompletion_v2');
    });

    it('should use MiniMax authorization format with groupId', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { total_tokens: 7 },
        }),
      });

      await provider.generate(messages);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers.get('Authorization')).toBe('Bearer group-123.sk-minimax-test');
    });

    it('should work without groupId in auth', async () => {
      const providerWithoutGroup = new MiniMaxProvider({ apiKey: 'sk-test' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { total_tokens: 7 },
        }),
      });

      await providerWithoutGroup.generate(messages);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers.get('Authorization')).toBe('Bearer sk-test');
    });

    it('should handle alternative MiniMax response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [
            { sender_type: 'USER', text: 'Hello' },
            { sender_type: 'assistant', text: 'Response from MiniMax' },
          ],
          usage: { total_tokens: 8 },
        }),
      });

      const result = await provider.generate(messages);

      expect(result?.content).toBe('Response from MiniMax');
    });

    it('should handle reply field in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          reply: 'Direct reply',
          usage: { total_tokens: 5 },
        }),
      });

      const result = await provider.generate(messages);

      expect(result?.content).toBe('Direct reply');
    });

    it('should handle streaming responses', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"id":"1","choices":[{"index":0,"delta":{"content":"MiniMax"}}]}\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const result = await provider.generate(messages, { stream: true });

      expect(result?.content).toBe('MiniMax');
    });

    it('should use custom model from options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { total_tokens: 7 },
        }),
      });

      await provider.generate(messages, { model: 'abab6.5s-chat' });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.model).toBe('abab6.5s-chat');
    });

    it('should pass groupId to adapter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { total_tokens: 7 },
        }),
      });

      await provider.generate(messages);

      const callArgs = mockFetch.mock.calls[0];
      // Verify that groupId was used in headers
      expect(callArgs[1].headers.get('Authorization')).toContain('group-123');
    });
  });

  describe('properties', () => {
    it('should expose model property', () => {
      expect(provider.model).toBe('abab6.5s-chat');
    });

    it('should expose maxTokens property', () => {
      expect(provider.maxTokens).toBe(24576);
    });

    it('should expose maxOutputTokens property', () => {
      expect(provider.maxOutputTokens).toBe(4096);
    });
  });

  describe('adapter integration', () => {
    it('should use MiniMaxAdapter for transformations', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'Transformed' }, finish_reason: 'stop' }],
          usage: { total_tokens: 10 },
        }),
      });

      await provider.generate([{ role: 'user', content: 'Hi' }]);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      // Should use MiniMax default model
      expect(body.model).toBe('abab6.5s-chat');
    });

    it('should handle MiniMax-specific response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [
            { sender_type: 'BOT', text: 'Bot response' },
          ],
          usage: { total_tokens: 5 },
        }),
      });

      const result = await provider.generate([{ role: 'user', content: 'Hi' }]);

      expect(result?.content).toBe('Bot response');
    });
  });
});
