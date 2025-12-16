/**
 * Test Data Fixtures for E2E Tests
 *
 * These fixtures provide consistent test data across all test files.
 * Update values as needed for your test environment.
 */

/**
 * Test user credentials
 */
export const TEST_USERS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'vinzlloydalferez@gmail.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'alferez123',
    role: 'admin',
    name: 'Admin User',
  },
  ops: {
    email: process.env.TEST_OPS_EMAIL || 'ops@test.com',
    password: process.env.TEST_OPS_PASSWORD || 'test123',
    role: 'ops',
    name: 'Ops User',
  },
  provider: {
    email: process.env.TEST_PROVIDER_EMAIL || 'provider@test.com',
    password: process.env.TEST_PROVIDER_PASSWORD || 'test123',
    role: 'provider',
    name: 'Provider User',
  },
  customer: {
    email: process.env.TEST_CUSTOMER_EMAIL || 'customer@test.com',
    password: process.env.TEST_CUSTOMER_PASSWORD || 'test123',
    role: 'customer',
    name: 'Customer User',
  },
};

/**
 * Default test user (used when no specific role is needed)
 */
export const DEFAULT_TEST_USER = TEST_USERS.admin;

/**
 * Test property data
 */
export const TEST_PROPERTIES = {
  beachHouse: {
    name: 'Test Beach House',
    address: '123 Beach Street',
    city: 'Miami',
    state: 'FL',
    zip: '33101',
    status: 'active',
    type: 'house',
    bedrooms: 4,
    bathrooms: 3,
  },
  mountainCabin: {
    name: 'Test Mountain Cabin',
    address: '456 Mountain Road',
    city: 'Aspen',
    state: 'CO',
    zip: '81611',
    status: 'active',
    type: 'cabin',
    bedrooms: 2,
    bathrooms: 1,
  },
  cityApartment: {
    name: 'Test City Apartment',
    address: '789 City Avenue',
    city: 'New York',
    state: 'NY',
    zip: '10001',
    status: 'inactive',
    type: 'apartment',
    bedrooms: 1,
    bathrooms: 1,
  },
};

/**
 * Test booking data
 */
export const TEST_BOOKINGS = {
  confirmed: {
    guestName: 'John Doe',
    guestEmail: 'john.doe@example.com',
    guestPhone: '555-123-4567',
    checkInDate: getFutureDate(1), // Tomorrow
    checkOutDate: getFutureDate(4), // 4 days from now
    status: 'confirmed',
    adults: 2,
    children: 0,
    totalAmount: 500,
  },
  pending: {
    guestName: 'Jane Smith',
    guestEmail: 'jane.smith@example.com',
    guestPhone: '555-987-6543',
    checkInDate: getFutureDate(7), // 1 week from now
    checkOutDate: getFutureDate(10), // 10 days from now
    status: 'pending',
    adults: 4,
    children: 2,
    totalAmount: 1200,
  },
  cancelled: {
    guestName: 'Bob Wilson',
    guestEmail: 'bob.wilson@example.com',
    guestPhone: '555-456-7890',
    checkInDate: getFutureDate(-5), // 5 days ago
    checkOutDate: getFutureDate(-2), // 2 days ago
    status: 'cancelled',
    adults: 1,
    children: 0,
    totalAmount: 0,
  },
};

/**
 * Test invoice data
 */
export const TEST_INVOICES = {
  draft: {
    invoiceNumber: 'INV-TEST-001',
    status: 'draft',
    subtotal: 500,
    tax: 50,
    total: 550,
    lineItems: [
      { description: 'Accommodation - 3 nights', quantity: 3, unitPrice: 150, total: 450 },
      { description: 'Cleaning fee', quantity: 1, unitPrice: 50, total: 50 },
    ],
  },
  sent: {
    invoiceNumber: 'INV-TEST-002',
    status: 'sent',
    subtotal: 1200,
    tax: 120,
    total: 1320,
    lineItems: [
      { description: 'Accommodation - 5 nights', quantity: 5, unitPrice: 200, total: 1000 },
      { description: 'Pool access', quantity: 5, unitPrice: 40, total: 200 },
    ],
  },
  paid: {
    invoiceNumber: 'INV-TEST-003',
    status: 'paid',
    subtotal: 800,
    tax: 80,
    total: 880,
    lineItems: [
      { description: 'Accommodation - 4 nights', quantity: 4, unitPrice: 180, total: 720 },
      { description: 'Parking fee', quantity: 4, unitPrice: 20, total: 80 },
    ],
  },
};

/**
 * Test provider data
 */
export const TEST_PROVIDERS = {
  cleaner: {
    name: 'ABC Cleaning Services',
    type: 'service',
    category: 'Cleaning',
    email: 'abc.cleaning@example.com',
    phone: '555-111-2222',
    status: 'active',
  },
  electrician: {
    name: 'Quick Fix Electric',
    type: 'service',
    category: 'Electrical',
    email: 'quickfix@example.com',
    phone: '555-333-4444',
    status: 'active',
  },
  utility: {
    name: 'City Power Company',
    type: 'utility',
    category: 'Electric',
    email: 'billing@citypower.com',
    phone: '555-555-6666',
    accountNumber: 'ACC-123456',
    status: 'active',
  },
};

/**
 * Test job data
 */
