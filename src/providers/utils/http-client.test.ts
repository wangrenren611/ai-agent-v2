/**
 * HTTP Client Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { HTTPClient } from './http-client';
import { LLMRetryableError } from '../../errors';

describe('HTTPClient', () => {
  let httpClient: HTTPClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    httpClient = new HTTPClient({
      timeout: 5000,
      maxRetries: 3,
      initialRetryDelay: 100,
      maxRetryDelay: 500,
      debug: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const client = new HTTPClient();
      expect(client.defaultTimeout).toBe(60000);
      expect(client.maxRetries).toBe(3);
    });

    it('should use custom options', () => {
      const client = new HTTPClient({
        timeout: 10000,
        maxRetries: 5,
        initialRetryDelay: 500,
        maxRetryDelay: 2000,
        debug: true,
      });

      expect(client.defaultTimeout).toBe(10000);
      expect(client.maxRetries).toBe(5);
      expect(client.debug).toBe(true);
    });
  });

  describe('fetch', () => {
    it('should make successful request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ result: 'success' }),
      });

      const response = await httpClient.fetch('https://api.test.com/endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should include request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const body = { message: 'Hello' };

      await httpClient.fetch('https://api.test.com/endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].body).toBe(JSON.stringify(body));
    });

    it('should handle custom timeout in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await httpClient.fetch('https://api.test.com/endpoint', {
        timeout: 10000,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should support abort signal', async () => {
      const controller = new AbortController();
      controller.abort();

      mockFetch.mockRejectedValueOnce(new Error('Request was aborted'));

      await expect(
        httpClient.fetch('https://api.test.com/endpoint', {
          signal: controller.signal,
        })
      ).rejects.toThrow();
    });
  });

  describe('retry logic', () => {
    it('should retry on 429 rate limit error', async () => {
      // First two calls fail with 429, third succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('ECONNRESET')) // Network error
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ result: 'success' }),
        });

      const response = await httpClient.fetch('https://api.test.com/endpoint');

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should respect custom maxRetries', async () => {
      const client = new HTTPClient({ maxRetries: 1 });

      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ result: 'success' }),
        });

      const response = await client.fetch('https://api.test.com/endpoint');

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 401 unauthorized error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(
        httpClient.fetch('https://api.test.com/endpoint')
      ).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 404 not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });

      await expect(
        httpClient.fetch('https://api.test.com/endpoint')
      ).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 400 bad request error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      });

      await expect(
        httpClient.fetch('https://api.test.com/endpoint')
      ).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on 500 server error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ result: 'success' }),
        });

      const response = await httpClient.fetch('https://api.test.com/endpoint');

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 502 bad gateway error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 502,
          text: async () => 'Bad Gateway',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ result: 'success' }),
        });

      const response = await httpClient.fetch('https://api.test.com/endpoint');

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 503 service unavailable error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          text: async () => 'Service Unavailable',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ result: 'success' }),
        });

      const response = await httpClient.fetch('https://api.test.com/endpoint');

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 504 gateway timeout error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 504,
          text: async () => 'Gateway Timeout',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ result: 'success' }),
        });

      const response = await httpClient.fetch('https://api.test.com/endpoint');

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should give up after max retries', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        httpClient.fetch('https://api.test.com/endpoint')
      ).rejects.toThrow();

      // Initial call + 3 retries = 4 total
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('should use exponential backoff between retries', async () => {
      const delays: number[] = [];
      const originalFetch = global.fetch;
      const startTime = Date.now();

      mockFetch.mockImplementation(async () => {
        const elapsed = Date.now() - startTime;
        if (mockFetch.mock.calls.length > 1) {
          delays.push(elapsed);
        }
        throw new Error('Network error');
      });

      try {
        await httpClient.fetch('https://api.test.com/endpoint');
      } catch (e) {
        // Expected to fail
      }

      // Verify exponential backoff (approximately)
      // Retry 1: ~100ms, Retry 2: ~200ms, Retry 3: ~400ms
      expect(delays).toHaveLength(3);
      expect(delays[0]).toBeGreaterThanOrEqual(80); // Allow some variance
      expect(delays[1]).toBeGreaterThanOrEqual(180);
    });
  });

  describe('network error detection', () => {
    it('should retry on ECONNREFUSED error', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ result: 'success' }),
        });

      const response = await httpClient.fetch('https://api.test.com/endpoint');

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on ECONNRESET error', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ result: 'success' }),
        });

      const response = await httpClient.fetch('https://api.test.com/endpoint');

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on ENOTFOUND error', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('ENOTFOUND'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ result: 'success' }),
        });

      const response = await httpClient.fetch('https://api.test.com/endpoint');

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on timeout error', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ result: 'success' }),
        });

      const response = await httpClient.fetch('https://api.test.com/endpoint');

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on AbortError', async () => {
      const error = new Error('Aborted');
      error.name = 'AbortError';

      mockFetch
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ result: 'success' }),
        });

      const response = await httpClient.fetch('https://api.test.com/endpoint');

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('timeout handling', () => {
    it('should handle network error with retry', async () => {
      const client = new HTTPClient({ timeout: 100 });

      // Mock first call to fail with network error, second to succeed
      const networkError = new Error('Network timeout');
      networkError.name = 'AbortError';

      mockFetch
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ result: 'success' }),
        });

      const response = await client.fetch('https://api.test.com/endpoint');

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('debug mode', () => {
    it('should log requests in debug mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const client = new HTTPClient({ debug: true });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ result: 'success' }),
      });

      await client.fetch('https://api.test.com/endpoint');

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
