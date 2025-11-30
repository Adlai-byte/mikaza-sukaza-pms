/**
 * Error Message Helper
 *
 * Maps error codes and types to i18n translation keys
 * for user-friendly error messages.
 */

import i18n from '@/i18n/config';

// Supabase error codes mapping
const SUPABASE_ERROR_MAP: Record<string, string> = {
  // Auth errors
  'invalid_credentials': 'errors.invalidCredentials',
  'email_taken': 'errors.emailInUse',
  'weak_password': 'errors.weakPassword',
  'user_not_found': 'errors.userNotFound',
  'over_request_rate_limit': 'errors.rateLimit',
  'email_not_confirmed': 'errors.emailNotConfirmed',
  'invalid_grant': 'errors.invalidCredentials',
  'user_already_exists': 'errors.emailInUse',

  // Database errors
  'PGRST116': 'errors.notFound', // Row not found
  'PGRST301': 'errors.conflict', // Unique constraint violation
  '23505': 'errors.conflict', // PostgreSQL unique violation
  '23503': 'errors.conflict', // PostgreSQL foreign key violation
  '42501': 'errors.forbidden', // Insufficient privileges
  '42P01': 'errors.notFound', // Undefined table

  // Network errors
  'FetchError': 'errors.network',
  'NetworkError': 'errors.network',
  'TypeError': 'errors.network',
  'AbortError': 'errors.timeout',
};

// HTTP status code mapping
const HTTP_STATUS_MAP: Record<number, string> = {
  400: 'errors.validation',
  401: 'errors.unauthorized',
  403: 'errors.forbidden',
  404: 'errors.notFound',
  408: 'errors.timeout',
  409: 'errors.conflict',
  422: 'errors.validation',
  429: 'errors.rateLimit',
  500: 'errors.serverError',
  502: 'errors.serverError',
  503: 'errors.maintenance',
  504: 'errors.timeout',
};

// Error message patterns for detection
const ERROR_PATTERNS: [RegExp, string][] = [
  [/network|fetch|connection|offline/i, 'errors.network'],
  [/unauthorized|not authenticated|login required/i, 'errors.unauthorized'],
  [/forbidden|permission|access denied/i, 'errors.forbidden'],
  [/not found|does not exist|404/i, 'errors.notFound'],
  [/timeout|timed out|deadline/i, 'errors.timeout'],
  [/rate limit|too many requests|throttle/i, 'errors.rateLimit'],
  [/duplicate|already exists|unique|conflict/i, 'errors.conflict'],
  [/invalid|validation|required/i, 'errors.validation'],
  [/server error|internal error|500/i, 'errors.serverError'],
  [/maintenance|unavailable|503/i, 'errors.maintenance'],
  [/upload|file.*failed/i, 'errors.uploadFailed'],
  [/download.*failed/i, 'errors.downloadFailed'],
  [/save.*failed|update.*failed/i, 'errors.saveFailed'],
  [/delete.*failed/i, 'errors.deleteFailed'],
  [/load.*failed|fetch.*failed/i, 'errors.loadFailed'],
  [/session.*expired|token.*expired/i, 'errors.sessionExpired'],
  [/invalid.*password|wrong.*password|incorrect.*password/i, 'errors.invalidCredentials'],
  [/email.*use|email.*taken/i, 'errors.emailInUse'],
  [/weak.*password|password.*weak/i, 'errors.weakPassword'],
  [/user.*not.*found|no.*account/i, 'errors.userNotFound'],
  [/too many.*attempts|failed.*attempts/i, 'errors.tooManyAttempts'],
];

// Extended error interface for errors with code/status properties
interface ExtendedError extends Error {
  code?: string;
  status?: number;
}

export interface ErrorOptions {
  /** Original error object */
  error?: Error | unknown;
  /** HTTP status code if available */
  statusCode?: number;
  /** Supabase error code */
  code?: string;
  /** Fallback message if no translation found */
  fallback?: string;
  /** Additional context for error */
  context?: string;
}

