import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useBookings,
  usePropertyBookings,
  useBookingsCalendar,
  useBookingDetail,
} from './useBookings';
import { createWrapper } from '@/test/utils/test-wrapper';
import { mockBooking } from '@/test/utils/mock-data';
import { mockSupabaseSuccess, mockSupabaseError } from '@/test/utils/supabase-mock';

// Mock AuthContext - Must be first
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', user_id: 'user-123', email: 'test@example.com', user_type: 'admin', is_active: true },
    profile: { user_id: 'user-123', email: 'test@example.com', user_type: 'admin' },
    session: { user: { id: 'user-123' }, access_token: 'mock-token' },
    isLoading: false,
  }),
  AuthProvider: ({ children }: any) => children,
}));

// Mock RBAC permissions
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: vi.fn().mockReturnValue(true),
  }),
}));

// Mock booking notifications
vi.mock('@/lib/notifications/booking-notifications', () => ({
  notifyBookingCreated: vi.fn().mockResolvedValue(undefined),
  notifyBookingConfirmed: vi.fn().mockResolvedValue(undefined),
  notifyBookingCancelled: vi.fn().mockResolvedValue(undefined),
  notifyBookingStatusChanged: vi.fn().mockResolvedValue(undefined),
}));

// Mock Supabase client - Must be defined inline for Vitest hoisting
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
      }),
    },
  },
}));

// Import after mocking
import { supabase } from '@/integrations/supabase/client';
const mockSupabase = supabase as any;

