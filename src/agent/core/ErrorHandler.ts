/**
 * 错误处理器
 * 
 * 职责：
 * 1. 分类错误（可重试、永久、取消）
 * 2. 计算退避时间
 * 3. 决定是否重试或终止
 */

import {
  isRetryableError,
  isPermanentError,
  isAbortedError,
  LLMAuthError,
  LLMNotFoundError,
} from '../../providers/providers/errors';

export interface ErrorClassification {
  message: string;
  isAborted: boolean;
  isRetryable: boolean;
  isPermanent: boolean;
  isAuth: boolean;
  isModelNotFound: boolean;
  resourceType?: string;
}

export interface ErrorHandlerConfig {
  maxNetworkRetries: number;
  noProgressLimit: number;
}

export interface ErrorHandlerState {
  consecutiveErrorCount: number;
  networkErrorCount: number;
}

export type ErrorDecision = 
  | { type: 'abort'; userMessage: string }
  | { type: 'retry'; backoffMs: number }
  | { type: 'stop'; userMessage: string }
  | { type: 'continue' };

export class ErrorHandler {
  private config: ErrorHandlerConfig;
  private state: ErrorHandlerState;

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      maxNetworkRetries: 10,
      noProgressLimit: 10,
      ...config,
    };
    this.state = {
      consecutiveErrorCount: 0,
      networkErrorCount: 0,
    };
  }

  /**
   * 分类错误
   */
  classify(error: unknown): ErrorClassification {
    const message = error instanceof Error ? error.message : String(error);

    return {
      message,
      isAborted: isAbortedError(error),
      isRetryable: isRetryableError(error),
      isPermanent: isPermanentError(error),
      isAuth: error instanceof LLMAuthError,
      isModelNotFound: error instanceof LLMNotFoundError,
      resourceType: error instanceof LLMNotFoundError 
        ? error.resourceType 
        : undefined,
    };
  }

  /**
   * 处理错误并决定下一步
   */
  handle(error: unknown): ErrorDecision {
    const classification = this.classify(error);

    // 1. 用户取消
    if (classification.isAborted) {
      return {
        type: 'abort',
        userMessage: '[Task cancelled]',
      };
    }

    // 2. 可重试错误（网络错误）
    if (classification.isRetryable) {
      this.state.networkErrorCount++;

      if (this.state.networkErrorCount > this.config.maxNetworkRetries) {
        return {
          type: 'stop',
          userMessage: `Service unavailable after ${this.config.maxNetworkRetries} retries. ${classification.message}`,
        };
      }

      const backoffMs = this.getBackoff(this.state.networkErrorCount);
      return { type: 'retry', backoffMs };
    }

    // 3. 永久错误
    if (classification.isPermanent) {
      let userMessage = `API Error: ${classification.message}`;

      if (classification.isAuth) {
        userMessage = 'Authentication failed. Please check your API key configuration.';
      } else if (classification.isModelNotFound) {
        userMessage = classification.resourceType === 'model'
          ? `Model not found. Please check AI_MODEL configuration. ${classification.message}`
          : `Resource not found. ${classification.message}`;
      }

      return { type: 'stop', userMessage };
    }

    // 4. 未知错误
    this.state.consecutiveErrorCount++;

    if (this.state.consecutiveErrorCount > this.config.noProgressLimit) {
      return {
        type: 'stop',
        userMessage: `Max error limit reached (${this.config.noProgressLimit} consecutive errors). Last error: ${classification.message}`,
      };
    }

    return { type: 'continue' };
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.state.consecutiveErrorCount = 0;
    this.state.networkErrorCount = 0;
  }

  /**
   * 标记成功（重置连续错误计数）
   */
  markSuccess(): void {
    this.state.consecutiveErrorCount = 0;
    this.state.networkErrorCount = 0;
  }

  /**
   * 获取当前状态
   */
  getState(): ErrorHandlerState {
    return { ...this.state };
  }

  /**
   * 计算退避时间（指数退避）
   */
  private getBackoff(retryCount: number): number {
    // 基础退避 1s，最大 60s
    const baseDelay = 1000;
    const maxDelay = 60000;
    const delay = baseDelay * Math.pow(2, retryCount - 1);
    return Math.min(delay, maxDelay);
  }
}
