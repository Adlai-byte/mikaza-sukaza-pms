/**
 * Supabase client mocking utilities
 * Provides helpers to mock Supabase responses in tests
 */

import { vi } from 'vitest';

/**
 * Create a mock Supabase query builder with proper promise resolution
 */
export function createMockSupabaseQuery(data: any, error: any = null) {
  const result = { data, error };

  const query: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    // Terminal methods that return promises
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };

  // Override specific methods to return resolved promises when needed
  query.select.mockImplementation((...args: any[]) => query);
  query.insert.mockImplementation((...args: any[]) => query);
  query.update.mockImplementation((...args: any[]) => query);
  query.delete.mockImplementation((...args: any[]) => query);
  query.eq.mockImplementation((...args: any[]) => query);
  query.not.mockImplementation((...args: any[]) => query);
  query.gte.mockImplementation((...args: any[]) => query);
  query.lte.mockImplementation((...args: any[]) => query);
  query.order.mockImplementation((...args: any[]) => query);
  query.limit.mockImplementation((...args: any[]) => query);

  // Make the query itself a thenable (Promise-like) that resolves to result
  query.then = vi.fn((onFulfilled: any) => {
    return Promise.resolve(result).then(onFulfilled);
  });

  return query;
}

/**
 * Create an advanced mock query chain that handles complex Supabase queries
 * This is useful for testing hooks with complex query patterns
 */
export function createMockQueryChain(finalResult: { data: any; error: any }) {
  const chain: any = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalResult),
    maybeSingle: vi.fn().mockResolvedValue(finalResult),
  };

  // Make chain thenable so it can be awaited
  chain.then = (onFulfilled: any) => Promise.resolve(finalResult).then(onFulfilled);

  return chain;
}

/**
 * Mock successful Supabase response
 */
export function mockSupabaseSuccess<T>(data: T) {
  return { data, error: null };
}

/**
 * Mock Supabase error response
 */
export function mockSupabaseError(message: string, code = 'PGRST116') {
  return {
    data: null,
    error: {
      message,
      code,
      details: '',
      hint: '',
    },
  };
}

/**
 * Mock Supabase client for testing hooks
 */
export function createMockSupabaseClient(responses: Record<string, any> = {}) {
  return {
    from: vi.fn((table: string) => {
      const response = responses[table] || { data: [], error: null };
      return createMockSupabaseQuery(response.data, response.error);
    }),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-123', email: 'test@example.com' },
            access_token: 'mock-token',
          },
        },
        error: null,
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    storage: {
      from: vi.fn((bucket: string) => ({
        upload: vi.fn().mockResolvedValue({
          data: { path: `${bucket}/test-file.pdf` },
          error: null,
        }),
        download: vi.fn().mockResolvedValue({
          data: new Blob(['test content']),
          error: null,
        }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi.fn((path: string) => ({
          data: { publicUrl: `https://example.com/${path}` },
        })),
      })),
    },
  };
}

/**
 * Mock React Query mutation for testing
 */
export function createMockMutation<TData, TVariables>(
  mutationFn?: (variables: TVariables) => Promise<TData>
) {
  return {
    mutate: vi.fn(),
    mutateAsync: mutationFn || vi.fn(),
    isLoading: false,
    isError: false,
    isSuccess: false,
    data: undefined,
    error: null,
    reset: vi.fn(),
  };
}

/**
 * Mock React Query query for testing
 */
export function createMockQuery<TData>(data?: TData, options?: {
  isLoading?: boolean;
  isError?: boolean;
  error?: Error;
}) {
  return {
    data,
    isLoading: options?.isLoading ?? false,
    isError: options?.isError ?? false,
    error: options?.error ?? null,
    refetch: vi.fn(),
    isFetching: false,
    isSuccess: !options?.isLoading && !options?.isError,
  };
}

/**
 * Wait for async operations in tests
 */
export async function waitForAsync() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Mock window.matchMedia for responsive component tests
 */
export function mockMatchMedia(matches = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

/**
 * Mock IntersectionObserver for lazy loading tests
 */
export function mockIntersectionObserver() {
  global.IntersectionObserver = class IntersectionObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
    takeRecords = vi.fn();
    root = null;
    rootMargin = '';
    thresholds = [];
  } as any;
}
