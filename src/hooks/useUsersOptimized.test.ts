import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUsersOptimized } from './useUsersOptimized';
import { createWrapper } from '@/test/utils/test-wrapper';
import { mockUser, mockAdminUser, mockStaffUser } from '@/test/utils/mock-data';
import { mockSupabaseSuccess, mockSupabaseError } from '@/test/utils/supabase-mock';

// Mock dependencies
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/hooks/useActivityLogs', () => ({
  useActivityLogs: () => ({
    logActivity: vi.fn(),
  }),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: vi.fn().mockReturnValue(true),
  }),
}));

vi.mock('@/lib/password-validation', () => ({
  validatePassword: vi.fn((password: string) => ({
    isValid: password.length >= 8,
    errors: password.length >= 8 ? [] : ['Password must be at least 8 characters'],
  })),
}));

vi.mock('@/lib/cache-manager-simplified', () => ({
  OptimisticUpdates: {
    updateUser: vi.fn(() => vi.fn()),
  },
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com', user_type: 'admin', is_active: true },
    session: { user: { id: 'user-123' }, access_token: 'mock-token' },
    isLoading: false,
  }),
  AuthProvider: ({ children }: any) => children,
}));

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
      }),
      signUp: vi.fn(),
    },
  },
}));

// Import after mocking
import { supabase } from '@/integrations/supabase/client';
const mockSupabase = supabase as any;

