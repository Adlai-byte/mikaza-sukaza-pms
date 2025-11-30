import React, { ComponentType, ReactNode, useState, useEffect, useCallback } from 'react';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import { AsyncErrorBoundary } from './AsyncErrorBoundary';
import { ErrorFallback } from './ErrorFallback';

/**
 * HOC to wrap a component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options?: {
    fallback?: (error: Error, reset: () => void) => ReactNode;
    onError?: (error: Error) => void;
    routeName?: string;
  }
) {
  const WrappedComponent = (props: P) => {
    return (
      <RouteErrorBoundary
        routeName={options?.routeName}
        onError={(error, errorInfo) => {
          if (options?.onError) {
            options.onError(error);
          }
          // Log to console in development
          if (import.meta.env.DEV) {
            console.error(`Error in ${options?.routeName || 'component'}:`, error, errorInfo);
          }
        }}
      >
        <AsyncErrorBoundary
          fallback={
            options?.fallback ||
            ((error, retry) => (
              <ErrorFallback
                error={error}
                resetError={retry}
                componentName={options?.routeName}
              />
            ))
          }
        >
          <Component {...props} />
        </AsyncErrorBoundary>
      </RouteErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

/**
 * Hook to wrap async operations with error handling
 */
export function useErrorBoundary() {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const captureError = useCallback((error: Error) => {
    setError(error);
  }, []);

  return {
    captureError,
    resetError,
  };
}