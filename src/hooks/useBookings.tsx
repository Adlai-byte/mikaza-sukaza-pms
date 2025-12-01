import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Booking, BookingInsert } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { CACHE_CONFIG } from "@/lib/cache-config";
import { OptimisticUpdates } from "@/lib/cache-manager-simplified";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { useAuth } from "@/contexts/AuthContext";
import {
  notifyBookingCreated,
  notifyBookingConfirmed,
  notifyBookingCancelled,
  notifyBookingStatusChanged,
} from "@/lib/notifications/booking-notifications";
import { createInvoiceFromBooking } from "@/hooks/useInvoices";

// Query keys for cache management
export const bookingKeys = {
  all: () => ['bookings'] as const,
  lists: () => ['bookings', 'list'] as const,
  list: (filters?: Record<string, unknown>) => ['bookings', 'list', ...(filters ? [JSON.stringify(filters)] : [])] as const,
  details: () => ['bookings', 'detail'] as const,
  detail: (id: string) => ['bookings', 'detail', id] as const,
  property: (propertyId: string) => ['bookings', 'property', propertyId] as const,
  calendar: (startDate: string, endDate: string) => ['bookings', 'calendar', startDate, endDate] as const,
} as const;

// Fetch all bookings
const fetchBookings = async (): Promise<Booking[]> => {
  console.log('📅 Fetching all bookings...');
  const { data, error } = await supabase
    .from('property_bookings')
    .select('*')
    .order('check_in_date', { ascending: false });

  if (error) {
    console.error('❌ Bookings fetch error:', error);
    throw error;
  }

  console.log('✅ Fetched bookings:', data?.length || 0, 'bookings');
  return (data || []) as Booking[];
};

// Fetch bookings for a specific property (with invoice data)
const fetchPropertyBookings = async (propertyId: string): Promise<Booking[]> => {
  console.log('📅 Fetching bookings for property:', propertyId);
  const { data, error } = await supabase
    .from('property_bookings')
    .select(`
      *,
      invoice:invoices!property_bookings_invoice_id_fkey(
        invoice_id,
        total_amount,
        amount_paid,
        status
      )
    `)
    .eq('property_id', propertyId)
    .order('check_in_date', { ascending: false });

  if (error) {
    console.error('❌ Property bookings fetch error:', error);
    throw error;
  }

  // Flatten invoice data into booking for easier access
  const bookingsWithInvoiceData = (data || []).map((booking: any) => ({
    ...booking,
    invoice_total_amount: booking.invoice?.total_amount || null,
    invoice_amount_paid: booking.invoice?.amount_paid || null,
    invoice_status: booking.invoice?.status || booking.invoice_status || 'not_generated',
  }));

  console.log('✅ Fetched property bookings:', bookingsWithInvoiceData?.length || 0, 'bookings');
  return bookingsWithInvoiceData as Booking[];
};

// Fetch bookings within a date range
const fetchBookingsInRange = async (startDate: string, endDate: string): Promise<Booking[]> => {
  console.log('📅 Fetching bookings from', startDate, 'to', endDate);
  const { data, error } = await supabase
    .from('property_bookings')
    .select('*')
    .gte('check_in_date', startDate)
    .lte('check_out_date', endDate)
    .order('check_in_date', { ascending: true });

  if (error) {
    console.error('❌ Calendar bookings fetch error:', error);
    throw error;
  }

  console.log('✅ Fetched calendar bookings:', data?.length || 0, 'bookings');
  return (data || []) as Booking[];
};

// Fetch single booking
const fetchBookingDetail = async (bookingId: string): Promise<Booking> => {
  console.log('📅 Fetching booking detail:', bookingId);
  const { data, error } = await supabase
    .from('property_bookings')
    .select('*')
    .eq('booking_id', bookingId)
    .single();

  if (error) {
    console.error('❌ Booking detail fetch error:', error);
    throw error;
  }

  console.log('✅ Fetched booking detail:', data);
  return data as Booking;
};

