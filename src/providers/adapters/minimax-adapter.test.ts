/**
 * MiniMax Adapter Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MiniMaxAdapter } from './minimax-adapter.js';
import { Message, LLMOptions } from '../base.js';
import { DEFAULT_TEMPERATURE } from '../../../agent/types.js';

describe('MiniMaxAdapter', () => {
  let adapter: MiniMaxAdapter;

  beforeEach(() => {
    adapter = new MiniMaxAdapter();
  });

  describe('constructor', () => {
    it('should initialize without groupId', () => {
      expect(adapter.groupId).toBeUndefined();
    });

    it('should store groupId when provided', () => {
      const adapterWithGroup = new MiniMaxAdapter({
        groupId: 'group-123',
      });
      expect(adapterWithGroup.groupId).toBe('group-123');
    });
  });

  describe('getEndpointPath', () => {
    it('should return MiniMax-specific endpoint', () => {
      expect(adapter.getEndpointPath()).toBe('/v1/text/chatcompletion_v2');
    });
  });

  describe('getHeaders', () => {
    it('should create standard headers without groupId', () => {
      const headers = adapter.getHeaders('sk-test-key');

      expect(headers.get('Content-Type')).toBe('application/json');
      expect(headers.get('Authorization')).toBe('Bearer sk-test-key');
    });

    it('should create headers with groupId in auth format', () => {
      const adapterWithGroup = new MiniMaxAdapter({
        groupId: 'group-123',
      });

      const headers = adapterWithGroup.getHeaders('sk-test-key');

      expect(headers.get('Authorization')).toBe('Bearer group-123.sk-test-key');
    });

    it('should use groupId from config parameter', () => {
      const headers = adapter.getHeaders('sk-test-key', {
        groupId: 'group-456',
      });

      expect(headers.get('Authorization')).toBe('Bearer group-456.sk-test-key');
    });

    it('should prioritize constructor groupId over config', () => {
      const adapterWithGroup = new MiniMaxAdapter({
        groupId: 'group-123',
      });

      const headers = adapterWithGroup.getHeaders('sk-test-key', {
        groupId: 'group-456',
      });

      // Config parameter should take precedence
      expect(headers.get('Authorization')).toBe('Bearer group-456.sk-test-key');
    });
  });

  describe('transformRequest', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hello' },
    ];

    it('should use MiniMax default model', () => {
      const result = adapter.transformRequest(messages);

      expect(result.model).toBe('abab6.5s-chat');
    });

    it('should use custom model from options', () => {
      const options: LLMOptions = { model: 'abab6.5s-chat' };
      const result = adapter.transformRequest(messages, options);

      expect(result.model).toBe('abab6.5s-chat');
    });

    it('should handle temperature', () => {
      const result = adapter.transformRequest(messages);

      expect(result.temperature).toBe(DEFAULT_TEMPERATURE);
    });

    it('should include tools when provided', () => {
      const tools = [
        {
          type: 'function' as const,
          function: {
            name: 'search',
            description: 'Search web',
            parameters: { type: 'object' },
          },
        },
      ];

      const options: LLMOptions = { tools };
      const result = adapter.transformRequest(messages, options);

      expect(result.tools).toEqual(tools);
    });

    it('should filter empty content messages', () => {
      const messagesWithEmpty: Message[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: '' },
        { role: 'user', content: 'Continue' },
      ];

      const result = adapter.transformRequest(messagesWithEmpty);

      expect(result.messages).toHaveLength(2);
    });
  });

  describe('transformResponse', () => {
    it('should handle standard OpenAI-compatible format', () => {
      const response = {
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello from MiniMax!',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          total_tokens: 100,
        },
      };

      const result = adapter.transformResponse(response);

      expect(result.content).toBe('Hello from MiniMax!');
      expect(result.finish_reason).toBe('stop');
      expect(result.usage.total_tokens).toBe(100);
    });

    it('should handle tool calls in standard format', () => {
      const response = {
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Using tool',
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function' as const,
                  function: {
                    name: 'search',
                    arguments: '{"query": "test"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
        usage: {
          total_tokens: 50,
        },
      };

      const result = adapter.transformResponse(response);

      expect(result.content).toBe('Using tool');
      expect(result.tool_calls).toHaveLength(1);
      expect(result.tool_calls?.[0].type).toBe('function');
    });

    it('should handle alternative MiniMax format with messages array', () => {
      const alternativeResponse = {
        messages: [
          { sender_type: 'USER', text: 'Hello' },
          { sender_type: 'BOT', text: 'Hi there!' },
          { sender_type: 'assistant', text: 'Response' },
        ],
        usage: {
          total_tokens: 30,
        },
      };

      const result = adapter.transformResponse(alternativeResponse);

      expect(result.content).toBe('Response');
      expect(result.usage.total_tokens).toBe(30);
    });

    it('should handle alternative format with BOT sender_type', () => {
      const botResponse = {
        messages: [
          { sender_type: 'USER', text: 'Hello' },
          { sender_type: 'BOT', text: 'Bot response' },
        ],
        usage: {
          total_tokens: 20,
        },
      };

      const result = adapter.transformResponse(botResponse);

      expect(result.content).toBe('Bot response');
    });

    it('should handle reply field when choices missing', () => {
      const replyResponse = {
        reply: 'Direct reply from MiniMax',
        usage: {
          total_tokens: 15,
        },
      };

      const result = adapter.transformResponse(replyResponse);

      expect(result.content).toBe('Direct reply from MiniMax');
      expect(result.usage.total_tokens).toBe(15);
    });

    it('should throw error when no valid response format', () => {
      const invalidResponse = {
        invalid: 'data',
      };

      expect(() => {
        adapter.transformResponse(invalidResponse);
      }).toThrow('Empty choices in response');
    });

    it('should handle missing usage in alternative format', () => {
      const responseWithoutUsage = {
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello',
            },
            finish_reason: 'stop',
          },
        ],
      };

      const result = adapter.transformResponse(responseWithoutUsage);

      expect(result.usage.total_tokens).toBe(0);
    });
  });

  describe('response format variations', () => {
    it('should prioritize choices format over alternatives', () => {
      const responseWithBoth = {
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'From choices',
            },
            finish_reason: 'stop',
          },
        ],
        messages: [
          { sender_type: 'BOT', text: 'From messages' },
        ],
        reply: 'From reply',
        usage: { total_tokens: 10 },
      };

      const result = adapter.transformResponse(responseWithBoth);

      // Should use choices format (standard OpenAI)
      expect(result.content).toBe('From choices');
    });

    it('should handle tool_calls with correct type', () => {
      const response = {
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Using tools',
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function' as const,
                  function: {
                    name: 'tool1',
                    arguments: '{}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
        usage: { total_tokens: 25 },
      };

      const result = adapter.transformResponse(response);

      expect(result.tool_calls?.[0].type).toBe('function');
    });
  });
});
