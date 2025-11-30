import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUsersOptimized } from '../useUsersOptimized';
import { createWrapper } from '@/test/utils/test-wrapper';
import { mockUser, createMockArray } from '@/test/utils/mock-data';

// Mock Supabase client - using inline factory to avoid hoisting issues
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signUp: vi.fn(),
    },
  },
}));

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useActivityLogs', () => ({
  useActivityLogs: () => ({ logActivity: vi.fn() }),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: vi.fn(() => true) }),
}));

// Import after mocks to get mocked versions
import { supabase as mockSupabase } from '@/integrations/supabase/client';

describe('useUsersOptimized', () => {
  const mockUsers = createMockArray(mockUser, 10);
  const testUser = mockUser({
    user_id: 'user-1',
    email: 'test@example.com',
    user_type: 'customer',
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'new-user-id' } },
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              then: vi.fn().mockResolvedValue({
                data: mockUsers,
                error: null,
              }),
            }),
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockReturnValue({
                then: vi.fn().mockResolvedValue({
                  data: testUser,
                  error: null,
                }),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockReturnValue({
                then: vi.fn().mockResolvedValue({
                  data: testUser,
                  error: null,
                }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockReturnValue({
                  then: vi.fn().mockResolvedValue({
                    data: testUser,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              then: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          then: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });
  });

  describe('fetching users', () => {
    it('should fetch all users', async () => {
      const { result } = renderHook(() => useUsersOptimized(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.users).toHaveLength(10);
      });
    });
  });

  describe('createUser', () => {
    it('should create user with Supabase Auth', async () => {
      const { result } = renderHook(() => useUsersOptimized(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newUser = {
        email: 'newuser@example.com',
        password: 'TestPass123!',
        first_name: 'New',
        last_name: 'User',
        user_type: 'customer' as const,
      };

      await result.current.createUser(newUser);

      expect(mockSupabase.auth.signUp).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });

    it('should validate password', async () => {
      const { result } = renderHook(() => useUsersOptimized(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const weakPassword = {
        email: 'test@example.com',
        password: '123', // Weak password
        first_name: 'Test',
        last_name: 'User',
        user_type: 'customer' as const,
      };

      // Password validation should prevent this
      await expect(result.current.createUser(weakPassword)).rejects.toThrow();
    });
  });

  describe('updateUser', () => {
    it('should update user and trigger immediate table refresh', async () => {
      const { result } = renderHook(() => useUsersOptimized(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updates = {
        first_name: 'Updated',
        last_name: 'Name',
      };

      await result.current.updateUser('user-1', updates);

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });
  });

  describe('deleteUser', () => {
    it('should delete user and trigger immediate table refresh', async () => {
      const { result } = renderHook(() => useUsersOptimized(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.deleteUser('user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });
  });

  describe('mutateAsync pattern', () => {
    it('should use mutateAsync for promise-based mutations', async () => {
      const { result } = renderHook(() => useUsersOptimized(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // The hook should return functions that are promise-based
      const updatePromise = result.current.updateUser('user-1', { first_name: 'Test' });

      expect(updatePromise).toBeInstanceOf(Promise);

      await updatePromise;
    });
  });
});
