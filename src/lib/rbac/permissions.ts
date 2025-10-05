/**
 * RBAC Permission System
 * Defines all permissions and role mappings for the Property Management System
 */

// ============================================
// PERMISSION DEFINITIONS
// ============================================

export const PERMISSIONS = {
  // ========== PROPERTIES ==========
  PROPERTIES_VIEW: 'properties.view',
  PROPERTIES_CREATE: 'properties.create',
  PROPERTIES_EDIT: 'properties.edit',
  PROPERTIES_DELETE: 'properties.delete',
  PROPERTIES_EXPORT: 'properties.export',

  // ========== USERS ==========
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_EDIT: 'users.edit',
  USERS_DELETE: 'users.delete',
  USERS_CHANGE_ROLE: 'users.change_role',

  // ========== JOBS ==========
  JOBS_VIEW: 'jobs.view',
  JOBS_CREATE: 'jobs.create',
  JOBS_EDIT: 'jobs.edit',
  JOBS_DELETE: 'jobs.delete',
  JOBS_ASSIGN: 'jobs.assign',
  JOBS_COMPLETE: 'jobs.complete',

  // ========== CALENDAR & BOOKINGS ==========
  BOOKINGS_VIEW: 'bookings.view',
  BOOKINGS_CREATE: 'bookings.create',
  BOOKINGS_EDIT: 'bookings.edit',
  BOOKINGS_CANCEL: 'bookings.cancel',
  CALENDAR_EXPORT: 'calendar.export',

  // ========== TODOS ==========
  TODOS_VIEW_OWN: 'todos.view_own',
  TODOS_VIEW_ALL: 'todos.view_all',
  TODOS_CREATE: 'todos.create',
  TODOS_EDIT_OWN: 'todos.edit_own',
  TODOS_DELETE_OWN: 'todos.delete_own',
  TODOS_ASSIGN: 'todos.assign',

  // ========== ISSUES & PHOTOS ==========
  ISSUES_VIEW: 'issues.view',
  ISSUES_CREATE: 'issues.create',
  ISSUES_EDIT: 'issues.edit',
  ISSUES_DELETE: 'issues.delete',
  ISSUES_CLOSE: 'issues.close',
  PHOTOS_UPLOAD: 'photos.upload',
  PHOTOS_DELETE: 'photos.delete',

  // ========== DOCUMENTS ==========
  DOCUMENTS_CONTRACTS_VIEW: 'documents.contracts.view',
  DOCUMENTS_CONTRACTS_MANAGE: 'documents.contracts.manage',

  DOCUMENTS_EMPLOYEE_VIEW: 'documents.employee.view',
  DOCUMENTS_EMPLOYEE_MANAGE: 'documents.employee.manage',

  DOCUMENTS_ACCESS_VIEW: 'documents.access.view',
  DOCUMENTS_ACCESS_CREATE: 'documents.access.create',
  DOCUMENTS_ACCESS_APPROVE: 'documents.access.approve',

  DOCUMENTS_COI_VIEW: 'documents.coi.view',
  DOCUMENTS_COI_MANAGE: 'documents.coi.manage',

  DOCUMENTS_SERVICE_VIEW: 'documents.service.view',
  DOCUMENTS_SERVICE_MANAGE: 'documents.service.manage',

  DOCUMENTS_MESSAGES_VIEW: 'documents.messages.view',
  DOCUMENTS_MESSAGES_MANAGE: 'documents.messages.manage',

  // ========== FINANCE ==========
  FINANCE_VIEW: 'finance.view',
  FINANCE_EDIT: 'finance.edit',
  FINANCE_CREATE: 'finance.create',
  FINANCE_DELETE: 'finance.delete',
  FINANCE_EXPORT: 'finance.export',

  INVOICES_VIEW: 'invoices.view',
  INVOICES_CREATE: 'invoices.create',
  INVOICES_EDIT: 'invoices.edit',
  INVOICES_SEND: 'invoices.send',

  COMMISSIONS_VIEW_ALL: 'commissions.view_all',
  COMMISSIONS_VIEW_OWN: 'commissions.view_own',
  COMMISSIONS_MANAGE: 'commissions.manage',

  PIPELINE_VIEW: 'pipeline.view',
  PIPELINE_MANAGE: 'pipeline.manage',

  // ========== MEDIA ==========
  MEDIA_VIEW: 'media.view',
  MEDIA_UPLOAD: 'media.upload',
  MEDIA_EDIT: 'media.edit',
  MEDIA_DELETE: 'media.delete',
  MEDIA_DOWNLOAD: 'media.download',

  // ========== HIGHLIGHTS ==========
  HIGHLIGHTS_VIEW: 'highlights.view',
  HIGHLIGHTS_SUGGEST: 'highlights.suggest',
  HIGHLIGHTS_APPROVE: 'highlights.approve',
  HIGHLIGHTS_REMOVE: 'highlights.remove',

  // ========== REPORTS ==========
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  REPORTS_CUSTOM: 'reports.custom',

  // ========== SYSTEM ==========
  SYSTEM_SETTINGS: 'system.settings',
  SYSTEM_LOGS: 'system.logs',
  SYSTEM_AUDIT: 'system.audit',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// ============================================
// ROLE DEFINITIONS WITH PERMISSIONS
// ============================================

export const ROLES = {
  /**
   * ADMIN - Full System Access
   * Complete control over all modules and data
   */
  admin: {
    name: 'Administrator',
    description: 'Full system access - manages users, finances, and all operations',
    permissions: [
      // ALL PERMISSIONS - Admin has unrestricted access
      ...Object.values(PERMISSIONS),
    ],
  },

  /**
   * OPS - Operations Manager
   * Day-to-day property and operations management
   * Limited access to financial and HR data
   */
  ops: {
    name: 'Operations Manager',
    description: 'Property and operations management - limited access to finance and user management',
    permissions: [
      // ========== PROPERTIES - Full CRUD except delete ==========
      PERMISSIONS.PROPERTIES_VIEW,
      PERMISSIONS.PROPERTIES_CREATE,
      PERMISSIONS.PROPERTIES_EDIT,
      PERMISSIONS.PROPERTIES_EXPORT,
      // NOT: PROPERTIES_DELETE (admin only)

      // ========== JOBS - Full access ==========
      PERMISSIONS.JOBS_VIEW,
      PERMISSIONS.JOBS_CREATE,
      PERMISSIONS.JOBS_EDIT,
      PERMISSIONS.JOBS_DELETE, // Can delete own jobs
      PERMISSIONS.JOBS_ASSIGN,
      PERMISSIONS.JOBS_COMPLETE,

      // ========== BOOKINGS - Full access ==========
      PERMISSIONS.BOOKINGS_VIEW,
      PERMISSIONS.BOOKINGS_CREATE,
      PERMISSIONS.BOOKINGS_EDIT,
      PERMISSIONS.BOOKINGS_CANCEL, // May need approval workflow
      PERMISSIONS.CALENDAR_EXPORT,

      // ========== TODOS - Own only ==========
      PERMISSIONS.TODOS_VIEW_OWN,
      PERMISSIONS.TODOS_CREATE,
      PERMISSIONS.TODOS_EDIT_OWN,
      PERMISSIONS.TODOS_DELETE_OWN,
      // NOT: TODOS_VIEW_ALL, TODOS_ASSIGN (admin only)

      // ========== ISSUES - Full access ==========
      PERMISSIONS.ISSUES_VIEW,
      PERMISSIONS.ISSUES_CREATE,
      PERMISSIONS.ISSUES_EDIT,
      PERMISSIONS.ISSUES_CLOSE,
      PERMISSIONS.PHOTOS_UPLOAD,
      PERMISSIONS.PHOTOS_DELETE, // Own uploads only
      // NOT: ISSUES_DELETE (preserve audit trail)

      // ========== DOCUMENTS - Mixed access ==========
      PERMISSIONS.DOCUMENTS_CONTRACTS_VIEW, // View only
      // NOT: DOCUMENTS_CONTRACTS_MANAGE

      // NOT: Employee documents at all

      PERMISSIONS.DOCUMENTS_ACCESS_VIEW,
      PERMISSIONS.DOCUMENTS_ACCESS_CREATE,
      // NOT: DOCUMENTS_ACCESS_APPROVE

      PERMISSIONS.DOCUMENTS_COI_VIEW, // View only
      // NOT: DOCUMENTS_COI_MANAGE

      PERMISSIONS.DOCUMENTS_SERVICE_VIEW,
      PERMISSIONS.DOCUMENTS_SERVICE_MANAGE, // Full access

      PERMISSIONS.DOCUMENTS_MESSAGES_VIEW,
      PERMISSIONS.DOCUMENTS_MESSAGES_MANAGE, // Full access

      // ========== FINANCE - View only ==========
      PERMISSIONS.FINANCE_VIEW,
      PERMISSIONS.INVOICES_VIEW,
      PERMISSIONS.COMMISSIONS_VIEW_OWN, // Own commission only
      PERMISSIONS.PIPELINE_VIEW,
      // NOT: Any finance editing/creating/deleting

      // ========== MEDIA - Full access ==========
      PERMISSIONS.MEDIA_VIEW,
      PERMISSIONS.MEDIA_UPLOAD,
      PERMISSIONS.MEDIA_EDIT,
      PERMISSIONS.MEDIA_DELETE, // Own uploads
      PERMISSIONS.MEDIA_DOWNLOAD,

      // ========== HIGHLIGHTS - Suggest only ==========
      PERMISSIONS.HIGHLIGHTS_VIEW,
      PERMISSIONS.HIGHLIGHTS_SUGGEST,
      // NOT: HIGHLIGHTS_APPROVE, HIGHLIGHTS_REMOVE

      // ========== REPORTS - View only ==========
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_EXPORT,
      // NOT: REPORTS_CUSTOM

      // NO SYSTEM ACCESS
      // NOT: SYSTEM_SETTINGS, SYSTEM_LOGS, SYSTEM_AUDIT
    ],
  },
} as const;

export type RoleName = keyof typeof ROLES;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get all permissions for a specific role
 */
export function getRolePermissions(role: RoleName): Permission[] {
  return ROLES[role].permissions;
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: RoleName, permission: Permission): boolean {
  return ROLES[role].permissions.includes(permission);
}

/**
 * Get role information
 */
export function getRoleInfo(role: RoleName) {
  return {
    name: ROLES[role].name,
    description: ROLES[role].description,
    permissionCount: ROLES[role].permissions.length,
  };
}

/**
 * Permission categories for UI grouping
 */
export const PERMISSION_CATEGORIES = {
  PROPERTIES: 'Properties Management',
  USERS: 'User Management',
  JOBS: 'Job Management',
  BOOKINGS: 'Bookings & Calendar',
  TODOS: 'To-Do Lists',
  ISSUES: 'Issues & Photos',
  DOCUMENTS: 'Documents',
  FINANCE: 'Financial Management',
  MEDIA: 'Media Gallery',
  HIGHLIGHTS: 'Highlights',
  REPORTS: 'Reports',
  SYSTEM: 'System Administration',
} as const;
