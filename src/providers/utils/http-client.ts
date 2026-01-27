/**
 * HTTP Client Utility
 *
 * Provides a unified HTTP client with:
 * - Retry logic with exponential backoff
 * - Timeout handling
 * - Abort signal support
 * - Error handling integration with LLM error types
 */

import {
  LLMError,
  LLMRetryableError,
  isRetryableError,
  createErrorFromStatus,
} from '../../providers/errors';

export interface HttpClientOptions {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum number of retries */
  maxRetries?: number;
  /** Initial retry delay in milliseconds */
  initialRetryDelay?: number;
  /** Maximum retry delay in milliseconds */
  maxRetryDelay?: number;
  /** Enable debug logging */
  debug?: boolean;
}

export interface RequestInitWithOptions extends RequestInit {
  timeout?: number;
  maxRetries?: number;
}

/**
 * HTTP Client with retry logic and error handling
 */
export class HTTPClient {
  readonly defaultTimeout: number;
  readonly maxRetries: number;
  readonly initialRetryDelay: number;
  readonly maxRetryDelay: number;
  readonly debug: boolean;

  constructor(options: HttpClientOptions = {}) {
    this.defaultTimeout = options.timeout ?? 60000;
    this.maxRetries = options.maxRetries ?? 3;
    this.initialRetryDelay = options.initialRetryDelay ?? 1000;
    this.maxRetryDelay = options.maxRetryDelay ?? 10000;
    this.debug = options.debug ?? false;
  }

  /**
   * Fetch with retry logic and timeout
   */
  async fetch(
    url: string,
    options: RequestInitWithOptions = {}
  ): Promise<Response> {
    const timeout = options.timeout ?? this.defaultTimeout;
    const maxRetries = options.maxRetries ?? this.maxRetries;

    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        if (this.debug) {
          console.log(`[HTTPClient] Attempt ${attempt + 1}/${maxRetries + 1}: ${options.method || 'GET'} ${url}`);
        }

        const response = await this.fetchWithTimeout(url, options, timeout);

        // Check for HTTP errors
        if (!response.ok) {
          const errorText = await response.text();
          const error = createErrorFromStatus(response.status, response.statusText, errorText);

          // Don't retry permanent errors
          if (!isRetryableError(error)) {
            throw error;
          }

          lastError = error;
          attempt++;

          // Calculate delay before retry
          if (attempt <= maxRetries) {
            const delay = this.calculateRetryDelay(attempt, error as LLMRetryableError);
            if (this.debug) {
              console.log(`[HTTPClient] Retrying after ${delay}ms...`);
            }
            await this.sleep(delay);
            continue;
          }

          throw error;
        }

        return response;
      } catch (error) {
        // If it's a network error or timeout, it might be retryable
        if (this.isNetworkError(error) || this.isTimeoutError(error)) {
          lastError = error as Error;
          attempt++;

          if (attempt <= maxRetries) {
            const delay = this.calculateRetryDelay(attempt);
            if (this.debug) {
              console.log(`[HTTPClient] Network error, retrying after ${delay}ms...`);
            }
            await this.sleep(delay);
            continue;
          }
        }

        // Re-throw non-retryable errors
        throw error;
      }
    }

    // Should not reach here, but just in case
    throw lastError || new LLMError('Max retries exceeded');
  }

  /**
   * Fetch with timeout support
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Merge abort signals if options.signal is provided
    const signal = options.signal;
    if (signal) {
      // If original signal is aborted, also abort our timeout controller
      signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      // Check if it's a timeout error
      if (controller.signal.aborted && !signal?.aborted) {
        throw new LLMRetryableError(
          `Request timeout after ${timeout}ms`,
          timeout,
          'TIMEOUT'
        );
      }

      throw error;
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number, error?: LLMRetryableError): number {
    // Use error's suggested retry-after if available
    if (error?.retryAfter) {
      return Math.min(error.retryAfter, this.maxRetryDelay);
    }

    // Exponential backoff: 2^attempt * initialDelay
    const delay = Math.min(
      this.initialRetryDelay * Math.pow(2, attempt),
      this.maxRetryDelay
    );

    // Add jitter (±25%)
    const jitter = delay * 0.25;
    return delay - jitter + Math.random() * jitter * 2;
  }

  /**
   * Check if error is a network error (retryable)
   */
  private isNetworkError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    // Common network error patterns
    const networkPatterns = [
      'ECONNREFUSED',
      'ECONNRESET',
      'ENOTFOUND',
      'ENETUNREACH',
      'EAI_AGAIN',
      'fetch failed',
      'network',
    ];

    const message = error.message.toLowerCase();
    return networkPatterns.some((pattern) =>
      message.includes(pattern.toLowerCase())
    );
  }

  /**
   * Check if error is a timeout error (retryable)
   */
  private isTimeoutError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('aborted') ||
      error.name === 'AbortError'
    );
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
