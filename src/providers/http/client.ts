/**
 * HTTP Client
 * 
 * 提供统一的 HTTP 请求能力：
 * - 重试逻辑（指数退避）
 * - 超时处理
 * - 中断信号支持
 * - 错误分类处理
 */

import { LLMError, LLMRetryableError, isRetryableError, createErrorFromStatus } from '../utils/errors';
import type { HttpClientOptions, RequestInitWithOptions } from '../types';

export { type HttpClientOptions, type RequestInitWithOptions };

export class HTTPClient {
  readonly defaultTimeout: number;
  readonly maxRetries: number;
  readonly initialRetryDelay: number;
  readonly maxRetryDelay: number;
  readonly debug: boolean;

  constructor(options: HttpClientOptions = {}) {
    this.defaultTimeout = options.timeout ?? 600_000; // 10分钟
    this.maxRetries = options.maxRetries ?? 10;
    this.initialRetryDelay = options.initialRetryDelay ?? 1000;
    this.maxRetryDelay = options.maxRetryDelay ?? 10_000;
    this.debug = options.debug ?? false;
  }

  /**
   * 发送请求（带重试逻辑）
   */
  async fetch(url: string, options: RequestInitWithOptions = {}): Promise<Response> {
    const timeout = options.timeout ?? this.defaultTimeout;
    const maxRetries = options.maxRetries ?? this.maxRetries;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, options, timeout);

        // HTTP 错误处理
        if (!response.ok) {
          const errorText = await response.text();
          const error = createErrorFromStatus(response.status, response.statusText, errorText);

          if (!isRetryableError(error)) {
            throw error;
          }

          lastError = error;

          if (attempt < maxRetries) {
            await this.delay(this.calculateRetryDelay(attempt, error as LLMRetryableError));
            continue;
          }

          throw error;
        }

        return response;
      } catch (error) {
        if (this.isNetworkError(error) || this.isTimeoutError(error)) {
          lastError = error as Error;

          if (attempt < maxRetries) {
            await this.delay(this.calculateRetryDelay(attempt));
            continue;
          }
        }

        throw error;
      }
    }

    throw lastError || new LLMError('Max retries exceeded');
  }

  /**
   * 带超时的 fetch
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
 
    // 合并外部中断信号
    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    try {
      // Debug: log headers being sent
      if (this.debug && options.headers) {
        const headerObj: Record<string, string> = {};
        new Headers(options.headers).forEach((value, key) => { headerObj[key] = value; });
        console.log('[HTTPClient] Request headers:', headerObj);
      }
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (controller.signal.aborted && !options.signal?.aborted) {
        throw new LLMRetryableError(`Request timeout after ${timeout}ms`, timeout, 'TIMEOUT');
      }

      throw error;
    }
  }

  /**
   * 计算重试延迟（指数退避 + 抖动）
   */
  private calculateRetryDelay(attempt: number, error?: LLMRetryableError): number {
    if (error?.retryAfter) {
      return Math.min(error.retryAfter, this.maxRetryDelay);
    }

    const delay = Math.min(
      this.initialRetryDelay * Math.pow(2, attempt),
      this.maxRetryDelay
    );

    // 添加 ±25% 抖动
    const jitter = delay * 0.25;
    return delay - jitter + Math.random() * jitter * 2;
  }

  /**
   * 检查是否为网络错误
   */
  private isNetworkError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const patterns = ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ENETUNREACH', 'EAI_AGAIN', 'fetch failed'];
    const message = error.message.toLowerCase();
    return patterns.some(p => message.includes(p.toLowerCase()));
  }

  /**
   * 检查是否为超时错误
   */
  private isTimeoutError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return message.includes('timeout') || message.includes('aborted') || error.name === 'AbortError';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
