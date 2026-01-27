/**
 * EventBus 中间件工具函数
 * 提供常用中间件工厂函数
 *
 * 设计原则：
 * 1. 日志中间件：记录事件开始和完成
 * 2. 错误处理中间件：通过 onError 回调捕获错误
 * 3. 验证中间件：验证失败时中止事件
 * 4. 超时中间件：超时后中止事件
 * 5. 重试中间件：自动重试失败的操作
 */

import type { Middleware, EventContext } from './types.js';

/**
 * 创建日志中间件
 * 记录事件开始和完成
 */
export function createLoggingMiddleware(source?: string): Middleware {
  return async (context, next) => {
    const startTime = Date.now();
    const sourceLabel = source || 'EventBus';

    console.log(`[${sourceLabel}] Event started: ${context.event}`, {
      correlationId: context.metadata.correlationId,
      timestamp: new Date(context.metadata.timestamp).toISOString(),
    });

    try {
      await next();
      const duration = Date.now() - startTime;
      console.log(`[${sourceLabel}] Event completed: ${context.event}`, {
        correlationId: context.metadata.correlationId,
        duration: `${duration}ms`,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${sourceLabel}] Event failed: ${context.event}`, {
        correlationId: context.metadata.correlationId,
        duration: `${duration}ms`,
        error,
      });
    }
  };
}

/**
 * 创建错误处理中间件
 * 通过 onError 回调捕获处理器错误
 */
export function createErrorHandlingMiddleware(
  onError?: (error: Error, context: EventContext) => void
): Middleware {
  return async (context, next) => {
    context.onError = (error: Error) => {
      if (onError) {
        onError(error, context);
      }
    };

    try {
      await next();
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)), context);
      }
    }
  };
}

/**
 * 创建验证中间件
 * 验证失败时中止事件
 */
export function createValidationMiddleware<T>(
  validator: (data: T) => boolean | Promise<boolean>,
  errorMessage = 'Validation failed'
): Middleware<T> {
  return async (context, next) => {
    const isValid = await validator(context.data);
    if (!isValid) {
      throw new Error(`${errorMessage} for event: ${context.event}`);
    }
    await next();
  };
}

/**
 * 创建超时中间件
 * 超时后中止事件
 */
export function createTimeoutMiddleware(timeoutMs: number): Middleware {
  return async (context, next) => {
    let timeoutId: NodeJS.Timeout | null = null;

    const timeoutPromise = new Promise<void>((resolve) => {
      timeoutId = setTimeout(() => {
        context.abort();
        resolve();
      }, timeoutMs);
    });

    try {
      await Promise.race([next(), timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };
}

/**
 * 创建重试中间件
 * 自动重试失败的操作（指数退避）
 */
export function createRetryMiddleware(
  maxRetries: number,
  delayMs: number = 1000
): Middleware {
  return async (context, next) => {
    let attempt = 0;
    let lastError: Error | undefined = undefined;

    while (attempt <= maxRetries) {
      try {
        await next();
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;

        if (attempt <= maxRetries) {
          const backoffMs = delayMs * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }
  };
}
