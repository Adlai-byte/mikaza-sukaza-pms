import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ServiceProvider, ServiceProviderInsert } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";

// Query keys for cache management
export const serviceProviderKeys = {
  all: () => ['service_providers'],
  lists: () => ['service_providers', 'list'],
  list: (filters?: { showInactive?: boolean }) => ['service_providers', 'list', ...(filters ? [JSON.stringify(filters)] : [])],
  details: () => ['service_providers', 'detail'],
  detail: (id: string) => ['service_providers', 'detail', id],
} as const;

// Fetch service providers list with optional inactive filter
const fetchServiceProviders = async (showInactive: boolean = false): Promise<ServiceProvider[]> => {
  console.log(`🔍 [ServiceProviders] Fetching service providers list${showInactive ? ' (including inactive)' : ''}...`);

  let query = supabase
    .from('service_providers')
    .select(`
      *,
      created_user:users!service_providers_created_by_fkey(
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

  const { data, error } = await query.order('company_name', { ascending: true });

  if (error) {
    console.error('❌ [ServiceProviders] Fetch error:', error);
    throw error;
  }

  console.log('✅ [ServiceProviders] Fetched:', data?.length || 0, 'providers');
  return (data || []) as ServiceProvider[];
};

// Fetch single service provider with full details
const fetchServiceProviderDetail = async (providerId: string): Promise<ServiceProvider> => {
  console.log('🔍 [ServiceProviders] Fetching provider detail for:', providerId);

  const { data, error } = await supabase
    .from('service_providers')
    .select(`
      *,
      created_user:users!service_providers_created_by_fkey(
        user_id,
        first_name,
        last_name,
        email
      ),
      documents:service_provider_documents(*),
      reviews:service_provider_reviews(
        *,
        reviewer:users!service_provider_reviews_reviewer_id_fkey(
          user_id,
          first_name,
          last_name
        )
      )
    `)
    .eq('provider_id', providerId)
    .single();

  if (error) {
    console.error('❌ [ServiceProviders] Detail fetch error:', error);
    throw error;
  }

  console.log('✅ [ServiceProviders] Provider detail fetched:', data);
  return data as ServiceProvider;
};

export function useServiceProviders(showInactive: boolean = false) {
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  // Service providers query
  const {
    data: providers = [],
    isLoading: loading,
    isFetching,
    error: providersError,
    refetch,
  } = useQuery({
    queryKey: serviceProviderKeys.list({ showInactive }),
    queryFn: () => fetchServiceProviders(showInactive),
    // Enable caching - realtime subscriptions will invalidate when data changes
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  // Create service provider mutation
  const createProviderMutation = useMutation({
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    mutationFn: async (providerData: ServiceProviderInsert) => {
      console.log('🏢 [ServiceProviders] Creating provider:', providerData.company_name);

      // Check permission
      if (!hasPermission(PERMISSIONS.SERVICE_PROVIDERS_CREATE)) {
        console.error('❌ [ServiceProviders] Permission denied for provider creation');
        throw new Error("You don't have permission to create service providers");
      }

      console.log('✅ [ServiceProviders] Permission granted for creation');

      // Create the service provider
      const { data: provider, error } = await supabase
        .from('service_providers')
        .insert([providerData as any])
        .select()
        .single();

      if (error) {
        console.error('❌ [ServiceProviders] Creation failed:', error);
        throw error;
      }

      console.log('✅ [ServiceProviders] Provider created:', provider.provider_id);

      await logActivity('SERVICE_PROVIDER_CREATED', {
        providerId: provider.provider_id,
        companyName: provider.company_name,
        serviceCategory: provider.service_category,
      });

      return provider;
    },
    onSuccess: async (data) => {
      console.log('✅ [ServiceProviders] Creation succeeded, refreshing list...');

      // Immediately fetch fresh data
      const freshData = await fetchServiceProviders();
      queryClient.setQueryData(serviceProviderKeys.lists(), freshData);

      // Invalidate to ensure consistency
      await queryClient.invalidateQueries({
        queryKey: serviceProviderKeys.lists(),
        refetchType: 'all'
      });

      toast({
        title: "Success",
        description: `Service provider "${data.company_name}" created successfully`,
      });
    },
    onError: (error) => {
      console.error('❌ [ServiceProviders] Creation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create service provider",
        variant: "destructive",
      });
    },
  });

  // Update service provider mutation
  const updateProviderMutation = useMutation({
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    mutationFn: async ({ providerId, providerData }: {
      providerId: string;
      providerData: Partial<ServiceProviderInsert>;
    }) => {
      console.log('📝 [ServiceProviders] Updating provider:', providerId);

      // Check permission
      if (!hasPermission(PERMISSIONS.SERVICE_PROVIDERS_EDIT)) {
        throw new Error("You don't have permission to edit service providers");
      }

      // Filter out undefined values
      const updateData = Object.fromEntries(
        Object.entries(providerData)
          .filter(([_, value]) => value !== undefined)
      );

      const { data, error } = await supabase
        .from('service_providers')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        } as any)
        .eq('provider_id', providerId)
        .select()
        .single();

      if (error) {
        console.error('❌ [ServiceProviders] Update failed:', error);
        throw error;
      }

      console.log('✅ [ServiceProviders] Provider updated:', providerId);

      await logActivity('SERVICE_PROVIDER_UPDATED', {
        providerId,
        updatedFields: Object.keys(updateData)
      });

      return data;
    },
    onSuccess: async () => {
      console.log('✅ [ServiceProviders] Update succeeded, refreshing list...');

      const freshData = await fetchServiceProviders();
      queryClient.setQueryData(serviceProviderKeys.lists(), freshData);

      await queryClient.invalidateQueries({
        queryKey: serviceProviderKeys.lists(),
        refetchType: 'all'
      });

      toast({
        title: "Success",
        description: "Service provider updated successfully",
      });
    },
    onError: (error) => {
      console.error('❌ [ServiceProviders] Update error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update service provider",
        variant: "destructive",
      });
    },
  });

  // Delete service provider mutation
  const deleteProviderMutation = useMutation({
    retry: 1,
    retryDelay: 1000,
    mutationFn: async (providerId: string) => {
      const provider = providers.find(p => p.provider_id === providerId);

      console.log('🗑️ [ServiceProviders] Deleting provider:', providerId);

      // Check permission
      if (!hasPermission(PERMISSIONS.SERVICE_PROVIDERS_DELETE)) {
        console.error('❌ [ServiceProviders] Permission denied for provider deletion');
        throw new Error("You don't have permission to delete service providers");
      }

      const { error } = await supabase
        .from('service_providers')
        .delete()
        .eq('provider_id', providerId);

      if (error) {
        console.error('❌ [ServiceProviders] Deletion failed:', error);
        throw error;
      }

      console.log('✅ [ServiceProviders] Provider deleted:', providerId);

      await logActivity('SERVICE_PROVIDER_DELETED', {
        providerId,
        companyName: provider?.company_name
      });

      return providerId;
    },
    onSuccess: async () => {
      console.log('✅ [ServiceProviders] Deletion succeeded, refreshing list...');

      const freshData = await fetchServiceProviders();
      queryClient.setQueryData(serviceProviderKeys.lists(), freshData);

      await queryClient.invalidateQueries({
        queryKey: serviceProviderKeys.lists(),
        refetchType: 'all'
      });

      toast({
        title: "Success",
        description: "Service provider deleted successfully",
      });
    },
    onError: (error) => {
      console.error('❌ [ServiceProviders] Deletion error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete service provider",
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
    updateProvider: (providerId: string, providerData: Partial<ServiceProviderInsert>) =>
      updateProviderMutation.mutateAsync({ providerId, providerData }),
    deleteProvider: deleteProviderMutation.mutateAsync,
    refetch,
    // Mutation states for UI feedback
    isCreating: createProviderMutation.isPending,
    isUpdating: updateProviderMutation.isPending,
    isDeleting: deleteProviderMutation.isPending,
  };
}

// Hook for fetching a single service provider with full details
export function useServiceProviderDetail(providerId: string | undefined) {
  const queryClient = useQueryClient();

  const {
    data: provider,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: serviceProviderKeys.detail(providerId || ''),
    queryFn: () => fetchServiceProviderDetail(providerId!),
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
