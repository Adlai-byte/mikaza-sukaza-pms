/**
 * Test Data Generator
 *
 * Utilities for generating bulk test data with realistic relationships
 * between entities (properties, bookings, invoices, users, etc.)
 */

import { mockUser, mockProperty, mockBooking, mockInvoice, mockTask, mockJob } from './mock-data';
import type { User, Property, Booking, Invoice, Task, Job } from '@/lib/schemas';

/**
 * Generate multiple instances of an entity
 */
export function createMockArray<T>(
  factory: (overrides?: Partial<T>) => T,
  count: number,
  overridesArray?: Partial<T>[]
): T[] {
  return Array.from({ length: count }, (_, index) => {
    const overrides = overridesArray?.[index] || {};
    return factory(overrides);
  });
}

/**
 * Generate test users with different roles
 */
export function generateTestUsers(): User[] {
  return [
    // Admin users
    mockUser({ user_id: 'admin-1', email: 'admin@test.com', user_type: 'admin', first_name: 'Admin', last_name: 'User' }),
    mockUser({ user_id: 'admin-2', email: 'admin2@test.com', user_type: 'admin', first_name: 'Super', last_name: 'Admin' }),

    // Ops users
    mockUser({ user_id: 'ops-1', email: 'ops@test.com', user_type: 'ops', first_name: 'Operations', last_name: 'Manager' }),
    mockUser({ user_id: 'ops-2', email: 'ops2@test.com', user_type: 'ops', first_name: 'Field', last_name: 'Ops' }),

    // Provider users
    mockUser({ user_id: 'provider-1', email: 'provider@test.com', user_type: 'provider', first_name: 'Service', last_name: 'Provider' }),
    mockUser({ user_id: 'provider-2', email: 'cleaner@test.com', user_type: 'provider', first_name: 'Cleaning', last_name: 'Service' }),

    // Customer users
    ...createMockArray(mockUser, 10,
      Array.from({ length: 10 }, (_, i) => ({
        user_id: `customer-${i + 1}`,
        user_type: 'customer' as const,
        email: `customer${i + 1}@test.com`,
        first_name: `Customer`,
        last_name: `${i + 1}`
      }))
    ),

    // Inactive users
    mockUser({ user_id: 'inactive-1', email: 'inactive@test.com', is_active: false }),
    mockUser({ user_id: 'suspended-1', email: 'suspended@test.com', account_status: 'suspended' }),
  ];
}

/**
 * Generate test properties with various configurations
 */
export function generateTestProperties(ownerIds: string[]): Property[] {
  return [
    // Standard properties
    ...createMockArray(mockProperty, 30,
      Array.from({ length: 30 }, (_, i) => ({
        property_id: `property-${i + 1}`,
        property_name: `Test Property ${i + 1}`,
        owner_id: ownerIds[i % ownerIds.length],
        is_active: true,
        allows_booking: i % 10 !== 0, // 10% don't allow booking
      }))
    ),

    // Inactive properties
    mockProperty({ property_id: 'property-inactive-1', property_name: 'Inactive Property', is_active: false }),
    mockProperty({ property_id: 'property-inactive-2', property_name: 'Archived Property', is_active: false }),

    // Properties with special configurations
    mockProperty({
      property_id: 'property-luxury-1',
      property_name: 'Luxury Penthouse',
      property_type: 'luxury',
      num_bedrooms: 4,
      num_bathrooms: 3,
      max_guests: 8,
    }),
    mockProperty({
      property_id: 'property-studio-1',
      property_name: 'Cozy Studio',
      property_type: 'apartment',
      num_bedrooms: 0,
      num_bathrooms: 1,
      max_guests: 2,
    }),
  ];
}

/**
 * Generate test bookings with realistic date ranges and statuses
 */
export function generateTestBookings(propertyIds: string[]): Booking[] {
  const statuses: Booking['booking_status'][] = [
    'inquiry', 'pending', 'confirmed', 'checked_in', 'checked_out', 'completed', 'cancelled', 'blocked'
  ];

  const channels: Booking['channel'][] = [
    'Airbnb', 'Booking.com', 'VRBO', 'Direct', 'Expedia', 'HomeAway', 'TripAdvisor', 'Other'
  ];

  const bookings: Booking[] = [];

  // Generate bookings across different months
  for (let i = 0; i < 100; i++) {
    const propertyId = propertyIds[i % propertyIds.length];
    const status = statuses[i % statuses.length];
    const channel = channels[i % channels.length];

    // Create date range
    const startDate = new Date(2025, 0, 1 + (i * 3)); // Staggered dates
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 3 + (i % 7)); // 3-10 night stays

    bookings.push(mockBooking({
      booking_id: `booking-${i + 1}`,
      property_id: propertyId,
      booking_status: status,
      channel,
      check_in_date: startDate.toISOString().split('T')[0],
      check_out_date: endDate.toISOString().split('T')[0],
      total_price: 100 + (i * 50),
      num_guests: 2 + (i % 4),
    }));
  }

  // Add some conflicting bookings for testing (same property, overlapping dates)
  bookings.push(mockBooking({
    booking_id: 'booking-conflict-1',
    property_id: propertyIds[0],
    check_in_date: '2025-06-10',
    check_out_date: '2025-06-15',
    booking_status: 'confirmed',
  }));

  bookings.push(mockBooking({
    booking_id: 'booking-conflict-2-should-fail',
    property_id: propertyIds[0],
    check_in_date: '2025-06-12', // Overlaps with booking-conflict-1
    check_out_date: '2025-06-17',
    booking_status: 'inquiry', // Not yet confirmed
  }));

  return bookings;
}

