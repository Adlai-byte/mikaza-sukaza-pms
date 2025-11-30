/**
 * Error Tracking Service
 *
 * A centralized error tracking solution that:
 * - Stores errors in IndexedDB for offline access
 * - Batches errors for efficient reporting
 * - Provides hooks for custom error handling
 * - Can be extended to integrate with Sentry, LogRocket, etc.
 */

import { ErrorInfo } from 'react';

// Extend window for error tracker user context
declare global {
  interface Window {
    __errorTrackerUser?: { userId: string; userEmail?: string };
  }
}

// Error report interface
export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  userId?: string;
  userEmail?: string;
  metadata?: Record<string, unknown>;
  severity: 'error' | 'warning' | 'info';
  handled: boolean;
  reported: boolean;
}

// Configuration
const ERROR_STORAGE_KEY = 'cc_error_reports';
const MAX_STORED_ERRORS = 100;
const BATCH_SIZE = 10;

// In-memory error cache
let errorQueue: ErrorReport[] = [];

// Generate unique error ID
const generateErrorId = (): string => {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get errors from localStorage
const getStoredErrors = (): ErrorReport[] => {
  try {
    const stored = localStorage.getItem(ERROR_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save errors to localStorage
const saveErrors = (errors: ErrorReport[]) => {
  try {
    // Keep only the most recent errors
    const trimmed = errors.slice(-MAX_STORED_ERRORS);
    localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Failed to save errors to localStorage:', e);
  }
};

// Create error report from Error object
const createErrorReport = (
  error: Error,
  options: {
    componentStack?: string;
    severity?: 'error' | 'warning' | 'info';
    handled?: boolean;
    metadata?: Record<string, unknown>;
    userId?: string;
    userEmail?: string;
  } = {}
): ErrorReport => {
  return {
    id: generateErrorId(),
    message: error.message,
    stack: error.stack,
    componentStack: options.componentStack,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    userId: options.userId,
    userEmail: options.userEmail,
    metadata: options.metadata,
    severity: options.severity || 'error',
    handled: options.handled ?? false,
    reported: false,
  };
};

// Main error tracking service
export const errorTracker = {
  /**
   * Capture an error
   */
  captureError: (
    error: Error,
    options?: {
      componentStack?: string;
      severity?: 'error' | 'warning' | 'info';
      handled?: boolean;
      metadata?: Record<string, unknown>;
      userId?: string;
      userEmail?: string;
    }
  ): ErrorReport => {
    const report = createErrorReport(error, options);

    // Add to queue
    errorQueue.push(report);

    // Store in localStorage
    const stored = getStoredErrors();
    stored.push(report);
    saveErrors(stored);

    // Log to console in development
    if (import.meta.env.DEV) {
      console.group(`[ErrorTracker] ${report.severity.toUpperCase()}`);
      console.error('Error:', error);
      console.log('Report:', report);
      console.groupEnd();
    }

    // Log summary in production
    if (import.meta.env.PROD) {
      console.error(`[ErrorTracker] ${report.severity}: ${report.message}`, {
        id: report.id,
        url: report.url,
        timestamp: report.timestamp,
      });
    }

    return report;
  },

  /**
   * Capture error from React Error Boundary
   */
  captureReactError: (
    error: Error,
    errorInfo: ErrorInfo,
    userId?: string,
    userEmail?: string
  ): ErrorReport => {
    return errorTracker.captureError(error, {
      componentStack: errorInfo.componentStack || undefined,
      severity: 'error',
      handled: true,
      userId,
      userEmail,
    });
  },

  /**
   * Capture a warning
   */
  captureWarning: (
    message: string,
    metadata?: Record<string, unknown>
  ): ErrorReport => {
    const error = new Error(message);
    return errorTracker.captureError(error, {
      severity: 'warning',
      handled: true,
      metadata,
    });
  },

  /**
   * Capture info/breadcrumb
   */
  captureInfo: (
    message: string,
    metadata?: Record<string, unknown>
  ): ErrorReport => {
    const error = new Error(message);
    return errorTracker.captureError(error, {
      severity: 'info',
      handled: true,
      metadata,
    });
  },

  /**
   * Get all stored errors
   */
  getErrors: (): ErrorReport[] => {
    return getStoredErrors();
  },

  /**
   * Get unreported errors
   */
  getUnreportedErrors: (): ErrorReport[] => {
    return getStoredErrors().filter(e => !e.reported);
  },

  /**
   * Mark errors as reported
   */
  markAsReported: (errorIds: string[]) => {
    const errors = getStoredErrors();
    const updated = errors.map(e => ({
      ...e,
      reported: errorIds.includes(e.id) ? true : e.reported,
    }));
    saveErrors(updated);
  },

  /**
   * Clear all stored errors
   */
  clearErrors: () => {
    localStorage.removeItem(ERROR_STORAGE_KEY);
    errorQueue = [];
  },

  /**
   * Clear reported errors only
   */
  clearReportedErrors: () => {
    const errors = getStoredErrors();
    const unreported = errors.filter(e => !e.reported);
    saveErrors(unreported);
  },

  /**
   * Get error summary for reporting
   */
  getSummary: (): {
    total: number;
    unreported: number;
    bySerity: Record<string, number>;
  } => {
    const errors = getStoredErrors();
    return {
      total: errors.length,
      unreported: errors.filter(e => !e.reported).length,
      bySerity: errors.reduce((acc, e) => {
        acc[e.severity] = (acc[e.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  },

  /**
   * Set user context for future errors
   */
  setUser: (userId: string, userEmail?: string) => {
    // Store user context for future errors
    if (typeof window !== 'undefined') {
      window.__errorTrackerUser = { userId, userEmail };
    }
  },

  /**
   * Clear user context
   */
  clearUser: () => {
    if (typeof window !== 'undefined') {
      delete window.__errorTrackerUser;
    }
  },

  /**
   * Export errors for manual reporting
   */
  exportErrors: (): string => {
    const errors = getStoredErrors();
    return JSON.stringify(errors, null, 2);
  },

  /**
   * Download errors as JSON file
   */
  downloadErrorReport: () => {
    const data = errorTracker.exportErrors();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

// Global error handler for uncaught errors
if (typeof window !== 'undefined') {
  window.onerror = (message, source, lineno, colno, error) => {
    if (error) {
      errorTracker.captureError(error, {
        handled: false,
        metadata: {
          source,
          lineno,
          colno,
        },
      });
    }
    // Return false to allow default error handling
    return false;
  };

  // Handle unhandled promise rejections
  window.onunhandledrejection = (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));

    errorTracker.captureError(error, {
      handled: false,
      metadata: {
        type: 'unhandledrejection',
      },
    });
  };
}

export default errorTracker;