describe('useBookings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Fetching Bookings', () => {
    it('should fetch all bookings successfully', async () => {
      const mockBookings = [
        mockBooking({ booking_id: 'booking-1' }),
        mockBooking({ booking_id: 'booking-2' }),
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockBookings)),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useBookings(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.bookings).toEqual(mockBookings);
      expect(result.current.bookings.length).toBe(2);
    });

    it('should return empty array when no bookings exist', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useBookings(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.bookings).toEqual([]);
    });

    it('should handle fetch error gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseError('Failed to fetch bookings')),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useBookings(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 5000 }); // Wait for React Query retries to complete

      // Should have empty array on error
      expect(result.current.bookings).toEqual([]);
    });

    it('should fetch bookings sorted by check_in_date descending', async () => {
      const mockBookings = [
        mockBooking({ booking_id: 'booking-3', check_in_date: '2025-12-01' }),
        mockBooking({ booking_id: 'booking-2', check_in_date: '2025-11-15' }),
        mockBooking({ booking_id: 'booking-1', check_in_date: '2025-11-01' }),
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockBookings)),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useBookings(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.bookings[0].check_in_date).toBe('2025-12-01');
      expect(result.current.bookings[2].check_in_date).toBe('2025-11-01');
    });
  });

  describe('Creating Bookings', () => {
    it('should create booking successfully', async () => {
      const newBooking = mockBooking({
        booking_id: 'new-booking-123',
        guest_name: 'Jane Smith',
        check_in_date: '2025-11-01',
        check_out_date: '2025-11-05',
      });

      // Mock empty bookings list
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'property_bookings') {
          // First call: fetch all bookings
          const selectMock = vi.fn();
          selectMock.mockReturnValueOnce({
            order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
          });
          // Second call: conflict check (no conflicts)
          selectMock.mockReturnValueOnce({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockReturnValue({
                or: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
              }),
            }),
          });
          // Third call: insert booking
          const insertMock = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(newBooking)),
            }),
          });

          return { select: selectMock, insert: insertMock };
        }
        if (table === 'properties') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess({ property_name: 'Sunset Villa' })),
              }),
            }),
          };
        }
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useBookings(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.createBooking({
        property_id: 'prop-123',
        guest_name: 'Jane Smith',
        guest_email: 'jane@example.com',
        check_in_date: '2025-11-01',
        check_out_date: '2025-11-05',
        number_of_guests: 2,
        total_amount: 500,
        booking_status: 'confirmed',
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });
    });

    it('should prevent booking with date conflict', async () => {
      const conflictingBooking = mockBooking({
        booking_id: 'existing-booking',
        check_in_date: '2025-11-03',
        check_out_date: '2025-11-07',
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'property_bookings') {
          const selectMock = vi.fn();
          // First call: fetch all bookings
          selectMock.mockReturnValueOnce({
            order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
          });
          // Second call: conflict check (has conflict)
          selectMock.mockReturnValueOnce({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockReturnValue({
                or: vi.fn().mockResolvedValue(mockSupabaseSuccess([conflictingBooking])),
              }),
            }),
          });

          return { select: selectMock };
        }
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useBookings(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.createBooking({
        property_id: 'prop-123',
        guest_name: 'John Doe',
        check_in_date: '2025-11-01',
        check_out_date: '2025-11-05',
        number_of_guests: 2,
        total_amount: 500,
        booking_status: 'confirmed',
      });

      // Should show error due to conflict
      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });
    });

    it('should handle booking creation error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'property_bookings') {
          const selectMock = vi.fn();
          // First call: fetch all bookings
          selectMock.mockReturnValueOnce({
            order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
          });
          // Second call: conflict check (no conflict)
          selectMock.mockReturnValueOnce({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockReturnValue({
                or: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
              }),
            }),
          });
          // Third call: insert fails
          const insertMock = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseError('Failed to create booking')),
            }),
          });

          return { select: selectMock, insert: insertMock };
        }
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useBookings(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.createBooking({
        property_id: 'prop-123',
        guest_name: 'John Doe',
        check_in_date: '2025-11-01',
        check_out_date: '2025-11-05',
        number_of_guests: 2,
        total_amount: 500,
        booking_status: 'confirmed',
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });
    });
  });

  describe('Updating Bookings', () => {
    it('should update booking successfully', async () => {
      const existingBooking = mockBooking({ booking_id: 'booking-123' });
      const updatedBooking = { ...existingBooking, guest_name: 'Updated Name' };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'property_bookings') {
          const selectMock = vi.fn();
          // First call: fetch all bookings
          selectMock.mockReturnValueOnce({
            order: vi.fn().mockResolvedValue(mockSupabaseSuccess([existingBooking])),
          });

          const updateMock = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess(updatedBooking)),
              }),
            }),
          });

          return { select: selectMock, update: updateMock };
        }
        if (table === 'properties') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess({ property_name: 'Sunset Villa' })),
              }),
            }),
          };
        }
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useBookings(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.updateBooking('booking-123', { guest_name: 'Updated Name' });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });
    });

    it('should check for conflicts when updating dates', async () => {
      const existingBooking = mockBooking({
        booking_id: 'booking-123',
        check_in_date: '2025-11-01',
        check_out_date: '2025-11-05',
      });
      const conflictingBooking = mockBooking({
        booking_id: 'booking-456',
        check_in_date: '2025-11-10',
        check_out_date: '2025-11-15',
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'property_bookings') {
          const selectMock = vi.fn();
          // First call: fetch all bookings
          selectMock.mockReturnValueOnce({
            order: vi.fn().mockResolvedValue(mockSupabaseSuccess([existingBooking])),
          });
          // Second call: fetch existing booking detail
          selectMock.mockReturnValueOnce({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(existingBooking)),
            }),
          });
          // Third call: conflict check (has conflict)
          selectMock.mockReturnValueOnce({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockReturnValue({
                or: vi.fn().mockResolvedValue(mockSupabaseSuccess([conflictingBooking])),
              }),
            }),
          });

          return { select: selectMock };
        }
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useBookings(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.updateBooking('booking-123', {
        check_in_date: '2025-11-12',
        check_out_date: '2025-11-16',
      });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });
    });

    it('should handle update error', async () => {
      const existingBooking = mockBooking({ booking_id: 'booking-123' });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'property_bookings') {
          const selectMock = vi.fn();
          // First call: fetch all bookings
          selectMock.mockReturnValueOnce({
            order: vi.fn().mockResolvedValue(mockSupabaseSuccess([existingBooking])),
          });

          const updateMock = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseError('Failed to update booking')),
              }),
            }),
          });

          return { select: selectMock, update: updateMock };
        }
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useBookings(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.updateBooking('booking-123', { guest_name: 'Updated Name' });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });
    });
  });

  describe('Deleting/Cancelling Bookings', () => {
    it('should cancel booking successfully (soft delete)', async () => {
      const existingBooking = mockBooking({
        booking_id: 'booking-123',
        booking_status: 'confirmed',
      });
      const cancelledBooking = { ...existingBooking, booking_status: 'cancelled' };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'property_bookings') {
          const selectMock = vi.fn();
          // First call: fetch all bookings
          selectMock.mockReturnValueOnce({
            order: vi.fn().mockResolvedValue(mockSupabaseSuccess([existingBooking])),
          });

          const updateMock = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess(cancelledBooking)),
              }),
            }),
          });

          return { select: selectMock, update: updateMock };
        }
        if (table === 'properties') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseSuccess({ property_name: 'Sunset Villa' })),
              }),
            }),
          };
        }
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useBookings(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.deleteBooking('booking-123');

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });
    });

    it('should handle delete error', async () => {
      const existingBooking = mockBooking({ booking_id: 'booking-123' });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'property_bookings') {
          const selectMock = vi.fn();
          // First call: fetch all bookings
          selectMock.mockReturnValueOnce({
            order: vi.fn().mockResolvedValue(mockSupabaseSuccess([existingBooking])),
          });

          const updateMock = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseError('Failed to cancel booking')),
              }),
            }),
          });

          return { select: selectMock, update: updateMock };
        }
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useBookings(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.deleteBooking('booking-123');

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });
    });
  });
});

