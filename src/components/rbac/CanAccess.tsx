/**
 * CanAccess Component
 * Conditionally renders children based on user permissions
 */

import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '@/lib/rbac/permissions';

interface CanAccessProps {
  /**
   * Permission(s) required to view the children
   * Can be a single permission or array of permissions
   */
  permission: Permission | Permission[];

  /**
   * Content to render if user has permission
   */
  children: ReactNode;

  /**
   * Optional content to render if user lacks permission
   * If not provided, nothing is rendered
   */
  fallback?: ReactNode;

  /**
   * If true and permission is an array, user must have ALL permissions
   * If false, user must have AT LEAST ONE permission
   * @default true
   */
  requireAll?: boolean;
}

/**
 * Conditionally renders children based on user permissions
 *
 * @example
 * ```tsx
 * // Single permission
 * <CanAccess permission={PERMISSIONS.USERS_DELETE}>
 *   <Button>Delete User</Button>
 * </CanAccess>
 *
 * // Multiple permissions (require all)
 * <CanAccess permission={[PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_EDIT]}>
 *   <Button>Edit User</Button>
 * </CanAccess>
 *
 * // Multiple permissions (require any)
 * <CanAccess
 *   permission={[PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_EDIT]}
 *   requireAll={false}
 * >
 *   <Button>View/Edit User</Button>
 * </CanAccess>
 *
 * // With fallback
 * <CanAccess
 *   permission={PERMISSIONS.USERS_DELETE}
 *   fallback={<p>You don't have permission to delete users</p>}
 * >
 *   <Button>Delete User</Button>
 * </CanAccess>
 * ```
 */
export function CanAccess({
  permission,
  children,
  fallback = null,
  requireAll = true,
}: CanAccessProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();

  // Determine if user has access
  const hasAccess = Array.isArray(permission)
    ? requireAll
      ? hasAllPermissions(permission)
      : hasAnyPermission(permission)
    : hasPermission(permission);

  // Render children if user has access, otherwise render fallback
  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Higher-order component version of CanAccess
 * Useful for wrapping entire components
 *
 * @example
 * ```tsx
 * const ProtectedComponent = withPermission(
 *   MyComponent,
 *   PERMISSIONS.USERS_VIEW
 * );
 * ```
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: Permission | Permission[],
  requireAll = true
) {
  return function PermissionWrappedComponent(props: P) {
    return (
      <CanAccess permission={permission} requireAll={requireAll}>
        <Component {...props} />
      </CanAccess>
    );
  };
}
