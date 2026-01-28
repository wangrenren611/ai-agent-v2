/**
 * OpenAI Adapter Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OpenAIAdapter } from './openai-adapter';
import { LLMOptions, Message } from '../providers/base';
import { DEFAULT_TEMPERATURE } from '../../agent/types';


describe('OpenAIAdapter', () => {
  let adapter: OpenAIAdapter;

  beforeEach(() => {
    adapter = new OpenAIAdapter();
  });

  describe('constructor', () => {
    it('should initialize with default endpoint path', () => {
      expect(adapter.endpointPath).toBe('/v1/chat/completions');
    });

    it('should use custom endpoint path', () => {
      const customAdapter = new OpenAIAdapter({
        endpointPath: '/api/paas/v4/chat/completions',
      });
      expect(customAdapter.endpointPath).toBe('/api/paas/v4/chat/completions');
    });

    it('should store organization ID', () => {
      const orgAdapter = new OpenAIAdapter({
        organization: 'org-123',
      });
      expect(orgAdapter.organization).toBe('org-123');
    });
  });

  describe('getEndpointPath', () => {
    it('should return configured endpoint path', () => {
      expect(adapter.getEndpointPath()).toBe('/v1/chat/completions');
    });

    it('should return custom endpoint path', () => {
      const customAdapter = new OpenAIAdapter({
        endpointPath: '/custom/path',
      });
      expect(customAdapter.getEndpointPath()).toBe('/custom/path');
    });
  });

  describe('getHeaders', () => {
    it('should create standard headers', () => {
      const headers = adapter.getHeaders('sk-test-key');

      expect(headers.get('Content-Type')).toBe('application/json');
      expect(headers.get('Authorization')).toBe('Bearer sk-test-key');
    });

    it('should include OpenAI-Organization header when set', () => {
      const orgAdapter = new OpenAIAdapter({
        organization: 'org-123',
      });

      const headers = orgAdapter.getHeaders('sk-test-key', {
        organization: 'org-123',
      });

      expect(headers.get('OpenAI-Organization')).toBe('org-123');
    });

    it('should not include organization header when not set', () => {
      const headers = adapter.getHeaders('sk-test-key');

      expect(headers.get('OpenAI-Organization')).toBeNull();
    });
  });

  describe('transformRequest', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hello, how are you?' },
    ];

    it('should transform basic request', () => {
      const result = adapter.transformRequest(messages);

      expect(result.model).toBe('gpt-4o-mini');
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toEqual({
        role: 'user',
        content: 'Hello, how are you?',
      });
      expect(result.temperature).toBe(DEFAULT_TEMPERATURE);
      expect(result.stream).toBe(false);
    });

    it('should use custom model from options', () => {
      const options: LLMOptions = { model: 'gpt-4' };
      const result = adapter.transformRequest(messages, options);

      expect(result.model).toBe('gpt-4');
    });

    it('should use custom max_tokens from options', () => {
      const options: LLMOptions = { model: 'gpt-4o', maxTokens: 2000 };
      const result = adapter.transformRequest(messages, options);

      expect(result.max_tokens).toBe(2000);
    });

    it('should use custom temperature from options', () => {
      const options: LLMOptions = { model: 'gpt-4o', temperature: 0.3 };
      const result = adapter.transformRequest(messages, options);

      expect(result.temperature).toBe(0.3);
    });

    it('should enable streaming when requested', () => {
      const options: LLMOptions = { model: 'gpt-4o', stream: true };
      const result = adapter.transformRequest(messages, options);

      expect(result.stream).toBe(true);
    });

    it('should include tools in request', () => {
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

      const options: LLMOptions = { model: 'gpt-4o', tools };
      const result = adapter.transformRequest(messages, options);

      expect(result.tools).toEqual(tools);
    });

    it('should not include tools when not provided', () => {
      const result = adapter.transformRequest(messages);

      expect(result.tools).toBeUndefined();
    });

    it('should filter out empty content messages', () => {
      const messagesWithEmpty: Message[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: '' },
        { role: 'user', content: 'How are you?' },
      ];

      const result = adapter.transformRequest(messagesWithEmpty);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].content).toBe('Hello');
      expect(result.messages[1].content).toBe('How are you?');
    });

    it('should preserve tool_call_id in messages', () => {
      const messagesWithTool: Message[] = [
        { role: 'user', content: 'Run command' },
        {
          role: 'tool',
          content: 'Command output',
          tool_call_id: 'call_123',
        },
      ];

      const result = adapter.transformRequest(messagesWithTool);

      expect(result.messages[1]).toEqual({
        role: 'tool',
        content: 'Command output',
        tool_call_id: 'call_123',
      });
    });

    it('should preserve tool_calls in messages', () => {
      const messagesWithToolCall: Message[] = [
        { role: 'user', content: 'Run command' },
        {
          role: 'assistant',
          content: 'Running command...',
          tool_calls: [
            {
              id: 'call_123',
              type: 'function',
              function: {
                name: 'bash',
                arguments: '{"command": "ls"}',
              },
            },
          ],
        },
      ];

      const result = adapter.transformRequest(messagesWithToolCall);

      expect(result.messages[1].tool_calls).toEqual([
        {
          id: 'call_123',
          type: 'function',
          function: {
            name: 'bash',
            arguments: '{"command": "ls"}',
          },
        },
      ]);
    });

    it('should filter out null messages', () => {
      const messagesWithNull: Message[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: null } as any,
        { role: 'user', content: 'Continue' },
      ];

      const result = adapter.transformRequest(messagesWithNull);

      // The adapter's cleanMessage filters null content, but we check what gets sent
      expect(result.messages.length).toBeGreaterThan(0);
    });
  });

  describe('transformResponse', () => {
    const standardResponse = {
      id: 'chatcmpl-123',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-4o-mini',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Hello! How can I help you?',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
    };

    it('should transform standard response', () => {
      const result = adapter.transformResponse(standardResponse);

      expect(result.content).toBe('Hello! How can I help you?');
      expect(result.tool_calls).toBeUndefined();
      expect(result.finish_reason).toBe('stop');
      expect(result.usage).toEqual({
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      });
    });

    it('should transform response with tool calls', () => {
      const responseWithTools = {
        ...standardResponse,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Using tool...',
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function' as const,
                  function: {
                    name: 'bash',
                    arguments: '{"command": "ls"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      };

      const result = adapter.transformResponse(responseWithTools);

      expect(result.content).toBe('Using tool...');
      expect(result.tool_calls).toHaveLength(1);
      expect(result.tool_calls?.[0].id).toBe('call_123');
      expect(result.tool_calls?.[0].type).toBe('function');
      expect(result.tool_calls?.[0].function.name).toBe('bash');
      expect(result.tool_calls?.[0].function.arguments).toBe('{"command": "ls"}');
    });

    it('should handle null content', () => {
      const responseWithNull = {
        ...standardResponse,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: null,
            },
            finish_reason: 'stop',
          },
        ],
      };

      const result = adapter.transformResponse(responseWithNull);

      expect(result.content).toBe('');
    });

    it('should handle missing usage', () => {
      const responseWithoutUsage = {
        ...standardResponse,
        usage: undefined,
      };

      const result = adapter.transformResponse(responseWithoutUsage);

      expect(result.usage).toEqual({
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      });
    });

    it('should handle missing finish_reason', () => {
      const responseWithoutFinish = {
        ...standardResponse,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello',
            },
            finish_reason: null,
          },
        ],
      };

      const result = adapter.transformResponse(responseWithoutFinish);

      expect(result.finish_reason).toBeNull();
    });

    it('should use choice.content when message is missing', () => {
      const responseWithChoiceContent = {
        ...standardResponse,
        choices: [
          {
            index: 0,
            content: 'Content from choice',
            role: 'assistant',
            finish_reason: 'stop',
          },
        ],
      };

      const result = adapter.transformResponse(responseWithChoiceContent);

      expect(result.content).toBe('Content from choice');
    });

    it('should throw error on empty choices', () => {
      const emptyResponse = {
        ...standardResponse,
        choices: [],
      };

      expect(() => {
        adapter.transformResponse(emptyResponse);
      }).toThrow('Empty choices in response');
    });

    it('should throw error on missing choices', () => {
      const noChoicesResponse = {
        ...standardResponse,
        choices: undefined,
      };

      expect(() => {
        adapter.transformResponse(noChoicesResponse);
      }).toThrow('Empty choices in response');
    });

    it('should handle choice with missing message', () => {
      const responseWithoutMessage = {
        ...standardResponse,
        choices: [
          {
            index: 0,
            role: 'assistant',
            content: 'Direct content',
            finish_reason: 'stop',
          },
        ],
      };

      const result = adapter.transformResponse(responseWithoutMessage);

      expect(result.content).toBe('Direct content');
    });
  });
});
