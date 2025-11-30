import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Provider, ProviderInsert } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";

// Query keys for cache management
export const providerKeys = {
  all: () => ['providers'],
  lists: () => ['providers', 'list'],
  list: (filters?: { category?: 'service' | 'utility' }) =>
    ['providers', 'list', ...(filters ? [JSON.stringify(filters)] : [])],
  details: () => ['providers', 'detail'],
  detail: (id: string) => ['providers', 'detail', id],
} as const;

// Fetch providers list with optional category filter
const fetchProviders = async (category?: 'service' | 'utility'): Promise<Provider[]> => {
  console.log(`🔍 [Providers] Fetching providers${category ? ` (category: ${category})` : ''}...`);

  let query = supabase
    .from('providers')
    .select(`
      *,
      created_user:users!providers_created_by_fkey(
        user_id,
        first_name,
        last_name,
        email
      )
    `);

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query.order('provider_name', { ascending: true });

  if (error) {
    console.error('❌ [Providers] Fetch error:', error);
    throw error;
  }

  console.log('✅ [Providers] Fetched:', data?.length || 0, 'providers');
  return (data || []) as Provider[];
};

// Fetch single provider with full details
const fetchProviderDetail = async (providerId: string): Promise<Provider> => {
  console.log('🔍 [Providers] Fetching provider detail for:', providerId);

  const { data, error } = await supabase
    .from('providers')
    .select(`
      *,
      created_user:users!providers_created_by_fkey(
        user_id,
        first_name,
        last_name,
        email
      ),
      documents:provider_documents(*),
      reviews:provider_reviews(
        *,
        reviewer:users!provider_reviews_reviewer_id_fkey(
          user_id,
          first_name,
          last_name
        )
      )
    `)
    .eq('provider_id', providerId)
    .single();

  if (error) {
    console.error('❌ [Providers] Detail fetch error:', error);
    throw error;
  }

  console.log('✅ [Providers] Provider detail fetched:', data);
  return data as Provider;
};

