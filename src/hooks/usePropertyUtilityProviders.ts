import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";

interface PropertyUtilityProvider {
  id: string;
  provider_id: string;
  property_id: string;
  account_number?: string;
  billing_name?: string;
  username?: string;
  password?: string;
  observations?: string;
  assigned_at: string;
  assigned_by?: string;
  // Joined provider data
  provider: {
    provider_id: string;
    provider_name: string;
    provider_type: string;
    phone_number?: string;
    email?: string;
    website?: string;
    customer_service_hours?: string;
    emergency_contact?: string;
    emergency_phone?: string;
    is_active: boolean;
  };
}

// Query keys
export const propertyUtilityProviderKeys = {
  all: (propertyId: string) => ['property_utility_providers', propertyId],
  available: () => ['available_utility_providers'],
} as const;

// Fetch assigned utility providers for a property
const fetchPropertyUtilityProviders = async (propertyId: string): Promise<PropertyUtilityProvider[]> => {
  console.log('🔍 [PropertyUtilityProviders] Fetching for property:', propertyId);

  const { data, error } = await supabase
    .from('utility_provider_properties')
    .select(`
      *,
      provider:utility_providers!utility_provider_properties_provider_id_fkey(
        provider_id,
        provider_name,
        provider_type,
        phone_number,
        email,
        website,
        customer_service_hours,
        emergency_contact,
        emergency_phone,
        is_active
      )
    `)
    .eq('property_id', propertyId)
    .order('assigned_at', { ascending: false });

  if (error) {
    console.error('❌ [PropertyUtilityProviders] Fetch error:', error);
    throw error;
  }

  console.log('✅ [PropertyUtilityProviders] Fetched:', data?.length || 0, 'assignments');
  return (data || []) as PropertyUtilityProvider[];
};

// Fetch all available utility providers (for assignment dialog)
const fetchAvailableUtilityProviders = async () => {
  console.log('🔍 [PropertyUtilityProviders] Fetching available providers');

  const { data, error } = await supabase
    .from('utility_providers')
    .select('provider_id, provider_name, provider_type, phone_number, email, website, is_active')
    .eq('is_active', true)
    .order('provider_name', { ascending: true });

  if (error) {
    console.error('❌ [PropertyUtilityProviders] Available providers fetch error:', error);
    throw error;
  }

  console.log('✅ [PropertyUtilityProviders] Available providers:', data?.length || 0);
  return data || [];
};

export function usePropertyUtilityProviders(propertyId: string) {
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
    queryKey: propertyUtilityProviderKeys.all(propertyId),
    queryFn: () => fetchPropertyUtilityProviders(propertyId),
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
    queryKey: propertyUtilityProviderKeys.available(),
    queryFn: fetchAvailableUtilityProviders,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Assign provider to property
  const assignProviderMutation = useMutation({
    mutationFn: async (data: {
      providerId: string;
      accountNumber?: string;
      billingName?: string;
      username?: string;
      password?: string;
      observations?: string;
    }) => {
      console.log('🔗 [PropertyUtilityProviders] Assigning provider:', data.providerId);

      if (!hasPermission(PERMISSIONS.PROPERTIES_EDIT)) {
        throw new Error("You don't have permission to assign utility providers");
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      const { data: assignment, error } = await supabase
        .from('utility_provider_properties')
        .insert([{
          provider_id: data.providerId,
          property_id: propertyId,
          account_number: data.accountNumber || null,
          billing_name: data.billingName || null,
          username: data.username || null,
          password: data.password || null,
          observations: data.observations || null,
          assigned_by: user?.id,
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ [PropertyUtilityProviders] Assignment failed:', error);
        throw error;
      }

      console.log('✅ [PropertyUtilityProviders] Provider assigned');
      return assignment;
    },
    onSuccess: async (data, variables) => {
      const provider = availableProviders.find(p => p.provider_id === variables.providerId);

      await logActivity('UTILITY_PROVIDER_ASSIGNED', {
        propertyId,
        providerId: variables.providerId,
        providerName: provider?.provider_name,
        providerType: provider?.provider_type,
      });

      // Refetch assignments
      await queryClient.invalidateQueries({
        queryKey: propertyUtilityProviderKeys.all(propertyId),
      });

      toast({
        title: "Success",
        description: `Utility provider "${provider?.provider_name}" assigned to property`,
      });
    },
    onError: (error) => {
      console.error('❌ [PropertyUtilityProviders] Assignment error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign utility provider",
        variant: "destructive",
      });
    },
  });

  // Update assignment
  const updateAssignmentMutation = useMutation({
    mutationFn: async (data: {
      assignmentId: string;
      accountNumber?: string;
      billingName?: string;
      username?: string;
      password?: string;
      observations?: string;
    }) => {
      console.log('📝 [PropertyUtilityProviders] Updating assignment:', data.assignmentId);

      if (!hasPermission(PERMISSIONS.PROPERTIES_EDIT)) {
        throw new Error("You don't have permission to update utility provider assignments");
      }

      const { error } = await supabase
        .from('utility_provider_properties')
        .update({
          account_number: data.accountNumber || null,
          billing_name: data.billingName || null,
          username: data.username || null,
          password: data.password || null,
          observations: data.observations || null,
        })
        .eq('id', data.assignmentId);

      if (error) {
        console.error('❌ [PropertyUtilityProviders] Update failed:', error);
        throw error;
      }

      console.log('✅ [PropertyUtilityProviders] Assignment updated');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: propertyUtilityProviderKeys.all(propertyId),
      });

      toast({
        title: "Success",
        description: "Assignment updated successfully",
      });
    },
    onError: (error) => {
      console.error('❌ [PropertyUtilityProviders] Update error:', error);
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
      console.log('🗑️ [PropertyUtilityProviders] Unassigning provider:', assignmentId);

      if (!hasPermission(PERMISSIONS.PROPERTIES_EDIT)) {
        throw new Error("You don't have permission to unassign utility providers");
      }

      const { error } = await supabase
        .from('utility_provider_properties')
        .delete()
        .eq('id', assignmentId);

      if (error) {
        console.error('❌ [PropertyUtilityProviders] Unassign failed:', error);
        throw error;
      }

      console.log('✅ [PropertyUtilityProviders] Provider unassigned');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: propertyUtilityProviderKeys.all(propertyId),
      });

      await logActivity('UTILITY_PROVIDER_UNASSIGNED', { propertyId });

      toast({
        title: "Success",
        description: "Utility provider unassigned from property",
      });
    },
    onError: (error) => {
      console.error('❌ [PropertyUtilityProviders] Unassign error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to unassign utility provider",
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
