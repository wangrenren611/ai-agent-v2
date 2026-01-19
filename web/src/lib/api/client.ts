import {
  ApiError,
  NetworkError,
  TimeoutError,
  ValidationError,
} from './errors';

export interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

/**
 * Default configuration
 */
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second

/**
 * Fetch wrapper with timeout, retry, and error handling
 */
export async function fetchWithErrorHandling<T>(
  url: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
      }, timeout);

      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await safeParseError(response);
        const errorMessage = (errorData as { message?: string })?.message || response.statusText;

        // Don't retry client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          throw new ApiError(errorMessage, response.status, errorData);
        }

        // Retry server errors (5xx)
        throw new ApiError(errorMessage, response.status, errorData);
      }

      const data = await response.json();

      return {
        data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      lastError = error as Error;

      // Don't retry if it's a validation error or client error
      if (error instanceof ValidationError || error instanceof ApiError && error.statusCode < 500) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt < retries) {
        await sleep(retryDelay * (attempt + 1)); // Exponential backoff
        continue;
      }
    }
  }

  // If we've exhausted all retries, throw the last error
  if (lastError instanceof NetworkError || lastError instanceof TimeoutError) {
    throw lastError;
  }

  throw new NetworkError('Request failed after retries');
}

/**
 * Fetch with timeout
 */
function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  return fetch(url, {
    ...options,
    signal: controller.signal,
  })
    .then((response) => {
      clearTimeout(timeoutId);
      return response;
    })
    .catch((error) => {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new TimeoutError();
      }
      throw new NetworkError(error.message);
    });
}

/**
 * Safely parse error response
 */
async function safeParseError(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Sleep utility for retry delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * API Client class
 */
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  private buildUrl(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  async get<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return fetchWithErrorHandling<T>(this.buildUrl(path), {
      ...options,
      method: 'GET',
    });
  }

  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return fetchWithErrorHandling<T>(this.buildUrl(path), {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return fetchWithErrorHandling<T>(this.buildUrl(path), {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return fetchWithErrorHandling<T>(this.buildUrl(path), {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return fetchWithErrorHandling<T>(this.buildUrl(path), {
      ...options,
      method: 'DELETE',
    });
  }
}

// Singleton instance
export const apiClient = new ApiClient();
