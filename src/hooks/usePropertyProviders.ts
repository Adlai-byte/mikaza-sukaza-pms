import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PropertyProviderAssignment } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";

// Query keys
export const propertyProviderKeys = {
  all: (propertyId: string) => ['property_providers', propertyId],
  byCategory: (propertyId: string, category: 'service' | 'utility') =>
    ['property_providers', propertyId, category],
  available: (category?: 'service' | 'utility') =>
    ['available_providers', ...(category ? [category] : [])],
} as const;

// Fetch assigned providers for a property (optionally filtered by category)
const fetchPropertyProviders = async (
  propertyId: string,
  category?: 'service' | 'utility'
): Promise<PropertyProviderAssignment[]> => {
  console.log(`🔍 [PropertyProviders] Fetching for property: ${propertyId}${category ? ` (category: ${category})` : ''}`);

  let query = supabase
    .from('property_providers_unified')
    .select(`
      *,
      provider:providers!property_providers_unified_provider_id_fkey(
        provider_id,
        provider_name,
        category,
        provider_type,
        contact_person,
        phone_primary,
        phone_secondary,
        email,
        website,
        address_street,
        address_city,
        address_state,
        address_zip,
        customer_service_hours,
        emergency_contact,
        emergency_phone,
        service_area,
        license_number,
        insurance_expiry,
        rating,
        total_reviews,
        is_active,
        is_preferred
      )
    `)
    .eq('property_id', propertyId);

  if (category) {
    // We need to filter by provider category, but we can't do it directly in the query
    // So we'll fetch all and filter in memory, or use a subquery
    // For now, let's fetch all and filter after
  }

  const { data, error } = await query.order('assigned_at', { ascending: false });

  if (error) {
    console.error('❌ [PropertyProviders] Fetch error:', error);
    throw error;
  }

  let result = (data || []) as PropertyProviderAssignment[];

  // Filter by category if provided
  if (category) {
    result = result.filter(assignment => assignment.provider.category === category);
  }

  console.log('✅ [PropertyProviders] Fetched:', result.length, 'assignments');
  return result;
};

// Fetch all available providers (for assignment dialog)
const fetchAvailableProviders = async (category?: 'service' | 'utility') => {
  console.log(`🔍 [PropertyProviders] Fetching available providers${category ? ` (category: ${category})` : ''}`);

  let query = supabase
    .from('providers')
    .select('provider_id, provider_name, category, provider_type, phone_primary, email, website, rating, is_active, is_preferred')
    .eq('is_active', true);

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query.order('provider_name', { ascending: true });

  if (error) {
    console.error('❌ [PropertyProviders] Available providers fetch error:', error);
    throw error;
  }

  console.log('✅ [PropertyProviders] Available providers:', data?.length || 0);
  return data || [];
};