export const TEST_JOBS = {
  cleaning: {
    title: 'Regular Cleaning',
    description: 'Standard cleaning service after checkout',
    type: 'cleaning',
    status: 'pending',
    priority: 'medium',
  },
  maintenance: {
    title: 'AC Repair',
    description: 'Air conditioning not cooling properly',
    type: 'maintenance',
    status: 'in_progress',
    priority: 'high',
  },
  inspection: {
    title: 'Monthly Inspection',
    description: 'Regular property inspection',
    type: 'inspection',
    status: 'completed',
    priority: 'low',
  },
};

/**
 * Test check-in/out data
 */
export const TEST_CHECKINOUT = {
  checkIn: {
    type: 'check_in',
    residentName: 'John Doe',
    residentContact: '555-123-4567',
    notes: 'Guest arrived on time',
    checklistItems: [
      { item: 'Keys handed', checked: true },
      { item: 'Walkthrough completed', checked: true },
      { item: 'Parking explained', checked: true },
    ],
  },
  checkOut: {
    type: 'check_out',
    residentName: 'John Doe',
    residentContact: '555-123-4567',
    notes: 'Guest left property in good condition',
    checklistItems: [
      { item: 'Keys returned', checked: true },
      { item: 'Property inspected', checked: true },
      { item: 'Deposit returned', checked: false },
    ],
  },
};

/**
 * Test document/COI data
 */
export const TEST_DOCUMENTS = {
  coi: {
    vendorName: 'ABC Cleaning Services',
    policyNumber: 'POL-123456',
    coverageType: 'General Liability',
    coverageAmount: 1000000,
    effectiveDate: getTodayDate(),
    expirationDate: getFutureDate(365),
  },
  contract: {
    name: 'Service Agreement',
    type: 'contract',
    description: 'Standard service agreement template',
  },
};

/**
 * Page routes for navigation tests
 */
export const ROUTES = {
  // Auth
  auth: '/auth',
  resetPassword: '/reset-password',
  unauthorized: '/unauthorized',

  // Core
  dashboard: '/',
  profile: '/profile',
  help: '/help',
  notifications: '/notifications',
  messages: '/messages',

  // Properties
  properties: '/properties',
  propertyEdit: (id: string) => `/properties/${id}/edit`,
  propertyView: (id: string) => `/properties/${id}/view`,

  // Bookings
  bookings: '/bookings',
  calendar: '/calendar',

  // Guests
  guests: '/guests',

  // Finance
  invoices: '/invoices',
  invoiceNew: '/invoices/new',
  invoiceEdit: (id: string) => `/invoices/${id}`,
  expenses: '/expenses',
  ownerStatement: '/owner-statement',
  billTemplates: '/bill-templates',
  financialDashboard: '/financial-dashboard',
  highlights: '/highlights',

  // Providers & Jobs
  providers: '/providers',
  jobs: '/jobs',

  // Documents
  contracts: '/contracts',
  employeeDocuments: '/employee-documents',
  serviceDocuments: '/service-documents',
  messageTemplates: '/message-templates',
  vendorCois: '/vendor-cois',
  accessAuthorizations: '/access-authorizations',

  // Operations
  checkInOut: '/check-in-out',
  checklistTemplates: '/checklist-templates',
  media: '/media',
  issues: '/issues',

  // Admin
  users: '/users',
  activityLogs: '/activity-logs',
  reports: '/reports',

  // Automation
  reportSchedules: '/automation/report-schedules',

  // Additional pages
  commissions: '/commissions',
  profile: '/profile',
  notifications: '/notifications',

  // Security
  passwordVault: '/password-vault',
};

/**
 * Permission groups for access control tests
 */
export const PERMISSION_GROUPS = {
  admin: {
    allowed: Object.values(ROUTES),
    denied: [],
  },
  ops: {
    allowed: [
      ROUTES.dashboard,
      ROUTES.properties,
      ROUTES.bookings,
      ROUTES.calendar,
      ROUTES.guests,
      ROUTES.providers,
      ROUTES.jobs,
      ROUTES.checkInOut,
      ROUTES.reports,
    ],
    denied: [
      ROUTES.users,
      ROUTES.activityLogs,
    ],
  },
  provider: {
    allowed: [
      ROUTES.dashboard,
      ROUTES.jobs,
      ROUTES.profile,
    ],
    denied: [
      ROUTES.properties,
      ROUTES.bookings,
      ROUTES.users,
      ROUTES.invoices,
    ],
  },
  customer: {
    allowed: [
      ROUTES.dashboard,
      ROUTES.invoices,
      ROUTES.profile,
    ],
    denied: [
      ROUTES.properties,
      ROUTES.users,
      ROUTES.providers,
    ],
  },
};

/**
 * Helper: Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Helper: Get a future date in YYYY-MM-DD format
 */
export function getFutureDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

/**
 * Helper: Get a past date in YYYY-MM-DD format
 */
export function getPastDate(daysAgo: number): string {
  return getFutureDate(-daysAgo);
}

/**
 * Helper: Generate a unique test ID
 */
export function generateTestId(prefix: string = 'TEST'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Helper: Generate test email
 */
export function generateTestEmail(): string {
  return `test.${generateTestId()}@example.com`;
}

/**
 * Export all fixtures
 */
export const TestData = {
  TEST_USERS,
  DEFAULT_TEST_USER,
  TEST_PROPERTIES,
  TEST_BOOKINGS,
  TEST_INVOICES,
  TEST_PROVIDERS,
  TEST_JOBS,
  TEST_CHECKINOUT,
  TEST_DOCUMENTS,
  ROUTES,
  PERMISSION_GROUPS,
  getTodayDate,
  getFutureDate,
  getPastDate,
  generateTestId,
  generateTestEmail,
};

export default TestData;
