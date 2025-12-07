import {
  LayoutDashboard,
  FileBarChart,
  DollarSign,
  Calendar,
  History,
  ClipboardCheck,
  Image,
  Percent,
  Star,
  MessageSquare,
  Bell,
  HelpCircle,
  Users,
  Building2,
  UserCheck,
  CalendarDays,
  Briefcase,
  CheckSquare,
  AlertTriangle,
  Receipt,
  CreditCard,
  Truck,
  FileText,
  KeyRound,
  Shield,
  LucideIcon,
} from 'lucide-react';
import { PERMISSIONS } from '@/lib/rbac/permissions';

// Entity types for database search
export type EntityType =
  | 'user'
  | 'property'
  | 'guest'
  | 'booking'
  | 'job'
  | 'task'
  | 'issue'
  | 'invoice'
  | 'expense'
  | 'provider'
  | 'document'
  | 'checkInOut'
  | 'accessAuth'
  | 'vendorCoi';

// Result types including quick actions
export type SearchResultType = 'quickAction' | EntityType;

// Search result interface
export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  route: string;
  icon?: LucideIcon;
}

// Entity configuration
export interface EntityConfig {
  type: EntityType;
  table: string;
  icon: LucideIcon;
  permission: string;
  fields: string[]; // Fields to select
  searchFields: string[]; // Fields to search
  routeGenerator: (id: string, item?: Record<string, unknown>) => string;
  titleField: string | ((item: Record<string, unknown>) => string);
  subtitleField: string | ((item: Record<string, unknown>) => string);
}

// Quick action configuration
export interface QuickAction {
  id: string;
  title: string;
  keywords: string[];
  route: string;
  icon: LucideIcon;
  permission?: string; // Optional permission requirement
}