// Check for booking conflicts
const checkBookingConflict = async (
  propertyId: string,
  checkIn: string,
  checkOut: string,
  excludeBookingId?: string
): Promise<boolean> => {
  let query = supabase
    .from('property_bookings')
    .select('booking_id, check_in_date, check_out_date, guest_name')
    .eq('property_id', propertyId)
    .neq('booking_status', 'cancelled')
    .or(`and(check_in_date.lte.${checkOut},check_out_date.gte.${checkIn})`);

  if (excludeBookingId) {
    query = query.neq('booking_id', excludeBookingId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Conflict check error:', error);
    throw error;
  }

  const hasConflict = data && data.length > 0;
  if (hasConflict) {
    console.warn('⚠️ Booking conflict detected:', data);
  }

  return hasConflict;
};

export function useBookings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const { user, profile } = useAuth();
  const currentUserId = profile?.user_id || user?.id;

  // Bookings query with caching (critical data - 1 minute stale time)
  const {
    data: bookings = [],
    isLoading: loading,
    isFetching,
    error: bookingsError,
    refetch,
  } = useQuery({
    queryKey: bookingKeys.lists(),
    queryFn: fetchBookings,
    staleTime: CACHE_CONFIG.CRITICAL.staleTime, // 1 minute
    gcTime: CACHE_CONFIG.CRITICAL.gcTime, // 30 minutes
    refetchOnMount: true, // Always refetch bookings on mount (critical data)
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: BookingInsert) => {
      // Check permission
      if (!hasPermission(PERMISSIONS.BOOKINGS_CREATE)) {
        throw new Error("You don't have permission to create bookings");
      }

      // Check for conflicts
      const hasConflict = await checkBookingConflict(
        bookingData.property_id,
        bookingData.check_in_date,
        bookingData.check_out_date
      );

      if (hasConflict) {
        throw new Error("This property is already booked for the selected dates");
      }

      // Create booking
      const { data, error } = await supabase
        .from('property_bookings')
        .insert([bookingData])
        .select()
        .single();

      if (error) throw error;

      return data as Booking;
    },
    onMutate: async (bookingData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: bookingKeys.lists() });

      // Snapshot the previous value
      const previousBookings = queryClient.getQueryData(bookingKeys.lists());

      // Optimistically add the new booking
      const tempBooking: Booking = {
        booking_id: `temp-${Date.now()}`,
        ...bookingData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData(bookingKeys.lists(), (oldData: any) => {
        if (!oldData || !Array.isArray(oldData)) return [tempBooking];
        return [tempBooking, ...oldData];
      });

      // Return rollback function
      return { rollback: () => queryClient.setQueryData(bookingKeys.lists(), previousBookings) };
    },
    onSuccess: async (data) => {
      // Invalidate booking-related caches with refetchType: 'all'
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists(), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: bookingKeys.property(data.property_id), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['bookings', 'calendar'], refetchType: 'all' });

      // Cross-entity invalidation: Property availability changed
      queryClient.invalidateQueries({ queryKey: ['properties', 'detail', data.property_id], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['properties', 'list'], refetchType: 'all' });

      // Cross-entity invalidation: Financial data may have changed
      queryClient.invalidateQueries({ queryKey: ['invoices'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['financial-entries'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'], refetchType: 'all' });

      // Get property name for notification
      const { data: property } = await supabase
        .from('properties')
        .select('property_name')
        .eq('property_id', data.property_id)
        .single();

      // Send notification
      if (property?.property_name) {
        await notifyBookingCreated(data, property.property_name, currentUserId);
      }

      // Auto-generate invoice for the booking
      try {
        console.log('📄 Auto-generating invoice for booking:', data.booking_id);
        const invoice = await createInvoiceFromBooking(data.booking_id!);
        console.log('✅ Invoice auto-generated:', invoice.invoice_id);

        // Invalidate invoice caches after creation
        queryClient.invalidateQueries({ queryKey: ['invoices'], refetchType: 'all' });

        toast({
          title: "Success",
          description: "Booking created and invoice generated successfully",
        });
      } catch (invoiceError) {
        console.error('⚠️ Failed to auto-generate invoice:', invoiceError);
        // Still show success for booking, but warn about invoice
        toast({
          title: "Booking Created",
          description: "Booking created successfully. Invoice generation failed - you can generate it manually.",
          variant: "default",
        });
      }
    },
    onError: (error, bookingData, context) => {
      // Rollback optimistic update
      context?.rollback?.();

      console.error('Error creating booking:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create booking",
        variant: "destructive",
      });
    },
  });

  // Update booking mutation
  const updateBookingMutation = useMutation({
    mutationFn: async ({ bookingId, bookingData }: { bookingId: string; bookingData: Partial<BookingInsert> }) => {
      // Check permission
      if (!hasPermission(PERMISSIONS.BOOKINGS_EDIT)) {
        throw new Error("You don't have permission to edit bookings");
      }

      // If dates are being changed, check for conflicts
      if (bookingData.check_in_date || bookingData.check_out_date || bookingData.property_id) {
        const existingBooking = await fetchBookingDetail(bookingId);

        const checkIn = bookingData.check_in_date || existingBooking.check_in_date;
        const checkOut = bookingData.check_out_date || existingBooking.check_out_date;
        const propertyId = bookingData.property_id || existingBooking.property_id;

        const hasConflict = await checkBookingConflict(
          propertyId,
          checkIn,
          checkOut,
          bookingId
        );

        if (hasConflict) {
          throw new Error("This property is already booked for the selected dates");
        }
      }

      // Update booking
      const { data, error } = await supabase
        .from('property_bookings')
        .update({
          ...bookingData,
          updated_at: new Date().toISOString(),
        })
        .eq('booking_id', bookingId)
        .select()
        .single();

      if (error) throw error;

      return data as Booking;
    },
    onMutate: async ({ bookingId, bookingData }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: bookingKeys.lists() });

      // Snapshot the previous value
      const previousBookings = queryClient.getQueryData(bookingKeys.lists());

      // Optimistically update the booking
      queryClient.setQueryData(bookingKeys.lists(), (oldData: any) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;

        return oldData.map((booking: Booking) =>
          booking.booking_id === bookingId
            ? { ...booking, ...bookingData, updated_at: new Date().toISOString() }
            : booking
        );
      });

      // Return rollback function
      return { rollback: () => queryClient.setQueryData(bookingKeys.lists(), previousBookings) };
    },
    onSuccess: async (data, variables) => {
      // Invalidate booking-related caches with refetchType: 'all'
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists(), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: bookingKeys.property(data.property_id), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(data.booking_id!), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['bookings', 'calendar'], refetchType: 'all' });

      // Cross-entity invalidation: Property availability changed
      queryClient.invalidateQueries({ queryKey: ['properties', 'detail', data.property_id], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['properties', 'list'], refetchType: 'all' });

      // Cross-entity invalidation: Financial data may have changed
      queryClient.invalidateQueries({ queryKey: ['invoices'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['financial-entries'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'], refetchType: 'all' });

      // Get property name for notification
      const { data: property } = await supabase
        .from('properties')
        .select('property_name')
        .eq('property_id', data.property_id)
        .single();

      // Get previous booking data to check for status changes
      const previousBooking = bookings.find(b => b.booking_id === variables.bookingId);

      if (property?.property_name) {
        // Check if status changed
        if (variables.bookingData.booking_status &&
            previousBooking?.booking_status !== variables.bookingData.booking_status) {
          // Special notification for confirmation
          if (variables.bookingData.booking_status === 'confirmed') {
            await notifyBookingConfirmed(data, property.property_name, currentUserId);

            // Auto-generate invoice if one doesn't exist
            if (!(data as any).invoice_id) {
              try {
                console.log('📄 Auto-generating invoice for confirmed booking:', data.booking_id);
                const invoice = await createInvoiceFromBooking(data.booking_id!);
                console.log('✅ Invoice auto-generated:', invoice.invoice_id);

                // Invalidate invoice caches after creation
                queryClient.invalidateQueries({ queryKey: ['invoices'], refetchType: 'all' });

                toast({
                  title: "🎉 Booking Confirmed!",
                  description: "Invoice has been automatically generated.",
                });
                return; // Skip regular success toast
              } catch (invoiceError) {
                console.error('⚠️ Failed to auto-generate invoice:', invoiceError);
                toast({
                  title: "🎉 Booking Confirmed!",
                  description: "Booking confirmed. Invoice generation failed - you can generate it manually.",
                });
                return; // Skip regular success toast
              }
            }
          } else {
            await notifyBookingStatusChanged(
              data,
              property.property_name,
              previousBooking?.booking_status || 'unknown',
              variables.bookingData.booking_status,
              currentUserId
            );
          }
        }
      }

      toast({
        title: "Success",
        description: "Booking updated successfully",
      });
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      context?.rollback?.();

      console.error('Error updating booking:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update booking",
        variant: "destructive",
      });
    },
  });

  // Delete/Cancel booking mutation
  const deleteBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      // Check permission
      if (!hasPermission(PERMISSIONS.BOOKINGS_CANCEL)) {
        throw new Error("You don't have permission to cancel bookings");
      }

      // Soft delete by setting status to cancelled
      const { data, error} = await supabase
        .from('property_bookings')
        .update({ booking_status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('booking_id', bookingId)
        .select()
        .single();

      if (error) throw error;

      return data as Booking;
    },
    onMutate: async (bookingId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: bookingKeys.lists() });

      // Snapshot the previous value
      const previousBookings = queryClient.getQueryData(bookingKeys.lists());

      // Optimistically update the booking status
      queryClient.setQueryData(bookingKeys.lists(), (oldData: any) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;

        return oldData.map((booking: Booking) =>
          booking.booking_id === bookingId
            ? { ...booking, booking_status: 'cancelled', updated_at: new Date().toISOString() }
            : booking
        );
      });

      // Return rollback function
      return { rollback: () => queryClient.setQueryData(bookingKeys.lists(), previousBookings) };
    },
    onSuccess: async (data, bookingId) => {
      // Invalidate booking-related caches with refetchType: 'all'
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists(), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: bookingKeys.property(data.property_id), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(bookingId), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['bookings', 'calendar'], refetchType: 'all' });

      // Cross-entity invalidation: Property availability changed
      queryClient.invalidateQueries({ queryKey: ['properties', 'detail', data.property_id], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['properties', 'list'], refetchType: 'all' });

      // Cross-entity invalidation: Financial data may have changed
      queryClient.invalidateQueries({ queryKey: ['invoices'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['financial-entries'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'], refetchType: 'all' });

      // Get property name for notification
      const { data: property } = await supabase
        .from('properties')
        .select('property_name')
        .eq('property_id', data.property_id)
        .single();

      // Send cancellation notification
      if (property?.property_name) {
        await notifyBookingCancelled(
          data,
          property.property_name,
          currentUserId,
          data.cancellation_reason || undefined
        );
      }

      toast({
        title: "Success",
        description: "Booking cancelled successfully",
      });
    },
    onError: (error, bookingId, context) => {
      // Rollback optimistic update
      context?.rollback?.();

      console.error('Error cancelling booking:', error);
      toast({
        title: "Error",
        description: "Failed to cancel booking",
        variant: "destructive",
      });
    },
  });

  return {
    bookings,
    loading,
    isFetching,
    error: bookingsError,
    createBooking: createBookingMutation.mutateAsync,
    updateBooking: (bookingId: string, bookingData: Partial<BookingInsert>) =>
      updateBookingMutation.mutateAsync({ bookingId, bookingData }),
    deleteBooking: deleteBookingMutation.mutateAsync,
    refetch,
    // Mutation states for UI feedback
    isCreating: createBookingMutation.isPending,
    isUpdating: updateBookingMutation.isPending,
    isDeleting: deleteBookingMutation.isPending,
  };
}