export function usePropertyProviders(propertyId: string, category?: 'service' | 'utility') {
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
    queryKey: category
      ? propertyProviderKeys.byCategory(propertyId, category)
      : propertyProviderKeys.all(propertyId),
    queryFn: () => fetchPropertyProviders(propertyId, category),
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
    refetch: refetchAvailable,
  } = useQuery({
    queryKey: propertyProviderKeys.available(category),
    queryFn: () => fetchAvailableProviders(category),
    staleTime: 30 * 1000, // Cache for 30 seconds (reduced from 5 minutes)
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Assign provider to property
  const assignProviderMutation = useMutation({
    mutationFn: async (data: {
      providerId: string;
      // Service provider fields
      isPreferredForProperty?: boolean;
      assignmentNotes?: string;
      // Utility provider fields
      accountNumber?: string;
      billingName?: string;
      username?: string;
      password?: string;
      observations?: string;
    }) => {
      console.log('🔗 [PropertyProviders] Assigning provider:', data.providerId);

      if (!hasPermission(PERMISSIONS.PROPERTIES_EDIT)) {
        throw new Error("You don't have permission to assign providers");
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      const { data: assignment, error } = await supabase
        .from('property_providers_unified')
        .insert([{
          provider_id: data.providerId,
          property_id: propertyId,
          // Service fields
          is_preferred_for_property: data.isPreferredForProperty || false,
          assignment_notes: data.assignmentNotes || null,
          // Utility fields
          account_number: data.accountNumber || null,
          billing_name: data.billingName || null,
          username: data.username || null,
          password: data.password || null,
          observations: data.observations || null,
          // Metadata
          assigned_by: user?.id,
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ [PropertyProviders] Assignment failed:', error);
        throw error;
      }

      console.log('✅ [PropertyProviders] Provider assigned');
      return assignment;
    },
    onSuccess: async (data, variables) => {
      const provider = availableProviders.find(p => p.provider_id === variables.providerId);

      await logActivity('PROVIDER_ASSIGNED', {
        propertyId,
        providerId: variables.providerId,
        providerName: provider?.provider_name,
        category: provider?.category,
        providerType: provider?.provider_type,
      });

      // Refetch all property provider queries
      await queryClient.invalidateQueries({
        queryKey: propertyProviderKeys.all(propertyId),
      });

      toast({
        title: "Success",
        description: `Provider "${provider?.provider_name}" assigned to property`,
      });
    },
    onError: (error) => {
      console.error('❌ [PropertyProviders] Assignment error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign provider",
        variant: "destructive",
      });
    },
  });

  // Update assignment
  const updateAssignmentMutation = useMutation({
    mutationFn: async (data: {
      assignmentId: string;
      // Service provider fields
      isPreferredForProperty?: boolean;
      assignmentNotes?: string;
      // Utility provider fields
      accountNumber?: string;
      billingName?: string;
      username?: string;
      password?: string;
      observations?: string;
    }) => {
      console.log('📝 [PropertyProviders] Updating assignment:', data.assignmentId);

      if (!hasPermission(PERMISSIONS.PROPERTIES_EDIT)) {
        throw new Error("You don't have permission to update provider assignments");
      }

      const updateData: any = {};

      // Add fields that are defined
      if (data.isPreferredForProperty !== undefined) {
        updateData.is_preferred_for_property = data.isPreferredForProperty;
      }
      if (data.assignmentNotes !== undefined) {
        updateData.assignment_notes = data.assignmentNotes || null;
      }
      if (data.accountNumber !== undefined) {
        updateData.account_number = data.accountNumber || null;
      }
      if (data.billingName !== undefined) {
        updateData.billing_name = data.billingName || null;
      }
      if (data.username !== undefined) {
        updateData.username = data.username || null;
      }
      if (data.password !== undefined) {
        updateData.password = data.password || null;
      }
      if (data.observations !== undefined) {
        updateData.observations = data.observations || null;
      }

      const { error } = await supabase
        .from('property_providers_unified')
        .update(updateData)
        .eq('id', data.assignmentId);

      if (error) {
        console.error('❌ [PropertyProviders] Update failed:', error);
        throw error;
      }

      console.log('✅ [PropertyProviders] Assignment updated');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: propertyProviderKeys.all(propertyId),
      });

      toast({
        title: "Success",
        description: "Assignment updated successfully",
      });
    },
    onError: (error) => {
      console.error('❌ [PropertyProviders] Update error:', error);
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
      console.log('🗑️ [PropertyProviders] Unassigning provider:', assignmentId);

      if (!hasPermission(PERMISSIONS.PROPERTIES_EDIT)) {
        throw new Error("You don't have permission to unassign providers");
      }

      const { error } = await supabase
        .from('property_providers_unified')
        .delete()
        .eq('id', assignmentId);

      if (error) {
        console.error('❌ [PropertyProviders] Unassign failed:', error);
        throw error;
      }

      console.log('✅ [PropertyProviders] Provider unassigned');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: propertyProviderKeys.all(propertyId),
      });

      await logActivity('PROVIDER_UNASSIGNED', { propertyId });

      toast({
        title: "Success",
        description: "Provider unassigned from property",
      });
    },
    onError: (error) => {
      console.error('❌ [PropertyProviders] Unassign error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to unassign provider",
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
    refetchAvailable,

    // Mutations
    assignProvider: assignProviderMutation.mutateAsync,
    updateAssignment: updateAssignmentMutation.mutateAsync,
    unassignProvider: unassignProviderMutation.mutateAsync,

    // Mutation states
    isAssigning: assignProviderMutation.isPending,
    isUpdatingAssignment: updateAssignmentMutation.isPending,
    isUnassigning: unassignProviderMutation.isPending,
  };
}