describe('useUsersOptimized', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Fetching Users', () => {
    it('should fetch all users successfully', async () => {
      const mockUsers = [
        mockUser({ user_id: 'user-1', email: 'user1@example.com', first_name: 'John' }),
        mockUser({ user_id: 'user-2', email: 'user2@example.com', first_name: 'Jane' }),
        mockAdminUser({ user_id: 'user-3', email: 'admin@example.com' }),
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockUsers)),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUsersOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.users).toEqual(mockUsers);
      expect(result.current.users.length).toBe(3);
    });

    it('should return empty array when no users exist', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUsersOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.users).toEqual([]);
    });

    it('should handle fetch error gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseError('Failed to fetch users')),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUsersOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 5000 }); // Wait for React Query retries to complete

      // Should have empty array on error
      expect(result.current.users).toEqual([]);
    });

    it('should fetch users sorted by created_at descending', async () => {
      const mockUsers = [
        mockUser({ user_id: 'user-3', created_at: '2025-10-23T00:00:00Z' }),
        mockUser({ user_id: 'user-2', created_at: '2025-10-22T00:00:00Z' }),
        mockUser({ user_id: 'user-1', created_at: '2025-10-21T00:00:00Z' }),
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockUsers)),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUsersOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify newest user is first
      expect(result.current.users[0].user_id).toBe('user-3');
      expect(result.current.users[1].user_id).toBe('user-2');
      expect(result.current.users[2].user_id).toBe('user-1');
    });
  });

  describe('User Types', () => {
    it('should fetch users with different types', async () => {
      const mockUsers = [
        mockAdminUser({ user_id: 'admin-1' }),
        mockStaffUser({ user_id: 'staff-1' }),
        mockUser({ user_id: 'owner-1', user_type: 'owner' }),
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockUsers)),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUsersOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const admin = result.current.users.find(u => u.user_type === 'admin');
      const staff = result.current.users.find(u => u.user_type === 'staff');
      const owner = result.current.users.find(u => u.user_type === 'owner');

      expect(admin).toBeTruthy();
      expect(staff).toBeTruthy();
      expect(owner).toBeTruthy();
    });

    it('should handle active and inactive users', async () => {
      const mockUsers = [
        mockUser({ user_id: 'user-1', is_active: true }),
        mockUser({ user_id: 'user-2', is_active: false }),
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockUsers)),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUsersOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const activeUser = result.current.users.find(u => u.user_id === 'user-1');
      const inactiveUser = result.current.users.find(u => u.user_id === 'user-2');

      expect(activeUser?.is_active).toBe(true);
      expect(inactiveUser?.is_active).toBe(false);
    });
  });

  describe('Creating Users', () => {
    it('should create user successfully', async () => {
      const newUser = mockUser({
        user_id: 'new-user-123',
        email: 'newuser@example.com',
        first_name: 'New',
        last_name: 'User',
      });

      // Mock auth signup
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: { id: 'new-user-123' } },
        error: null,
      });

      // Mock database insert
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseSuccess(newUser)),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
        }),
        insert: insertMock,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUsersOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.createUser({
        email: 'newuser@example.com',
        password: 'StrongPassword123!',
        first_name: 'New',
        last_name: 'User',
        user_type: 'owner',
        is_active: true,
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });

      expect(mockSupabase.auth.signUp).toHaveBeenCalled();
      expect(insertMock).toHaveBeenCalled();
    });

    it('should reject user creation with weak password', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUsersOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.createUser({
        email: 'test@example.com',
        password: 'weak', // Too short
        first_name: 'Test',
        last_name: 'User',
        user_type: 'owner',
        is_active: true,
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });

      // Should not have called signUp due to validation failure
      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('should reject user creation without password', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUsersOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.createUser({
        email: 'test@example.com',
        // password missing
        first_name: 'Test',
        last_name: 'User',
        user_type: 'owner',
        is_active: true,
      } as any);

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });

      expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('should handle auth signup failure', async () => {
      // Mock auth signup failure
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Email already exists' },
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUsersOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.createUser({
        email: 'existing@example.com',
        password: 'StrongPassword123!',
        first_name: 'Test',
        last_name: 'User',
        user_type: 'owner',
        is_active: true,
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });

      expect(mockSupabase.auth.signUp).toHaveBeenCalled();
    });
  });

  describe('Updating Users', () => {
    it('should update user successfully', async () => {
      const existingUser = mockUser({ user_id: 'user-123' });
      const updatedUser = mockUser({
        user_id: 'user-123',
        first_name: 'Updated',
        last_name: 'Name',
      });

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(updatedUser)),
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess([existingUser])),
        }),
        update: updateMock,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUsersOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.updateUser('user-123', {
        first_name: 'Updated',
        last_name: 'Name',
      });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });

      expect(updateMock).toHaveBeenCalled();
    });

    it('should update user password with validation', async () => {
      const existingUser = mockUser({ user_id: 'user-123' });

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(existingUser)),
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess([existingUser])),
        }),
        update: updateMock,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUsersOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.updateUser('user-123', {
        password: 'NewStrongPassword123!',
      });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });

      expect(updateMock).toHaveBeenCalled();
    });

    it('should reject password update with weak password', async () => {
      const existingUser = mockUser({ user_id: 'user-123' });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess([existingUser])),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUsersOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.updateUser('user-123', {
        password: 'weak', // Too short
      });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });
    });

    it('should update user status (active/inactive)', async () => {
      const existingUser = mockUser({ user_id: 'user-123', is_active: true });
      const updatedUser = mockUser({ user_id: 'user-123', is_active: false });

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(updatedUser)),
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess([existingUser])),
        }),
        update: updateMock,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUsersOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.updateUser('user-123', {
        is_active: false,
      });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });

      expect(updateMock).toHaveBeenCalled();
    });

    it('should handle update error', async () => {
      const existingUser = mockUser({ user_id: 'user-123' });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess([existingUser])),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseError('Failed to update user')),
            }),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUsersOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.updateUser('user-123', {
        first_name: 'Updated',
      });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });
    });
  });

  describe('Deleting Users', () => {
    it('should delete user successfully', async () => {
      const userToDelete = mockUser({ user_id: 'user-123', email: 'delete@example.com' });

      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess([userToDelete])),
        }),
        delete: deleteMock,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUsersOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.deleteUser('user-123');

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });

      expect(deleteMock).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });

    it('should handle delete error', async () => {
      const userToDelete = mockUser({ user_id: 'user-123' });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess([userToDelete])),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSupabaseError('Failed to delete user')),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUsersOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.deleteUser('user-123');

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });
    });
  });

  describe('Bank Accounts and Credit Cards', () => {
    it('should fetch bank accounts for a user', async () => {
      const mockBankAccounts = [
        { account_id: 'acc-1', user_id: 'user-123', account_number: '****1234', bank_name: 'Test Bank' },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
        if (table === 'bank_accounts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockBankAccounts)),
            }),
          };
        }
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUsersOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Render the bank accounts hook
      const { result: bankAccountsResult } = renderHook(
        () => result.current.useUserBankAccounts('user-123'),
        { wrapper }
      );

      await waitFor(() => {
        expect(bankAccountsResult.current.isLoading).toBe(false);
      });

      expect(bankAccountsResult.current.data).toEqual(mockBankAccounts);
    });

    it('should fetch credit cards for a user', async () => {
      const mockCreditCards = [
        { card_id: 'card-1', user_id: 'user-123', last_four: '5678', card_type: 'Visa' },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          };
        }
        if (table === 'credit_cards') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockCreditCards)),
            }),
          };
        }
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUsersOptimized(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Render the credit cards hook
      const { result: creditCardsResult } = renderHook(
        () => result.current.useUserCreditCards('user-123'),
        { wrapper }
      );

      await waitFor(() => {
        expect(creditCardsResult.current.isLoading).toBe(false);
      });

      expect(creditCardsResult.current.data).toEqual(mockCreditCards);
    });
  });
});
