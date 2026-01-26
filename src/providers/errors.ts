/**
 * LLM Provider 错误类型定义
 *
 * 错误层次结构：
 * LLMError (基础)
 * ├─ LLMRetryableError (可重试的临时性错误)
 * │   └─ LLMRateLimitError (速率限制)
 * ├─ LLMPermanentError (不可重试的永久性错误)
 * │   ├─ LLMAuthError (认证失败)
 * │   └─ LLMNotFoundError (资源/模型不存在)
 * └─ LLMAbortedError (用户取消)
 */

/**
 * LLM 错误基类
 */
export class LLMError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'LLMError';
    Error.captureStackTrace?.(this, LLMError);
  }
}

/**
 * 可重试的临时性错误
 * - 429 Rate Limit
 * - 500, 502, 503, 504 服务器错误
 * - 网络超时、连接失败
 */
export class LLMRetryableError extends LLMError {
  constructor(
    message: string,
    public retryAfter?: number, // 建议重试延迟（毫秒）
    code?: string
  ) {
    super(message, code);
    this.name = 'LLMRetryableError';
  }

  /**
   * 获取建议的重试延迟（指数退避）
   */
  getBackoff(retryCount: number): number {
    // 如果有服务器指定的 retry-after，优先使用
    if (this.retryAfter) {
      return this.retryAfter;
    }
    // 否则使用指数退避：2^retryCount * 1000ms
    return Math.pow(2, retryCount) * 1000;
  }
}

/**
 * 速率限制错误（429）
 */
export class LLMRateLimitError extends LLMRetryableError {
  constructor(
    message: string,
    public limitType?: 'user' | 'organization' | 'global',
    retryAfter?: number
  ) {
    super(message, retryAfter, 'RATE_LIMIT');
    this.name = 'LLMRateLimitError';
  }
}

/**
 * 不可重试的永久性错误
 * - 400 Bad Request
 * - 401 Unauthorized
 * - 404 Not Found
 * - 501 Not Implemented
 */
export class LLMPermanentError extends LLMError {
  constructor(
    message: string,
    public statusCode?: number,
    code?: string
  ) {
    super(message, code);
    this.name = 'LLMPermanentError';
  }
}

/**
 * 认证失败错误（401, 403）
 */
export class LLMAuthError extends LLMPermanentError {
  constructor(message: string) {
    super(message, 401, 'AUTH_FAILED');
    this.name = 'LLMAuthError';
  }
}

/**
 * 资源/模型不存在错误（404）
 */
export class LLMNotFoundError extends LLMPermanentError {
  constructor(message: string, public resourceType?: 'model' | 'endpoint' | 'resource') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'LLMNotFoundError';
  }
}

/**
 * 请求参数错误（400）
 */
export class LLMBadRequestError extends LLMPermanentError {
  constructor(message: string, public validationErrors?: Record<string, string>) {
    super(message, 400, 'BAD_REQUEST');
    this.name = 'LLMBadRequestError';
  }
}

/**
 * 用户取消错误
 */
export class LLMAbortedError extends LLMError {
  constructor(message: string = 'Request was cancelled') {
    super(message, 'ABORTED');
    this.name = 'LLMAbortedError';
  }
}

/**
 * 工具函数：根据 HTTP 状态码创建对应的错误
 */
export function createErrorFromStatus(
  status: number,
  statusText: string,
  errorText: string
): LLMError {
  // 解析可能的错误详情
  let details = '';
  try {
    const parsed = JSON.parse(errorText);
    details = parsed.error?.message || errorText;
  } catch {
    details = errorText;
  }

  const message = `${status} ${statusText}${details ? ` - ${details}` : ''}`;

  switch (status) {
    case 401:
    case 403:
      return new LLMAuthError(message);

    case 404:
      // 尝试识别资源类型
      const resourceType: 'model' | 'endpoint' | 'resource' =
        details.includes('模型') || details.toLowerCase().includes('model') ? 'model' :
        details.includes('endpoint') || details.includes('路径') ? 'endpoint' : 'resource';
      return new LLMNotFoundError(message, resourceType);

    case 429:
      return new LLMRateLimitError(message);

    case 400:
      return new LLMBadRequestError(message);

    case 501:
      return new LLMPermanentError(message, 501, 'NOT_IMPLEMENTED');

    case 500:
    case 502:
    case 503:
    case 504:
      return new LLMRetryableError(message, undefined, `SERVER_${status}`);

    default:
      return new LLMError(message, `HTTP_${status}`);
  }
}

/**
 * 工具函数：判断是否为可重试错误
 */
export function isRetryableError(error: unknown): error is LLMRetryableError {
  return error instanceof LLMRetryableError;
}

/**
 * 工具函数：判断是否为永久性错误
 */
export function isPermanentError(error: unknown): error is LLMPermanentError {
  return error instanceof LLMPermanentError;
}

/**
 * 工具函数：判断是否为取消错误
 */
export function isAbortedError(error: unknown): error is LLMAbortedError {
  return error instanceof LLMAbortedError;
}
