import React from 'react';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  componentName?: string;
  compact?: boolean;
}

export function ErrorFallback({
  error,
  resetError,
  componentName,
  compact = false,
}: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  if (compact) {
    return (
      <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-700 dark:text-red-400">
            Failed to load {componentName || 'content'}
          </span>
        </div>
        <Button onClick={resetError} size="sm" variant="ghost">
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-red-200 dark:border-red-800">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>

          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
            {componentName ? `Error loading ${componentName}` : 'Something went wrong'}
          </h3>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-sm">
            {error.message || 'An unexpected error occurred while loading this content.'}
          </p>

          <Button onClick={resetError} variant="default" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>

          {import.meta.env.DEV && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="mt-4 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Technical Details
              {showDetails ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          )}

          {import.meta.env.DEV && showDetails && (
            <div className="mt-4 w-full">
              <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded text-left overflow-x-auto">
                {error.stack}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Loading fallback component
export function LoadingFallback({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
      <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
}

// Empty state fallback
export function EmptyFallback({
  title = 'No data',
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-sm">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}