/**
 * Generate test invoices linked to bookings
 */
export function generateTestInvoices(bookingIds: string[]): Invoice[] {
  const statuses: Invoice['status'][] = ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded'];

  return createMockArray(mockInvoice, 80,
    Array.from({ length: 80 }, (_, i) => ({
      invoice_id: `invoice-${i + 1}`,
      booking_id: bookingIds[i % bookingIds.length],
      status: statuses[i % statuses.length],
      invoice_number: `INV-2025-${String(i + 1).padStart(4, '0')}`,
      total_amount: 500 + (i * 100),
      amount_paid: statuses[i % statuses.length] === 'paid' ? 500 + (i * 100) : 0,
    }))
  );
}

/**
 * Generate test tasks
 */
export function generateTestTasks(propertyIds: string[], assigneeIds: string[]): Task[] {
  const statuses: Task['task_status'][] = ['pending', 'in_progress', 'completed', 'cancelled'];
  const priorities: Task['priority'][] = ['low', 'medium', 'high', 'urgent'];

  return createMockArray(mockTask, 50,
    Array.from({ length: 50 }, (_, i) => ({
      task_id: `task-${i + 1}`,
      property_id: propertyIds[i % propertyIds.length],
      assigned_to: assigneeIds[i % assigneeIds.length],
      task_status: statuses[i % statuses.length],
      priority: priorities[i % priorities.length],
      title: `Test Task ${i + 1}`,
    }))
  );
}

/**
 * Generate test jobs
 */
export function generateTestJobs(propertyIds: string[], providerIds: string[]): Job[] {
  const statuses: Job['job_status'][] = ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'];

  return createMockArray(mockJob, 40,
    Array.from({ length: 40 }, (_, i) => ({
      job_id: `job-${i + 1}`,
      property_id: propertyIds[i % propertyIds.length],
      service_provider_id: providerIds[i % providerIds.length],
      job_status: statuses[i % statuses.length],
      job_title: `Test Job ${i + 1}`,
    }))
  );
}

/**
 * Generate complete test dataset with all relationships
 */
export function generateCompleteTestData() {
  // Generate users first (they are referenced by other entities)
  const users = generateTestUsers();
  const customerIds = users.filter(u => u.user_type === 'customer').map(u => u.user_id);
  const providerIds = users.filter(u => u.user_type === 'provider').map(u => u.user_id);
  const opsIds = users.filter(u => u.user_type === 'ops').map(u => u.user_id);

  // Generate properties
  const properties = generateTestProperties(customerIds);
  const propertyIds = properties.map(p => p.property_id);

  // Generate bookings
  const bookings = generateTestBookings(propertyIds);
  const bookingIds = bookings.map(b => b.booking_id);

  // Generate invoices
  const invoices = generateTestInvoices(bookingIds);

  // Generate tasks
  const tasks = generateTestTasks(propertyIds, opsIds);

  // Generate jobs
  const jobs = generateTestJobs(propertyIds, providerIds);

  return {
    users,
    properties,
    bookings,
    invoices,
    tasks,
    jobs,
    // Helper arrays for testing
    customerIds,
    providerIds,
    opsIds,
    propertyIds,
    bookingIds,
  };
}

/**
 * Export test data to JSON (for manual inspection or seeding)
 */
export function exportTestDataToJSON(): string {
  const data = generateCompleteTestData();
  return JSON.stringify(data, null, 2);
}

/**
 * Get a subset of test data for specific test scenarios
 */
export function getTestScenarioData(scenario: 'minimal' | 'standard' | 'comprehensive') {
  const fullData = generateCompleteTestData();

  switch (scenario) {
    case 'minimal':
      return {
        users: fullData.users.slice(0, 5), // 1 admin, 1 ops, 1 provider, 2 customers
        properties: fullData.properties.slice(0, 3),
        bookings: fullData.bookings.slice(0, 5),
        invoices: fullData.invoices.slice(0, 5),
        tasks: fullData.tasks.slice(0, 5),
        jobs: fullData.jobs.slice(0, 5),
      };

    case 'standard':
      return {
        users: fullData.users.slice(0, 10),
        properties: fullData.properties.slice(0, 10),
        bookings: fullData.bookings.slice(0, 20),
        invoices: fullData.invoices.slice(0, 15),
        tasks: fullData.tasks.slice(0, 15),
        jobs: fullData.jobs.slice(0, 10),
      };

    case 'comprehensive':
    default:
      return fullData;
  }
}
