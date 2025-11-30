/**
 * Mock data factory for testing
 * Provides realistic test data for all major entities
 */

import { Invoice, InvoicePayment, InvoiceLineItem, Expense, Property, Booking, User, Task, TaskChecklist, AppNotification, NotificationPreferences } from '@/lib/schemas';
import { Job, JobTask, JobComment, JobAttachment } from '@/hooks/useJobs';

// ===== INVOICES =====

export const mockInvoice = (overrides?: Partial<Invoice>): Invoice => ({
  invoice_id: 'inv-123',
  invoice_number: 'INV-2025-001',
  property_id: 'prop-123',
  booking_id: 'booking-123',
  issue_date: '2025-10-01',
  due_date: '2025-10-15',
  status: 'sent',
  subtotal: 1000.00,
  tax_rate: 0.08,
  tax_amount: 80.00,
  total_amount: 1080.00,
  amount_paid: 0.00,
  paid_date: null,
  notes: 'Test invoice',
  created_by: 'user-123',
  created_at: '2025-10-01T00:00:00Z',
  updated_at: '2025-10-01T00:00:00Z',
  ...overrides,
});

export const mockPaidInvoice = (overrides?: Partial<Invoice>): Invoice =>
  mockInvoice({
    status: 'paid',
    amount_paid: 1080.00,
    paid_date: '2025-10-10',
    ...overrides,
  });

export const mockOverdueInvoice = (overrides?: Partial<Invoice>): Invoice =>
  mockInvoice({
    status: 'overdue',
    due_date: '2025-09-01', // Past date
    ...overrides,
  });

// ===== INVOICE PAYMENTS =====

export const mockPayment = (overrides?: Partial<InvoicePayment>): InvoicePayment => ({
  payment_id: 'pay-123',
  invoice_id: 'inv-123',
  payment_date: '2025-10-10',
  amount: 1080.00,
  payment_method: 'cash',
  reference_number: 'REF-001',
  notes: 'Full payment',
  created_by: 'user-123',
  created_at: '2025-10-10T00:00:00Z',
  updated_at: '2025-10-10T00:00:00Z',
  ...overrides,
});

export const mockPartialPayment = (overrides?: Partial<InvoicePayment>): InvoicePayment =>
  mockPayment({
    amount: 500.00,
    notes: 'Partial payment',
    ...overrides,
  });

// ===== INVOICE LINE ITEMS =====

export const mockInvoiceLineItem = (overrides?: Partial<InvoiceLineItem>): InvoiceLineItem => ({
  line_item_id: 'line-123',
  invoice_id: 'inv-123',
  line_number: 1,
  description: 'Accommodation - 4 nights',
  quantity: 4,
  unit_price: 250.00,
  tax_rate: 0,
  tax_amount: 0,
  item_type: 'accommodation',
  created_at: '2025-10-01T00:00:00Z',
  updated_at: '2025-10-01T00:00:00Z',
  ...overrides,
});

export const mockAccommodationLineItem = (overrides?: Partial<InvoiceLineItem>): InvoiceLineItem =>
  mockInvoiceLineItem({
    description: 'Accommodation - 3 nights (2025-11-01 to 2025-11-04)',
    quantity: 3,
    unit_price: 200.00,
    item_type: 'accommodation',
    ...overrides,
  });

export const mockCleaningLineItem = (overrides?: Partial<InvoiceLineItem>): InvoiceLineItem =>
  mockInvoiceLineItem({
    line_number: 2,
    description: 'Cleaning Fee',
    quantity: 1,
    unit_price: 100.00,
    item_type: 'cleaning',
    ...overrides,
  });

export const mockTaxLineItem = (overrides?: Partial<InvoiceLineItem>): InvoiceLineItem =>
  mockInvoiceLineItem({
    line_number: 3,
    description: 'Taxes',
    quantity: 1,
    unit_price: 56.00,
    item_type: 'tax',
    ...overrides,
  });

// ===== EXPENSES =====

