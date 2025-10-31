import React from 'react';

// Re-export all error boundary components from the ErrorBoundary folder
export { GlobalErrorBoundary } from './ErrorBoundary/GlobalErrorBoundary';
export { GlobalErrorBoundary as ErrorBoundary } from './ErrorBoundary/GlobalErrorBoundary'; // Backward compatibility
export { RouteErrorBoundary } from './ErrorBoundary/RouteErrorBoundary';
export { AsyncErrorBoundary, NetworkError, useAsyncError } from './ErrorBoundary/AsyncErrorBoundary';
export { ErrorFallback, LoadingFallback, EmptyFallback } from './ErrorBoundary/ErrorFallback';
export { withErrorBoundary, useErrorBoundary } from './ErrorBoundary/withErrorBoundary';

// Re-export retry utilities
export {
  withRetry,
  fetchWithRetry,
  createRetryWrapper,
  CircuitBreaker,
  withTimeout,
  batchWithRetry,
  useRetry,
  type RetryOptions,
} from '@/lib/api-retry';

// Legacy hook for backward compatibility
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return setError;
};
