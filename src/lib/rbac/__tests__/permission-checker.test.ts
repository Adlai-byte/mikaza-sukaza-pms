/**
 * Permission Checker Unit Tests
 * Tests the RBAC permission checking logic
 */

import { describe, it, expect } from 'vitest';
import { PermissionChecker, createPermissionChecker } from '../permission-checker';
import { PERMISSIONS, ROLES, RoleName } from '../permissions';

describe('PermissionChecker', () => {
  describe('constructor and basic methods', () => {
    it('should create a permission checker with role and user id', () => {
      const checker = new PermissionChecker('admin', 'user-123');
      expect(checker.getUserId()).toBe('user-123');
      expect(checker.getUserRole()).toBe('admin');
    });

    it('should correctly identify admin role', () => {
      const adminChecker = new PermissionChecker('admin', 'user-123');
      const opsChecker = new PermissionChecker('ops', 'user-456');

      expect(adminChecker.isAdmin()).toBe(true);
      expect(adminChecker.isOps()).toBe(false);
      expect(opsChecker.isAdmin()).toBe(false);
      expect(opsChecker.isOps()).toBe(true);
    });

    it('should return role info correctly', () => {
      const checker = new PermissionChecker('admin', 'user-123');
      const roleInfo = checker.getRoleInfo();

      expect(roleInfo.role).toBe('admin');
      expect(roleInfo.name).toBe('Administrator');
      expect(roleInfo.description).toContain('Full system access');
      expect(roleInfo.permissionCount).toBeGreaterThan(0);
    });
  });

  describe('hasPermission', () => {
    describe('admin role', () => {
      const adminChecker = new PermissionChecker('admin', 'admin-user');

      it('should have all permissions', () => {
        // Admin has all permissions
        Object.values(PERMISSIONS).forEach(permission => {
          expect(adminChecker.hasPermission(permission)).toBe(true);
        });
      });

      it('should have system permissions', () => {
        expect(adminChecker.hasPermission(PERMISSIONS.SYSTEM_SETTINGS)).toBe(true);
        expect(adminChecker.hasPermission(PERMISSIONS.SYSTEM_LOGS)).toBe(true);
        expect(adminChecker.hasPermission(PERMISSIONS.SYSTEM_AUDIT)).toBe(true);
      });

      it('should have user management permissions', () => {
        expect(adminChecker.hasPermission(PERMISSIONS.USERS_VIEW)).toBe(true);
        expect(adminChecker.hasPermission(PERMISSIONS.USERS_CREATE)).toBe(true);
        expect(adminChecker.hasPermission(PERMISSIONS.USERS_DELETE)).toBe(true);
        expect(adminChecker.hasPermission(PERMISSIONS.USERS_CHANGE_ROLE)).toBe(true);
      });

      it('should have finance delete permission', () => {
        expect(adminChecker.hasPermission(PERMISSIONS.FINANCE_DELETE)).toBe(true);
      });
    });

    describe('ops role', () => {
      const opsChecker = new PermissionChecker('ops', 'ops-user');

      it('should NOT have system permissions', () => {
        expect(opsChecker.hasPermission(PERMISSIONS.SYSTEM_SETTINGS)).toBe(false);
        expect(opsChecker.hasPermission(PERMISSIONS.SYSTEM_LOGS)).toBe(false);
        expect(opsChecker.hasPermission(PERMISSIONS.SYSTEM_AUDIT)).toBe(false);
      });

      it('should NOT have user management permissions', () => {
        expect(opsChecker.hasPermission(PERMISSIONS.USERS_VIEW)).toBe(false);
        expect(opsChecker.hasPermission(PERMISSIONS.USERS_CREATE)).toBe(false);
        expect(opsChecker.hasPermission(PERMISSIONS.USERS_DELETE)).toBe(false);
        expect(opsChecker.hasPermission(PERMISSIONS.USERS_CHANGE_ROLE)).toBe(false);
      });

      it('should have property view/create/edit but NOT delete', () => {
        expect(opsChecker.hasPermission(PERMISSIONS.PROPERTIES_VIEW)).toBe(true);
        expect(opsChecker.hasPermission(PERMISSIONS.PROPERTIES_CREATE)).toBe(true);
        expect(opsChecker.hasPermission(PERMISSIONS.PROPERTIES_EDIT)).toBe(true);
        expect(opsChecker.hasPermission(PERMISSIONS.PROPERTIES_DELETE)).toBe(false);
      });

      it('should have booking permissions', () => {
        expect(opsChecker.hasPermission(PERMISSIONS.BOOKINGS_VIEW)).toBe(true);
        expect(opsChecker.hasPermission(PERMISSIONS.BOOKINGS_CREATE)).toBe(true);
        expect(opsChecker.hasPermission(PERMISSIONS.BOOKINGS_EDIT)).toBe(true);
        expect(opsChecker.hasPermission(PERMISSIONS.BOOKINGS_CANCEL)).toBe(true);
      });

      it('should have todo permissions including view all and assign', () => {
        expect(opsChecker.hasPermission(PERMISSIONS.TODOS_VIEW_OWN)).toBe(true);
        expect(opsChecker.hasPermission(PERMISSIONS.TODOS_VIEW_ALL)).toBe(true);
        expect(opsChecker.hasPermission(PERMISSIONS.TODOS_CREATE)).toBe(true);
        expect(opsChecker.hasPermission(PERMISSIONS.TODOS_ASSIGN)).toBe(true);
      });

      it('should have automation view/create/edit but NOT delete', () => {
        expect(opsChecker.hasPermission(PERMISSIONS.AUTOMATION_VIEW)).toBe(true);
        expect(opsChecker.hasPermission(PERMISSIONS.AUTOMATION_CREATE)).toBe(true);
        expect(opsChecker.hasPermission(PERMISSIONS.AUTOMATION_EDIT)).toBe(true);
        expect(opsChecker.hasPermission(PERMISSIONS.AUTOMATION_DELETE)).toBe(false);
      });

      it('should NOT have finance delete permission', () => {
        expect(opsChecker.hasPermission(PERMISSIONS.FINANCE_VIEW)).toBe(true);
        expect(opsChecker.hasPermission(PERMISSIONS.FINANCE_CREATE)).toBe(true);
        expect(opsChecker.hasPermission(PERMISSIONS.FINANCE_DELETE)).toBe(false);
      });
    });

    describe('provider role', () => {
      const providerChecker = new PermissionChecker('provider', 'provider-user');

      it('should only have limited permissions', () => {
        expect(providerChecker.hasPermission(PERMISSIONS.BOOKINGS_VIEW)).toBe(true);
        expect(providerChecker.hasPermission(PERMISSIONS.GUESTS_VIEW)).toBe(true);
        expect(providerChecker.hasPermission(PERMISSIONS.ISSUES_VIEW)).toBe(true);
        expect(providerChecker.hasPermission(PERMISSIONS.ISSUES_CREATE)).toBe(true);
      });

      it('should NOT have property create/edit permissions', () => {
        expect(providerChecker.hasPermission(PERMISSIONS.PROPERTIES_VIEW)).toBe(false);
        expect(providerChecker.hasPermission(PERMISSIONS.PROPERTIES_CREATE)).toBe(false);
        expect(providerChecker.hasPermission(PERMISSIONS.PROPERTIES_EDIT)).toBe(false);
      });

      it('should NOT have booking create/edit permissions', () => {
        expect(providerChecker.hasPermission(PERMISSIONS.BOOKINGS_CREATE)).toBe(false);
        expect(providerChecker.hasPermission(PERMISSIONS.BOOKINGS_EDIT)).toBe(false);
      });

      it('should have limited todo permissions (own only)', () => {
        expect(providerChecker.hasPermission(PERMISSIONS.TODOS_VIEW_OWN)).toBe(true);
        expect(providerChecker.hasPermission(PERMISSIONS.TODOS_EDIT_OWN)).toBe(true);
        expect(providerChecker.hasPermission(PERMISSIONS.TODOS_VIEW_ALL)).toBe(false);
        expect(providerChecker.hasPermission(PERMISSIONS.TODOS_ASSIGN)).toBe(false);
      });

      it('should have media view/upload but not edit/delete', () => {
        expect(providerChecker.hasPermission(PERMISSIONS.MEDIA_VIEW)).toBe(true);
        expect(providerChecker.hasPermission(PERMISSIONS.MEDIA_UPLOAD)).toBe(true);
        expect(providerChecker.hasPermission(PERMISSIONS.MEDIA_DOWNLOAD)).toBe(true);
        expect(providerChecker.hasPermission(PERMISSIONS.MEDIA_EDIT)).toBe(false);
        expect(providerChecker.hasPermission(PERMISSIONS.MEDIA_DELETE)).toBe(false);
      });
    });

    describe('customer role', () => {
      const customerChecker = new PermissionChecker('customer', 'customer-user');

      it('should have view-only property access', () => {
        expect(customerChecker.hasPermission(PERMISSIONS.PROPERTIES_VIEW)).toBe(true);
        expect(customerChecker.hasPermission(PERMISSIONS.PROPERTIES_CREATE)).toBe(false);
        expect(customerChecker.hasPermission(PERMISSIONS.PROPERTIES_EDIT)).toBe(false);
        expect(customerChecker.hasPermission(PERMISSIONS.PROPERTIES_DELETE)).toBe(false);
      });

      it('should have view-only booking access', () => {
        expect(customerChecker.hasPermission(PERMISSIONS.BOOKINGS_VIEW)).toBe(true);
        expect(customerChecker.hasPermission(PERMISSIONS.BOOKINGS_CREATE)).toBe(false);
        expect(customerChecker.hasPermission(PERMISSIONS.CALENDAR_EXPORT)).toBe(true);
      });

      it('should have view-only finance access', () => {
        expect(customerChecker.hasPermission(PERMISSIONS.FINANCE_VIEW)).toBe(true);
        expect(customerChecker.hasPermission(PERMISSIONS.INVOICES_VIEW)).toBe(true);
        expect(customerChecker.hasPermission(PERMISSIONS.FINANCE_CREATE)).toBe(false);
        expect(customerChecker.hasPermission(PERMISSIONS.FINANCE_EDIT)).toBe(false);
      });

      it('should be able to report issues', () => {
        expect(customerChecker.hasPermission(PERMISSIONS.ISSUES_VIEW)).toBe(true);
        expect(customerChecker.hasPermission(PERMISSIONS.ISSUES_CREATE)).toBe(true);
        expect(customerChecker.hasPermission(PERMISSIONS.PHOTOS_UPLOAD)).toBe(true);
        expect(customerChecker.hasPermission(PERMISSIONS.ISSUES_EDIT)).toBe(false);
      });
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when user has all specified permissions', () => {
      const adminChecker = new PermissionChecker('admin', 'admin-user');

      const permissions = [
        PERMISSIONS.PROPERTIES_VIEW,
        PERMISSIONS.PROPERTIES_CREATE,
        PERMISSIONS.PROPERTIES_EDIT,
      ];

      expect(adminChecker.hasAllPermissions(permissions)).toBe(true);
    });

    it('should return false when user is missing any permission', () => {
      const opsChecker = new PermissionChecker('ops', 'ops-user');

      const permissions = [
        PERMISSIONS.PROPERTIES_VIEW,
        PERMISSIONS.PROPERTIES_DELETE, // Ops doesn't have this
      ];

      expect(opsChecker.hasAllPermissions(permissions)).toBe(false);
    });

    it('should return true for empty permission array', () => {
      const checker = new PermissionChecker('customer', 'customer-user');
      expect(checker.hasAllPermissions([])).toBe(true);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when user has at least one permission', () => {
      const opsChecker = new PermissionChecker('ops', 'ops-user');

      const permissions = [
        PERMISSIONS.PROPERTIES_VIEW, // Ops has this
        PERMISSIONS.SYSTEM_SETTINGS, // Ops doesn't have this
      ];

      expect(opsChecker.hasAnyPermission(permissions)).toBe(true);
    });

    it('should return false when user has none of the permissions', () => {
      const customerChecker = new PermissionChecker('customer', 'customer-user');

      const permissions = [
        PERMISSIONS.SYSTEM_SETTINGS,
        PERMISSIONS.USERS_DELETE,
        PERMISSIONS.FINANCE_DELETE,
      ];

      expect(customerChecker.hasAnyPermission(permissions)).toBe(false);
    });

    it('should return false for empty permission array', () => {
      const checker = new PermissionChecker('admin', 'admin-user');
      expect(checker.hasAnyPermission([])).toBe(false);
    });
  });

  describe('canAccessResource', () => {
    it('should always return true for admin regardless of ownership', () => {
      const adminChecker = new PermissionChecker('admin', 'admin-user');

      expect(adminChecker.canAccessResource('other-user', PERMISSIONS.PROPERTIES_VIEW)).toBe(true);
      expect(adminChecker.canAccessResource('admin-user', PERMISSIONS.PROPERTIES_VIEW)).toBe(true);
    });

    it('should return true for non-admin when they own the resource', () => {
      const opsChecker = new PermissionChecker('ops', 'ops-user');

      expect(opsChecker.canAccessResource('ops-user', PERMISSIONS.PROPERTIES_VIEW)).toBe(true);
    });

    it('should return false for non-admin when they do not own the resource', () => {
      const opsChecker = new PermissionChecker('ops', 'ops-user');

      expect(opsChecker.canAccessResource('other-user', PERMISSIONS.PROPERTIES_VIEW)).toBe(false);
    });

    it('should return false when user lacks the permission', () => {
      const customerChecker = new PermissionChecker('customer', 'customer-user');

      // Customer doesn't have PROPERTIES_EDIT permission
      expect(customerChecker.canAccessResource('customer-user', PERMISSIONS.PROPERTIES_EDIT)).toBe(false);
    });
  });

  describe('canModifyResource', () => {
    it('should always return true for admin regardless of ownership', () => {
      const adminChecker = new PermissionChecker('admin', 'admin-user');

      expect(adminChecker.canModifyResource('other-user', PERMISSIONS.PROPERTIES_EDIT)).toBe(true);
    });

    it('should return true for non-admin when they own the resource and have permission', () => {
      const opsChecker = new PermissionChecker('ops', 'ops-user');

      expect(opsChecker.canModifyResource('ops-user', PERMISSIONS.PROPERTIES_EDIT)).toBe(true);
    });

    it('should return false for non-admin when modifying others resources', () => {
      const opsChecker = new PermissionChecker('ops', 'ops-user');

      expect(opsChecker.canModifyResource('other-user', PERMISSIONS.PROPERTIES_EDIT)).toBe(false);
    });

    it('should return false when user lacks the permission', () => {
      const providerChecker = new PermissionChecker('provider', 'provider-user');

      // Provider doesn't have PROPERTIES_EDIT
      expect(providerChecker.canModifyResource('provider-user', PERMISSIONS.PROPERTIES_EDIT)).toBe(false);
    });
  });

  describe('getPermissions', () => {
    it('should return all permissions for admin', () => {
      const adminChecker = new PermissionChecker('admin', 'admin-user');
      const permissions = adminChecker.getPermissions();

      expect(permissions).toEqual(expect.arrayContaining(Object.values(PERMISSIONS)));
    });

    it('should return limited permissions for customer', () => {
      const customerChecker = new PermissionChecker('customer', 'customer-user');
      const permissions = customerChecker.getPermissions();

      expect(permissions.length).toBeLessThan(Object.values(PERMISSIONS).length);
      expect(permissions).toContain(PERMISSIONS.PROPERTIES_VIEW);
      expect(permissions).not.toContain(PERMISSIONS.PROPERTIES_DELETE);
    });
  });

  describe('createPermissionChecker factory', () => {
    it('should create a PermissionChecker instance', () => {
      const checker = createPermissionChecker('ops', 'user-123');

      expect(checker).toBeInstanceOf(PermissionChecker);
      expect(checker.getUserId()).toBe('user-123');
      expect(checker.getUserRole()).toBe('ops');
    });
  });

  describe('edge cases', () => {
    it('should handle unknown role gracefully', () => {
      // Cast to bypass TypeScript check for testing
      const checker = new PermissionChecker('unknown' as RoleName, 'user-123');

      expect(checker.hasPermission(PERMISSIONS.PROPERTIES_VIEW)).toBe(false);
      expect(checker.getPermissions()).toEqual([]);
    });

    it('should be consistent across multiple permission checks', () => {
      const checker = new PermissionChecker('ops', 'ops-user');

      // Check same permission multiple times
      const result1 = checker.hasPermission(PERMISSIONS.PROPERTIES_VIEW);
      const result2 = checker.hasPermission(PERMISSIONS.PROPERTIES_VIEW);
      const result3 = checker.hasPermission(PERMISSIONS.PROPERTIES_VIEW);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });
});

describe('ROLES configuration', () => {
  it('should have all required roles defined', () => {
    expect(ROLES).toHaveProperty('admin');
    expect(ROLES).toHaveProperty('ops');
    expect(ROLES).toHaveProperty('provider');
    expect(ROLES).toHaveProperty('customer');
  });

  it('should have admin with all permissions', () => {
    const adminPermissions = ROLES.admin.permissions;
    const allPermissions = Object.values(PERMISSIONS);

    allPermissions.forEach(permission => {
      expect(adminPermissions).toContain(permission);
    });
  });

  it('should have progressively fewer permissions for each role', () => {
    const adminCount = ROLES.admin.permissions.length;
    const opsCount = ROLES.ops.permissions.length;
    const providerCount = ROLES.provider.permissions.length;
    const customerCount = ROLES.customer.permissions.length;

    expect(adminCount).toBeGreaterThan(opsCount);
    expect(opsCount).toBeGreaterThan(providerCount);
    expect(opsCount).toBeGreaterThan(customerCount);
  });

  it('should have name and description for each role', () => {
    Object.values(ROLES).forEach(role => {
      expect(role).toHaveProperty('name');
      expect(role).toHaveProperty('description');
      expect(role).toHaveProperty('permissions');
      expect(role.name.length).toBeGreaterThan(0);
      expect(role.description.length).toBeGreaterThan(0);
      expect(Array.isArray(role.permissions)).toBe(true);
    });
  });
});

describe('PERMISSIONS constant', () => {
  it('should have unique permission values', () => {
    const values = Object.values(PERMISSIONS);
    const uniqueValues = new Set(values);

    expect(uniqueValues.size).toBe(values.length);
  });

  it('should follow naming convention (module.action or module.submodule.action)', () => {
    Object.values(PERMISSIONS).forEach(permission => {
      // Allow module.action or module.submodule.action patterns
      expect(permission).toMatch(/^[a-z_]+(\.[a-z_]+){1,2}$/);
    });
  });

  it('should have permissions for all major modules', () => {
    const modules = ['properties', 'users', 'bookings', 'finance', 'jobs', 'issues', 'todos'];

    modules.forEach(module => {
      const modulePermissions = Object.values(PERMISSIONS).filter(p => p.startsWith(`${module}.`));
      expect(modulePermissions.length).toBeGreaterThan(0);
    });
  });
});
