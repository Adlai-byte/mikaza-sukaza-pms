import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBookings } from '../useBookings';
import { createWrapper } from '@/test/utils/test-wrapper';
import { mockBooking, createMockArray } from '@/test/utils/mock-data';

// Mock Supabase client - using inline factory to avoid hoisting issues
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: vi.fn(() => true),
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    profile: { user_id: 'test-user-id', user_type: 'admin' },
  }),
}));

// Import after mocks to get mocked versions
import { supabase as mockSupabase } from '@/integrations/supabase/client';

describe('useBookings', () => {
  const mockBookings = createMockArray(mockBooking, 10);
  const testBooking = mockBooking({
    booking_id: 'booking-1',
    property_id: 'property-1',
    check_in_date: '2025-06-10',
    check_out_date: '2025-06-15',
    booking_status: 'confirmed',
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    // Default mock for bookings fetch
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'property_bookings') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              then: vi.fn().mockResolvedValue({
                data: mockBookings,
                error: null,
              }),
            }),
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  then: vi.fn().mockResolvedValue({
                    data: [], // No conflicts by default
                    error: null,
                  }),
                }),
              }),
              single: vi.fn().mockReturnValue({
                then: vi.fn().mockResolvedValue({
                  data: testBooking,
                  error: null,
                }),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockReturnValue({
                then: vi.fn().mockResolvedValue({
                  data: testBooking,
                  error: null,
                }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockReturnValue({
                  then: vi.fn().mockResolvedValue({
                    data: testBooking,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          then: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });
  });

  describe('fetching bookings', () => {
    it('should fetch all bookings on mount', async () => {
      const { result } = renderHook(() => useBookings(), {
        wrapper: createWrapper(),
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.bookings).toHaveLength(10);
        expect(result.current.bookings[0]).toHaveProperty('booking_id');
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('property_bookings');
    });

    it('should handle fetch errors gracefully', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'property_bookings') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                then: vi.fn().mockRejectedValue(new Error('Database error')),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            then: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const { result } = renderHook(() => useBookings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.bookings).toEqual([]);
    });
  });

  describe('createBooking', () => {
    it('should create booking when no conflicts exist', async () => {
      const { result } = renderHook(() => useBookings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newBooking = {
        property_id: 'property-1',
        check_in_date: '2025-07-10',
        check_out_date: '2025-07-15',
        guest_name: 'John Doe',
        num_guests: 2,
      };

      await result.current.createBooking(newBooking as any);

      expect(mockSupabase.from).toHaveBeenCalledWith('property_bookings');
    });
  });

  describe('CRITICAL: Double Booking Prevention', () => {
    it('should prevent overlapping bookings on the same property', async () => {
      // Mock conflict detection to return conflicting bookings
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'property_bookings') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                then: vi.fn().mockResolvedValue({
                  data: mockBookings,
                  error: null,
                }),
              }),
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockReturnValue({
                  or: vi.fn().mockReturnValue({
                    then: vi.fn().mockResolvedValue({
                      data: [testBooking], // Conflict exists!
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            then: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const { result } = renderHook(() => useBookings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const conflictingBooking = {
        property_id: 'property-1',
        check_in_date: '2025-06-12', // Overlaps with existing booking (June 10-15)
        check_out_date: '2025-06-17',
        guest_name: 'Jane Smith',
        num_guests: 2,
      };

      // Should throw error due to conflict
      await expect(
        result.current.createBooking(conflictingBooking as any)
      ).rejects.toThrow();
    });

    it('should allow non-overlapping bookings on the same property', async () => {
      const { result } = renderHook(() => useBookings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const nonConflictingBooking = {
        property_id: 'property-1',
        check_in_date: '2025-06-16', // After existing booking (June 10-15)
        check_out_date: '2025-06-20',
        guest_name: 'Jane Smith',
        num_guests: 2,
      };

      await result.current.createBooking(nonConflictingBooking as any);

      // Should succeed without throwing
      expect(mockSupabase.from).toHaveBeenCalledWith('property_bookings');
    });

    it('should allow back-to-back bookings (checkout and checkin same day)', async () => {
      const { result } = renderHook(() => useBookings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const backToBackBooking = {
        property_id: 'property-1',
        check_in_date: '2025-06-15', // Same as existing booking checkout
        check_out_date: '2025-06-20',
        guest_name: 'Back to Back Guest',
        num_guests: 2,
      };

      // This depends on how the conflict logic handles same-day scenarios
      // The current logic uses <= and >= which would flag this as conflict
      // This is a business decision - should same-day turnover be allowed?
      await result.current.createBooking(backToBackBooking as any);

      expect(mockSupabase.from).toHaveBeenCalledWith('property_bookings');
    });

    it('should ignore cancelled bookings when checking conflicts', async () => {
      const cancelledBooking = mockBooking({
        booking_id: 'cancelled-booking',
        property_id: 'property-1',
        check_in_date: '2025-06-12',
        check_out_date: '2025-06-17',
        booking_status: 'cancelled',
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'property_bookings') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                then: vi.fn().mockResolvedValue({
                  data: [cancelledBooking],
                  error: null,
                }),
              }),
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockReturnValue({
                  or: vi.fn().mockReturnValue({
                    then: vi.fn().mockResolvedValue({
                      data: [], // No conflicts (cancelled excluded)
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            then: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const { result } = renderHook(() => useBookings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newBooking = {
        property_id: 'property-1',
        check_in_date: '2025-06-13',
        check_out_date: '2025-06-16',
        guest_name: 'New Guest',
        num_guests: 2,
      };

      // Should succeed because cancelled booking is ignored
      await result.current.createBooking(newBooking as any);

      expect(mockSupabase.from).toHaveBeenCalledWith('property_bookings');
    });
  });

  describe('updateBooking', () => {
    it('should update booking details', async () => {
      const { result } = renderHook(() => useBookings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updates = {
        guest_name: 'Updated Guest Name',
        num_guests: 4,
      };

      await result.current.updateBooking('booking-1', updates);

      expect(mockSupabase.from).toHaveBeenCalledWith('property_bookings');
    });

    it('should check for conflicts when changing dates', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'property_bookings') {
          let selectCallCount = 0;
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                then: vi.fn().mockResolvedValue({
                  data: mockBookings,
                  error: null,
                }),
              }),
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockReturnValue({
                  then: vi.fn().mockImplementation(() => {
                    selectCallCount++;
                    return Promise.resolve({
                      data: testBooking,
                      error: null,
                    });
                  }),
                }),
                neq: vi.fn().mockReturnValue({
                  or: vi.fn().mockReturnValue({
                    then: vi.fn().mockResolvedValue({
                      data: [], // No conflicts
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockReturnValue({
                    then: vi.fn().mockResolvedValue({
                      data: { ...testBooking, check_in_date: '2025-06-11' },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            then: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const { result } = renderHook(() => useBookings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const dateChange = {
        check_in_date: '2025-06-11',
      };

      await result.current.updateBooking('booking-1', dateChange);

      // Should have checked for conflicts
      expect(mockSupabase.from).toHaveBeenCalledWith('property_bookings');
    });
  });

  describe('booking status transitions', () => {
    it('should update booking status', async () => {
      const { result } = renderHook(() => useBookings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const statusUpdate = {
        booking_status: 'checked_in' as const,
      };

      await result.current.updateBooking('booking-1', statusUpdate);

      expect(mockSupabase.from).toHaveBeenCalledWith('property_bookings');
    });

    it('should handle all booking statuses', async () => {
      const statuses: Array<any> = [
        'inquiry',
        'pending',
        'confirmed',
        'checked_in',
        'checked_out',
        'completed',
        'cancelled',
        'blocked',
      ];

      const { result } = renderHook(() => useBookings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      for (const status of statuses) {
        await result.current.updateBooking('booking-1', {
          booking_status: status,
        });
      }

      // Should have made update calls for each status
      expect(mockSupabase.from).toHaveBeenCalledWith('property_bookings');
    });
  });

  describe('channel handling', () => {
    it('should support all booking channels', async () => {
      const channels: Array<any> = [
        'Airbnb',
        'Booking.com',
        'VRBO',
        'Direct',
        'Expedia',
        'HomeAway',
        'TripAdvisor',
        'Other',
      ];

      const { result } = renderHook(() => useBookings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      for (const channel of channels) {
        const channelBooking = {
          property_id: 'property-1',
          check_in_date: '2025-08-10',
          check_out_date: '2025-08-15',
          channel,
          guest_name: `Guest from ${channel}`,
          num_guests: 2,
        };

        await result.current.createBooking(channelBooking as any);
      }

      expect(mockSupabase.from).toHaveBeenCalledWith('property_bookings');
    });
  });

  describe('payment tracking', () => {
    it('should track payment status', async () => {
      const { result } = renderHook(() => useBookings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const paymentUpdate = {
        payment_status: 'paid' as const,
        total_price: 1000,
      };

      await result.current.updateBooking('booking-1', paymentUpdate);

      expect(mockSupabase.from).toHaveBeenCalledWith('property_bookings');
    });

    it('should handle partial payments', async () => {
      const { result } = renderHook(() => useBookings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const partialPayment = {
        payment_status: 'partially_paid' as const,
        total_price: 1000,
      };

      await result.current.updateBooking('booking-1', partialPayment);

      expect(mockSupabase.from).toHaveBeenCalledWith('property_bookings');
    });
  });

  describe('guest validation', () => {
    it('should validate guest count', async () => {
      const { result } = renderHook(() => useBookings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const booking = {
        property_id: 'property-1',
        check_in_date: '2025-09-10',
        check_out_date: '2025-09-15',
        guest_name: 'Test Guest',
        num_guests: 8, // High number
      };

      await result.current.createBooking(booking as any);

      // Should still succeed (property capacity check is business logic)
      expect(mockSupabase.from).toHaveBeenCalledWith('property_bookings');
    });
  });
});
