import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UtilityProvider, UtilityProviderInsert } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";

// Query keys for cache management
export const utilityProviderKeys = {
  all: () => ['utility_providers'],
  lists: () => ['utility_providers', 'list'],
  list: (filters?: { showInactive?: boolean }) => ['utility_providers', 'list', ...(filters ? [JSON.stringify(filters)] : [])],
  details: () => ['utility_providers', 'detail'],
  detail: (id: string) => ['utility_providers', 'detail', id],
} as const;

// Fetch utility providers list with optional inactive filter
const fetchUtilityProviders = async (showInactive: boolean = false): Promise<UtilityProvider[]> => {
  console.log(`🔍 [UtilityProviders] Fetching utility providers list${showInactive ? ' (including inactive)' : ''}...`);

  let query = supabase
    .from('utility_providers')
    .select(`
      *,
      created_user:users!utility_providers_created_by_fkey(
        user_id,
        first_name,
        last_name,
        email
      )
    `);

  // By default, only show active providers unless showInactive is true
  if (!showInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query.order('provider_name', { ascending: true });

  if (error) {
    console.error('❌ [UtilityProviders] Fetch error:', error);
    throw error;
  }

  console.log('✅ [UtilityProviders] Fetched:', data?.length || 0, 'providers');
  return (data || []) as UtilityProvider[];
};

// Fetch single utility provider with full details
const fetchUtilityProviderDetail = async (providerId: string): Promise<UtilityProvider> => {
  console.log('🔍 [UtilityProviders] Fetching provider detail for:', providerId);

  const { data, error } = await supabase
    .from('utility_providers')
    .select(`
      *,
      created_user:users!utility_providers_created_by_fkey(
        user_id,
        first_name,
        last_name,
        email
      )
    `)
    .eq('provider_id', providerId)
    .single();

  if (error) {
    console.error('❌ [UtilityProviders] Detail fetch error:', error);
    throw error;
  }

  console.log('✅ [UtilityProviders] Provider detail fetched:', data);
  return data as UtilityProvider;
};

export function useUtilityProviders(showInactive: boolean = false) {
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  // Utility providers query
  const {
    data: providers = [],
    isLoading: loading,
    isFetching,
    error: providersError,
    refetch,
  } = useQuery({
    queryKey: utilityProviderKeys.list({ showInactive }),
    queryFn: () => fetchUtilityProviders(showInactive),
    // Enable caching - realtime subscriptions will invalidate when data changes
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  // Create utility provider mutation
  const createProviderMutation = useMutation({
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    mutationFn: async (providerData: UtilityProviderInsert) => {
      console.log('⚡ [UtilityProviders] Creating provider:', providerData.provider_name);

      // Check permission
      if (!hasPermission(PERMISSIONS.UTILITY_PROVIDERS_CREATE)) {
        console.error('❌ [UtilityProviders] Permission denied for provider creation');
        throw new Error("You don't have permission to create utility providers");
      }

      console.log('✅ [UtilityProviders] Permission granted for creation');

      // Create the utility provider
      const { data: provider, error } = await supabase
        .from('utility_providers')
        .insert([providerData as any])
        .select()
        .single();

      if (error) {
        console.error('❌ [UtilityProviders] Creation failed:', error);
        throw error;
      }

      console.log('✅ [UtilityProviders] Provider created:', provider.provider_id);

      await logActivity('UTILITY_PROVIDER_CREATED', {
        providerId: provider.provider_id,
        providerName: provider.provider_name,
        providerType: provider.provider_type,
      });

      return provider;
    },
    onSuccess: async (data) => {
      console.log('✅ [UtilityProviders] Creation succeeded, refreshing list...');

      // Immediately fetch fresh data
      const freshData = await fetchUtilityProviders();
      queryClient.setQueryData(utilityProviderKeys.lists(), freshData);

      // Invalidate to ensure consistency
      await queryClient.invalidateQueries({
        queryKey: utilityProviderKeys.lists(),
        refetchType: 'all'
      });

      toast({
        title: "Success",
        description: `Utility provider "${data.provider_name}" created successfully`,
      });
    },
    onError: (error) => {
      console.error('❌ [UtilityProviders] Creation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create utility provider",
        variant: "destructive",
      });
    },
  });

  // Update utility provider mutation
  const updateProviderMutation = useMutation({
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    mutationFn: async ({ providerId, providerData }: {
      providerId: string;
      providerData: Partial<UtilityProviderInsert>;
    }) => {
      console.log('📝 [UtilityProviders] Updating provider:', providerId);

      // Check permission
      if (!hasPermission(PERMISSIONS.UTILITY_PROVIDERS_EDIT)) {
        throw new Error("You don't have permission to edit utility providers");
      }

      // Filter out undefined values
      const updateData = Object.fromEntries(
        Object.entries(providerData)
          .filter(([_, value]) => value !== undefined)
      );

      const { data, error } = await supabase
        .from('utility_providers')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        } as any)
        .eq('provider_id', providerId)
        .select()
        .single();

      if (error) {
        console.error('❌ [UtilityProviders] Update failed:', error);
        throw error;
      }

      console.log('✅ [UtilityProviders] Provider updated:', providerId);

      await logActivity('UTILITY_PROVIDER_UPDATED', {
        providerId,
        updatedFields: Object.keys(updateData)
      });

      return data;
    },
    onSuccess: async () => {
      console.log('✅ [UtilityProviders] Update succeeded, refreshing list...');

      const freshData = await fetchUtilityProviders();
      queryClient.setQueryData(utilityProviderKeys.lists(), freshData);

      await queryClient.invalidateQueries({
        queryKey: utilityProviderKeys.lists(),
        refetchType: 'all'
      });

      toast({
        title: "Success",
        description: "Utility provider updated successfully",
      });
    },
    onError: (error) => {
      console.error('❌ [UtilityProviders] Update error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update utility provider",
        variant: "destructive",
      });
    },
  });

  // Delete utility provider mutation
  const deleteProviderMutation = useMutation({
    retry: 1,
    retryDelay: 1000,
    mutationFn: async (providerId: string) => {
      const provider = providers.find(p => p.provider_id === providerId);

      console.log('🗑️ [UtilityProviders] Deleting provider:', providerId);

      // Check permission
      if (!hasPermission(PERMISSIONS.UTILITY_PROVIDERS_DELETE)) {
        console.error('❌ [UtilityProviders] Permission denied for provider deletion');
        throw new Error("You don't have permission to delete utility providers");
      }

      const { error } = await supabase
        .from('utility_providers')
        .delete()
        .eq('provider_id', providerId);

      if (error) {
        console.error('❌ [UtilityProviders] Deletion failed:', error);
        throw error;
      }

      console.log('✅ [UtilityProviders] Provider deleted:', providerId);

      await logActivity('UTILITY_PROVIDER_DELETED', {
        providerId,
        providerName: provider?.provider_name
      });

      return providerId;
    },
    onSuccess: async () => {
      console.log('✅ [UtilityProviders] Deletion succeeded, refreshing list...');

      const freshData = await fetchUtilityProviders();
      queryClient.setQueryData(utilityProviderKeys.lists(), freshData);

      await queryClient.invalidateQueries({
        queryKey: utilityProviderKeys.lists(),
        refetchType: 'all'
      });

      toast({
        title: "Success",
        description: "Utility provider deleted successfully",
      });
    },
    onError: (error) => {
      console.error('❌ [UtilityProviders] Deletion error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete utility provider",
        variant: "destructive",
      });
    },
  });

  return {
    providers,
    loading,
    isFetching,
    error: providersError,
    createProvider: createProviderMutation.mutateAsync,
    updateProvider: (providerId: string, providerData: Partial<UtilityProviderInsert>) =>
      updateProviderMutation.mutateAsync({ providerId, providerData }),
    deleteProvider: deleteProviderMutation.mutateAsync,
    refetch,
    // Mutation states for UI feedback
    isCreating: createProviderMutation.isPending,
    isUpdating: updateProviderMutation.isPending,
    isDeleting: deleteProviderMutation.isPending,
  };
}

// Hook for fetching a single utility provider with full details
export function useUtilityProviderDetail(providerId: string | undefined) {
  const queryClient = useQueryClient();

  const {
    data: provider,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: utilityProviderKeys.detail(providerId || ''),
    queryFn: () => fetchUtilityProviderDetail(providerId!),
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  return {
    provider,
    loading: isLoading,
    isFetching,
    error,
    refetch,
  };
}