// Entity configurations for database search
export const ENTITY_CONFIGS: EntityConfig[] = [
  {
    type: 'user',
    table: 'users',
    icon: Users,
    permission: PERMISSIONS.USERS_VIEW,
    fields: ['user_id', 'first_name', 'last_name', 'email', 'company'],
    searchFields: ['first_name', 'last_name', 'email', 'company'],
    routeGenerator: (id) => `/users?highlight=${id}`,
    titleField: (item) => `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown User',
    subtitleField: 'email',
  },
  {
    type: 'property',
    table: 'properties',
    icon: Building2,
    permission: PERMISSIONS.PROPERTIES_VIEW,
    fields: ['property_id', 'property_name', 'property_type', 'is_active'],
    searchFields: ['property_name'],
    routeGenerator: (id) => `/properties/${id}/view`,
    titleField: 'property_name',
    subtitleField: (item) => `${item.property_type || 'Property'} • ${item.is_active ? 'Active' : 'Inactive'}`,
  },
  {
    type: 'guest',
    table: 'guests',
    icon: UserCheck,
    permission: PERMISSIONS.GUESTS_VIEW,
    fields: ['guest_id', 'first_name', 'last_name', 'email', 'phone'],
    searchFields: ['first_name', 'last_name', 'email', 'phone'],
    routeGenerator: (id) => `/guests?highlight=${id}`,
    titleField: (item) => `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown Guest',
    subtitleField: (item) => String(item.email || item.phone || 'No contact info'),
  },
  {
    type: 'booking',
    table: 'property_bookings',
    icon: CalendarDays,
    permission: PERMISSIONS.BOOKINGS_VIEW,
    fields: ['booking_id', 'guest_name', 'guest_email', 'confirmation_code', 'check_in_date', 'check_out_date', 'booking_status'],
    searchFields: ['guest_name', 'guest_email', 'confirmation_code'],
    routeGenerator: (id) => `/bookings?highlight=${id}`,
    titleField: (item) => String(item.guest_name || item.confirmation_code || 'Unknown Booking'),
    subtitleField: (item) => {
      const dates = [item.check_in_date, item.check_out_date].filter(Boolean).join(' - ');
      const status = item.booking_status ? ` • ${item.booking_status}` : '';
      return dates + status || 'No dates';
    },
  },
  {
    type: 'job',
    table: 'jobs',
    icon: Briefcase,
    permission: PERMISSIONS.JOBS_VIEW,
    fields: ['job_id', 'title', 'description', 'status', 'job_type'],
    searchFields: ['title', 'description'],
    routeGenerator: (id) => `/jobs?highlight=${id}`,
    titleField: 'title',
    subtitleField: (item) => `${item.job_type || 'Job'} • ${item.status || 'Unknown status'}`,
  },
  {
    type: 'task',
    table: 'tasks',
    icon: CheckSquare,
    permission: PERMISSIONS.TODOS_VIEW_OWN,
    fields: ['task_id', 'title', 'description', 'status', 'priority'],
    searchFields: ['title', 'description'],
    routeGenerator: (id) => `/todos?highlight=${id}`,
    titleField: 'title',
    subtitleField: (item) => `${item.priority || 'Normal'} priority • ${item.status || 'pending'}`,
  },
  {
    type: 'issue',
    table: 'issues',
    icon: AlertTriangle,
    permission: PERMISSIONS.ISSUES_VIEW,
    fields: ['issue_id', 'title', 'description', 'status', 'priority'],
    searchFields: ['title', 'description'],
    routeGenerator: (id) => `/issues?highlight=${id}`,
    titleField: 'title',
    subtitleField: (item) => `${item.priority || 'Normal'} • ${item.status || 'open'}`,
  },
  {
    type: 'invoice',
    table: 'invoices',
    icon: Receipt,
    permission: PERMISSIONS.FINANCE_VIEW,
    fields: ['invoice_id', 'invoice_number', 'guest_name', 'total_amount', 'status'],
    searchFields: ['invoice_number', 'guest_name'],
    routeGenerator: (id) => `/invoices/${id}`,
    titleField: (item) => `Invoice #${item.invoice_number || 'N/A'}`,
    subtitleField: (item) => `${item.guest_name || 'Unknown'} • ${item.status || 'draft'}`,
  },
  {
    type: 'expense',
    table: 'expenses',
    icon: CreditCard,
    permission: PERMISSIONS.FINANCE_VIEW,
    fields: ['expense_id', 'description', 'vendor_name', 'amount', 'expense_date'],
    searchFields: ['description', 'vendor_name'],
    routeGenerator: (id) => `/expenses?highlight=${id}`,
    titleField: 'description',
    subtitleField: (item) => `${item.vendor_name || 'Unknown vendor'} • $${item.amount || 0}`,
  },
  {
    type: 'provider',
    table: 'providers',
    icon: Truck,
    permission: PERMISSIONS.SERVICE_PROVIDERS_VIEW,
    fields: ['provider_id', 'provider_name', 'contact_person', 'email', 'provider_type'],
    searchFields: ['provider_name', 'contact_person', 'email'],
    routeGenerator: (id) => `/vendors?highlight=${id}`,
    titleField: 'provider_name',
    subtitleField: (item) => `${item.provider_type || 'Provider'} • ${item.contact_person || item.email || 'No contact'}`,
  },
  {
    type: 'document',
    table: 'documents',
    icon: FileText,
    permission: PERMISSIONS.DOCUMENTS_CONTRACTS_VIEW,
    fields: ['document_id', 'document_name', 'document_type', 'category', 'status'],
    searchFields: ['document_name', 'document_type', 'category'],
    routeGenerator: (id, item) => {
      // Route based on document category
      const categoryRoutes: Record<string, string> = {
        contracts: '/contracts',
        employee: '/employee-documents',
        service: '/service-documents',
        access: '/access-authorizations',
        coi: '/vendor-cois',
        messages: '/message-templates',
      };
      const category = typeof item?.category === 'string' ? item.category : 'contracts';
      const basePath = categoryRoutes[category] || '/contracts';
      return `${basePath}?highlight=${id}`;
    },
    titleField: 'document_name',
    subtitleField: (item) => {
      const categoryLabels: Record<string, string> = {
        contracts: 'Contract',
        employee: 'Employee Doc',
        service: 'Service Doc',
        access: 'Access Auth',
        coi: 'Vendor COI',
        messages: 'Message Template',
      };
      const categoryLabel = categoryLabels[String(item.category)] || item.document_type || 'Document';
      return `${categoryLabel} • ${item.status || 'active'}`;
    },
  },
  {
    type: 'checkInOut',
    table: 'check_in_out_records',
    icon: ClipboardCheck,
    permission: PERMISSIONS.PROPERTIES_VIEW,
    fields: ['record_id', 'record_type', 'status', 'record_date', 'property_id'],
    searchFields: ['record_type', 'status'],
    routeGenerator: (id) => `/check-in-out?highlight=${id}`,
    titleField: (item) => `${item.record_type === 'check_in' ? 'Check-In' : 'Check-Out'} Record`,
    subtitleField: (item) => `${item.record_date || 'No date'} • ${item.status || 'pending'}`,
  },
  {
    type: 'accessAuth',
    table: 'access_authorizations',
    icon: KeyRound,
    permission: PERMISSIONS.SERVICE_PROVIDERS_VIEW,
    fields: ['authorization_id', 'status', 'access_date', 'vendor_id', 'property_id'],
    searchFields: ['status'],
    routeGenerator: (id) => `/access-authorizations?highlight=${id}`,
    titleField: (item) => `Access Authorization - ${item.status || 'pending'}`,
    subtitleField: (item) => String(item.access_date || 'No date set'),
  },
  {
    type: 'vendorCoi',
    table: 'vendor_cois',
    icon: Shield,
    permission: PERMISSIONS.SERVICE_PROVIDERS_VIEW,
    fields: ['coi_id', 'coverage_type', 'status', 'valid_through', 'vendor_id'],
    searchFields: ['coverage_type', 'status'],
    routeGenerator: (id) => `/vendor-cois?highlight=${id}`,
    titleField: (item) => `COI - ${item.coverage_type || 'Unknown type'}`,
    subtitleField: (item) => `Valid through: ${item.valid_through || 'N/A'} • ${item.status || 'pending'}`,
  },
];

