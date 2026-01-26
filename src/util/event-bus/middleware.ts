/**
 * EventBus 中间件工具函数
 * 提供常用中间件工厂函数
 */

import type { Middleware, EventContext } from './types';

/**
 * 创建日志中间件
 */
export function createLoggingMiddleware(source?: string): Middleware {
  return async (context, next) => {
    const startTime = Date.now();
    console.log(`[${source || 'EventBus'}] Event started: ${context.event}`, {
      correlationId: context.metadata.correlationId,
      timestamp: new Date(context.metadata.timestamp).toISOString(),
    });

    try {
      await next();
      const duration = Date.now() - startTime;
      console.log(`[${source || 'EventBus'}] Event completed: ${context.event}`, {
        correlationId: context.metadata.correlationId,
        duration: `${duration}ms`,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${source || 'EventBus'}] Event failed: ${context.event}`, {
        correlationId: context.metadata.correlationId,
        duration: `${duration}ms`,
        error,
      });
      throw error;
    }
  };
}

/**
 * 创建错误处理中间件
 */
export function createErrorHandlingMiddleware(
  onError?: (error: Error, context: EventContext) => void
): Middleware {
  return async (context, next) => {
    try {
      await next();
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)), context);
      }
      throw error;
    }
  };
}

/**
 * 创建验证中间件
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
 * 修复超时逻辑，确保正确的行为
 */
export function createTimeoutMiddleware(timeoutMs: number): Middleware {
  return async (context, next) => {
    let timeoutId: NodeJS.Timeout | null = null;
    let timedOut = false;

    const timeoutPromise = new Promise<void>((_, reject) => {
      timeoutId = setTimeout(() => {
        timedOut = true;
        context.abort();
        reject(new Error(`Event "${context.event}" timed out after ${timeoutMs}ms`));
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
 * 修复重试计数逻辑
 */
export function createRetryMiddleware(
  maxRetries: number,
  delayMs: number = 1000
): Middleware {
  return async (context, next) => {
    let attempt = 0;
    let lastError: Error | undefined;

    while (attempt <= maxRetries) {
      try {
        await next();
        return; // 成功则返回
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;

        // 如果还有重试机会
        if (attempt <= maxRetries) {
          // 指数退避
          const backoffMs = delayMs * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }

    // 重试次数用完，抛出最后一次错误
    if (lastError) {
      throw lastError;
    }
  };
}
