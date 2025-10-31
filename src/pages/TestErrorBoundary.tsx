import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Bomb,
  AlertTriangle,
  WifiOff,
  Clock,
  Shield,
  CheckCircle2
} from 'lucide-react';
import { useAsyncError } from '@/components/ErrorBoundary';
import { fetchWithRetry } from '@/lib/api-retry';

/**
 * Test page for Error Boundary functionality
 * This page is for development/testing only
 */
export default function TestErrorBoundary() {
  const [testStatus, setTestStatus] = useState<string>('');
  const throwAsyncError = useAsyncError();

  // Test 1: Throw synchronous error
  const throwSyncError = () => {
    throw new Error('Test synchronous error - This error was thrown intentionally for testing');
  };

  // Test 2: Throw async error
  const throwAsyncErrorTest = () => {
    setTimeout(() => {
      throwAsyncError(new Error('Test async error - This async error was thrown after 1 second'));
    }, 1000);
    setTestStatus('Async error will be thrown in 1 second...');
  };

  // Test 3: Unhandled promise rejection
  const throwUnhandledRejection = () => {
    Promise.reject(new Error('Test unhandled promise rejection'));
    setTestStatus('Unhandled promise rejection thrown!');
  };

  // Test 4: Network error with retry
  const testNetworkRetry = async () => {
    setTestStatus('Testing network retry logic...');
    try {
      // This will fail and retry 3 times
      const response = await fetchWithRetry(
        'https://jsonplaceholder.typicode.com/fake-endpoint-404',
        {},
        {
          maxRetries: 3,
          onRetry: (error, attempt) => {
            setTestStatus(`Retry attempt ${attempt} of 3...`);
          },
        }
      );
      setTestStatus('Network request succeeded!');
    } catch (error) {
      setTestStatus(`Network request failed after retries: ${error.message}`);
    }
  };

  // Test 5: Component that crashes
  const CrashingComponent = () => {
    const [shouldCrash, setShouldCrash] = useState(false);

    if (shouldCrash) {
      throw new Error('Component crashed intentionally!');
    }

    return (
      <Button
        onClick={() => setShouldCrash(true)}
        variant="destructive"
        size="sm"
      >
        <Bomb className="mr-2 h-4 w-4" />
        Crash This Component
      </Button>
    );
  };

  // Test 6: Simulate out of memory
  const causeMemoryError = () => {
    const arr = [];
    try {
      while (true) {
        arr.push(new Array(1000000).fill('memory'));
      }
    } catch (e) {
      throw new Error('Out of memory error simulation');
    }
  };

  if (import.meta.env.PROD) {
    return (
      <div className="p-8">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>Test Page Disabled</AlertTitle>
          <AlertDescription>
            This error boundary test page is only available in development mode.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Error Boundary Test Suite</CardTitle>
          <CardDescription>
            Test various error scenarios to verify error boundary functionality.
            These tests are only available in development mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status display */}
          {testStatus && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{testStatus}</AlertDescription>
            </Alert>
          )}

          {/* Test sections */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Synchronous errors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Synchronous Errors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={throwSyncError}
                  variant="destructive"
                  className="w-full"
                >
                  <Bomb className="mr-2 h-4 w-4" />
                  Throw Sync Error
                </Button>
                <p className="text-xs text-muted-foreground">
                  Throws an immediate error to test error boundary
                </p>
              </CardContent>
            </Card>

            {/* Asynchronous errors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Asynchronous Errors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={throwAsyncErrorTest}
                  variant="destructive"
                  className="w-full"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Throw Async Error (1s delay)
                </Button>
                <p className="text-xs text-muted-foreground">
                  Throws an error after 1 second delay
                </p>
              </CardContent>
            </Card>

            {/* Promise rejection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Unhandled Promise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={throwUnhandledRejection}
                  variant="destructive"
                  className="w-full"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Unhandled Promise Rejection
                </Button>
                <p className="text-xs text-muted-foreground">
                  Creates an unhandled promise rejection
                </p>
              </CardContent>
            </Card>

            {/* Network retry */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Network Retry</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={testNetworkRetry}
                  variant="outline"
                  className="w-full"
                >
                  <WifiOff className="mr-2 h-4 w-4" />
                  Test Network Retry (404)
                </Button>
                <p className="text-xs text-muted-foreground">
                  Tests retry logic with a failing endpoint
                </p>
              </CardContent>
            </Card>

            {/* Component crash */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Component Crash</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <CrashingComponent />
                <p className="text-xs text-muted-foreground">
                  Component that crashes on demand
                </p>
              </CardContent>
            </Card>

            {/* Memory error */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Memory Error</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={causeMemoryError}
                  variant="destructive"
                  className="w-full"
                >
                  <Bomb className="mr-2 h-4 w-4" />
                  Simulate Memory Error
                </Button>
                <p className="text-xs text-muted-foreground">
                  ⚠️ Warning: May freeze browser temporarily
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Success indicator */}
          <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-800 dark:text-green-300">
              Error Boundaries Active
            </AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-400">
              All errors thrown on this page will be caught by error boundaries.
              You should see a user-friendly error page instead of a white screen.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}