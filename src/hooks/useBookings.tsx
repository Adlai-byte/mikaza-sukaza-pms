import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Booking, BookingInsert, BookingJobConfig, CustomBookingTask } from "@/lib/schemas";
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
import { shouldCreateAllocation } from "@/hooks/useBookingRevenueAllocation";
import { createJobsFromBooking, bookingTaskKeys } from "@/hooks/useBookingTasks";
import { jobKeys } from "@/hooks/useJobs";
import { taskKeys } from "@/hooks/useTasks";

// Extended booking insert with job configs for auto-generation
export interface CreateBookingParams extends BookingInsert {
  jobConfigs?: BookingJobConfig[];
  customTasks?: CustomBookingTask[];
}

// Extended update params with job configs and custom tasks for generating jobs on existing bookings
export interface UpdateBookingParams {
  bookingId: string;
  bookingData: Partial<BookingInsert>;
  jobConfigs?: BookingJobConfig[];
  customTasks?: CustomBookingTask[];
}

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

// Fetch all bookings (with unit data for multi-unit properties)
const fetchBookings = async (): Promise<Booking[]> => {
  console.log('📅 Fetching all bookings...');
  const { data, error } = await supabase
    .from('property_bookings')
    .select(`
      *,
      unit:units!property_bookings_unit_id_fkey(
        unit_id,
        property_name,
        license_number,
        folio,
        owner_id
      )
    `)
    .order('check_in_date', { ascending: false });

  if (error) {
    console.error('❌ Bookings fetch error:', error);
    throw error;
  }

  // Flatten unit data into booking for easier access
  const bookingsWithUnitData = (data || []).map((booking: any) => ({
    ...booking,
    unit_name: booking.unit?.property_name || null,
    unit_license_number: booking.unit?.license_number || null,
    unit_folio: booking.unit?.folio || null,
    unit_owner_id: booking.unit?.owner_id || null,
  }));

  console.log('✅ Fetched bookings:', bookingsWithUnitData?.length || 0, 'bookings');
  return bookingsWithUnitData as Booking[];
};

