import React, { useState, useEffect, ReactNode } from 'react';
import { AlertCircle, WifiOff, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface AsyncErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error) => void;
}

export function AsyncErrorBoundary({
  children,
  fallback,
  onError,
}: AsyncErrorBoundaryProps) {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      const error = new Error(
        event.reason?.message || 'An asynchronous error occurred'
      );
      setError(error);
      if (onError) {
        onError(error);
      }
      // Prevent the default error handling
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [onError]);

  const retry = () => {
    setError(null);
  };

  if (error) {
    if (fallback) {
      return <>{fallback(error, retry)}</>;
    }

    return (
      <div className="p-4">
        <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertTitle className="text-red-800 dark:text-red-300">
            Async Operation Failed
          </AlertTitle>
          <AlertDescription className="text-red-700 dark:text-red-400">
            {error.message}
          </AlertDescription>
          <Button
            onClick={retry}
            size="sm"
            variant="outline"
            className="mt-2"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}

// Network Error Component
interface NetworkErrorProps {
  error: Error;
  retry: () => void;
  isOffline?: boolean;
}

export function NetworkError({ error, retry, isOffline }: NetworkErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
        <WifiOff className="h-8 w-8 text-gray-600 dark:text-gray-400" />
      </div>

      <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
        {isOffline ? 'No Internet Connection' : 'Network Error'}
      </h3>

      <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-sm">
        {isOffline
          ? 'Please check your internet connection and try again.'
          : error.message || 'Failed to connect to our servers.'}
      </p>

      <Button onClick={retry} variant="default">
        <RefreshCw className="mr-2 h-4 w-4" />
        Try Again
      </Button>
    </div>
  );
}

// Hook for handling async errors
export function useAsyncError() {
  const [, setError] = useState<Error | null>(null);

  return (error: Error) => {
    setError(() => {
      throw error;
    });
  };
}