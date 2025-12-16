/**
 * Booking Revenue Allocation Hook
 *
 * Manages revenue allocation for entire-property bookings across unit owners.
 * When a booking is made for the entire property (unit_id = null), revenue
 * is split equally among all unit owners.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  BookingRevenueAllocation,
  OwnerRevenueSummary,
} from '@/lib/schemas';

// Query keys for cache management
export const allocationKeys = {
  all: ['booking-revenue-allocations'] as const,
  byBooking: (bookingId: string) => [...allocationKeys.all, 'booking', bookingId] as const,
  byOwner: (ownerId: string) => [...allocationKeys.all, 'owner', ownerId] as const,
  ownerSummary: (ownerId: string, dateFrom?: string, dateTo?: string) =>
    [...allocationKeys.all, 'summary', ownerId, dateFrom, dateTo] as const,
};

/**
 * Fetch allocations for a specific booking
 */
export function useBookingAllocations(bookingId: string | null) {
  return useQuery({
    queryKey: allocationKeys.byBooking(bookingId || ''),
    queryFn: async (): Promise<BookingRevenueAllocation[]> => {
      if (!bookingId) return [];

      const { data, error } = await supabase
        .from('booking_revenue_allocation')
        .select(`
          *,
          owner:users!booking_revenue_allocation_owner_id_fkey(
            user_id,
            first_name,
            last_name,
            email
          ),
          unit:units!booking_revenue_allocation_unit_id_fkey(
            unit_id,
            property_name
          )
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as BookingRevenueAllocation[];
    },
    enabled: !!bookingId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch allocations for a specific owner (for owner statements)
 */
export function useOwnerAllocations(
  ownerId: string | null,
  dateFrom?: string,
  dateTo?: string
) {
  return useQuery({
    queryKey: allocationKeys.byOwner(ownerId || ''),
    queryFn: async (): Promise<BookingRevenueAllocation[]> => {
      if (!ownerId) return [];

      let query = supabase
        .from('booking_revenue_allocation')
        .select(`
          *,
          unit:units!booking_revenue_allocation_unit_id_fkey(
            unit_id,
            property_name
          ),
          booking:property_bookings!booking_revenue_allocation_booking_id_fkey(
            booking_id,
            guest_name,
            check_in_date,
            check_out_date,
            total_amount,
            booking_status
          )
        `)
        .eq('owner_id', ownerId);

      // Filter by booking date range if provided
      if (dateFrom) {
        query = query.gte('booking.check_in_date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('booking.check_in_date', dateTo);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out cancelled bookings
      return ((data || []) as any[])
        .filter(a => a.booking?.booking_status !== 'cancelled')
        .map(a => a as BookingRevenueAllocation);
    },
    enabled: !!ownerId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch owner revenue summary (aggregated by month/property/unit)
 */
export function useOwnerRevenueSummary(
  ownerId: string | null,
  dateFrom?: string,
  dateTo?: string
) {
  return useQuery({
    queryKey: allocationKeys.ownerSummary(ownerId || '', dateFrom, dateTo),
    queryFn: async (): Promise<OwnerRevenueSummary[]> => {
      if (!ownerId) return [];

      let query = supabase
        .from('owner_revenue_summary')
        .select('*')
        .eq('owner_id', ownerId);

      if (dateFrom) {
        query = query.gte('revenue_month', dateFrom);
      }
      if (dateTo) {
        query = query.lte('revenue_month', dateTo);
      }

      const { data, error } = await query.order('revenue_month', { ascending: false });

      if (error) {
        // View might not exist yet if migration hasn't run
        console.warn('Owner revenue summary view not available:', error.message);
        return [];
      }

      return (data || []) as OwnerRevenueSummary[];
    },
    enabled: !!ownerId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create revenue allocations for an entire-property booking
 */
export function useCreateBookingAllocations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      bookingId,
      propertyId,
      totalAmount,
    }: {
      bookingId: string;
      propertyId: string;
      totalAmount: number;
    }) => {
      // Call the database function to create allocations
      const { error } = await supabase.rpc('create_booking_revenue_allocations', {
        p_booking_id: bookingId,
        p_property_id: propertyId,
        p_total_amount: totalAmount,
      });

      if (error) throw error;

      // Fetch the created allocations to return
      const { data, error: fetchError } = await supabase
        .from('booking_revenue_allocation')
        .select('*')
        .eq('booking_id', bookingId);

      if (fetchError) throw fetchError;
      return data as BookingRevenueAllocation[];
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: allocationKeys.byBooking(variables.bookingId) });
      queryClient.invalidateQueries({ queryKey: allocationKeys.all });

      if (data && data.length > 0) {
        toast({
          title: 'Revenue Allocated',
          description: `Revenue split among ${data.length} unit owner(s)`,
        });
      }
    },
    onError: (error: Error) => {
      console.error('Failed to create revenue allocations:', error);
      toast({
        title: 'Allocation Error',
        description: 'Failed to allocate revenue to unit owners',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete allocations for a booking (e.g., when booking is cancelled)
 */
export function useDeleteBookingAllocations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from('booking_revenue_allocation')
        .delete()
        .eq('booking_id', bookingId);

      if (error) throw error;
    },
    onSuccess: (_, bookingId) => {
      queryClient.invalidateQueries({ queryKey: allocationKeys.byBooking(bookingId) });
      queryClient.invalidateQueries({ queryKey: allocationKeys.all });
    },
  });
}

/**
 * Helper function to check if a booking needs revenue allocation
 * (entire-property bookings with units need allocation)
 */
export async function shouldCreateAllocation(
  propertyId: string,
  unitId: string | null
): Promise<boolean> {
  // Only entire-property bookings (unit_id = null) need allocation
  if (unitId !== null) return false;

  // Check if property has units
  const { count, error } = await supabase
    .from('units')
    .select('*', { count: 'exact', head: true })
    .eq('property_id', propertyId);

  if (error) {
    console.error('Error checking units:', error);
    return false;
  }

  // Only allocate if property has units
  return (count || 0) > 0;
}

/**
 * Hook to manage revenue allocation for a booking
 * Combines check + create logic
 */
export function useManageBookingAllocation() {
  const createAllocations = useCreateBookingAllocations();
  const deleteAllocations = useDeleteBookingAllocations();

  const allocateRevenue = async (
    bookingId: string,
    propertyId: string,
    unitId: string | null,
    totalAmount: number
  ) => {
    // Check if allocation is needed
    const needsAllocation = await shouldCreateAllocation(propertyId, unitId);

    if (needsAllocation) {
      await createAllocations.mutateAsync({
        bookingId,
        propertyId,
        totalAmount,
      });
    }
  };

  const removeAllocation = async (bookingId: string) => {
    await deleteAllocations.mutateAsync(bookingId);
  };

  return {
    allocateRevenue,
    removeAllocation,
    isAllocating: createAllocations.isPending,
    isRemoving: deleteAllocations.isPending,
  };
}
