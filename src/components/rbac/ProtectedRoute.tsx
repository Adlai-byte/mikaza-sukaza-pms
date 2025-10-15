/**
 * ProtectedRoute Component
 * Route wrapper that requires specific permissions to access
 */

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '@/lib/rbac/permissions';

interface ProtectedRouteProps {
  /**
   * Content to render if user has permission
   */
  children: ReactNode;

  /**
   * Permission(s) required to access this route
   * If not provided, only authentication is required
   */
  permission?: Permission | Permission[];

  /**
   * If true and permission is an array, user must have ALL permissions
   * If false, user must have AT LEAST ONE permission
   * @default true
   */
  requireAll?: boolean;

  /**
   * Path to redirect to if user lacks permission
   * @default "/unauthorized"
   */
  redirectTo?: string;

  /**
   * Require authentication (in addition to permission check)
   * @default true
   */
  requireAuth?: boolean;
}

/**
 * Route component that requires specific permissions
 *
 * @example
 * ```tsx
 * <Route
 *   path="/users"
 *   element={
 *     <ProtectedRoute permission={PERMISSIONS.USERS_VIEW}>
 *       <UserManagement />
 *     </ProtectedRoute>
 *   }
 * />
 * ```
 */
export function ProtectedRoute({
  children,
  permission,
  requireAll = true,
  redirectTo = '/unauthorized',
  requireAuth = true,
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const { hasPermission, hasAllPermissions, hasAnyPermission, getPermissions } = usePermissions();
  const location = useLocation();

  // DEBUG: Log permission check details
  console.log('🔐 ProtectedRoute Check:', {
    path: location.pathname,
    requiredPermission: permission,
    userType: profile?.user_type,
    userId: profile?.user_id,
    hasProfile: !!profile,
    loading,
  });

  // Show loading spinner while checking authentication
  if (requireAuth && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth page if not authenticated
  if (requireAuth && !user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If no permission specified, just check authentication
  if (!permission) {
    return <>{children}</>;
  }

  // Check if user has required permission(s)
  const hasAccess = Array.isArray(permission)
    ? requireAll
      ? hasAllPermissions(permission)
      : hasAnyPermission(permission)
    : hasPermission(permission);

  // DEBUG: Log permission check result
  console.log('✅ Permission Check Result:', {
    hasAccess,
    userPermissions: getPermissions(),
    requiredPermission: permission,
  });

  // Redirect if user lacks permission
  if (!hasAccess) {
    console.error('❌ Access Denied:', {
      path: location.pathname,
      requiredPermission: permission,
      userType: profile?.user_type,
      redirectingTo: redirectTo,
    });
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