// Fetch bookings for a specific property (with invoice and unit data)
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
      ),
      unit:units!property_bookings_unit_id_fkey(
        unit_id,
        property_name,
        license_number,
        folio,
        owner_id
      )
    `)
    .eq('property_id', propertyId)
    .order('check_in_date', { ascending: false });

  if (error) {
    console.error('❌ Property bookings fetch error:', error);
    throw error;
  }

  // Flatten invoice and unit data into booking for easier access
  const bookingsWithData = (data || []).map((booking: any) => ({
    ...booking,
    invoice_total_amount: booking.invoice?.total_amount || null,
    invoice_amount_paid: booking.invoice?.amount_paid || null,
    invoice_status: booking.invoice?.status || booking.invoice_status || 'not_generated',
    unit_name: booking.unit?.property_name || null,
    unit_license_number: booking.unit?.license_number || null,
    unit_folio: booking.unit?.folio || null,
    unit_owner_id: booking.unit?.owner_id || null,
  }));

  console.log('✅ Fetched property bookings:', bookingsWithData?.length || 0, 'bookings');
  return bookingsWithData as Booking[];
};

// Fetch bookings within a date range (for calendar view, with unit data)
const fetchBookingsInRange = async (startDate: string, endDate: string): Promise<Booking[]> => {
  console.log('📅 Fetching bookings from', startDate, 'to', endDate);
  const { data, error } = await supabase
    .from('property_bookings')
    .select(`
      *,
      unit:units!property_bookings_unit_id_fkey(
        unit_id,
        property_name,
        license_number,
        folio,
        owner_id
      )
    `)
    .gte('check_in_date', startDate)
    .lte('check_out_date', endDate)
    .order('check_in_date', { ascending: true });

  if (error) {
    console.error('❌ Calendar bookings fetch error:', error);
    throw error;
  }

  // Flatten unit data into booking for easier access
  const bookingsWithUnitData = (data || []).map((booking: any) => ({
    ...booking,
    unit_name: booking.unit?.property_name || null,
    unit_license_number: booking.unit?.license_number || null,
    unit_folio: booking.unit?.folio || null,
    unit_owner_id: booking.unit?.owner_id || null,
  }));

  console.log('✅ Fetched calendar bookings:', bookingsWithUnitData?.length || 0, 'bookings');
  return bookingsWithUnitData as Booking[];
};

// Fetch single booking (with unit data)
const fetchBookingDetail = async (bookingId: string): Promise<Booking> => {
  console.log('📅 Fetching booking detail:', bookingId);
  const { data, error } = await supabase
    .from('property_bookings')
    .select(`
      *,
      unit:units!property_bookings_unit_id_fkey(
        unit_id,
        property_name,
        license_number,
        folio,
        owner_id
      )
    `)
    .eq('booking_id', bookingId)
    .single();

  if (error) {
    console.error('❌ Booking detail fetch error:', error);
    throw error;
  }

  // Flatten unit data into booking for easier access
  const bookingWithUnitData = {
    ...data,
    unit_name: data.unit?.property_name || null,
    unit_license_number: data.unit?.license_number || null,
    unit_folio: data.unit?.folio || null,
    unit_owner_id: data.unit?.owner_id || null,
  };

  console.log('✅ Fetched booking detail:', bookingWithUnitData);
  return bookingWithUnitData as Booking;
};

// Check for booking conflicts
// Conflict logic:
// - If booking a specific unit (unit_id set): conflicts with same unit bookings + whole-property bookings
// - If booking whole property (unit_id is null): conflicts with ANY booking for that property
const checkBookingConflict = async (
  propertyId: string,
  checkIn: string,
  checkOut: string,
  unitId?: string | null,
  excludeBookingId?: string
): Promise<boolean> => {
  let query = supabase
    .from('property_bookings')
    .select('booking_id, check_in_date, check_out_date, guest_name, unit_id')
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

  if (!data || data.length === 0) {
    return false;
  }

  // Filter conflicts based on unit logic
  let conflictingBookings = data;

  if (unitId) {
    // Booking a specific unit: conflicts with same unit OR whole-property bookings
    conflictingBookings = data.filter(
      (booking: any) => booking.unit_id === unitId || booking.unit_id === null
    );
  }
  // If unitId is null (whole property): any booking conflicts (no filtering needed)

  const hasConflict = conflictingBookings.length > 0;
  if (hasConflict) {
    console.warn('⚠️ Booking conflict detected:', conflictingBookings);
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
    mutationFn: async (params: CreateBookingParams) => {
      // Extract jobConfigs and customTasks from params (not sent to database)
      const { jobConfigs, customTasks, ...bookingData } = params;

      // Check permission
      if (!hasPermission(PERMISSIONS.BOOKINGS_CREATE)) {
        throw new Error("You don't have permission to create bookings");
      }

      // Check for conflicts (with unit awareness)
      const hasConflict = await checkBookingConflict(
        bookingData.property_id,
        bookingData.check_in_date,
        bookingData.check_out_date,
        bookingData.unit_id
      );

      if (hasConflict) {
        const unitText = bookingData.unit_id ? "This unit" : "This property";
        throw new Error(`${unitText} is already booked for the selected dates`);
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
    onMutate: async (params: CreateBookingParams) => {
      // Extract jobConfigs and customTasks to pass through context
      const { jobConfigs, customTasks, ...bookingData } = params;

      console.log('🔍 onMutate - customTasks received:', customTasks);
      console.log('🔍 onMutate - jobConfigs received:', jobConfigs);

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

      // Return rollback function, jobConfigs and customTasks for onSuccess
      return {
        rollback: () => queryClient.setQueryData(bookingKeys.lists(), previousBookings),
        jobConfigs,
        customTasks,
        guestName: bookingData.guest_name,
      };
    },
    onSuccess: async (data, variables, context) => {
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

      // Create revenue allocation for entire-property bookings with units
      try {
        const needsAllocation = await shouldCreateAllocation(
          data.property_id,
          data.unit_id || null
        );

        if (needsAllocation && data.total_amount) {
          console.log('💰 Creating revenue allocation for entire-property booking:', data.booking_id);
          const { error: allocError } = await supabase.rpc('create_booking_revenue_allocations', {
            p_booking_id: data.booking_id,
            p_property_id: data.property_id,
            p_total_amount: data.total_amount,
          });

          if (allocError) {
            console.error('⚠️ Failed to create revenue allocation:', allocError);
          } else {
            console.log('✅ Revenue allocation created for booking:', data.booking_id);
            // Invalidate allocation caches
            queryClient.invalidateQueries({ queryKey: ['booking-revenue-allocations'] });
          }
        }
      } catch (allocError) {
        console.error('⚠️ Error during revenue allocation:', allocError);
        // Don't fail the booking creation for allocation errors
      }

      // Auto-generate tasks from booking if job configs or custom tasks provided
      console.log('🔍 onSuccess - context:', context);
      console.log('🔍 onSuccess - context.customTasks:', context?.customTasks);
      console.log('🔍 onSuccess - context.jobConfigs:', context?.jobConfigs);

      const hasJobConfigs = context?.jobConfigs && context.jobConfigs.length > 0;
      const hasCustomTasks = context?.customTasks && context.customTasks.length > 0;

      console.log('🔍 onSuccess - hasJobConfigs:', hasJobConfigs, 'hasCustomTasks:', hasCustomTasks);

      if ((hasJobConfigs || hasCustomTasks) && currentUserId) {
        try {
          const enabledJobs = hasJobConfigs
            ? context.jobConfigs.filter((job: BookingJobConfig) => job.enabled)
            : [];
          const customTasks = context?.customTasks || [];

          if (enabledJobs.length > 0 || customTasks.length > 0) {
            console.log('📋 Creating jobs for booking:', data.booking_id, {
              enabledJobs: enabledJobs.length,
              customTasks: customTasks.length
            });
            const jobs = await createJobsFromBooking(
              data.booking_id!,
              data.property_id,
              data.check_in_date,
              data.check_out_date,
              enabledJobs,
              currentUserId,
              context.guestName,
              customTasks
            );
            console.log('✅ Jobs created:', jobs.length);

            // Invalidate job and task caches (jobs also create linked tasks)
            queryClient.invalidateQueries({ queryKey: jobKeys.all });
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
            queryClient.invalidateQueries({ queryKey: bookingTaskKeys.booking(data.booking_id!) });
          }
        } catch (taskError) {
          console.error('⚠️ Failed to create tasks for booking:', taskError);
          // Don't fail the booking creation for task errors
        }
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
    mutationFn: async ({ bookingId, bookingData, jobConfigs }: UpdateBookingParams) => {
      // Check permission
      if (!hasPermission(PERMISSIONS.BOOKINGS_EDIT)) {
        throw new Error("You don't have permission to edit bookings");
      }

      // Valid booking fields that can be updated in the database
      const validBookingFields = [
        'property_id', 'unit_id', 'guest_id', 'guest_name', 'guest_email', 'guest_phone',
        'check_in_date', 'check_out_date', 'number_of_guests', 'total_amount', 'deposit_amount',
        'payment_method', 'booking_status', 'special_requests', 'booking_channel',
        'payment_status', 'bill_template_id', 'notes', 'confirmation_code'
      ];

      // Filter bookingData to only include valid fields
      const filteredBookingData: Partial<BookingInsert> = {};
      for (const key of validBookingFields) {
        if (key in bookingData && bookingData[key as keyof typeof bookingData] !== undefined) {
          (filteredBookingData as any)[key] = bookingData[key as keyof typeof bookingData];
        }
      }

      console.log('📝 Updating booking with filtered data:', { bookingId, filteredBookingData, hasJobConfigs: !!jobConfigs?.length });

      // If dates, property, or unit are being changed, check for conflicts
      if (filteredBookingData.check_in_date || filteredBookingData.check_out_date || filteredBookingData.property_id || filteredBookingData.unit_id !== undefined) {
        const existingBooking = await fetchBookingDetail(bookingId);

        const checkIn = filteredBookingData.check_in_date || existingBooking.check_in_date;
        const checkOut = filteredBookingData.check_out_date || existingBooking.check_out_date;
        const propertyId = filteredBookingData.property_id || existingBooking.property_id;
        const unitId = filteredBookingData.unit_id !== undefined ? filteredBookingData.unit_id : existingBooking.unit_id;

        const hasConflict = await checkBookingConflict(
          propertyId,
          checkIn,
          checkOut,
          unitId,
          bookingId
        );

        if (hasConflict) {
          const unitText = unitId ? "This unit" : "This property";
          throw new Error(`${unitText} is already booked for the selected dates`);
        }
      }

      // Update booking with only valid fields
      const { data, error } = await supabase
        .from('property_bookings')
        .update({
          ...filteredBookingData,
          updated_at: new Date().toISOString(),
        })
        .eq('booking_id', bookingId)
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase update error:', error);
        throw error;
      }

      return data as Booking;
    },
    onMutate: async ({ bookingId, bookingData, jobConfigs, customTasks }) => {
      console.log('🔍 updateBooking onMutate - customTasks:', customTasks);
      console.log('🔍 updateBooking onMutate - jobConfigs:', jobConfigs);

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

      // Return rollback function, jobConfigs and customTasks for onSuccess
      return {
        rollback: () => queryClient.setQueryData(bookingKeys.lists(), previousBookings),
        jobConfigs,
        customTasks,
        guestName: bookingData.guest_name,
      };
    },
    onSuccess: async (data, variables, context) => {
      // Invalidate booking-related caches with refetchType: 'all'
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists(), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: bookingKeys.property(data.property_id), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(data.booking_id!), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['bookings', 'calendar'], refetchType: 'all' });

      // Create jobs if jobConfigs were provided (for generating jobs on existing bookings)
      if (context?.jobConfigs && context.jobConfigs.length > 0 && currentUserId) {
        try {
          const enabledJobs = context.jobConfigs.filter((job: BookingJobConfig) => job.enabled);
          if (enabledJobs.length > 0) {
            console.log('🔧 Creating jobs for updated booking:', data.booking_id, enabledJobs);

            const createdJobs = await createJobsFromBooking(
              data.booking_id!,
              data.property_id,
              data.check_in_date,
              data.check_out_date,
              enabledJobs,
              currentUserId,
              data.guest_name
            );

            console.log('✅ Jobs created for updated booking:', createdJobs.length);

            // Invalidate job and task caches
            queryClient.invalidateQueries({ queryKey: jobKeys.all });
            queryClient.invalidateQueries({ queryKey: taskKeys.all });

            toast({
              title: "Success",
              description: `Booking updated and ${createdJobs.length} job(s) created`,
            });
            return; // Skip regular success toast
          }
        } catch (jobError) {
          console.error('⚠️ Error creating jobs:', jobError);
          toast({
            title: "Booking Updated",
            description: `Booking updated but failed to create jobs`,
            variant: "destructive",
          });
        }
      }

      // Create custom tasks if provided
      const hasCustomTasks = context?.customTasks && context.customTasks.length > 0;
      console.log('🔍 updateBooking onSuccess - hasCustomTasks:', hasCustomTasks, context?.customTasks);

      if (hasCustomTasks && currentUserId) {
        try {
          const validCustomTasks = context.customTasks.filter((task: CustomBookingTask) => task.title.trim() !== '');
          if (validCustomTasks.length > 0) {
            console.log('📋 Creating custom jobs for updated booking:', data.booking_id, validCustomTasks);

            const jobs = await createJobsFromBooking(
              data.booking_id!,
              data.property_id,
              data.check_in_date,
              data.check_out_date,
              [], // No job configs, just custom tasks
              currentUserId,
              context.guestName || data.guest_name,
              validCustomTasks
            );

            console.log('✅ Custom jobs created:', jobs.length);

            // Invalidate job and task caches
            queryClient.invalidateQueries({ queryKey: jobKeys.all });
            queryClient.invalidateQueries({ queryKey: taskKeys.all });
            queryClient.invalidateQueries({ queryKey: bookingTaskKeys.booking(data.booking_id!) });

            toast({
              title: "Success",
              description: `Booking updated and ${jobs.length} custom job(s) created`,
            });
          }
        } catch (taskError) {
          console.error('⚠️ Error creating custom tasks:', taskError);
          toast({
            title: "Booking Updated",
            description: "Booking updated but failed to create custom tasks",
            variant: "destructive",
          });
        }
      }

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

      // Update revenue allocation if total_amount changed for entire-property bookings
      if (variables.bookingData.total_amount !== undefined) {
        try {
          const needsAllocation = await shouldCreateAllocation(
            data.property_id,
            data.unit_id || null
          );

          if (needsAllocation) {
            console.log('💰 Updating revenue allocation for booking:', data.booking_id);
            const { error: allocError } = await supabase.rpc('create_booking_revenue_allocations', {
              p_booking_id: data.booking_id,
              p_property_id: data.property_id,
              p_total_amount: data.total_amount || 0,
            });

            if (allocError) {
              console.error('⚠️ Failed to update revenue allocation:', allocError);
            } else {
              console.log('✅ Revenue allocation updated for booking:', data.booking_id);
              queryClient.invalidateQueries({ queryKey: ['booking-revenue-allocations'] });
            }
          }
        } catch (allocError) {
          console.error('⚠️ Error during revenue allocation update:', allocError);
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
    updateBooking: (bookingId: string, bookingData: Partial<BookingInsert>, jobConfigs?: BookingJobConfig[], customTasks?: CustomBookingTask[]) =>
      updateBookingMutation.mutateAsync({ bookingId, bookingData, jobConfigs, customTasks }),
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
