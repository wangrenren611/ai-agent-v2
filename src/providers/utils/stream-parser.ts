/**
 * Stream Parser Utility
 *
 * Handles SSE (Server-Sent Events) stream parsing for LLM streaming responses.
 * Extracted and generalized from openai.ts implementation.
 */

import { StreamChunk } from '../../providers/base';

export interface StreamCallbacks {
  /** Called when content chunk is received */
  onContent: (content: string) => void;
  /** Called when tool call delta is received */
  onToolCall: (toolCall: {
    index: number;
    id?: string;
    type?: string;
    function: {
      name?: string;
      arguments?: string;
    };
  }) => void;
  /** Called when stream finishes */
  onFinish: (reason: string | undefined) => void;
}

/**
 * SSE stream chunk from OpenAI-compatible APIs
 */
interface StreamChunkData {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta?: {
      content?: string;
      role?: string;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        index: number;
        function: {
          name?: string;
          arguments?: string;
        };
      }>;
      audio?: unknown;
    };
    message?: {
      content?: string;
      role?: string;
    };
    finish_reason?: 'stop' | 'length' | 'content_filter' | 'tool_calls' | null;
  }>;
}

/**
 * Stream Parser for SSE (Server-Sent Events)
 */
export class StreamParser {
  /**
   * Parse an SSE line and extract data
   * Returns null for empty lines, comments, or non-data lines
   */
  static parseSseLine(line: string): string | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(':')) {
      return null;
    }
    if (trimmed.startsWith('data: ')) {
      return trimmed.slice(6).trim();
    }
    if (trimmed.startsWith('{')) {
      return trimmed;
    }
    return null;
  }

  /**
   * Check if data indicates stream end
   */
  static isStreamEnd(data: string): boolean {
    return data === '[DONE]';
  }

  /**
   * Safely parse JSON, returning null on failure
   */
  static safeJsonParse<T>(data: string): T | null {
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  /**
   * Process a readable stream and call callbacks for events
   */
  static async parse(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = '';
    let shouldStop = false;

    while (!shouldStop) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/[\r\n]+/);
      buffer = lines.pop() || '';

      for (const line of lines) {
        const data = this.parseSseLine(line);

        if (!data) continue;

        if (this.isStreamEnd(data)) {
          shouldStop = true;
          break;
        }

        const chunk = this.safeJsonParse<StreamChunkData>(data);
        if (!chunk) continue;

        this.processChunk(chunk, callbacks);
      }
    }
  }

  /**
   * Process a single stream chunk
   */
  private static processChunk(
    chunk: StreamChunkData,
    callbacks: StreamCallbacks
  ): void {
    const choice = chunk.choices[0];
    if (!choice) return;

    const delta = choice.delta;
    const message = choice.message;

    // Handle content
    const content = delta?.content || message?.content;
    if (content) {
      callbacks.onContent(content);
    }

    // Handle tool calls
    const toolCallsDelta = delta?.tool_calls;
    if (toolCallsDelta && toolCallsDelta.length > 0) {
      for (const tc of toolCallsDelta) {
        callbacks.onToolCall({
          index: tc.index,
          id: tc.id,
          type: tc.type,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        });
      }
    }

    // Handle finish reason
    const finishReason = choice.finish_reason;
    if (finishReason) {
      callbacks.onFinish(finishReason);
    }
  }
}
