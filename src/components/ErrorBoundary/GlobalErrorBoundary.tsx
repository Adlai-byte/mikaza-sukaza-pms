import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, Home, RefreshCw, Bug, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { errorTracker } from '@/lib/error-tracking';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  showDetails: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    // Update state with error details
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external service (will be implemented with Sentry later)
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Use the centralized error tracking service
    errorTracker.captureReactError(error, errorInfo);
  };

  downloadErrorReport = () => {
    errorTracker.downloadErrorReport();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails,
    }));
  };

  reportBug = () => {
    const { error, errorInfo } = this.state;
    const issueBody = encodeURIComponent(
      `## Error Report\n\n**Error:** ${error?.message}\n\n**Stack:**\n\`\`\`\n${error?.stack}\n\`\`\`\n\n**Component Stack:**\n\`\`\`\n${errorInfo?.componentStack}\n\`\`\`\n\n**URL:** ${window.location.href}\n**User Agent:** ${navigator.userAgent}`
    );
    window.open(
      `https://github.com/casaconcierge/pms/issues/new?title=Error%20Report&body=${issueBody}`,
      '_blank'
    );
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorCount, showDetails } = this.state;

      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Oops! Something went wrong
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
                We're sorry for the inconvenience. The application encountered an unexpected error.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Error message */}
              <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <AlertTitle className="text-orange-800 dark:text-orange-300">
                  Error Details
                </AlertTitle>
                <AlertDescription className="text-orange-700 dark:text-orange-400">
                  {error?.message || 'An unexpected error occurred'}
                </AlertDescription>
              </Alert>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleReset}
                  className="flex-1"
                  variant="default"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleReload}
                  className="flex-1"
                  variant="outline"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Page
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  className="flex-1"
                  variant="outline"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
              </div>

              {/* Error count warning */}
              {errorCount > 1 && (
                <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                    This error has occurred {errorCount} times. If the problem persists, please contact support.
                  </AlertDescription>
                </Alert>
              )}

              {/* Technical details (collapsible) */}
              {import.meta.env.DEV && (
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                  <button
                    onClick={this.toggleDetails}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Technical Details (Development Only)
                    </span>
                    {showDetails ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </button>

                  {showDetails && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Error Stack:
                        </h4>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto">
                          {error?.stack}
                        </pre>
                      </div>

                      {errorInfo?.componentStack && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Component Stack:
                          </h4>
                          <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto">
                            {errorInfo.componentStack}
                          </pre>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          onClick={this.reportBug}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <Bug className="mr-2 h-4 w-4" />
                          Report Bug
                        </Button>
                        <Button
                          onClick={this.downloadErrorReport}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download Log
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Help text */}
              <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-4 border-t">
                <p>If you continue to experience issues, please contact support at</p>
                <a
                  href="mailto:support@casaconcierge.com"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  support@casaconcierge.com
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}