export function useProviders(category?: 'service' | 'utility') {
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  // Providers query - NO CACHING
  const {
    data: providers = [],
    isLoading: loading,
    isFetching,
    error: providersError,
    refetch,
  } = useQuery({
    queryKey: providerKeys.list(category ? { category } : undefined),
    queryFn: () => fetchProviders(category),
    staleTime: 0, // No caching
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Create provider mutation
  const createProviderMutation = useMutation({
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    mutationFn: async (providerData: ProviderInsert) => {
      console.log('🏢 [Providers] Creating provider:', providerData.provider_name);

      // Check permission based on category
      const permission = providerData.category === 'service'
        ? PERMISSIONS.SERVICE_PROVIDERS_CREATE
        : PERMISSIONS.UTILITY_PROVIDERS_CREATE;

      if (!hasPermission(permission)) {
        console.error('❌ [Providers] Permission denied for provider creation');
        throw new Error("You don't have permission to create providers");
      }

      console.log('✅ [Providers] Permission granted for creation');

      // Create the provider
      const { data: provider, error } = await supabase
        .from('providers')
        .insert([providerData as any])
        .select()
        .single();

      if (error) {
        console.error('❌ [Providers] Creation failed:', error);
        throw error;
      }

      console.log('✅ [Providers] Provider created:', provider.provider_id);

      await logActivity('PROVIDER_CREATED', {
        providerId: provider.provider_id,
        providerName: provider.provider_name,
        category: provider.category,
        providerType: provider.provider_type,
      });

      return provider;
    },
    onSuccess: async (data) => {
      console.log('✅ [Providers] Creation succeeded, refreshing list...');

      // Refresh all provider lists
      const freshData = await fetchProviders(category);
      queryClient.setQueryData(providerKeys.list(category ? { category } : undefined), freshData);

      // Invalidate all provider queries to ensure consistency
      await queryClient.invalidateQueries({
        queryKey: providerKeys.lists(),
        refetchType: 'all'
      });

      toast({
        title: "Success",
        description: `Provider "${data.provider_name}" created successfully`,
      });
    },
    onError: (error) => {
      console.error('❌ [Providers] Creation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create provider",
        variant: "destructive",
      });
    },
  });

  // Update provider mutation
  const updateProviderMutation = useMutation({
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    mutationFn: async ({ providerId, providerData }: {
      providerId: string;
      providerData: Partial<ProviderInsert>;
    }) => {
      console.log('📝 [Providers] Updating provider:', providerId);

      // Check permission based on category if provided
      if (providerData.category) {
        const permission = providerData.category === 'service'
          ? PERMISSIONS.SERVICE_PROVIDERS_EDIT
          : PERMISSIONS.UTILITY_PROVIDERS_EDIT;

        if (!hasPermission(permission)) {
          throw new Error("You don't have permission to edit providers");
        }
      }

      // Filter out undefined values
      const updateData = Object.fromEntries(
        Object.entries(providerData)
          .filter(([_, value]) => value !== undefined)
      );

      const { data, error } = await supabase
        .from('providers')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        } as any)
        .eq('provider_id', providerId)
        .select()
        .single();

      if (error) {
        console.error('❌ [Providers] Update failed:', error);
        throw error;
      }

      console.log('✅ [Providers] Provider updated:', providerId);

      await logActivity('PROVIDER_UPDATED', {
        providerId,
        updatedFields: Object.keys(updateData)
      });

      return data;
    },
    onSuccess: async () => {
      console.log('✅ [Providers] Update succeeded, refreshing list...');

      const freshData = await fetchProviders(category);
      queryClient.setQueryData(providerKeys.list(category ? { category } : undefined), freshData);

      await queryClient.invalidateQueries({
        queryKey: providerKeys.lists(),
        refetchType: 'all'
      });

      toast({
        title: "Success",
        description: "Provider updated successfully",
      });
    },
    onError: (error) => {
      console.error('❌ [Providers] Update error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update provider",
        variant: "destructive",
      });
    },
  });

  // Delete provider mutation
  const deleteProviderMutation = useMutation({
    retry: 1,
    retryDelay: 1000,
    mutationFn: async (providerId: string) => {
      const provider = providers.find(p => p.provider_id === providerId);

      console.log('🗑️ [Providers] Deleting provider:', providerId);

      // Check permission based on provider category
      if (provider) {
        const permission = provider.category === 'service'
          ? PERMISSIONS.SERVICE_PROVIDERS_DELETE
          : PERMISSIONS.UTILITY_PROVIDERS_DELETE;

        if (!hasPermission(permission)) {
          console.error('❌ [Providers] Permission denied for provider deletion');
          throw new Error("You don't have permission to delete providers");
        }
      }

      const { error } = await supabase
        .from('providers')
        .delete()
        .eq('provider_id', providerId);

      if (error) {
        console.error('❌ [Providers] Deletion failed:', error);
        throw error;
      }

      console.log('✅ [Providers] Provider deleted:', providerId);

      await logActivity('PROVIDER_DELETED', {
        providerId,
        providerName: provider?.provider_name,
        category: provider?.category
      });

      return providerId;
    },
    onSuccess: async () => {
      console.log('✅ [Providers] Deletion succeeded, refreshing list...');

      const freshData = await fetchProviders(category);
      queryClient.setQueryData(providerKeys.list(category ? { category } : undefined), freshData);

      await queryClient.invalidateQueries({
        queryKey: providerKeys.lists(),
        refetchType: 'all'
      });

      toast({
        title: "Success",
        description: "Provider deleted successfully",
      });
    },
    onError: (error) => {
      console.error('❌ [Providers] Deletion error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete provider",
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
    updateProvider: (providerId: string, providerData: Partial<ProviderInsert>) =>
      updateProviderMutation.mutateAsync({ providerId, providerData }),
    deleteProvider: deleteProviderMutation.mutateAsync,
    refetch,
    // Mutation states for UI feedback
    isCreating: createProviderMutation.isPending,
    isUpdating: updateProviderMutation.isPending,
    isDeleting: deleteProviderMutation.isPending,
  };
}

// Hook for fetching a single provider with full details
export function useProviderDetail(providerId: string | undefined) {
  const {
    data: provider,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: providerKeys.detail(providerId || ''),
    queryFn: () => fetchProviderDetail(providerId!),
    enabled: !!providerId,
    staleTime: 0,
    gcTime: 0,
    retry: 2,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  return {
    provider,
    loading: isLoading,
    isFetching,
    error,
    refetch,
  };
}