// Quick actions for fast navigation
export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    keywords: ['dashboard', 'home', 'overview', 'main'],
    route: '/',
    icon: LayoutDashboard,
  },
  {
    id: 'reports',
    title: 'Reports',
    keywords: ['reports', 'analytics', 'statistics', 'report'],
    route: '/reports',
    icon: FileBarChart,
    permission: PERMISSIONS.REPORTS_VIEW,
  },
  {
    id: 'financial-dashboard',
    title: 'Financial Dashboard',
    keywords: ['finance', 'financial', 'money', 'accounting', 'revenue'],
    route: '/financial-dashboard',
    icon: DollarSign,
    permission: PERMISSIONS.FINANCE_VIEW,
  },
  {
    id: 'calendar',
    title: 'Calendar',
    keywords: ['calendar', 'schedule', 'dates', 'availability', 'booking calendar'],
    route: '/calendar',
    icon: Calendar,
    permission: PERMISSIONS.BOOKINGS_VIEW,
  },
  {
    id: 'activity-logs',
    title: 'Activity Logs',
    keywords: ['logs', 'activity', 'audit', 'history', 'actions'],
    route: '/activity-logs',
    icon: History,
    permission: PERMISSIONS.SYSTEM_AUDIT,
  },
  {
    id: 'check-in-out',
    title: 'Check-In / Check-Out',
    keywords: ['checkin', 'checkout', 'arrival', 'departure', 'check-in', 'check-out'],
    route: '/check-in-out',
    icon: ClipboardCheck,
    permission: PERMISSIONS.PROPERTIES_VIEW,
  },
  {
    id: 'media',
    title: 'Media Library',
    keywords: ['media', 'photos', 'images', 'gallery', 'pictures', 'files'],
    route: '/media',
    icon: Image,
    permission: PERMISSIONS.MEDIA_VIEW,
  },
  {
    id: 'commissions',
    title: 'Commissions',
    keywords: ['commissions', 'earnings', 'payouts', 'commission'],
    route: '/commissions',
    icon: Percent,
    permission: PERMISSIONS.FINANCE_VIEW,
  },
  {
    id: 'highlights',
    title: 'Highlights',
    keywords: ['highlights', 'summary', 'featured', 'important'],
    route: '/highlights',
    icon: Star,
    permission: PERMISSIONS.FINANCE_VIEW,
  },
  {
    id: 'messages',
    title: 'Messages',
    keywords: ['messages', 'chat', 'inbox', 'communication', 'message'],
    route: '/messages',
    icon: MessageSquare,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    keywords: ['notifications', 'alerts', 'notify', 'notification'],
    route: '/notifications',
    icon: Bell,
  },
  {
    id: 'help',
    title: 'Help',
    keywords: ['help', 'support', 'faq', 'documentation', 'guide'],
    route: '/help',
    icon: HelpCircle,
  },
  // Add more navigation shortcuts
  {
    id: 'properties',
    title: 'Properties',
    keywords: ['properties', 'property', 'units', 'buildings', 'real estate'],
    route: '/properties',
    icon: Building2,
    permission: PERMISSIONS.PROPERTIES_VIEW,
  },
  {
    id: 'bookings',
    title: 'Bookings',
    keywords: ['bookings', 'reservations', 'booking', 'reservation'],
    route: '/bookings',
    icon: CalendarDays,
    permission: PERMISSIONS.BOOKINGS_VIEW,
  },
  {
    id: 'jobs',
    title: 'Jobs',
    keywords: ['jobs', 'work orders', 'maintenance', 'job'],
    route: '/jobs',
    icon: Briefcase,
    permission: PERMISSIONS.JOBS_VIEW,
  },
  {
    id: 'tasks',
    title: 'Tasks',
    keywords: ['tasks', 'todos', 'to-do', 'todo', 'task'],
    route: '/todos',
    icon: CheckSquare,
    permission: PERMISSIONS.TODOS_VIEW_OWN,
  },
  {
    id: 'issues',
    title: 'Issues',
    keywords: ['issues', 'problems', 'bugs', 'issue', 'problem'],
    route: '/issues',
    icon: AlertTriangle,
    permission: PERMISSIONS.ISSUES_VIEW,
  },
  {
    id: 'invoices',
    title: 'Invoices',
    keywords: ['invoices', 'billing', 'invoice', 'bills'],
    route: '/invoices',
    icon: Receipt,
    permission: PERMISSIONS.FINANCE_VIEW,
  },
  {
    id: 'expenses',
    title: 'Expenses',
    keywords: ['expenses', 'spending', 'expense', 'costs'],
    route: '/expenses',
    icon: CreditCard,
    permission: PERMISSIONS.FINANCE_VIEW,
  },
  {
    id: 'vendors',
    title: 'Service Providers',
    keywords: ['vendors', 'providers', 'supplier', 'contractor', 'service provider'],
    route: '/vendors',
    icon: Truck,
    permission: PERMISSIONS.SERVICE_PROVIDERS_VIEW,
  },
  {
    id: 'guests',
    title: 'Guests',
    keywords: ['guests', 'tenants', 'guest', 'customer'],
    route: '/guests',
    icon: UserCheck,
    permission: PERMISSIONS.GUESTS_VIEW,
  },
  {
    id: 'users',
    title: 'Users',
    keywords: ['users', 'team', 'staff', 'user', 'members'],
    route: '/users',
    icon: Users,
    permission: PERMISSIONS.USERS_VIEW,
  },
  // Document pages
  {
    id: 'contracts',
    title: 'Contracts',
    keywords: ['contracts', 'contract', 'agreements', 'document', 'legal'],
    route: '/contracts',
    icon: FileText,
    permission: PERMISSIONS.DOCUMENTS_CONTRACTS_VIEW,
  },
  {
    id: 'employee-documents',
    title: 'Employee Documents',
    keywords: ['employee', 'hr', 'staff documents', 'personnel', 'employee docs'],
    route: '/employee-documents',
    icon: FileText,
    permission: PERMISSIONS.DOCUMENTS_EMPLOYEE_VIEW,
  },
  {
    id: 'service-documents',
    title: 'Service Documents',
    keywords: ['service', 'service docs', 'maintenance documents', 'work documents'],
    route: '/service-documents',
    icon: FileText,
    permission: PERMISSIONS.DOCUMENTS_SERVICE_VIEW,
  },
  {
    id: 'access-authorizations',
    title: 'Access Authorizations',
    keywords: ['access', 'authorization', 'permissions', 'entry', 'access request'],
    route: '/access-authorizations',
    icon: KeyRound,
    permission: PERMISSIONS.DOCUMENTS_ACCESS_VIEW,
  },
  {
    id: 'vendor-cois',
    title: 'Vendor COIs',
    keywords: ['coi', 'certificate', 'insurance', 'vendor insurance', 'coverage'],
    route: '/vendor-cois',
    icon: Shield,
    permission: PERMISSIONS.DOCUMENTS_COI_VIEW,
  },
  {
    id: 'message-templates',
    title: 'Message Templates',
    keywords: ['message', 'template', 'email template', 'sms template', 'communication'],
    route: '/message-templates',
    icon: MessageSquare,
    permission: PERMISSIONS.DOCUMENTS_MESSAGES_VIEW,
  },
];