// Hook for fetching bookings for a specific property
export function usePropertyBookings(propertyId: string) {
  const queryClient = useQueryClient();

  const {
    data: bookings = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: bookingKeys.property(propertyId),
    queryFn: () => fetchPropertyBookings(propertyId),
    enabled: !!propertyId,
    staleTime: CACHE_CONFIG.CRITICAL.staleTime, // 1 minute
    gcTime: CACHE_CONFIG.CRITICAL.gcTime, // 30 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  return {
    bookings,
    loading: isLoading,
    isFetching,
    error,
    refetch,
  };
}

// Hook for fetching bookings within a date range (for calendar view)
export function useBookingsCalendar(startDate: string, endDate: string) {
  const {
    data: bookings = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: bookingKeys.calendar(startDate, endDate),
    queryFn: () => fetchBookingsInRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: CACHE_CONFIG.CRITICAL.staleTime, // 1 minute
    gcTime: CACHE_CONFIG.CRITICAL.gcTime, // 30 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  return {
    bookings,
    loading: isLoading,
    isFetching,
    error,
    refetch,
  };
}

// Hook for fetching a single booking
export function useBookingDetail(bookingId: string | undefined) {
  const {
    data: booking,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: bookingKeys.detail(bookingId || ''),
    queryFn: () => fetchBookingDetail(bookingId!),
    enabled: !!bookingId,
    staleTime: CACHE_CONFIG.DETAIL.staleTime, // 10 minutes
    gcTime: CACHE_CONFIG.DETAIL.gcTime, // 1 hour
  });

  return {
    booking,
    loading: isLoading,
    isFetching,
    error,
    refetch,
  };
}