/**
 * Get translated error message from error object or code
 */
export function getErrorMessage(options: ErrorOptions = {}): string {
  const { error, statusCode, code, fallback, context } = options;

  // Try to get error code from error object
  let errorCode = code;
  let errorMessage = '';

  if (error instanceof Error) {
    errorMessage = error.message;
    const extError = error as ExtendedError;
    // Check if error has a code property (Supabase errors)
    if ('code' in error && typeof extError.code === 'string') {
      errorCode = extError.code;
    }
    // Check for status in error
    if ('status' in error && typeof extError.status === 'number') {
      const status = extError.status;
      if (!statusCode && HTTP_STATUS_MAP[status]) {
        const key = HTTP_STATUS_MAP[status];
        const translated = i18n.t(key);
        if (translated !== key) {
          return context ? `${context}: ${translated}` : translated;
        }
      }
    }
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  // Try Supabase error code mapping
  if (errorCode && SUPABASE_ERROR_MAP[errorCode]) {
    const key = SUPABASE_ERROR_MAP[errorCode];
    const translated = i18n.t(key);
    if (translated !== key) {
      return context ? `${context}: ${translated}` : translated;
    }
  }

  // Try HTTP status code mapping
  if (statusCode && HTTP_STATUS_MAP[statusCode]) {
    const key = HTTP_STATUS_MAP[statusCode];
    const translated = i18n.t(key);
    if (translated !== key) {
      return context ? `${context}: ${translated}` : translated;
    }
  }

  // Try pattern matching on error message
  if (errorMessage) {
    for (const [pattern, key] of ERROR_PATTERNS) {
      if (pattern.test(errorMessage)) {
        const translated = i18n.t(key);
        if (translated !== key) {
          return context ? `${context}: ${translated}` : translated;
        }
      }
    }
  }

  // Return fallback or generic message
  if (fallback) {
    return context ? `${context}: ${fallback}` : fallback;
  }

  const genericMessage = i18n.t('errors.generic');
  return context ? `${context}: ${genericMessage}` : genericMessage;
}

/**
 * Get error translation key from error object or code
 */
export function getErrorKey(options: ErrorOptions = {}): string {
  const { error, statusCode, code } = options;

  let errorCode = code;
  let errorMessage = '';

  if (error instanceof Error) {
    errorMessage = error.message;
    const extError = error as ExtendedError;
    if ('code' in error && typeof extError.code === 'string') {
      errorCode = extError.code;
    }
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  // Check Supabase error code
  if (errorCode && SUPABASE_ERROR_MAP[errorCode]) {
    return SUPABASE_ERROR_MAP[errorCode];
  }

  // Check HTTP status code
  if (statusCode && HTTP_STATUS_MAP[statusCode]) {
    return HTTP_STATUS_MAP[statusCode];
  }

  // Pattern matching
  if (errorMessage) {
    for (const [pattern, key] of ERROR_PATTERNS) {
      if (pattern.test(errorMessage)) {
        return key;
      }
    }
  }

  return 'errors.generic';
}

/**
 * Check if error is a network-related error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('offline') ||
      error.name === 'TypeError' ||
      error.name === 'NetworkError' ||
      error.name === 'FetchError'
    );
  }
  return false;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const code = 'code' in error ? String((error as any).code).toLowerCase() : '';
    return (
      message.includes('unauthorized') ||
      message.includes('authentication') ||
      message.includes('session expired') ||
      code.includes('invalid_credentials') ||
      code.includes('user_not_found')
    );
  }
  return false;
}

/**
 * Check if error requires user to retry
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('rate limit') ||
      message.includes('server error') ||
      message.includes('503')
    );
  }
  return false;
}

export default {
  getErrorMessage,
  getErrorKey,
  isNetworkError,
  isAuthError,
  isRetryableError,
};
