/**
 * API Retry Logic with Exponential Backoff
 * Provides robust retry mechanism for network failures
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (error: any, attemptNumber: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  retryCondition: (error: any) => {
    // Retry on network errors or 5xx server errors
    if (!error.response) return true; // Network error
    const status = error.response?.status || error.status;
    return status >= 500 && status < 600;
  },
  onRetry: () => {},
};

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attemptNumber: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number
): number {
  const delay = initialDelay * Math.pow(backoffMultiplier, attemptNumber - 1);
  return Math.min(delay, maxDelay);
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt === opts.maxRetries || !opts.retryCondition(error)) {
        throw error;
      }

      // Calculate delay
      const delay = calculateDelay(
        attempt,
        opts.initialDelay,
        opts.maxDelay,
        opts.backoffMultiplier
      );

      // Call retry callback
      opts.onRetry(error, attempt);

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Retry a fetch request with exponential backoff
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  return withRetry(
    async () => {
      const response = await fetch(url, init);

      // Throw an error for non-2xx responses
      if (!response.ok) {
        const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.response = response;
        error.status = response.status;
        throw error;
      }

      return response;
    },
    {
      ...options,
      retryCondition: (error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error.status >= 400 && error.status < 500) {
          return false;
        }
        // Retry on network errors or 5xx server errors
        return options.retryCondition ? options.retryCondition(error) : DEFAULT_OPTIONS.retryCondition(error);
      },
    }
  );
}

/**
 * Create a retry wrapper for any async function
 */
export function createRetryWrapper<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  defaultOptions: RetryOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    return withRetry(() => fn(...args), defaultOptions);
  }) as T;
}

/**
 * Circuit breaker pattern for preventing cascading failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime: number | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private onStateChange?: (state: 'closed' | 'open' | 'half-open') => void
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should be reset
    if (
      this.state === 'open' &&
      this.lastFailureTime &&
      Date.now() - this.lastFailureTime > this.timeout
    ) {
      this.setState('half-open');
    }

    // Reject immediately if circuit is open
    if (this.state === 'open') {
      throw new Error('Circuit breaker is open - service unavailable');
    }

    try {
      const result = await fn();

      // Reset on success
      if (this.state === 'half-open') {
        this.reset();
      }

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.setState('open');
    }
  }

  private reset() {
    this.failures = 0;
    this.lastFailureTime = null;
    this.setState('closed');
  }

  private setState(state: 'closed' | 'open' | 'half-open') {
    if (this.state !== state) {
      this.state = state;
      this.onStateChange?.(state);
    }
  }

  getState() {
    return this.state;
  }
}

/**
 * Timeout wrapper for promises
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError = new Error('Operation timed out')
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(timeoutError), timeoutMs);
    }),
  ]);
}

/**
 * Batch retry for multiple operations
 */
export async function batchWithRetry<T>(
  operations: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<Array<{ success: boolean; result?: T; error?: any }>> {
  const results = await Promise.allSettled(
    operations.map(op => withRetry(op, options))
  );

  return results.map(result => {
    if (result.status === 'fulfilled') {
      return { success: true, result: result.value };
    } else {
      return { success: false, error: result.reason };
    }
  });
}

/**
 * Hook for React components to handle retry logic
 */
export function useRetry<T>(
  asyncFunction: () => Promise<T>,
  options: RetryOptions = {}
) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [data, setData] = React.useState<T | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  const execute = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await withRetry(asyncFunction, {
        ...options,
        onRetry: (error, attempt) => {
          setRetryCount(attempt);
          options.onRetry?.(error, attempt);
        },
      });
      setData(result);
      setRetryCount(0);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [asyncFunction, options]);

  return {
    loading,
    error,
    data,
    retryCount,
    execute,
    retry: execute,
  };
}

// Import React for the hook
import React from 'react';