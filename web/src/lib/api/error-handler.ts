import { toast } from 'sonner';
import {
  getErrorMessage,
  isApiError,
  isNetworkError,
  isTimeoutError,
  isValidationError,
} from './errors';

/**
 * Handle API errors with user-friendly toast notifications
 */
export function handleApiError(error: unknown, context?: string): void {
  const message = getErrorMessage(error);
  const contextPrefix = context ? `${context}: ` : '';

  if (isValidationError(error)) {
    toast.error(`${contextPrefix}Validation Error`, {
      description: message,
    });
  } else if (isTimeoutError(error)) {
    toast.error(`${contextPrefix}Request Timeout`, {
      description: 'The request took too long to complete. Please try again.',
    });
  } else if (isNetworkError(error)) {
    toast.error(`${contextPrefix}Network Error`, {
      description: 'Please check your internet connection and try again.',
    });
  } else if (isApiError(error)) {
    // Handle specific HTTP status codes
    switch (error.statusCode) {
      case 401:
        toast.error(`${contextPrefix}Unauthorized`, {
          description: 'Please log in to continue.',
        });
        break;
      case 403:
        toast.error(`${contextPrefix}Access Denied`, {
          description: 'You do not have permission to perform this action.',
        });
        break;
      case 404:
        toast.error(`${contextPrefix}Not Found`, {
          description: 'The requested resource was not found.',
        });
        break;
      case 500:
        toast.error(`${contextPrefix}Server Error`, {
          description: 'An internal server error occurred. Please try again later.',
        });
        break;
      default:
        toast.error(`${contextPrefix}Error`, {
          description: message,
        });
    }
  } else {
    toast.error(`${contextPrefix}Unexpected Error`, {
      description: message,
    });
  }

  // Log error for debugging
  console.error('[API Error]', error);
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleApiError(error, context);
      throw error;
    }
  }) as T;
}

/**
 * Create a promise with toast notification
 */
export function withToastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
): void {
  toast.promise(promise, messages);
}
