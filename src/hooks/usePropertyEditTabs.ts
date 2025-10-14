import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Query keys for property edit tabs
export const propertyEditKeys = {
  all: (propertyId: string) => ['propertyEdit', propertyId] as const,
  providers: (propertyId: string) => [...propertyEditKeys.all(propertyId), 'providers'] as const,
  photos: (propertyId: string) => [...propertyEditKeys.all(propertyId), 'photos'] as const,
  vehicles: (propertyId: string) => [...propertyEditKeys.all(propertyId), 'vehicles'] as const,
  owners: (propertyId: string) => [...propertyEditKeys.all(propertyId), 'owners'] as const,
  financial: (propertyId: string) => [...propertyEditKeys.all(propertyId), 'financial'] as const,
  checklists: (propertyId: string) => [...propertyEditKeys.all(propertyId), 'checklists'] as const,
  booking: (propertyId: string) => [...propertyEditKeys.all(propertyId), 'booking'] as const,
  notes: (propertyId: string) => [...propertyEditKeys.all(propertyId), 'notes'] as const,
};

// Provider types
interface Provider {
  provider_id: string;
  property_id: string;
  provider_name: string;
  provider_type: string;
  phone_number?: string;
  account_number?: string;
  billing_name?: string;
  website?: string;
  username?: string;
  password?: string;
  observations?: string;
  created_at?: string;
}

// Photo types
interface Photo {
  image_id: string;
  property_id: string;
  image_url: string;
  image_title?: string;
  is_primary: boolean;
  created_at?: string;
}

// Fetch providers
const fetchProviders = async (propertyId: string): Promise<Provider[]> => {
  const { data, error } = await supabase
    .from('property_providers')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

// Fetch photos
const fetchPhotos = async (propertyId: string): Promise<Photo[]> => {
  console.log('🖼️ [PhotosTab] fetchPhotos called:', { propertyId });

  const { data, error } = await supabase
    .from('property_images')
    .select('*')
    .eq('property_id', propertyId)
    .order('is_primary', { ascending: false });

  if (error) {
    console.error('❌ [PhotosTab] fetchPhotos error:', error);
    throw error;
  }

  console.log('✅ [PhotosTab] fetchPhotos success:', {
    count: data?.length || 0,
    photos: data
  });

  return data || [];
};

// Hook for providers
export function usePropertyProviders(propertyId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: providers = [],
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: propertyEditKeys.providers(propertyId),
    queryFn: () => fetchProviders(propertyId),
    enabled: !!propertyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const createProviderMutation = useMutation({
    mutationFn: async (providerData: Omit<Provider, 'provider_id' | 'created_at' | 'property_id'>) => {
      console.log('🛠️ [Providers] createProvider mutationFn called with:', { providerData, propertyId });
      const { data, error } = await supabase
        .from('property_providers')
        .insert([{ ...providerData, property_id: propertyId }])
        .select()
        .single();

      if (error) {
        console.error('❌ [Providers] createProvider supabase error:', error);
        throw error;
      }

      console.log('✅ [Providers] createProvider supabase success:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyEditKeys.providers(propertyId) });
      toast({
        title: "Success",
        description: "Provider created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create provider",
        variant: "destructive",
      });
    },
  });

  const updateProviderMutation = useMutation({
    mutationFn: async ({ providerId, updates }: { providerId: string; updates: Partial<Provider> }) => {
      console.log('🛠️ [Providers] updateProvider mutationFn called with:', { providerId, updates });
      const { data, error } = await supabase
        .from('property_providers')
        .update(updates)
        .eq('provider_id', providerId)
        .select()
        .single();

      if (error) {
        console.error('❌ [Providers] updateProvider supabase error:', error);
        throw error;
      }

      console.log('✅ [Providers] updateProvider supabase success:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyEditKeys.providers(propertyId) });
      toast({
        title: "Success",
        description: "Provider updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update provider",
        variant: "destructive",
      });
    },
  });

  const deleteProviderMutation = useMutation({
    mutationFn: async (providerId: string) => {
      console.log('🗑️ [Providers] deleteProvider mutationFn called for:', providerId);
      const { data, error } = await supabase
        .from('property_providers')
        .delete()
        .eq('provider_id', providerId)
        .select();

      if (error) {
        console.error('❌ [Providers] deleteProvider supabase error:', error);
        throw error;
      }

      console.log('✅ [Providers] deleteProvider supabase success:', data);
      return providerId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyEditKeys.providers(propertyId) });
      toast({
        title: "Success",
        description: "Provider deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete provider",
        variant: "destructive",
      });
    },
  });

  // ❌ REMOVED: Toast in render body (causes infinite loops)
  // Error handling moved to component level with useEffect

  return {
    providers,
    isLoading,
    isFetching,
    error, // ✅ Return error to component for proper handling
    createProvider: createProviderMutation.mutate,
    updateProvider: updateProviderMutation.mutate,
    deleteProvider: deleteProviderMutation.mutate,
    isCreating: createProviderMutation.isPending,
    isUpdating: updateProviderMutation.isPending,
    isDeleting: deleteProviderMutation.isPending,
  };
}

// Hook for photos
export function usePropertyPhotos(propertyId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: photos = [],
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: propertyEditKeys.photos(propertyId),
    queryFn: () => {
      console.log('🔄 [PhotosTab] useQuery queryFn triggered:', { propertyId });
      return fetchPhotos(propertyId);
    },
    enabled: !!propertyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const createPhotoMutation = useMutation({
    mutationFn: async (photoData: Omit<Photo, 'image_id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('property_images')
        .insert([{ ...photoData, property_id: propertyId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyEditKeys.photos(propertyId) });
      toast({
        title: "Success",
        description: "Photo uploaded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload photo",
        variant: "destructive",
      });
    },
  });

  const updatePhotoMutation = useMutation({
    mutationFn: async ({ photoId, updates }: { photoId: string; updates: Partial<Photo> }) => {
      const { data, error } = await supabase
        .from('property_images')
        .update(updates)
        .eq('image_id', photoId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyEditKeys.photos(propertyId) });
      toast({
        title: "Success",
        description: "Photo updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update photo",
        variant: "destructive",
      });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      const { error } = await supabase
        .from('property_images')
        .delete()
        .eq('image_id', photoId);

      if (error) throw error;
      return photoId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyEditKeys.photos(propertyId) });
      toast({
        title: "Success",
        description: "Photo deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete photo",
        variant: "destructive",
      });
    },
  });

  const setPrimaryPhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      // First, set all photos to non-primary
      await supabase
        .from('property_images')
        .update({ is_primary: false })
        .eq('property_id', propertyId);

      // Then set the selected photo as primary
      const { data, error } = await supabase
        .from('property_images')
        .update({ is_primary: true })
        .eq('image_id', photoId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyEditKeys.photos(propertyId) });
      toast({
        title: "Success",
        description: "Primary photo updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set primary photo",
        variant: "destructive",
      });
    },
  });

  // ❌ REMOVED: Toast in render body (causes infinite loops)
  // Error handling moved to component level with useEffect

  return {
    photos,
    isLoading,
    isFetching,
    error, // ✅ Return error to component for proper handling
    createPhoto: createPhotoMutation.mutate,
    updatePhoto: updatePhotoMutation.mutate,
    deletePhoto: deletePhotoMutation.mutate,
    setPrimaryPhoto: setPrimaryPhotoMutation.mutate,
    isUploading: createPhotoMutation.isPending,
    isUpdating: updatePhotoMutation.isPending,
    isDeleting: deletePhotoMutation.isPending,
    isSettingPrimary: setPrimaryPhotoMutation.isPending,
  };
}