// Get entity config by type
export function getEntityConfig(type: EntityType): EntityConfig | undefined {
  return ENTITY_CONFIGS.find(c => c.type === type);
}

// Get icon for entity type
export function getEntityIcon(type: SearchResultType): LucideIcon {
  if (type === 'quickAction') {
    return LayoutDashboard;
  }
  const config = getEntityConfig(type as EntityType);
  return config?.icon || FileText;
}

// Filter quick actions by search query
export function filterQuickActions(query: string, hasPermission: (permission: string) => boolean): QuickAction[] {
  const lowerQuery = query.toLowerCase().trim();

  return QUICK_ACTIONS.filter(action => {
    // Check permission if required
    if (action.permission && !hasPermission(action.permission)) {
      return false;
    }

    // If no query, show all permitted actions
    if (!lowerQuery) {
      return true;
    }

    // Match against title or keywords
    return (
      action.title.toLowerCase().includes(lowerQuery) ||
      action.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))
    );
  });
}

// Get title from entity item
export function getEntityTitle(config: EntityConfig, item: Record<string, unknown>): string {
  if (typeof config.titleField === 'function') {
    return config.titleField(item);
  }
  return String(item[config.titleField] || 'Unknown');
}

// Get subtitle from entity item
export function getEntitySubtitle(config: EntityConfig, item: Record<string, unknown>): string {
  if (typeof config.subtitleField === 'function') {
    return config.subtitleField(item);
  }
  return String(item[config.subtitleField] || '');
}

// Get ID field name for entity
export function getEntityIdField(type: EntityType): string {
  const idFields: Record<EntityType, string> = {
    user: 'user_id',
    property: 'property_id',
    guest: 'guest_id',
    booking: 'booking_id',
    job: 'job_id',
    task: 'task_id',
    issue: 'issue_id',
    invoice: 'invoice_id',
    expense: 'expense_id',
    provider: 'provider_id',
    document: 'document_id',
    checkInOut: 'record_id',
    accessAuth: 'authorization_id',
    vendorCoi: 'coi_id',
  };
  return idFields[type];
}
