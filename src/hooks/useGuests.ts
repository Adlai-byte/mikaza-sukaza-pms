import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { Guest, GuestInsert, GuestFilters } from '@/lib/schemas';
import { CACHE_CONFIG } from '@/lib/cache-config';

// =============================================
// QUERY KEYS FOR CACHE MANAGEMENT
// =============================================

export const guestKeys = {
  all: () => ['guests'] as const,
  lists: () => [...guestKeys.all(), 'list'] as const,
  list: (filters?: GuestFilters) => [...guestKeys.lists(), filters] as const,
  details: () => [...guestKeys.all(), 'detail'] as const,
  detail: (id: string) => [...guestKeys.details(), id] as const,
  history: (id: string) => [...guestKeys.detail(id), 'history'] as const,
  search: (query: string) => [...guestKeys.all(), 'search', query] as const,
};

// =============================================
// FETCH FUNCTIONS
// =============================================

/**
 * Fetch all guests with optional filters
 */
const fetchGuests = async (filters?: GuestFilters): Promise<Guest[]> => {
  let query = supabase
    .from('guests')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply search filter (name or email)
  if (filters?.search) {
    const searchTerm = `%${filters.search}%`;
    query = query.or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm}`);
  }

  // Apply booking count filters
  if (filters?.min_bookings !== undefined) {
    query = query.gte('total_bookings', filters.min_bookings);
  }
  if (filters?.max_bookings !== undefined) {
    query = query.lte('total_bookings', filters.max_bookings);
  }

  // Apply total spent filters
  if (filters?.min_spent !== undefined) {
    query = query.gte('total_spent', filters.min_spent);
  }
  if (filters?.max_spent !== undefined) {
    query = query.lte('total_spent', filters.max_spent);
  }

  // Apply last booking date filters
  if (filters?.last_booking_from) {
    query = query.gte('last_booking_date', filters.last_booking_from);
  }
  if (filters?.last_booking_to) {
    query = query.lte('last_booking_date', filters.last_booking_to);
  }

  // Apply verification filter
  if (filters?.is_verified !== undefined) {
    query = query.eq('is_verified', filters.is_verified);
  }

  // Apply email filter
  if (filters?.has_email !== undefined) {
    if (filters.has_email) {
      query = query.not('email', 'is', null);
    } else {
      query = query.is('email', null);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching guests:', error);
    throw error;
  }

  return (data as Guest[]) || [];
};

/**
 * Fetch a single guest by ID with optional relations
 */
const fetchGuestById = async (guestId: string): Promise<Guest | null> => {
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('guest_id', guestId)
    .single();

  if (error) {
    console.error(`Error fetching guest ${guestId}:`, error);
    throw error;
  }

  return data as Guest;
};

/**
 * Check if email already exists (for uniqueness validation)
 */
const checkEmailExists = async (email: string, excludeGuestId?: string): Promise<boolean> => {
  let query = supabase
    .from('guests')
    .select('guest_id')
    .eq('email', email.toLowerCase().trim());

  // Exclude current guest when updating
  if (excludeGuestId) {
    query = query.neq('guest_id', excludeGuestId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error checking email:', error);
    return false;
  }

  return (data?.length || 0) > 0;
};

// =============================================
// HOOKS
// =============================================

/**
 * Hook to fetch all guests with optional filters
 */
export function useGuests(filters?: GuestFilters) {
  const { hasPermission } = usePermissions();

  return useQuery({
    queryKey: guestKeys.list(filters),
    queryFn: () => fetchGuests(filters),
    enabled: hasPermission(PERMISSIONS.GUESTS_VIEW),
    staleTime: CACHE_CONFIG.LIST.staleTime, // 30 minutes
    gcTime: CACHE_CONFIG.LIST.gcTime,
  });
}

/**
 * Hook to fetch a single guest by ID
 */
export function useGuest(guestId: string | null) {
  const { hasPermission } = usePermissions();

  return useQuery({
    queryKey: guestId ? guestKeys.detail(guestId) : ['guests', 'null'],
    queryFn: () => (guestId ? fetchGuestById(guestId) : null),
    enabled: !!guestId && hasPermission(PERMISSIONS.GUESTS_VIEW),
    staleTime: CACHE_CONFIG.DETAIL.staleTime,
    gcTime: CACHE_CONFIG.DETAIL.gcTime,
  });
}

/**
 * Hook to check if an email already exists
 */
export function useCheckEmailExists() {
  return useMutation({
    mutationFn: ({ email, excludeGuestId }: { email: string; excludeGuestId?: string }) =>
      checkEmailExists(email, excludeGuestId),
  });
}

/**
 * Hook to create a new guest
 */
export function useCreateGuest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();
  const { hasPermission } = usePermissions();

  return useMutation({
    mutationFn: async (guestData: GuestInsert) => {
      if (!hasPermission(PERMISSIONS.GUESTS_CREATE)) {
        throw new Error('You do not have permission to create guests');
      }

      // Check for duplicate email
      const emailExists = await checkEmailExists(guestData.email);
      if (emailExists) {
        throw new Error('A guest with this email already exists');
      }

      // Normalize email to lowercase
      const normalizedData = {
        ...guestData,
        email: guestData.email.toLowerCase().trim(),
      };

      const { data, error } = await supabase
        .from('guests')
        .insert(normalizedData)
        .select()
        .single();

      if (error) throw error;

      return data as Guest;
    },
    onMutate: async (newGuest) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: guestKeys.lists() });

      // Snapshot the previous value
      const previousGuests = queryClient.getQueryData(guestKeys.lists());

      // Optimistically update to the new value
      queryClient.setQueryData(guestKeys.lists(), (old: Guest[] | undefined) => {
        const optimisticGuest: Guest = {
          ...newGuest,
          guest_id: 'temp-' + Date.now(),
          total_bookings: 0,
          total_spent: 0,
          is_verified: false,
          marketing_opt_in: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return old ? [optimisticGuest, ...old] : [optimisticGuest];
      });

      return { previousGuests };
    },
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: guestKeys.all() });

      // Log activity
      logActivity('guest_created', {
        guest_id: data.guest_id,
        guest_name: `${data.first_name} ${data.last_name}`,
        email: data.email,
      });

      toast({
        title: 'Success',
        description: 'Guest created successfully',
      });
    },
    onError: (error: any, newGuest, context) => {
      // Rollback optimistic update
      if (context?.previousGuests) {
        queryClient.setQueryData(guestKeys.lists(), context.previousGuests);
      }

      console.error('Error creating guest:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create guest',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update a guest
 */
export function useUpdateGuest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();
  const { hasPermission } = usePermissions();

  return useMutation({
    mutationFn: async ({ guestId, updates }: { guestId: string; updates: Partial<GuestInsert> }) => {
      if (!hasPermission(PERMISSIONS.GUESTS_EDIT)) {
        throw new Error('You do not have permission to edit guests');
      }

      // If email is being updated, check for duplicates
      if (updates.email) {
        const emailExists = await checkEmailExists(updates.email, guestId);
        if (emailExists) {
          throw new Error('A guest with this email already exists');
        }

        // Normalize email
        updates.email = updates.email.toLowerCase().trim();
      }

      const { data, error } = await supabase
        .from('guests')
        .update(updates)
        .eq('guest_id', guestId)
        .select()
        .single();

      if (error) throw error;

      return data as Guest;
    },
    onMutate: async ({ guestId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: guestKeys.detail(guestId) });

      // Snapshot previous value
      const previousGuest = queryClient.getQueryData(guestKeys.detail(guestId));

      // Optimistically update
      queryClient.setQueryData(guestKeys.detail(guestId), (old: Guest | undefined) => {
        if (!old) return old;
        return { ...old, ...updates, updated_at: new Date().toISOString() };
      });

      return { previousGuest };
    },
    onSuccess: (data, { guestId }) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: guestKeys.all() });
      queryClient.setQueryData(guestKeys.detail(guestId), data);

      // Log activity
      logActivity('guest_updated', {
        guest_id: data.guest_id,
        guest_name: `${data.first_name} ${data.last_name}`,
        email: data.email,
      });

      toast({
        title: 'Success',
        description: 'Guest updated successfully',
      });
    },
    onError: (error: any, { guestId }, context) => {
      // Rollback optimistic update
      if (context?.previousGuest) {
        queryClient.setQueryData(guestKeys.detail(guestId), context.previousGuest);
      }

      console.error('Error updating guest:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update guest',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a guest (soft delete recommended)
 */
export function useDeleteGuest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();
  const { hasPermission } = usePermissions();

  return useMutation({
    mutationFn: async (guestId: string) => {
      if (!hasPermission(PERMISSIONS.GUESTS_DELETE)) {
        throw new Error('You do not have permission to delete guests');
      }

      // Check if guest has bookings or invoices
      const { data: bookings } = await supabase
        .from('property_bookings')
        .select('booking_id')
        .eq('guest_id', guestId)
        .limit(1);

      const { data: invoices } = await supabase
        .from('invoices')
        .select('invoice_id')
        .eq('guest_id', guestId)
        .limit(1);

      if ((bookings && bookings.length > 0) || (invoices && invoices.length > 0)) {
        throw new Error(
          'Cannot delete guest with existing bookings or invoices. Bookings and invoices will remain linked even if guest is deleted.'
        );
      }

      // Hard delete if no related records
      const { error } = await supabase.from('guests').delete().eq('guest_id', guestId);

      if (error) throw error;

      return guestId;
    },
    onSuccess: (guestId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: guestKeys.detail(guestId) });
      queryClient.invalidateQueries({ queryKey: guestKeys.all() });

      // Log activity
      logActivity('guest_deleted', {
        guest_id: guestId,
      });

      toast({
        title: 'Success',
        description: 'Guest deleted successfully',
      });
    },
    onError: (error: any) => {
      console.error('Error deleting guest:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete guest',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to get guest statistics
 */
export function useGuestStats() {
  const { hasPermission } = usePermissions();

  return useQuery({
    queryKey: ['guests', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('guests').select('guest_id, total_bookings, total_spent, created_at');

      if (error) throw error;

      const totalGuests = data?.length || 0;
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const newThisMonth = data?.filter((g) => new Date(g.created_at!) >= thisMonth).length || 0;
      const repeatGuests = data?.filter((g) => (g.total_bookings || 0) > 1).length || 0;
      const totalRevenue = data?.reduce((sum, g) => sum + (g.total_spent || 0), 0) || 0;

      return {
        totalGuests,
        newThisMonth,
        repeatGuests,
        totalRevenue,
      };
    },
    enabled: hasPermission(PERMISSIONS.GUESTS_VIEW),
    staleTime: CACHE_CONFIG.DETAIL.staleTime, // 10 minutes for stats
    gcTime: CACHE_CONFIG.DETAIL.gcTime,
  });
}
