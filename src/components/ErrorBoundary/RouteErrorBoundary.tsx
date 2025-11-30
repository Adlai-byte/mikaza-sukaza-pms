import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, ArrowLeft, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface Props {
  children: ReactNode;
  routeName?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Wrapper component to use hooks
export function RouteErrorBoundary(props: Props) {
  const navigate = useNavigate();
  return <RouteErrorBoundaryClass {...props} navigate={navigate} />;
}

interface ClassProps extends Props {
  navigate: ReturnType<typeof useNavigate>;
}

class RouteErrorBoundaryClass extends Component<ClassProps, State> {
  constructor(props: ClassProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error in route ${this.props.routeName || 'unknown'}:`, error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoBack = () => {
    this.props.navigate(-1);
  };

  handleGoHome = () => {
    this.props.navigate('/');
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="text-center max-w-md">
            <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>

            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
              Something went wrong
            </h2>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {this.props.routeName
                ? `An error occurred while loading ${this.props.routeName}.`
                : 'An error occurred while loading this page.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleReset} variant="default" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={this.handleGoBack} variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              <Button onClick={this.handleGoHome} variant="outline" size="sm">
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="mt-6 text-left">
                <details className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                    Error Details (Dev Only)
                  </summary>
                  <pre className="mt-2 text-xs text-red-600 dark:text-red-400 overflow-x-auto">
                    {this.state.error.message}
                    {'\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}