export const mockExpense = (overrides?: Partial<Expense>): Expense => ({
  expense_id: 'exp-123',
  property_id: 'prop-123',
  job_id: null,
  category: 'maintenance',
  description: 'Plumbing repair',
  amount: 150.00,
  tax_amount: 12.00,
  expense_date: '2025-10-15',
  vendor_name: 'ABC Plumbing',
  receipt_url: null,
  notes: 'Fixed kitchen sink',
  created_by: 'user-123',
  created_at: '2025-10-15T00:00:00Z',
  updated_at: '2025-10-15T00:00:00Z',
  ...overrides,
});

export const mockExpenseWithJob = (overrides?: Partial<Expense>): Expense =>
  mockExpense({
    job_id: 'job-123',
    ...overrides,
  });

// ===== PROPERTIES =====

export const mockProperty = (overrides?: Partial<Property>): any => ({
  property_id: 'prop-123',
  property_name: 'Sunset Villa',
  property_type: 'house',
  address: '123 Main St',
  city: 'Los Angeles',
  state: 'CA',
  zip_code: '90001',
  country: 'USA',
  bedrooms: 3,
  bathrooms: 2,
  square_feet: 1500,
  is_active: true,
  main_owner_id: 'owner-123',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

// ===== BOOKINGS =====

export const mockBooking = (overrides?: Partial<Booking>): any => ({
  booking_id: 'booking-123',
  property_id: 'prop-123',
  guest_name: 'John Doe',
  guest_email: 'john@example.com',
  guest_phone: '555-0123',
  check_in_date: '2025-11-01',
  check_out_date: '2025-11-05',
  number_of_guests: 2,
  total_price: 1000.00,
  status: 'confirmed',
  booking_source: 'direct',
  notes: 'Early check-in requested',
  created_by: 'user-123',
  created_at: '2025-10-01T00:00:00Z',
  updated_at: '2025-10-01T00:00:00Z',
  ...overrides,
});

// ===== USERS =====

export const mockUser = (overrides?: Partial<User>): User => ({
  user_id: 'user-123',
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  user_type: 'owner',
  is_active: true,
  date_of_birth: null,
  company: null,
  cellphone_primary: '+1234567890',
  cellphone_usa: null,
  whatsapp: null,
  address: '123 Main St',
  city: 'Los Angeles',
  state: 'CA',
  zip: '90001',
  photo_url: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

export const mockAdminUser = (overrides?: Partial<User>): User =>
  mockUser({
    user_type: 'admin',
    first_name: 'Admin',
    last_name: 'User',
    email: 'admin@example.com',
    ...overrides,
  });

export const mockStaffUser = (overrides?: Partial<User>): User =>
  mockUser({
    user_type: 'staff',
    first_name: 'Staff',
    last_name: 'Member',
    email: 'staff@example.com',
    ...overrides,
  });

// ===== FINANCIAL DASHBOARD DATA =====

export const mockDashboardSummary = () => ({
  total_revenue: 25000.00,
  total_expenses: 8000.00,
  net_income: 17000.00,
  total_invoices: 45,
  paid_invoices: 38,
  pending_invoices: 5,
  overdue_invoices: 2,
  total_properties: 12,
  active_bookings: 8,
});

export const mockRevenueByProperty = () => [
  {
    property_id: 'prop-1',
    property_name: 'Sunset Villa',
    revenue: 12000.00,
    invoice_count: 10,
    occupancy_days: 45,
  },
  {
    property_id: 'prop-2',
    property_name: 'Beach House',
    revenue: 8000.00,
    invoice_count: 8,
    occupancy_days: 30,
  },
  {
    property_id: 'prop-3',
    property_name: 'Mountain Cabin',
    revenue: 5000.00,
    invoice_count: 5,
    occupancy_days: 20,
  },
];

export const mockExpensesByCategory = () => [
  {
    category: 'maintenance',
    amount: 3000.00,
    count: 12,
    percentage: 37.5,
  },
  {
    category: 'utilities',
    amount: 2500.00,
    count: 24,
    percentage: 31.25,
  },
  {
    category: 'supplies',
    amount: 1500.00,
    count: 8,
    percentage: 18.75,
  },
  {
    category: 'insurance',
    amount: 1000.00,
    count: 1,
    percentage: 12.5,
  },
];

export const mockFinancialOverTime = () => [
  { month: '2025-01', revenue: 5000, expenses: 1500, net_income: 3500 },
  { month: '2025-02', revenue: 4500, expenses: 1200, net_income: 3300 },
  { month: '2025-03', revenue: 6000, expenses: 2000, net_income: 4000 },
  { month: '2025-04', revenue: 5500, expenses: 1800, net_income: 3700 },
  { month: '2025-05', revenue: 7000, expenses: 2200, net_income: 4800 },
  { month: '2025-06', revenue: 6500, expenses: 2100, net_income: 4400 },
];

// ===== HELPER FUNCTIONS =====

/**
 * Create multiple mock items
 */
export function createMockArray<T>(
  factory: (overrides?: any) => T,
  count: number,
  baseOverrides?: any
): T[] {
  return Array.from({ length: count }, (_, index) =>
    factory({
      ...baseOverrides,
      // Add unique identifiers
      ...(factory.name.includes('Invoice') && { invoice_id: `inv-${index + 1}` }),
      ...(factory.name.includes('Payment') && { payment_id: `pay-${index + 1}` }),
      ...(factory.name.includes('Expense') && { expense_id: `exp-${index + 1}` }),
      ...(factory.name.includes('Property') && { property_id: `prop-${index + 1}` }),
      ...(factory.name.includes('Booking') && { booking_id: `booking-${index + 1}` }),
    })
  );
}

/**
 * Create a realistic invoice with line items
 */
export function createInvoiceWithLineItems(overrides?: Partial<Invoice>) {
  const lineItems = [
    { description: 'Nightly rate (4 nights)', quantity: 4, unit_price: 250.00, amount: 1000.00 },
    { description: 'Cleaning fee', quantity: 1, unit_price: 100.00, amount: 100.00 },
  ];

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxRate = 0.08;
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;

  return {
    invoice: mockInvoice({
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      ...overrides,
    }),
    lineItems,
  };
}

// ===== JOBS =====

export const mockJob = (overrides?: Partial<Job>): Job => ({
  job_id: 'job-123',
  property_id: 'prop-123',
  title: 'Fix leaking faucet',
  description: 'Kitchen sink is leaking',
  job_type: 'maintenance',
  status: 'pending',
  priority: 'high',
  assigned_to: 'user-456',
  created_by: 'user-123',
  due_date: '2025-11-01',
  estimated_hours: 2,
  actual_hours: null,
  estimated_cost: 150.00,
  actual_cost: null,
  created_at: '2025-10-20T00:00:00Z',
  updated_at: '2025-10-20T00:00:00Z',
  completed_at: null,
  ...overrides,
});

export const mockJobTask = (overrides?: Partial<JobTask>): JobTask => ({
  task_id: 'task-123',
  job_id: 'job-123',
  title: 'Turn off water supply',
  description: 'Turn off main water valve',
  status: 'pending',
  task_order: 1,
  estimated_duration: 15,
  created_at: '2025-10-20T00:00:00Z',
  updated_at: '2025-10-20T00:00:00Z',
  completed_at: null,
  ...overrides,
});

export const mockJobComment = (overrides?: Partial<JobComment>): JobComment => ({
  comment_id: 'comment-123',
  job_id: 'job-123',
  user_id: 'user-123',
  comment: 'Started working on this',
  created_at: '2025-10-20T10:00:00Z',
  ...overrides,
});

export const mockJobAttachment = (overrides?: Partial<JobAttachment>): JobAttachment => ({
  attachment_id: 'attach-123',
  job_id: 'job-123',
  file_name: 'photo.jpg',
  file_url: 'https://example.com/photo.jpg',
  file_type: 'image/jpeg',
  file_size: 102400,
  uploaded_by: 'user-123',
  uploaded_at: '2025-10-20T10:00:00Z',
  ...overrides,
});

// ===== TASKS =====

export const mockTask = (overrides?: Partial<Task>): Task => ({
  task_id: 'task-123',
  title: 'Clean pool',
  description: 'Weekly pool cleaning',
  status: 'pending',
  priority: 'medium',
  category: 'maintenance',
  assigned_to: 'user-456',
  created_by: 'user-123',
  property_id: 'prop-123',
  job_id: null,
  due_date: '2025-10-25',
  created_at: '2025-10-20T00:00:00Z',
  updated_at: '2025-10-20T00:00:00Z',
  completed_at: null,
  ...overrides,
});

export const mockTaskChecklist = (overrides?: Partial<TaskChecklist>): TaskChecklist => ({
  checklist_item_id: 'check-123',
  task_id: 'task-123',
  item_text: 'Check pH levels',
  is_completed: false,
  order_index: 1,
  created_at: '2025-10-20T00:00:00Z',
  ...overrides,
});

// ===== NOTIFICATIONS =====

export const mockNotification = (overrides?: Partial<AppNotification>): AppNotification => ({
  notification_id: 'notif-123',
  user_id: 'user-123',
  type: 'task_assigned',
  title: 'Task Assigned',
  message: 'You have been assigned to task: Clean pool',
  link: '/tasks/task-123',
  task_id: 'task-123',
  issue_id: null,
  booking_id: null,
  job_id: null,
  action_by: 'user-456',
  metadata: null,
  is_read: false,
  read_at: null,
  created_at: '2025-10-24T10:00:00Z',
  ...overrides,
});

export const mockUnreadNotification = (overrides?: Partial<AppNotification>): AppNotification =>
  mockNotification({
    notification_id: 'notif-unread',
    is_read: false,
    read_at: null,
    ...overrides,
  });

export const mockReadNotification = (overrides?: Partial<AppNotification>): AppNotification =>
  mockNotification({
    notification_id: 'notif-read',
    is_read: true,
    read_at: '2025-10-24T11:00:00Z',
    ...overrides,
  });

export const mockTaskNotification = (overrides?: Partial<AppNotification>): AppNotification =>
  mockNotification({
    notification_id: 'notif-task',
    type: 'task_assigned',
    title: 'Task Assigned',
    message: 'You have been assigned to task: Fix AC',
    link: '/tasks/task-456',
    task_id: 'task-456',
    ...overrides,
  });

export const mockJobNotification = (overrides?: Partial<AppNotification>): AppNotification =>
  mockNotification({
    notification_id: 'notif-job',
    type: 'job_status_changed',
    title: 'Job Status Updated',
    message: 'Job "Fix plumbing" status changed to in_progress',
    link: '/jobs',
    job_id: 'job-123',
    task_id: null,
    ...overrides,
  });

export const mockBookingNotification = (overrides?: Partial<AppNotification>): AppNotification =>
  mockNotification({
    notification_id: 'notif-booking',
    type: 'booking_created',
    title: 'New Booking',
    message: 'New booking created for Sunset Villa',
    link: '/bookings',
    booking_id: 'booking-123',
    task_id: null,
    ...overrides,
  });

export const mockNotificationPreferences = (overrides?: Partial<NotificationPreferences>): NotificationPreferences => ({
  user_id: 'user-123',
  email_task_assigned: true,
  email_task_due_soon: true,
  email_task_completed: false,
  email_issue_assigned: true,
  email_issue_resolved: false,
  email_mentions: true,
  app_task_assigned: true,
  app_task_status_changed: true,
  app_task_due_soon: true,
  app_issue_assigned: true,
  app_issue_status_changed: true,
  app_mentions: true,
  browser_enabled: false,
  daily_summary: false,
  weekly_summary: false,
  ...overrides,
});
