import { ReactNode, createContext, useContext } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

/**
 * Test wrapper that provides all necessary contexts for testing
 * Includes QueryClient, Router, Auth, and other providers
 */

// Mock Auth Context for testing
const mockAuthContext = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    user_type: 'admin',
    is_active: true,
  },
  isLoading: false,
  signIn: async () => ({ data: null, error: null }),
  signOut: async () => {},
  session: {
    user: { id: 'user-123', email: 'test@example.com' },
    access_token: 'mock-token',
  },
};

const TestAuthContext = createContext(mockAuthContext);

// Mock AuthProvider for tests
function MockAuthProvider({ children }: { children: ReactNode }) {
  return (
    <TestAuthContext.Provider value={mockAuthContext}>
      {children}
    </TestAuthContext.Provider>
  );
}

// Create a fresh QueryClient for each test to avoid state leakage
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Don't retry failed queries in tests
        cacheTime: 0, // Don't cache between tests
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {}, // Silence console errors in tests
    },
  });
}

interface TestWrapperProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

/**
 * Wrapper component for React Testing Library
 * Provides QueryClient, Router, and Auth context
 */
export function TestWrapper({ children, queryClient }: TestWrapperProps) {
  const client = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      <MockAuthProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </MockAuthProvider>
    </QueryClientProvider>
  );
}

/**
 * Helper function to create a wrapper for renderHook
 */
export function createWrapper(queryClient?: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );
  };
}
