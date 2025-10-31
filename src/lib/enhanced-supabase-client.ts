import { supabase } from '@/integrations/supabase/client';
import { withRetry, fetchWithRetry, CircuitBreaker } from '@/lib/api-retry';

/**
 * Enhanced Supabase client with automatic retry logic and circuit breaker
 */

// Create circuit breakers for different services
const databaseCircuitBreaker = new CircuitBreaker(5, 60000, (state) => {
  console.log(`Database circuit breaker state: ${state}`);
});

const storageCircuitBreaker = new CircuitBreaker(5, 60000, (state) => {
  console.log(`Storage circuit breaker state: ${state}`);
});

const authCircuitBreaker = new CircuitBreaker(3, 30000, (state) => {
  console.log(`Auth circuit breaker state: ${state}`);
});

/**
 * Enhanced database query with retry logic
 */
export async function queryWithRetry<T = any>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options = {}
) {
  return databaseCircuitBreaker.execute(() =>
    withRetry(
      async () => {
        const result = await queryFn();
        if (result.error) {
          // Check if it's a retryable error
          if (result.error.code === 'PGRST301' || // Network error
              result.error.code === 'PGRST000' || // Unknown error
              result.error.message?.includes('Failed to fetch') ||
              result.error.message?.includes('Network request failed')) {
            throw result.error; // Will trigger retry
          }
          // Non-retryable error (e.g., permission denied, not found)
          throw result.error;
        }
        return result;
      },
      {
        maxRetries: 3,
        onRetry: (error, attempt) => {
          console.warn(`Database query retry attempt ${attempt}:`, error.message);
        },
        retryCondition: (error) => {
          // Don't retry on auth errors or permission errors
          if (error.code === 'PGRST301' ||
              error.code === 'PGRST000' ||
              error.message?.includes('Failed to fetch') ||
              error.message?.includes('Network request failed')) {
            return true;
          }
          return false;
        },
        ...options,
      }
    )
  );
}

/**
 * Enhanced storage operations with retry logic
 */
export async function storageWithRetry<T = any>(
  storageFn: () => Promise<{ data: T | null; error: any }>,
  options = {}
) {
  return storageCircuitBreaker.execute(() =>
    withRetry(
      async () => {
        const result = await storageFn();
        if (result.error) {
          // Check if it's a retryable error
          if (result.error.statusCode >= 500 || // Server errors
              result.error.message?.includes('Failed to fetch') ||
              result.error.message?.includes('Network request failed')) {
            throw result.error;
          }
          throw result.error;
        }
        return result;
      },
      {
        maxRetries: 3,
        onRetry: (error, attempt) => {
          console.warn(`Storage operation retry attempt ${attempt}:`, error.message);
        },
        ...options,
      }
    )
  );
}

/**
 * Enhanced auth operations with retry logic
 */
export async function authWithRetry<T = any>(
  authFn: () => Promise<{ data: T | null; error: any }>,
  options = {}
) {
  return authCircuitBreaker.execute(() =>
    withRetry(
      async () => {
        const result = await authFn();
        if (result.error) {
          // Check if it's a retryable error
          if (result.error.status >= 500 || // Server errors
              result.error.message?.includes('Failed to fetch') ||
              result.error.message?.includes('Network request failed')) {
            throw result.error;
          }
          throw result.error;
        }
        return result;
      },
      {
        maxRetries: 2, // Less retries for auth
        onRetry: (error, attempt) => {
          console.warn(`Auth operation retry attempt ${attempt}:`, error.message);
        },
        ...options,
      }
    )
  );
}

/**
 * Enhanced Supabase client with retry wrappers
 */
export const enhancedSupabase = {
  // Original client for cases where you don't want retry
  client: supabase,

  // Database operations with retry
  from: (table: string) => ({
    select: (columns = '*') => ({
      execute: async () => queryWithRetry(() =>
        supabase.from(table).select(columns)
      ),
      eq: (column: string, value: any) => ({
        execute: async () => queryWithRetry(() =>
          supabase.from(table).select(columns).eq(column, value)
        ),
        single: async () => queryWithRetry(() =>
          supabase.from(table).select(columns).eq(column, value).single()
        ),
      }),
      filter: (column: string, operator: string, value: any) => ({
        execute: async () => queryWithRetry(() =>
          supabase.from(table).select(columns).filter(column, operator, value)
        ),
      }),
    }),
    insert: (data: any) => ({
      execute: async () => queryWithRetry(() =>
        supabase.from(table).insert(data)
      ),
      select: () => ({
        execute: async () => queryWithRetry(() =>
          supabase.from(table).insert(data).select()
        ),
      }),
    }),
    update: (data: any) => ({
      eq: (column: string, value: any) => ({
        execute: async () => queryWithRetry(() =>
          supabase.from(table).update(data).eq(column, value)
        ),
      }),
    }),
    delete: () => ({
      eq: (column: string, value: any) => ({
        execute: async () => queryWithRetry(() =>
          supabase.from(table).delete().eq(column, value)
        ),
      }),
    }),
  }),

  // Storage operations with retry
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: File | Blob, options?: any) =>
        storageWithRetry(() =>
          supabase.storage.from(bucket).upload(path, file, options)
        ),
      download: async (path: string) =>
        storageWithRetry(() =>
          supabase.storage.from(bucket).download(path)
        ),
      remove: async (paths: string[]) =>
        storageWithRetry(() =>
          supabase.storage.from(bucket).remove(paths)
        ),
      createSignedUrl: async (path: string, expiresIn: number) =>
        storageWithRetry(() =>
          supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
        ),
      getPublicUrl: (path: string) =>
        supabase.storage.from(bucket).getPublicUrl(path),
    }),
  },

  // Auth operations with retry
  auth: {
    signIn: async (credentials: any) =>
      authWithRetry(() =>
        supabase.auth.signInWithPassword(credentials)
      ),
    signUp: async (credentials: any) =>
      authWithRetry(() =>
        supabase.auth.signUp(credentials)
      ),
    signOut: async () =>
      authWithRetry(() =>
        supabase.auth.signOut()
      ),
    getSession: async () =>
      authWithRetry(() =>
        supabase.auth.getSession()
      ),
    resetPasswordForEmail: async (email: string, options?: any) =>
      authWithRetry(() =>
        supabase.auth.resetPasswordForEmail(email, options)
      ),
  },

  // Functions with retry
  functions: {
    invoke: async (functionName: string, options?: any) =>
      withRetry(
        () => supabase.functions.invoke(functionName, options),
        {
          maxRetries: 2,
          onRetry: (error, attempt) => {
            console.warn(`Function ${functionName} retry attempt ${attempt}:`, error);
          },
        }
      ),
  },
};

// Export circuit breaker states for monitoring
export function getCircuitBreakerStates() {
  return {
    database: databaseCircuitBreaker.getState(),
    storage: storageCircuitBreaker.getState(),
    auth: authCircuitBreaker.getState(),
  };
}