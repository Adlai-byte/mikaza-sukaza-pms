/**
 * usePermissions Hook
 * React hook for checking user permissions throughout the application
 */

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionChecker } from '@/lib/rbac/permission-checker';
import { Permission, RoleName } from '@/lib/rbac/permissions';

interface UsePermissionsReturn {
  /**
   * Check if user has a specific permission
   */
  hasPermission: (permission: Permission) => boolean;

  /**
   * Check if user has all of the specified permissions
   */
  hasAllPermissions: (permissions: Permission[]) => boolean;

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission: (permissions: Permission[]) => boolean;

  /**
   * Check if user can access a resource (ownership check)
   */
  canAccessResource: (resourceOwnerId: string, permission: Permission) => boolean;

  /**
   * Check if user can modify a resource (ownership check)
   */
  canModifyResource: (resourceOwnerId: string, permission: Permission) => boolean;

  /**
   * Get all permissions for current user
   */
  getPermissions: () => Permission[];

  /**
   * Get role information
   */
  getRoleInfo: () => {
    role: RoleName;
    name: string;
    description: string;
    permissionCount: number;
  };

  /**
   * Check if user is admin
   */
  isAdmin: boolean;

  /**
   * Check if user is ops
   */
  isOps: boolean;

  /**
   * Current user role
   */
  userRole: RoleName | null;

  /**
   * Permission checker instance (for advanced usage)
   */
  permissionChecker: PermissionChecker | null;
}

/**
 * Hook for checking user permissions
 *
 * @example
 * ```tsx
 * const { hasPermission, isAdmin } = usePermissions();
 *
 * if (hasPermission(PERMISSIONS.USERS_DELETE)) {
 *   // Show delete button
 * }
 * ```
 */
export function usePermissions(): UsePermissionsReturn {
  const { profile } = useAuth();

  // Create permission checker instance
  const permissionChecker = useMemo(() => {
    if (!profile || !profile.user_type) {
      return null;
    }
    return new PermissionChecker(
      profile.user_type as RoleName,
      profile.user_id
    );
  }, [profile]);

  // Memoize all permission checking functions
  const hasPermission = useMemo(
    () => (permission: Permission) => {
      return permissionChecker?.hasPermission(permission) ?? false;
    },
    [permissionChecker]
  );

  const hasAllPermissions = useMemo(
    () => (permissions: Permission[]) => {
      return permissionChecker?.hasAllPermissions(permissions) ?? false;
    },
    [permissionChecker]
  );

  const hasAnyPermission = useMemo(
    () => (permissions: Permission[]) => {
      return permissionChecker?.hasAnyPermission(permissions) ?? false;
    },
    [permissionChecker]
  );

  const canAccessResource = useMemo(
    () => (resourceOwnerId: string, permission: Permission) => {
      return permissionChecker?.canAccessResource(resourceOwnerId, permission) ?? false;
    },
    [permissionChecker]
  );

  const canModifyResource = useMemo(
    () => (resourceOwnerId: string, permission: Permission) => {
      return permissionChecker?.canModifyResource(resourceOwnerId, permission) ?? false;
    },
    [permissionChecker]
  );

  const getPermissions = useMemo(
    () => () => {
      return permissionChecker?.getPermissions() ?? [];
    },
    [permissionChecker]
  );

  const getRoleInfo = useMemo(
    () => () => {
      return (
        permissionChecker?.getRoleInfo() ?? {
          role: null as any,
          name: 'Unknown',
          description: '',
          permissionCount: 0,
        }
      );
    },
    [permissionChecker]
  );

  return {
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    canAccessResource,
    canModifyResource,
    getPermissions,
    getRoleInfo,
    isAdmin: profile?.user_type === 'admin',
    isOps: profile?.user_type === 'ops',
    userRole: (profile?.user_type as RoleName) ?? null,
    permissionChecker,
  };
}

/**
 * Hook for authorizing actions with toast notifications
 *
 * @example
 * ```tsx
 * const { authorize } = useAuthorize();
 *
 * const handleDelete = () => {
 *   if (!authorize(PERMISSIONS.USERS_DELETE)) {
 *     return; // Toast shown automatically
 *   }
 *   // Proceed with delete
 * };
 * ```
 */
export function useAuthorize() {
  const { hasPermission } = usePermissions();

  const authorize = (permission: Permission, customMessage?: string) => {
    const authorized = hasPermission(permission);

    if (!authorized) {
      // You can add toast notification here if needed
      console.warn(
        customMessage || `Access denied: Missing permission "${permission}"`
      );
    }

    return authorized;
  };

  return { authorize };
}
