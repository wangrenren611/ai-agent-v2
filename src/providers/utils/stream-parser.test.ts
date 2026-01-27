/**
 * Stream Parser Tests
 */

import { describe, it, expect } from 'vitest';
import { StreamParser } from './stream-parser.js';

describe('StreamParser', () => {
  describe('parseSseLine', () => {
    it('should parse standard SSE data line', () => {
      const line = 'data: {"content": "hello"}';
      const result = StreamParser.parseSseLine(line);
      expect(result).toBe('{"content": "hello"}');
    });

    it('should return null for empty lines', () => {
      expect(StreamParser.parseSseLine('')).toBeNull();
      expect(StreamParser.parseSseLine('   ')).toBeNull();
    });

    it('should return null for comment lines', () => {
      expect(StreamParser.parseSseLine(': comment')).toBeNull();
      expect(StreamParser.parseSseLine(': this is a comment')).toBeNull();
    });

    it('should parse JSON lines without data prefix', () => {
      const line = '{"content": "hello"}';
      const result = StreamParser.parseSseLine(line);
      expect(result).toBe('{"content": "hello"}');
    });

    it('should trim whitespace from data lines', () => {
      const line = '  data: {"content": "hello"}  ';
      const result = StreamParser.parseSseLine(line);
      expect(result).toBe('{"content": "hello"}');
    });

    it('should return null for lines without data prefix or JSON', () => {
      expect(StreamParser.parseSseLine('event: message')).toBeNull();
      expect(StreamParser.parseSseLine('id: 123')).toBeNull();
      expect(StreamParser.parseSseLine('retry: 1000')).toBeNull();
    });
  });

  describe('isStreamEnd', () => {
    it('should detect [DONE] marker', () => {
      expect(StreamParser.isStreamEnd('[DONE]')).toBe(true);
    });

    it('should not detect other data as stream end', () => {
      expect(StreamParser.isStreamEnd('data: {"content": "hello"}')).toBe(false);
      expect(StreamParser.isStreamEnd('[DONE]')).toBe(true);
      expect(StreamParser.isStreamEnd('done')).toBe(false);
      expect(StreamParser.isStreamEnd('')).toBe(false);
    });

    it('should be case sensitive', () => {
      expect(StreamParser.isStreamEnd('[done]')).toBe(false);
      expect(StreamParser.isStreamEnd('[Done]')).toBe(false);
      expect(StreamParser.isStreamEnd('[DONE]')).toBe(true);
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const data = '{"content": "hello", "index": 0}';
      const result = StreamParser.safeJsonParse<{ content: string; index: number }>(data);
      expect(result).toEqual({ content: 'hello', index: 0 });
    });

    it('should return null for invalid JSON', () => {
      expect(StreamParser.safeJsonParse('not json')).toBeNull();
      expect(StreamParser.safeJsonParse('{broken json')).toBeNull();
      expect(StreamParser.safeJsonParse('')).toBeNull();
    });

    it('should handle JSON arrays', () => {
      const data = '[1, 2, 3]';
      const result = StreamParser.safeJsonParse<number[]>(data);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should handle nested JSON', () => {
      const data = '{"choices": [{"delta": {"content": "hello"}}]}';
      const result = StreamParser.safeJsonParse<{ choices: Array<{ delta: { content: string } }> }>(data);
      expect(result?.choices[0].delta.content).toBe('hello');
    });
  });

  describe('parse', () => {
    it('should parse streaming SSE content', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"id":"1","choices":[{"index":0,"delta":{"content":"Hello"}}]}\n'));
          controller.enqueue(encoder.encode('data: {"id":"2","choices":[{"index":0,"delta":{"content":" World"}}]}\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n'));
          controller.close();
        },
      });

      const chunks: string[] = [];
      const callbacks = {
        onContent: (content: string) => chunks.push(content),
        onToolCall: vi.fn(),
        onFinish: vi.fn(),
      };

      await StreamParser.parse(stream.getReader(), callbacks);

      expect(chunks).toEqual(['Hello', ' World']);
    });

    it('should pass tool call deltas to callback', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // First chunk: tool call id and name
          controller.enqueue(encoder.encode(
            'data: {"choices":[{"index":0,"delta":{"tool_calls":[{"id":"call_123","index":0,"function":{"name":"bash"}}]}}]}\n'
          ));
          // Second chunk: function arguments part 1
          controller.enqueue(encoder.encode(
            'data: {"choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"arguments":"ls"}}]}}]}\n'
          ));
          // Third chunk: function arguments part 2
          controller.enqueue(encoder.encode(
            'data: {"choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"arguments":" -"}}]}}]}\n'
          ));
          controller.enqueue(encoder.encode('data: [DONE]\n'));
          controller.close();
        },
      });

      const toolCalls: Array<{ index: number; id?: string; function: { name?: string; arguments?: string } }> = [];
      const callbacks = {
        onContent: vi.fn(),
        onToolCall: (tc: typeof toolCalls[0]) => toolCalls.push(tc),
        onFinish: vi.fn(),
      };

      await StreamParser.parse(stream.getReader(), callbacks);

      expect(toolCalls).toHaveLength(3);

      // First chunk has name
      expect(toolCalls[0].id).toBe('call_123');
      expect(toolCalls[0].function.name).toBe('bash');
      expect(toolCalls[0].function.arguments).toBeUndefined();

      // Second chunk has first part of arguments
      expect(toolCalls[1].index).toBe(0);
      expect(toolCalls[1].function.arguments).toBe('ls');

      // Third chunk has second part of arguments
      expect(toolCalls[2].function.arguments).toBe(' -');
    });

    it('should handle finish reason', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"id":"1","choices":[{"index":0,"delta":{"content":"Hello"}}]}\n'));
          controller.enqueue(encoder.encode('data: {"id":"2","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n'));
          controller.close();
        },
      });

      let finishReason: string | undefined;
      const callbacks = {
        onContent: vi.fn(),
        onToolCall: vi.fn(),
        onFinish: (reason: string | undefined) => {
          finishReason = reason;
        },
      };

      await StreamParser.parse(stream.getReader(), callbacks);

      expect(finishReason).toBe('stop');
    });

    it('should handle multi-line SSE chunks', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Send multiple lines in one chunk
          controller.enqueue(
            encoder.encode(
              'data: {"id":"1","choices":[{"index":0,"delta":{"content":"A"}}]}\n' +
              'data: {"id":"2","choices":[{"index":0,"delta":{"content":"B"}}]}\n' +
              'data: {"id":"3","choices":[{"index":0,"delta":{"content":"C"}}]}\n'
            )
          );
          controller.enqueue(encoder.encode('data: [DONE]\n'));
          controller.close();
        },
      });

      const chunks: string[] = [];
      const callbacks = {
        onContent: (content: string) => chunks.push(content),
        onToolCall: vi.fn(),
        onFinish: vi.fn(),
      };

      await StreamParser.parse(stream.getReader(), callbacks);

      expect(chunks).toEqual(['A', 'B', 'C']);
    });

    it('should handle split lines across chunks', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Split a line across two chunks
          controller.enqueue(encoder.encode('data: {"id":"1","choices":[{"i'));
          controller.enqueue(encoder.encode('ndex":0,"delta":{"content":"Hello"}}]}\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n'));
          controller.close();
        },
      });

      const chunks: string[] = [];
      const callbacks = {
        onContent: (content: string) => chunks.push(content),
        onToolCall: vi.fn(),
        onFinish: vi.fn(),
      };

      await StreamParser.parse(stream.getReader(), callbacks);

      expect(chunks).toEqual(['Hello']);
    });

    it('should ignore invalid JSON chunks', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: invalid json\n'));
          controller.enqueue(encoder.encode('data: {"id":"1","choices":[{"index":0,"delta":{"content":"Hello"}}]}\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n'));
          controller.close();
        },
      });

      const chunks: string[] = [];
      const callbacks = {
        onContent: (content: string) => chunks.push(content),
        onToolCall: vi.fn(),
        onFinish: vi.fn(),
      };

      await StreamParser.parse(stream.getReader(), callbacks);

      // Only valid JSON should be processed
      expect(chunks).toEqual(['Hello']);
    });

    it('should handle empty content in delta', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"id":"1","choices":[{"index":0,"delta":{"role":"assistant"}}]}\n'));
          controller.enqueue(encoder.encode('data: {"id":"2","choices":[{"index":0,"delta":{"content":"Hello"}}]}\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n'));
          controller.close();
        },
      });

      const chunks: string[] = [];
      const callbacks = {
        onContent: (content: string) => chunks.push(content),
        onToolCall: vi.fn(),
        onFinish: vi.fn(),
      };

      await StreamParser.parse(stream.getReader(), callbacks);

      // Only chunks with content should trigger callback
      expect(chunks).toEqual(['Hello']);
    });

    it('should handle choice with message field (alternative format)', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"id":"1","choices":[{"index":0,"message":{"content":"Hello"}}]}\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n'));
          controller.close();
        },
      });

      const chunks: string[] = [];
      const callbacks = {
        onContent: (content: string) => chunks.push(content),
        onToolCall: vi.fn(),
        onFinish: vi.fn(),
      };

      await StreamParser.parse(stream.getReader(), callbacks);

      expect(chunks).toEqual(['Hello']);
    });

    it('should stop processing on [DONE]', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"id":"1","choices":[{"index":0,"delta":{"content":"Before"}}]}\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n'));
          controller.enqueue(encoder.encode('data: {"id":"2","choices":[{"index":0,"delta":{"content":"After"}}]}\n'));
          controller.close();
        },
      });

      const chunks: string[] = [];
      const callbacks = {
        onContent: (content: string) => chunks.push(content),
        onToolCall: vi.fn(),
        onFinish: vi.fn(),
      };

      await StreamParser.parse(stream.getReader(), callbacks);

      // Should only process content before [DONE]
      expect(chunks).toEqual(['Before']);
    });

    it('should handle multiple tool calls in same chunk', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Format with proper array structure
          controller.enqueue(encoder.encode(
            'data: {"choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"id":"call_1","type":"function","function":{"name":"bash","arguments":""}},{"index":1,"id":"call_2","type":"function","function":{"name":"grep","arguments":""}}]}}]}\n'
          ));
          controller.enqueue(encoder.encode('data: [DONE]\n'));
          controller.close();
        },
      });

      const toolCalls: Array<{ index: number; id?: string }> = [];
      const callbacks = {
        onContent: vi.fn(),
        onToolCall: (tc: typeof toolCalls[0]) => toolCalls.push(tc),
        onFinish: vi.fn(),
      };

      await StreamParser.parse(stream.getReader(), callbacks);

      expect(toolCalls).toHaveLength(2);
      expect(toolCalls[0].id).toBe('call_1');
      expect(toolCalls[0].index).toBe(0);
      expect(toolCalls[1].id).toBe('call_2');
      expect(toolCalls[1].index).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty stream', async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      const callbacks = {
        onContent: vi.fn(),
        onToolCall: vi.fn(),
        onFinish: vi.fn(),
      };

      await StreamParser.parse(stream.getReader(), callbacks);

      expect(callbacks.onContent).not.toHaveBeenCalled();
      expect(callbacks.onToolCall).not.toHaveBeenCalled();
      expect(callbacks.onFinish).not.toHaveBeenCalled();
    });

    it('should handle stream with only comments', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(': this is a comment\n'));
          controller.enqueue(encoder.encode(': another comment\n'));
          controller.close();
        },
      });

      const callbacks = {
        onContent: vi.fn(),
        onToolCall: vi.fn(),
        onFinish: vi.fn(),
      };

      await StreamParser.parse(stream.getReader(), callbacks);

      expect(callbacks.onContent).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only chunks', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('   \n'));
          controller.enqueue(encoder.encode('\t\n'));
          controller.enqueue(encoder.encode('data: {"id":"1","choices":[{"index":0,"delta":{"content":"Hello"}}]}\n'));
          controller.close();
        },
      });

      const chunks: string[] = [];
      const callbacks = {
        onContent: (content: string) => chunks.push(content),
        onToolCall: vi.fn(),
        onFinish: vi.fn(),
      };

      await StreamParser.parse(stream.getReader(), callbacks);

      expect(chunks).toEqual(['Hello']);
    });
  });
});
