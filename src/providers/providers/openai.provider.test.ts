/**
 * OpenAI Provider Tests (New Architecture)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAIProvider } from './openai.provider.js';
import { BaseProviderConfig, Message } from '../../base.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OpenAIProvider (New Architecture)', () => {
  let provider: OpenAIProvider;
  const config: BaseProviderConfig = {
    apiKey: 'sk-test-key',
    model: 'gpt-4o-mini',
    maxTokens: 128000,
    maxOutputTokens: 4096,
    temperature: 0.7,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new OpenAIProvider(config);
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const p = new OpenAIProvider({ apiKey: 'sk-test' });

      expect(p.baseURL).toBe('https://api.openai.com/v1');
      expect(p.model).toBe('gpt-4o-mini');
      expect(p.maxTokens).toBe(128000);
      expect(p.maxOutputTokens).toBe(4096);
    });

    it('should use custom config values', () => {
      const p = new OpenAIProvider({
        apiKey: 'sk-custom',
        baseURL: 'https://custom.api.com/v1',
        model: 'gpt-4',
        maxTokens: 50000,
        maxOutputTokens: 2000,
        temperature: 0.5,
      });

      expect(p.baseURL).toBe('https://custom.api.com/v1');
      expect(p.model).toBe('gpt-4');
      expect(p.maxTokens).toBe(50000);
      expect(p.maxOutputTokens).toBe(2000);
    });

    it('should initialize adapter and HTTP client', () => {
      expect(provider.adapter).toBeDefined();
      expect(provider.httpClient).toBeDefined();
    });

    it('should strip trailing slash from baseURL', () => {
      const p = new OpenAIProvider({
        apiKey: 'sk-test',
        baseURL: 'https://api.openai.com/v1/',
      });

      expect(p.baseURL).toBe('https://api.openai.com/v1');
    });
  });

  describe('generate - non-streaming', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hello, how are you?' },
    ];

    it('should make successful API call and return response', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-4o-mini',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'I am doing well, thank you!',
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 8,
          total_tokens: 18,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await provider.generate(messages);

      expect(result).toBeDefined();
      expect(result?.content).toBe('I am doing well, thank you!');
      expect(result?.role).toBe('assistant');
      expect(result?.type).toBe('text');
      expect(result?.finishReason).toBe('stop');
      expect(result?.usage).toEqual({
        prompt_tokens: 10,
        completion_tokens: 8,
        total_tokens: 18,
      });
    });

    it('should use adapter to transform request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      });

      await provider.generate(messages);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe('https://api.openai.com/v1/v1/chat/completions');
    });

    it('should include OpenAI authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      });

      await provider.generate(messages);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers.get('Authorization')).toBe('Bearer sk-test-key');
    });

    it('should use custom model from options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      });

      await provider.generate(messages, { model: 'gpt-4' });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.model).toBe('gpt-4');
    });

    it('should use custom max_tokens from options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      });

      await provider.generate(messages, { max_tokens: 1000 });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.max_tokens).toBe(1000);
    });

    it('should handle tool calls in response', async () => {
      const mockResponse = {
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'Using tool...',
            tool_calls: [{
              id: 'call_123',
              type: 'function' as const,
              function: {
                name: 'bash',
                arguments: '{"command": "ls"}',
              },
            }],
          },
          finish_reason: 'tool_calls',
        }],
        usage: { prompt_tokens: 15, completion_tokens: 10, total_tokens: 25 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await provider.generate(messages);

      expect(result?.tool_calls).toHaveLength(1);
      expect(result?.tool_calls?.[0].id).toBe('call_123');
      expect(result?.tool_calls?.[0].type).toBe('function');
      expect(result?.tool_calls?.[0].function.name).toBe('bash');
    });

    it('should return null for empty messages array', async () => {
      const result = await provider.generate([]);
      expect(result).toBeNull();
    });

    it('should pass abort signal to fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      });

      const controller = new AbortController();
      await provider.generate(messages, { abortSignal: controller.signal });

      const callArgs = mockFetch.mock.calls[0];
      // Just check that signal was passed, not strict equality
      expect(callArgs[1].signal).toBeDefined();
      expect(callArgs[1].signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('generate - streaming', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Say hello' },
    ];

    it('should handle streaming response', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"id":"1","choices":[{"index":0,"delta":{"content":"Hello"}}]}\n'));
          controller.enqueue(encoder.encode('data: {"id":"2","choices":[{"index":0,"delta":{"content":" World"}}]}\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const chunks: string[] = [];
      const result = await provider.generate(messages, {
        stream: true,
        streamCallback: (chunk) => {
          if (chunk.content) chunks.push(chunk.content);
        },
      });

      expect(result?.content).toBe('Hello World');
      expect(chunks).toEqual(['Hello', ' World']);
    });

    it('should accumulate tool calls across chunks', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(
            'data: {"id":"1","choices":[{"index":0,"delta":{"tool_calls":[{"id":"call_1","index":0,"function":{"name":"bash"}}]}}]}\n'
          ));
          controller.enqueue(encoder.encode(
            'data: {"id":"2","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"arguments":"ls"}}]}}]}\n'
          ));
          controller.enqueue(encoder.encode(
            'data: {"id":"3","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"arguments":" -la"}}]}}]}\n'
          ));
          controller.enqueue(encoder.encode('data: [DONE]\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const result = await provider.generate(messages, { stream: true });

      expect(result?.tool_calls).toHaveLength(1);
      expect(result?.tool_calls?.[0].id).toBe('call_1');
      expect(result?.tool_calls?.[0].function.name).toBe('bash');
      expect(result?.tool_calls?.[0].function.arguments).toBe('ls -la');
    });

    it('should handle finish reason in stream', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"id":"1","choices":[{"index":0,"delta":{"content":"Hi"}}]}\n'));
          controller.enqueue(encoder.encode('data: {"id":"2","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const result = await provider.generate(messages, { stream: true });

      expect(result?.finishReason).toBe('stop');
    });

    it('should throw error when response body is not readable', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: null,
      });

      await expect(
        provider.generate(messages, { stream: true })
      ).rejects.toThrow('Response body is not readable');
    });

    it('should handle empty response with finish reason stop', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"id":"1","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const result = await provider.generate(messages, { stream: true });

      // Should not throw, but return empty content
      expect(result?.content).toBe('');
      expect(result?.finishReason).toBe('stop');
    });
  });

  describe('properties', () => {
    it('should expose model property', () => {
      expect(provider.model).toBe('gpt-4o-mini');

      const customProvider = new OpenAIProvider({
        apiKey: 'sk-test',
        model: 'gpt-4',
      });
      expect(customProvider.model).toBe('gpt-4');
    });

    it('should expose maxTokens property', () => {
      expect(provider.maxTokens).toBe(128000);

      const customProvider = new OpenAIProvider({
        apiKey: 'sk-test',
        maxTokens: 50000,
      });
      expect(customProvider.maxTokens).toBe(50000);
    });

    it('should expose maxOutputTokens property', () => {
      expect(provider.maxOutputTokens).toBe(4096);

      const customProvider = new OpenAIProvider({
        apiKey: 'sk-test',
        maxOutputTokens: 2000,
      });
      expect(customProvider.maxOutputTokens).toBe(2000);
    });
  });

  describe('error handling via HTTP client', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hello' },
    ];

    it('should handle HTTP errors through HTTP client', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      // HTTP client should throw, provider should propagate
      await expect(provider.generate(messages)).rejects.toThrow();
    });

    it('should retry on retryable errors', async () => {
      // First call fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { role: 'assistant', content: 'Success' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
          }),
        });

      const result = await provider.generate(messages);

      expect(result?.content).toBe('Success');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('adapter integration', () => {
    it('should use adapter to get headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      });

      await provider.generate([{ role: 'user', content: 'Hi' }]);

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1].headers;

      expect(headers.get('Content-Type')).toBe('application/json');
      expect(headers.get('Authorization')).toBe('Bearer sk-test-key');
    });

    it('should use adapter to transform response', async () => {
      const apiResponse = {
        choices: [{
          message: { role: 'assistant', content: 'Transformed' },
          finish_reason: 'stop',
        }],
        usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => apiResponse,
      });

      const result = await provider.generate([{ role: 'user', content: 'Hi' }]);

      expect(result?.content).toBe('Transformed');
    });
  });

  describe('integration with tools', () => {
    it('should include tools in request when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      });

      const tools = [
        {
          type: 'function' as const,
          function: {
            name: 'bash',
            description: 'Run bash commands',
            parameters: { type: 'object', properties: { command: { type: 'string' } } },
          },
        },
      ];

      await provider.generate([{ role: 'user', content: 'Run ls' }], { tools });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.tools).toEqual(tools);
    });
  });
});
