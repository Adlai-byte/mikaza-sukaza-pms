/**
 * Permission Checker Utility
 * Provides methods to check user permissions based on their role
 */

import { ROLES, Permission, RoleName } from './permissions';

export class PermissionChecker {
  private userRole: RoleName;
  private userId: string;

  constructor(userRole: RoleName, userId: string) {
    this.userRole = userRole;
    this.userId = userId;
  }

  /**
   * Check if user has a specific permission
   * @param permission - Permission to check
   * @returns true if user has permission
   */
  hasPermission(permission: Permission): boolean {
    const role = ROLES[this.userRole];
    if (!role) {
      console.warn(`Unknown role: ${this.userRole}`);
      return false;
    }
    return role.permissions.includes(permission);
  }

  /**
   * Check if user has ALL of the specified permissions
   * @param permissions - Array of permissions to check
   * @returns true if user has all permissions
   */
  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }

  /**
   * Check if user has ANY of the specified permissions
   * @param permissions - Array of permissions to check
   * @returns true if user has at least one permission
   */
  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  /**
   * Check if user can access a resource
   * Combines permission check with ownership check
   *
   * @param resourceOwnerId - ID of the resource owner
   * @param permission - Permission required
   * @returns true if user can access the resource
   */
  canAccessResource(resourceOwnerId: string, permission: Permission): boolean {
    // Admin can access everything
    if (this.userRole === 'admin') {
      return true;
    }

    // Check if user has the required permission
    if (!this.hasPermission(permission)) {
      return false;
    }

    // For non-admin users, verify ownership
    return resourceOwnerId === this.userId;
  }

  /**
   * Check if user can modify a resource
   * Similar to canAccessResource but more strict for modifications
   *
   * @param resourceOwnerId - ID of the resource owner
   * @param permission - Permission required
   * @returns true if user can modify the resource
   */
  canModifyResource(resourceOwnerId: string, permission: Permission): boolean {
    // Admin can modify everything
    if (this.userRole === 'admin') {
      return true;
    }

    // Check if user has the required permission
    if (!this.hasPermission(permission)) {
      return false;
    }

    // For non-admin users, can only modify own resources
    return resourceOwnerId === this.userId;
  }

  /**
   * Get all permissions for the current user role
   * @returns Array of all permissions
   */
  getPermissions(): Permission[] {
    const role = ROLES[this.userRole];
    return role ? role.permissions : [];
  }

  /**
   * Get user role information
   * @returns Role information
   */
  getRoleInfo() {
    const role = ROLES[this.userRole];
    return {
      role: this.userRole,
      name: role?.name || 'Unknown',
      description: role?.description || '',
      permissionCount: role?.permissions.length || 0,
    };
  }

  /**
   * Check if user is admin
   * @returns true if user is admin
   */
  isAdmin(): boolean {
    return this.userRole === 'admin';
  }

  /**
   * Check if user is ops
   * @returns true if user is ops
   */
  isOps(): boolean {
    return this.userRole === 'ops';
  }

  /**
   * Get user ID
   * @returns User ID
   */
  getUserId(): string {
    return this.userId;
  }

  /**
   * Get user role
   * @returns User role
   */
  getUserRole(): RoleName {
    return this.userRole;
  }
}

/**
 * Create a new PermissionChecker instance
 * @param userRole - User's role
 * @param userId - User's ID
 * @returns PermissionChecker instance
 */
export function createPermissionChecker(
  userRole: RoleName,
  userId: string
): PermissionChecker {
  return new PermissionChecker(userRole, userId);
}