describe('usePropertyBookings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch bookings for a specific property', async () => {
    const mockBookings = [
      mockBooking({ booking_id: 'booking-1', property_id: 'prop-123' }),
      mockBooking({ booking_id: 'booking-2', property_id: 'prop-123' }),
    ];

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockBookings)),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePropertyBookings('prop-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.bookings).toEqual(mockBookings);
    expect(result.current.bookings.length).toBe(2);
  });

  it('should return empty array when property has no bookings', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePropertyBookings('prop-no-bookings'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.bookings).toEqual([]);
  });

  it('should handle fetch error gracefully', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseError('Failed to fetch property bookings')),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePropertyBookings('prop-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    }, { timeout: 5000 });
  });
});

describe('useBookingsCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch bookings within date range', async () => {
    const mockBookings = [
      mockBooking({
        booking_id: 'booking-1',
        check_in_date: '2025-11-05',
        check_out_date: '2025-11-10',
      }),
      mockBooking({
        booking_id: 'booking-2',
        check_in_date: '2025-11-15',
        check_out_date: '2025-11-20',
      }),
    ];

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockBookings)),
          }),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useBookingsCalendar('2025-11-01', '2025-11-30'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.bookings).toEqual(mockBookings);
    expect(result.current.bookings.length).toBe(2);
  });

  it('should return empty array when no bookings in range', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
          }),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useBookingsCalendar('2025-12-01', '2025-12-31'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.bookings).toEqual([]);
  });

  it('should handle fetch error gracefully', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue(mockSupabaseError('Failed to fetch calendar bookings')),
          }),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useBookingsCalendar('2025-11-01', '2025-11-30'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    }, { timeout: 5000 });
  });
});

describe('useBookingDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch single booking detail successfully', async () => {
    const mockBookingData = mockBooking({ booking_id: 'booking-123' });

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockBookingData)),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useBookingDetail('booking-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.booking).toEqual(mockBookingData);
  });

  it('should handle fetch error gracefully', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseError('Failed to fetch booking detail')),
        }),
      }),
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useBookingDetail('booking-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    }, { timeout: 5000 });
  });

  it('should not fetch when bookingId is undefined', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useBookingDetail(undefined), { wrapper });

    // When query is disabled (enabled: false), loading is false and no data is fetched
    expect(result.current.loading).toBe(false);
    expect(result.current.booking).toBeUndefined();
  });
});

describe('Booking Status Changes and Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update booking status to confirmed', async () => {
    const existingBooking = mockBooking({
      booking_id: 'booking-123',
      booking_status: 'pending',
    });
    const confirmedBooking = { ...existingBooking, booking_status: 'confirmed' };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'property_bookings') {
        const selectMock = vi.fn();
        // First call: fetch all bookings
        selectMock.mockReturnValueOnce({
          order: vi.fn().mockResolvedValue(mockSupabaseSuccess([existingBooking])),
        });

        const updateMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(confirmedBooking)),
            }),
          }),
        });

        return { select: selectMock, update: updateMock };
      }
      if (table === 'properties') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess({ property_name: 'Sunset Villa' })),
            }),
          }),
        };
      }
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useBookings(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.updateBooking('booking-123', { booking_status: 'confirmed' });

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    });
  });
});
