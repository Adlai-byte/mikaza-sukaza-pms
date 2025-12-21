import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { useAuth, AuthProvider } from '../AuthContext';
import { mockUser } from '@/test/utils/mock-data';

// Mock Supabase client - using inline factory to avoid hoisting issues
vi.mock('@/integrations/supabase/client', () => {
  const mockAuth = {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
  };

  const mockFrom = vi.fn();

  return {
    supabase: {
      auth: mockAuth,
      from: mockFrom,
    },
  };
});

// Mock cache warmer
vi.mock('@/lib/cache-manager-simplified', () => ({
  cacheWarmer: {
    warmCriticalData: vi.fn().mockResolvedValue(undefined),
  },
}));

// Import after mocks to get mocked versions
import { supabase as mockSupabase } from '@/integrations/supabase/client';

describe('AuthContext', () => {
  const mockUserData = mockUser({
    user_id: 'test-user-id',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    user_type: 'admin',
    is_active: true,
  });

  const mockSession = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      email_confirmed_at: '2025-01-01T00:00:00.000Z',
    },
    access_token: 'mock-token',
    expires_at: Date.now() + 3600000,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockUserData,
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockUserData,
          error: null,
        }),
      }),
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Capture console errors
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleError.mockRestore();
    });

    it('should return auth context when used within AuthProvider', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('session');
      expect(result.current).toHaveProperty('profile');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('isAdmin');
      expect(result.current).toHaveProperty('isOps');
      expect(result.current).toHaveProperty('signIn');
      expect(result.current).toHaveProperty('signUp');
      expect(result.current).toHaveProperty('signOut');
      expect(result.current).toHaveProperty('updateProfile');
    });
  });

  describe('signIn', () => {
    it('should successfully sign in with valid credentials', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockSession.user, session: mockSession },
        error: null,
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(signInResult).toHaveProperty('data');
      expect(signInResult).toHaveProperty('error', null);
    });

    it('should handle invalid credentials error', async () => {
      const errorMessage = 'Invalid login credentials';
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: { message: errorMessage, code: 'invalid_credentials' },
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn('wrong@example.com', 'wrongpass');
      });

      expect(signInResult).toHaveProperty('error');
      expect(signInResult.error.message).toBe(errorMessage);
    });

    it('should update last_login_at timestamp on successful sign in', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockSession.user, session: mockSession },
        error: null,
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      // Check that update was called for both users and profiles tables
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('users');
        expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      });
    });

    it('should handle network errors gracefully', async () => {
      mockSupabase.auth.signInWithPassword.mockRejectedValueOnce(
        new Error('Network request failed')
      );

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.signIn('test@example.com', 'password123');
        })
      ).rejects.toThrow('Network request failed');
    });
  });

  describe('signUp', () => {
    it('should successfully sign up a new user', async () => {
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: mockSession.user },
        error: null,
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp(
          'newuser@example.com',
          'password123',
          'New',
          'User'
        );
      });

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
        options: {
          emailRedirectTo: expect.stringContaining(window.location.origin),
          data: {
            first_name: 'New',
            last_name: 'User',
          },
        },
      });
      expect(signUpResult).toHaveProperty('error', null);
    });

    it('should handle duplicate email error', async () => {
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: null,
        error: { message: 'User already registered', code: 'user_already_exists' },
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp('existing@example.com', 'password123');
      });

      expect(signUpResult).toHaveProperty('error');
      expect(signUpResult.error.message).toBe('User already registered');
    });

    it('should handle weak password error', async () => {
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: null,
        error: { message: 'Password is too weak', code: 'weak_password' },
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp('newuser@example.com', '123');
      });

      expect(signUpResult).toHaveProperty('error');
      expect(signUpResult.error.code).toBe('weak_password');
    });
  });

  describe('signOut', () => {
    it('should successfully sign out and clear state', async () => {
      // Capture the auth state change callback
      let authStateChangeCallback: ((event: string, session: any) => void) | null = null;

      mockSupabase.auth.onAuthStateChange.mockImplementation((callback: any) => {
        authStateChangeCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      });

      // First set up a signed-in state
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      mockSupabase.auth.signOut.mockImplementation(async () => {
        // Trigger auth state change to SIGNED_OUT when signOut is called
        if (authStateChangeCallback) {
          authStateChangeCallback('SIGNED_OUT', null);
        }
        return { error: null };
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial session to load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();

      // Wait for state to be cleared after signOut
      await waitFor(() => {
        expect(result.current.user).toBeNull();
      });

      expect(result.current.session).toBeNull();
    });

    it('should handle sign out errors and still clear local state', async () => {
      // Capture the auth state change callback
      let authStateChangeCallback: ((event: string, session: any) => void) | null = null;

      mockSupabase.auth.onAuthStateChange.mockImplementation((callback: any) => {
        authStateChangeCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      });

      mockSupabase.auth.signOut.mockImplementation(async () => {
        // Even on error, trigger state change to clear local state
        if (authStateChangeCallback) {
          authStateChangeCallback('SIGNED_OUT', null);
        }
        return { error: { message: 'Sign out failed', code: 'signout_error' } };
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for component to mount
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.signOut();
        })
      ).rejects.toThrow();

      // State should still be cleared even on error
      await waitFor(() => {
        expect(result.current.user).toBeNull();
      });
      expect(result.current.session).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should successfully update profile data', async () => {
      // Set up authenticated state
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial session load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updates = { first_name: 'Updated', last_name: 'Name' };

      await act(async () => {
        await result.current.updateProfile(updates);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    });

    it('should not update profile when user is not authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateProfile({ first_name: 'Test' });
      });

      // Should not call supabase.from('profiles') when user is null
      expect(mockSupabase.from).not.toHaveBeenCalledWith('profiles');
    });

    it('should handle profile update errors', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      // Mock update to return error
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Update failed', code: 'update_error' },
          }),
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUserData,
              error: null,
            }),
          }),
        }),
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.updateProfile({ first_name: 'Test' });
        })
      ).rejects.toThrow();
    });
  });

  describe('computed properties', () => {
    it('should set isAdmin to true for admin user type', async () => {
      const adminUser = { ...mockUserData, user_type: 'admin' as const };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: adminUser,
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.isAdmin).toBe(true);
        expect(result.current.isOps).toBe(false);
      });
    });

    it('should set isOps to true for ops user type', async () => {
      const opsUser = { ...mockUserData, user_type: 'ops' as const };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: opsUser,
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.isAdmin).toBe(false);
        expect(result.current.isOps).toBe(true);
      });
    });

    it('should set both isAdmin and isOps to false for customer user', async () => {
      const customerUser = { ...mockUserData, user_type: 'customer' as const };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: customerUser,
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.isAdmin).toBe(false);
        expect(result.current.isOps).toBe(false);
      });
    });
  });

  describe('profile fetching', () => {
    it('should fetch profile when session exists on mount', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.profile).toBeTruthy();
        expect(result.current.profile?.email).toBe(mockUserData.email);
      });
    });

    it('should handle profile fetch errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Profile not found', code: 'not_found' },
            }),
          }),
        }),
      });

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should set loading to false even on error
      expect(result.current.loading).toBe(false);
    });
  });

  describe('loading state', () => {
    it('should start with loading true and set to false after session check', async () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Initially should be loading
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });
});
