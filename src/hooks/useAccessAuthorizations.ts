import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AccessAuthorization, accessAuthorizationSchema } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';

interface UseAccessAuthorizationsOptions {
  vendor_id?: string;
  property_id?: string;
  unit_id?: string;
  job_id?: string;
  status?: string;
  access_date?: string; // YYYY-MM-DD format
}

export function useAccessAuthorizations(options: UseAccessAuthorizationsOptions = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch access authorizations with optional filters
  const {
    data: authorizations = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['access-authorizations', options],
    queryFn: async () => {
      let query = supabase
        .from('access_authorizations')
        .select(`
          *,
          vendor:providers(provider_id, provider_name, provider_type, contact_person, phone_primary, email),
          property:properties(property_id, property_type),
          unit:units(unit_id, property_name, license_number, folio),
          job:jobs(job_id, job_type, description, status),
          coi:vendor_cois(coi_id, coverage_type, valid_through, status),
          requested_user:users!access_authorizations_requested_by_fkey(user_id, first_name, last_name, email),
          approved_user:users!access_authorizations_approved_by_fkey(user_id, first_name, last_name, email),
          completed_user:users!access_authorizations_completed_by_fkey(user_id, first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (options.vendor_id) {
        query = query.eq('vendor_id', options.vendor_id);
      }
      if (options.property_id) {
        query = query.eq('property_id', options.property_id);
      }
      if (options.unit_id) {
        query = query.eq('unit_id', options.unit_id);
      }
      if (options.job_id) {
        query = query.eq('job_id', options.job_id);
      }
      if (options.status) {
        query = query.eq('status', options.status);
      }
      if (options.access_date) {
        query = query.eq('access_date', options.access_date);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching access authorizations:', error);
        throw error;
      }

      return data as AccessAuthorization[];
    },
  });

  // Create new access authorization
  const createAuthorization = useMutation({
    mutationFn: async (authData: Partial<AccessAuthorization>) => {
      // Validate with schema
      const validated = accessAuthorizationSchema.parse(authData);

      const user = (await supabase.auth.getUser()).data.user;

      const { data, error } = await supabase
        .from('access_authorizations')
        .insert([{
          ...validated,
          requested_by: user?.id,
        }])
        .select(`
          *,
          vendor:providers(provider_id, provider_name, provider_type, contact_person, phone_primary, email),
          property:properties(property_id, property_type),
          unit:units(unit_id, property_name, license_number, folio),
          job:jobs(job_id, job_type, description, status)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-authorizations'] });
      toast({
        title: 'Access Request Created',
        description: 'Vendor access authorization has been successfully created.',
      });
    },
    onError: (error: any) => {
      console.error('Error creating access authorization:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create access authorization. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Update existing access authorization
  const updateAuthorization = useMutation({
    mutationFn: async ({
      access_auth_id,
      updates
    }: {
      access_auth_id: string;
      updates: Partial<AccessAuthorization>
    }) => {
      const { data, error } = await supabase
        .from('access_authorizations')
        .update(updates)
        .eq('access_auth_id', access_auth_id)
        .select(`
          *,
          vendor:providers(provider_id, provider_name, provider_type, contact_person, phone_primary, email),
          property:properties(property_id, property_type),
          unit:units(unit_id, property_name, license_number, folio),
          job:jobs(job_id, job_type, description, status)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-authorizations'] });
      toast({
        title: 'Authorization Updated',
        description: 'Access authorization has been updated successfully.',
      });
    },
    onError: (error: any) => {
      console.error('Error updating access authorization:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update access authorization.',
        variant: 'destructive',
      });
    },
  });

  // Delete access authorization
  const deleteAuthorization = useMutation({
    mutationFn: async (access_auth_id: string) => {
      const { error } = await supabase
        .from('access_authorizations')
        .delete()
        .eq('access_auth_id', access_auth_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-authorizations'] });
      toast({
        title: 'Authorization Deleted',
        description: 'Access authorization has been removed.',
      });
    },
    onError: (error: any) => {
      console.error('Error deleting access authorization:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete access authorization.',
        variant: 'destructive',
      });
    },
  });

  // Approve access authorization
  const approveAuthorization = useMutation({
    mutationFn: async (access_auth_id: string) => {
      const user = (await supabase.auth.getUser()).data.user;

      const { data, error } = await supabase
        .from('access_authorizations')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('access_auth_id', access_auth_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-authorizations'] });
      toast({
        title: 'Authorization Approved',
        description: 'Vendor access has been approved.',
      });
    },
    onError: (error: any) => {
      console.error('Error approving authorization:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve authorization.',
        variant: 'destructive',
      });
    },
  });

  // Mark authorization as in progress (vendor arrived)
  const markInProgress = useMutation({
    mutationFn: async (access_auth_id: string) => {
      const { data, error } = await supabase
        .from('access_authorizations')
        .update({
          status: 'in_progress',
          actual_arrival_time: new Date().toISOString(),
        })
        .eq('access_auth_id', access_auth_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-authorizations'] });
      toast({
        title: 'Vendor Checked In',
        description: 'Vendor has been marked as arrived and in progress.',
      });
    },
    onError: (error: any) => {
      console.error('Error marking in progress:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to check in vendor.',
        variant: 'destructive',
      });
    },
  });

  // Complete authorization (vendor departed)
  const completeAuthorization = useMutation({
    mutationFn: async ({
      access_auth_id,
      completion_notes
    }: {
      access_auth_id: string;
      completion_notes?: string
    }) => {
      const user = (await supabase.auth.getUser()).data.user;

      const { data, error } = await supabase
        .from('access_authorizations')
        .update({
          status: 'completed',
          actual_departure_time: new Date().toISOString(),
          completed_by: user?.id,
          completion_notes,
        })
        .eq('access_auth_id', access_auth_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-authorizations'] });
      toast({
        title: 'Authorization Completed',
        description: 'Vendor access has been completed and logged.',
      });
    },
    onError: (error: any) => {
      console.error('Error completing authorization:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete authorization.',
        variant: 'destructive',
      });
    },
  });

  // Cancel authorization
  const cancelAuthorization = useMutation({
    mutationFn: async (access_auth_id: string) => {
      const { data, error } = await supabase
        .from('access_authorizations')
        .update({ status: 'cancelled' })
        .eq('access_auth_id', access_auth_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-authorizations'] });
      toast({
        title: 'Authorization Cancelled',
        description: 'Access authorization has been cancelled.',
      });
    },
    onError: (error: any) => {
      console.error('Error cancelling authorization:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel authorization.',
        variant: 'destructive',
      });
    },
  });

  return {
    authorizations,
    isLoading,
    error,
    refetch,
    createAuthorization: createAuthorization.mutateAsync,
    updateAuthorization: updateAuthorization.mutateAsync,
    deleteAuthorization: deleteAuthorization.mutateAsync,
    approveAuthorization: approveAuthorization.mutateAsync,
    markInProgress: markInProgress.mutateAsync,
    completeAuthorization: completeAuthorization.mutateAsync,
    cancelAuthorization: cancelAuthorization.mutateAsync,
    isCreating: createAuthorization.isPending,
    isUpdating: updateAuthorization.isPending,
    isDeleting: deleteAuthorization.isPending,
    isApproving: approveAuthorization.isPending,
    isMarkingInProgress: markInProgress.isPending,
    isCompleting: completeAuthorization.isPending,
    isCancelling: cancelAuthorization.isPending,
  };
}

// Hook to get today's access authorizations
export function useTodayAccessAuthorizations() {
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['today-access-authorizations', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_authorizations')
        .select(`
          *,
          vendor:providers(provider_id, provider_name, provider_type),
          property:properties(property_id, property_type),
          unit:units(unit_id, property_name)
        `)
        .eq('access_date', today)
        .in('status', ['approved', 'in_progress'])
        .order('access_time_start', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Hook to get upcoming access authorizations
export function useUpcomingAccessAuthorizations(days_ahead: number = 7) {
  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days_ahead);
  const futureStr = futureDate.toISOString().split('T')[0];

  return useQuery({
    queryKey: ['upcoming-access-authorizations', days_ahead],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_authorizations')
        .select(`
          *,
          vendor:providers(provider_id, provider_name, provider_type),
          property:properties(property_id, property_type),
          unit:units(unit_id, property_name)
        `)
        .gte('access_date', today)
        .lte('access_date', futureStr)
        .in('status', ['requested', 'approved'])
        .order('access_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

// Hook to check if vendor has valid COI for access request
export function useValidateVendorAccess(vendor_id?: string, property_id?: string) {
  return useQuery({
    queryKey: ['validate-vendor-access', vendor_id, property_id],
    queryFn: async () => {
      if (!vendor_id || !property_id) return null;

      // Get building requirements
      const { data: buildingCOI } = await supabase
        .from('building_cois')
        .select('required_coverages')
        .eq('property_id', property_id)
        .single();

      // If no requirements, vendor is valid
      if (!buildingCOI?.required_coverages) {
        return { is_valid: true, missing_coverages: [] };
      }

      const requiredCoverages = buildingCOI.required_coverages as Record<
        string,
        { min_amount: number; required: boolean }
      >;

      // Get required coverage types
      const requiredTypes = Object.entries(requiredCoverages)
        .filter(([_, req]) => req.required)
        .map(([type, _]) => type);

      if (requiredTypes.length === 0) {
        return { is_valid: true, missing_coverages: [] };
      }

      // Use the check_vendor_coi_valid function
      const { data, error } = await supabase
        .rpc('check_vendor_coi_valid', {
          p_vendor_id: vendor_id,
          p_coverage_types: requiredTypes,
        });

      if (error) throw error;

      const result = data?.[0];
      return {
        is_valid: result?.is_valid || false,
        missing_coverages: result?.missing_coverages || [],
        expiring_soon: result?.expiring_soon || [],
      };
    },
    enabled: !!vendor_id && !!property_id,
  });
}
