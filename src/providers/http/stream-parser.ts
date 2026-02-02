/**
 * Stream Parser
 * 
 * 处理 SSE (Server-Sent Events) 流式响应
 */

import type { StreamCallbacks } from '../types';

export { type StreamCallbacks };

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
    };
    message?: {
      content?: string;
      role?: string;
    };
    finish_reason?: 'stop' | 'length' | 'content_filter' | 'tool_calls' | null;
  }>;
}

export class StreamParser {
  /**
   * 解析 SSE 行
   */
  static parseSseLine(line: string): string | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(':')) return null;
    if (trimmed.startsWith('data: ')) return trimmed.slice(6).trim();
    if (trimmed.startsWith('{')) return trimmed;
    return null;
  }

  /**
   * 检查是否为流结束标记
   */
  static isStreamEnd(data: string): boolean {
    return data === '[DONE]';
  }

  /**
   * 安全解析 JSON
   */
  static safeJsonParse<T>(data: string): T | null {
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  /**
   * 解析流
   */
  static async parse(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/[\r\n]+/);
      buffer = lines.pop() || '';

      for (const line of lines) {
        const data = this.parseSseLine(line);
        if (!data) continue;

        if (this.isStreamEnd(data)) return;

        const chunk = this.safeJsonParse<StreamChunkData>(data);
        if (chunk) this.processChunk(chunk, callbacks);
      }
    }
  }

  /**
   * 处理单个 chunk
   */
  private static processChunk(chunk: StreamChunkData, callbacks: StreamCallbacks): void {
    const choice = chunk?.choices?.[0];
    if (!choice) return;

    const delta = choice.delta;
    const message = choice.message;

    // 处理内容
    const content = delta?.content || message?.content;
    if (content) callbacks.onContent(content);

    // 处理工具调用
    const toolCallsDelta = delta?.tool_calls;
    if (toolCallsDelta?.length) {
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

    // 处理完成原因
    if (choice.finish_reason) {
      callbacks.onFinish(choice.finish_reason);
    }
  }
}
