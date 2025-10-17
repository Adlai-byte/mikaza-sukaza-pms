import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";

interface PropertyServiceProvider {
  id: string;
  provider_id: string;
  property_id: string;
  is_preferred_for_property: boolean;
  notes?: string;
  assigned_at: string;
  assigned_by?: string;
  // Joined provider data
  provider: {
    provider_id: string;
    company_name: string;
    service_category: string;
    contact_person?: string;
    phone_primary?: string;
    email?: string;
    is_active: boolean;
    is_preferred: boolean;
    rating?: number;
    total_reviews?: number;
  };
}

// Query keys
export const propertyServiceProviderKeys = {
  all: (propertyId: string) => ['property_service_providers', propertyId],
  available: () => ['available_service_providers'],
} as const;

// Fetch assigned service providers for a property
const fetchPropertyServiceProviders = async (propertyId: string): Promise<PropertyServiceProvider[]> => {
  console.log('🔍 [PropertyServiceProviders] Fetching for property:', propertyId);

  const { data, error } = await supabase
    .from('service_provider_properties')
    .select(`
      *,
      provider:service_providers!service_provider_properties_provider_id_fkey(
        provider_id,
        company_name,
        service_category,
        contact_person,
        phone_primary,
        email,
        is_active,
        is_preferred,
        rating,
        total_reviews
      )
    `)
    .eq('property_id', propertyId)
    .order('assigned_at', { ascending: false });

  if (error) {
    console.error('❌ [PropertyServiceProviders] Fetch error:', error);
    throw error;
  }

  console.log('✅ [PropertyServiceProviders] Fetched:', data?.length || 0, 'assignments');
  return (data || []) as PropertyServiceProvider[];
};

// Fetch all available service providers (for assignment dialog)
const fetchAvailableServiceProviders = async () => {
  console.log('🔍 [PropertyServiceProviders] Fetching available providers');

  const { data, error } = await supabase
    .from('service_providers')
    .select('provider_id, company_name, service_category, phone_primary, email, rating, is_active, is_preferred')
    .eq('is_active', true)
    .order('company_name', { ascending: true });

  if (error) {
    console.error('❌ [PropertyServiceProviders] Available providers fetch error:', error);
    throw error;
  }

  console.log('✅ [PropertyServiceProviders] Available providers:', data?.length || 0);
  return data || [];
};

export function usePropertyServiceProviders(propertyId: string) {
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  // Query for assigned providers
  const {
    data: assignedProviders = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: propertyServiceProviderKeys.all(propertyId),
    queryFn: () => fetchPropertyServiceProviders(propertyId),
    enabled: !!propertyId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Query for available providers
  const {
    data: availableProviders = [],
    isLoading: isLoadingAvailable,
  } = useQuery({
    queryKey: propertyServiceProviderKeys.available(),
    queryFn: fetchAvailableServiceProviders,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Assign provider to property
  const assignProviderMutation = useMutation({
    mutationFn: async (data: {
      providerId: string;
      isPreferred?: boolean;
      notes?: string;
    }) => {
      console.log('🔗 [PropertyServiceProviders] Assigning provider:', data.providerId);

      if (!hasPermission(PERMISSIONS.PROPERTIES_EDIT)) {
        throw new Error("You don't have permission to assign service providers");
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      const { data: assignment, error } = await supabase
        .from('service_provider_properties')
        .insert([{
          provider_id: data.providerId,
          property_id: propertyId,
          is_preferred_for_property: data.isPreferred || false,
          notes: data.notes || null,
          assigned_by: user?.id,
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ [PropertyServiceProviders] Assignment failed:', error);
        throw error;
      }

      console.log('✅ [PropertyServiceProviders] Provider assigned');
      return assignment;
    },
    onSuccess: async (data, variables) => {
      const provider = availableProviders.find(p => p.provider_id === variables.providerId);

      await logActivity('SERVICE_PROVIDER_ASSIGNED', {
        propertyId,
        providerId: variables.providerId,
        companyName: provider?.company_name,
      });

      // Refetch assignments
      await queryClient.invalidateQueries({
        queryKey: propertyServiceProviderKeys.all(propertyId),
      });

      toast({
        title: "Success",
        description: `Service provider "${provider?.company_name}" assigned to property`,
      });
    },
    onError: (error) => {
      console.error('❌ [PropertyServiceProviders] Assignment error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign service provider",
        variant: "destructive",
      });
    },
  });

  // Update assignment
  const updateAssignmentMutation = useMutation({
    mutationFn: async (data: {
      assignmentId: string;
      isPreferred?: boolean;
      notes?: string;
    }) => {
      console.log('📝 [PropertyServiceProviders] Updating assignment:', data.assignmentId);

      if (!hasPermission(PERMISSIONS.PROPERTIES_EDIT)) {
        throw new Error("You don't have permission to update service provider assignments");
      }

      const { error } = await supabase
        .from('service_provider_properties')
        .update({
          is_preferred_for_property: data.isPreferred,
          notes: data.notes || null,
        })
        .eq('id', data.assignmentId);

      if (error) {
        console.error('❌ [PropertyServiceProviders] Update failed:', error);
        throw error;
      }

      console.log('✅ [PropertyServiceProviders] Assignment updated');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: propertyServiceProviderKeys.all(propertyId),
      });

      toast({
        title: "Success",
        description: "Assignment updated successfully",
      });
    },
    onError: (error) => {
      console.error('❌ [PropertyServiceProviders] Update error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update assignment",
        variant: "destructive",
      });
    },
  });

  // Unassign provider from property
  const unassignProviderMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      console.log('🗑️ [PropertyServiceProviders] Unassigning provider:', assignmentId);

      if (!hasPermission(PERMISSIONS.PROPERTIES_EDIT)) {
        throw new Error("You don't have permission to unassign service providers");
      }

      const { error } = await supabase
        .from('service_provider_properties')
        .delete()
        .eq('id', assignmentId);

      if (error) {
        console.error('❌ [PropertyServiceProviders] Unassign failed:', error);
        throw error;
      }

      console.log('✅ [PropertyServiceProviders] Provider unassigned');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: propertyServiceProviderKeys.all(propertyId),
      });

      await logActivity('SERVICE_PROVIDER_UNASSIGNED', { propertyId });

      toast({
        title: "Success",
        description: "Service provider unassigned from property",
      });
    },
    onError: (error) => {
      console.error('❌ [PropertyServiceProviders] Unassign error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to unassign service provider",
        variant: "destructive",
      });
    },
  });

  return {
    // Assigned providers for this property
    assignedProviders,
    isLoading,
    isFetching,
    error,
    refetch,

    // Available providers for assignment
    availableProviders,
    isLoadingAvailable,

    // Mutations
    assignProvider: assignProviderMutation.mutate,
    updateAssignment: updateAssignmentMutation.mutate,
    unassignProvider: unassignProviderMutation.mutate,

    // Mutation states
    isAssigning: assignProviderMutation.isPending,
    isUpdatingAssignment: updateAssignmentMutation.isPending,
    isUnassigning: unassignProviderMutation.isPending,
  };
}
