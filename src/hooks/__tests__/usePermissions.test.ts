/**
 * usePermissions Hook Tests
 * Tests the React hook for permission checking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermissions, useAuthorize } from '../usePermissions';
import { PERMISSIONS } from '@/lib/rbac/permissions';

// Mock AuthContext
const mockProfile = {
  user_id: 'test-user-id',
  email: 'test@example.com',
  user_type: 'admin',
  first_name: 'Test',
  last_name: 'User',
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    profile: mockProfile,
    user: { id: 'test-user-id' },
    session: { access_token: 'test-token' },
    isLoading: false,
  })),
}));

// Import the mocked useAuth to control it in tests
import { useAuth } from '@/contexts/AuthContext';

describe('usePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to admin by default
    vi.mocked(useAuth).mockReturnValue({
      profile: { ...mockProfile, user_type: 'admin' },
      user: { id: 'test-user-id' },
      session: { access_token: 'test-token' },
      isLoading: false,
    } as any);
  });

  describe('basic functionality', () => {
    it('should return permission checking functions', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission).toBeDefined();
      expect(result.current.hasAllPermissions).toBeDefined();
      expect(result.current.hasAnyPermission).toBeDefined();
      expect(result.current.canAccessResource).toBeDefined();
      expect(result.current.canModifyResource).toBeDefined();
      expect(result.current.getPermissions).toBeDefined();
      expect(result.current.getRoleInfo).toBeDefined();
    });

    it('should return role status flags', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isAdmin).toBe(true);
      expect(result.current.isOps).toBe(false);
      expect(result.current.userRole).toBe('admin');
    });

    it('should provide permissionChecker instance', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.permissionChecker).not.toBeNull();
    });
  });

  describe('admin role permissions', () => {
    it('should have all permissions', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(PERMISSIONS.PROPERTIES_VIEW)).toBe(true);
      expect(result.current.hasPermission(PERMISSIONS.USERS_DELETE)).toBe(true);
      expect(result.current.hasPermission(PERMISSIONS.SYSTEM_SETTINGS)).toBe(true);
      expect(result.current.hasPermission(PERMISSIONS.FINANCE_DELETE)).toBe(true);
    });

    it('should identify as admin', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isAdmin).toBe(true);
      expect(result.current.isOps).toBe(false);
    });

    it('should have all permissions via hasAllPermissions', () => {
      const { result } = renderHook(() => usePermissions());

      const allCriticalPermissions = [
        PERMISSIONS.PROPERTIES_DELETE,
        PERMISSIONS.USERS_DELETE,
        PERMISSIONS.FINANCE_DELETE,
        PERMISSIONS.SYSTEM_SETTINGS,
      ];

      expect(result.current.hasAllPermissions(allCriticalPermissions)).toBe(true);
    });
  });

  describe('ops role permissions', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        profile: { ...mockProfile, user_type: 'ops' },
        user: { id: 'test-user-id' },
        session: { access_token: 'test-token' },
        isLoading: false,
      } as any);
    });

    it('should have limited permissions', () => {
      const { result } = renderHook(() => usePermissions());

      // Has these
      expect(result.current.hasPermission(PERMISSIONS.PROPERTIES_VIEW)).toBe(true);
      expect(result.current.hasPermission(PERMISSIONS.PROPERTIES_EDIT)).toBe(true);
      expect(result.current.hasPermission(PERMISSIONS.BOOKINGS_CREATE)).toBe(true);

      // Does NOT have these
      expect(result.current.hasPermission(PERMISSIONS.PROPERTIES_DELETE)).toBe(false);
      expect(result.current.hasPermission(PERMISSIONS.USERS_DELETE)).toBe(false);
      expect(result.current.hasPermission(PERMISSIONS.SYSTEM_SETTINGS)).toBe(false);
    });

    it('should identify as ops', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isOps).toBe(true);
      expect(result.current.userRole).toBe('ops');
    });

    it('should fail hasAllPermissions when missing one', () => {
      const { result } = renderHook(() => usePermissions());

      const mixedPermissions = [
        PERMISSIONS.PROPERTIES_VIEW, // Has
        PERMISSIONS.PROPERTIES_DELETE, // Doesn't have
      ];

      expect(result.current.hasAllPermissions(mixedPermissions)).toBe(false);
    });

    it('should pass hasAnyPermission with partial match', () => {
      const { result } = renderHook(() => usePermissions());

      const mixedPermissions = [
        PERMISSIONS.PROPERTIES_VIEW, // Has
        PERMISSIONS.SYSTEM_SETTINGS, // Doesn't have
      ];

      expect(result.current.hasAnyPermission(mixedPermissions)).toBe(true);
    });
  });

  describe('provider role permissions', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        profile: { ...mockProfile, user_type: 'provider' },
        user: { id: 'test-user-id' },
        session: { access_token: 'test-token' },
        isLoading: false,
      } as any);
    });

    it('should have very limited permissions', () => {
      const { result } = renderHook(() => usePermissions());

      // Has these
      expect(result.current.hasPermission(PERMISSIONS.BOOKINGS_VIEW)).toBe(true);
      expect(result.current.hasPermission(PERMISSIONS.ISSUES_CREATE)).toBe(true);
      expect(result.current.hasPermission(PERMISSIONS.MEDIA_UPLOAD)).toBe(true);

      // Does NOT have these
      expect(result.current.hasPermission(PERMISSIONS.PROPERTIES_VIEW)).toBe(false);
      expect(result.current.hasPermission(PERMISSIONS.BOOKINGS_CREATE)).toBe(false);
      expect(result.current.hasPermission(PERMISSIONS.FINANCE_VIEW)).toBe(false);
    });

    it('should not be admin or ops', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isOps).toBe(false);
      expect(result.current.userRole).toBe('provider');
    });
  });

  describe('customer role permissions', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        profile: { ...mockProfile, user_type: 'customer' },
        user: { id: 'test-user-id' },
        session: { access_token: 'test-token' },
        isLoading: false,
      } as any);
    });

    it('should have view-only permissions', () => {
      const { result } = renderHook(() => usePermissions());

      // Has view permissions
      expect(result.current.hasPermission(PERMISSIONS.PROPERTIES_VIEW)).toBe(true);
      expect(result.current.hasPermission(PERMISSIONS.BOOKINGS_VIEW)).toBe(true);
      expect(result.current.hasPermission(PERMISSIONS.FINANCE_VIEW)).toBe(true);

      // Does NOT have create/edit/delete
      expect(result.current.hasPermission(PERMISSIONS.PROPERTIES_CREATE)).toBe(false);
      expect(result.current.hasPermission(PERMISSIONS.BOOKINGS_CREATE)).toBe(false);
      expect(result.current.hasPermission(PERMISSIONS.FINANCE_CREATE)).toBe(false);
    });

    it('should be able to report issues', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(PERMISSIONS.ISSUES_VIEW)).toBe(true);
      expect(result.current.hasPermission(PERMISSIONS.ISSUES_CREATE)).toBe(true);
      expect(result.current.hasPermission(PERMISSIONS.PHOTOS_UPLOAD)).toBe(true);
    });
  });

  describe('resource access checks', () => {
    it('admin can access any resource', () => {
      vi.mocked(useAuth).mockReturnValue({
        profile: { ...mockProfile, user_type: 'admin', user_id: 'admin-id' },
        user: { id: 'admin-id' },
        session: { access_token: 'test-token' },
        isLoading: false,
      } as any);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.canAccessResource('other-user-id', PERMISSIONS.PROPERTIES_VIEW)).toBe(true);
      expect(result.current.canModifyResource('other-user-id', PERMISSIONS.PROPERTIES_EDIT)).toBe(true);
    });

    it('non-admin can only access own resources', () => {
      vi.mocked(useAuth).mockReturnValue({
        profile: { ...mockProfile, user_type: 'ops', user_id: 'ops-user-id' },
        user: { id: 'ops-user-id' },
        session: { access_token: 'test-token' },
        isLoading: false,
      } as any);

      const { result } = renderHook(() => usePermissions());

      // Own resource - allowed
      expect(result.current.canAccessResource('ops-user-id', PERMISSIONS.PROPERTIES_VIEW)).toBe(true);
      expect(result.current.canModifyResource('ops-user-id', PERMISSIONS.PROPERTIES_EDIT)).toBe(true);

      // Others' resource - denied
      expect(result.current.canAccessResource('other-user-id', PERMISSIONS.PROPERTIES_VIEW)).toBe(false);
      expect(result.current.canModifyResource('other-user-id', PERMISSIONS.PROPERTIES_EDIT)).toBe(false);
    });
  });

  describe('getPermissions', () => {
    it('should return array of permissions for user role', () => {
      const { result } = renderHook(() => usePermissions());

      const permissions = result.current.getPermissions();

      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions.length).toBeGreaterThan(0);
    });

    it('should return more permissions for admin than customer', () => {
      vi.mocked(useAuth).mockReturnValue({
        profile: { ...mockProfile, user_type: 'admin' },
        user: { id: 'test-user-id' },
        session: { access_token: 'test-token' },
        isLoading: false,
      } as any);

      const { result: adminResult } = renderHook(() => usePermissions());
      const adminPerms = adminResult.current.getPermissions();

      vi.mocked(useAuth).mockReturnValue({
        profile: { ...mockProfile, user_type: 'customer' },
        user: { id: 'test-user-id' },
        session: { access_token: 'test-token' },
        isLoading: false,
      } as any);

      const { result: customerResult } = renderHook(() => usePermissions());
      const customerPerms = customerResult.current.getPermissions();

      expect(adminPerms.length).toBeGreaterThan(customerPerms.length);
    });
  });

  describe('getRoleInfo', () => {
    it('should return role information', () => {
      const { result } = renderHook(() => usePermissions());

      const roleInfo = result.current.getRoleInfo();

      expect(roleInfo).toHaveProperty('role');
      expect(roleInfo).toHaveProperty('name');
      expect(roleInfo).toHaveProperty('description');
      expect(roleInfo).toHaveProperty('permissionCount');
    });

    it('should return correct info for admin role', () => {
      const { result } = renderHook(() => usePermissions());

      const roleInfo = result.current.getRoleInfo();

      expect(roleInfo.role).toBe('admin');
      expect(roleInfo.name).toBe('Administrator');
      expect(roleInfo.permissionCount).toBeGreaterThan(50);
    });
  });

  describe('null profile handling', () => {
    it('should handle null profile gracefully', () => {
      vi.mocked(useAuth).mockReturnValue({
        profile: null,
        user: null,
        session: null,
        isLoading: false,
      } as any);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(PERMISSIONS.PROPERTIES_VIEW)).toBe(false);
      expect(result.current.permissionChecker).toBeNull();
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.userRole).toBeNull();
    });

    it('should handle missing user_type gracefully', () => {
      vi.mocked(useAuth).mockReturnValue({
        profile: { ...mockProfile, user_type: undefined },
        user: { id: 'test-user-id' },
        session: { access_token: 'test-token' },
        isLoading: false,
      } as any);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.permissionChecker).toBeNull();
      expect(result.current.hasPermission(PERMISSIONS.PROPERTIES_VIEW)).toBe(false);
    });
  });
});

describe('useAuthorize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      profile: { ...mockProfile, user_type: 'ops' },
      user: { id: 'test-user-id' },
      session: { access_token: 'test-token' },
      isLoading: false,
    } as any);
  });

  it('should return authorize function', () => {
    const { result } = renderHook(() => useAuthorize());

    expect(result.current.authorize).toBeDefined();
    expect(typeof result.current.authorize).toBe('function');
  });

  it('should return true when user has permission', () => {
    const { result } = renderHook(() => useAuthorize());

    const authorized = result.current.authorize(PERMISSIONS.PROPERTIES_VIEW);

    expect(authorized).toBe(true);
  });

  it('should return false when user lacks permission', () => {
    const { result } = renderHook(() => useAuthorize());

    const authorized = result.current.authorize(PERMISSIONS.SYSTEM_SETTINGS);

    expect(authorized).toBe(false);
  });

  it('should log warning when access denied', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useAuthorize());

    result.current.authorize(PERMISSIONS.SYSTEM_SETTINGS);

    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('should use custom message when provided', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useAuthorize());

    const customMessage = 'Custom access denied message';
    result.current.authorize(PERMISSIONS.SYSTEM_SETTINGS, customMessage);

    expect(warnSpy).toHaveBeenCalledWith(customMessage);

    warnSpy.mockRestore();
  });
});
