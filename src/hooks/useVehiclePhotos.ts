import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { VehiclePhoto, VehiclePhotoInsert } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Query keys
export const vehiclePhotoKeys = {
  all: (vehicleId: string) => ['vehicle-photos', vehicleId] as const,
  primary: (vehicleId: string) => ['vehicle-photos', vehicleId, 'primary'] as const,
};

// Fetch vehicle photos
const fetchVehiclePhotos = async (vehicleId: string): Promise<VehiclePhoto[]> => {
  console.log('🖼️ [VehiclePhotos] Fetching photos for vehicle:', vehicleId);

  const { data, error } = await supabase
    .from('vehicle_photos')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('❌ [VehiclePhotos] Fetch error:', error);
    throw error;
  }

  console.log('✅ [VehiclePhotos] Fetched:', data?.length || 0, 'photos');
  return (data || []) as VehiclePhoto[];
};

// Upload photo to storage
const uploadPhotoToStorage = async (file: File, vehicleId: string): Promise<string> => {
  console.log('📤 [VehiclePhotos] Uploading photo for vehicle:', vehicleId);

  // Create filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${vehicleId}/${Date.now()}.${fileExt}`;
  const filePath = `vehicles/${fileName}`;

  // Upload to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('property-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('❌ [VehiclePhotos] Upload error:', uploadError);
    throw uploadError;
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('property-images')
    .getPublicUrl(filePath);

  console.log('✅ [VehiclePhotos] Photo uploaded:', publicUrl);
  return publicUrl;
};

// Hook for managing vehicle photos
export function useVehiclePhotos(vehicleId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const currentUserId = profile?.user_id || user?.id;

  // Fetch photos query
  const {
    data: photos = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: vehiclePhotoKeys.all(vehicleId),
    queryFn: () => fetchVehiclePhotos(vehicleId),
    enabled: !!vehicleId,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnMount: true,
  });

  // Upload photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ file, photoTitle }: { file: File; photoTitle?: string }) => {
      console.log('📸 [VehiclePhotos] Uploading photo:', file.name);

      // Upload file to storage
      const photoUrl = await uploadPhotoToStorage(file, vehicleId);

      // Create database record
      const photoData: VehiclePhotoInsert = {
        vehicle_id: vehicleId,
        photo_url: photoUrl,
        photo_title: photoTitle,
        is_primary: photos.length === 0, // First photo is primary by default
        display_order: photos.length,
      };

      const { data, error } = await supabase
        .from('vehicle_photos')
        .insert([{ ...photoData, uploaded_by: currentUserId }])
        .select()
        .single();

      if (error) {
        console.error('❌ [VehiclePhotos] Database insert error:', error);
        throw error;
      }

      console.log('✅ [VehiclePhotos] Photo saved to database');
      return data as VehiclePhoto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehiclePhotoKeys.all(vehicleId) });
      toast({
        title: 'Photo Uploaded',
        description: 'Vehicle photo uploaded successfully',
      });
    },
    onError: (error: any) => {
      console.error('❌ [VehiclePhotos] Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload photo',
        variant: 'destructive',
      });
    },
  });

  // Update photo mutation
  const updatePhotoMutation = useMutation({
    mutationFn: async ({ photoId, updates }: { photoId: string; updates: Partial<VehiclePhotoInsert> }) => {
      console.log('📝 [VehiclePhotos] Updating photo:', photoId);

      const { data, error } = await supabase
        .from('vehicle_photos')
        .update(updates)
        .eq('photo_id', photoId)
        .select()
        .single();

      if (error) {
        console.error('❌ [VehiclePhotos] Update error:', error);
        throw error;
      }

      console.log('✅ [VehiclePhotos] Photo updated');
      return data as VehiclePhoto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehiclePhotoKeys.all(vehicleId) });
      toast({
        title: 'Success',
        description: 'Photo updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update photo',
        variant: 'destructive',
      });
    },
  });

  // Delete photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      console.log('🗑️ [VehiclePhotos] Deleting photo:', photoId);

      // Get photo data to delete from storage
      const photo = photos.find(p => p.photo_id === photoId);

      // Delete from database
      const { error } = await supabase
        .from('vehicle_photos')
        .delete()
        .eq('photo_id', photoId);

      if (error) {
        console.error('❌ [VehiclePhotos] Delete error:', error);
        throw error;
      }

      // Delete from storage
      if (photo?.photo_url) {
        try {
          const pathMatch = photo.photo_url.match(/vehicles\/.+/);
          if (pathMatch) {
            await supabase.storage
              .from('property-images')
              .remove([pathMatch[0]]);
          }
        } catch (storageError) {
          console.warn('⚠️ [VehiclePhotos] Storage deletion failed (non-critical):', storageError);
        }
      }

      console.log('✅ [VehiclePhotos] Photo deleted');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehiclePhotoKeys.all(vehicleId) });
      toast({
        title: 'Photo Deleted',
        description: 'Vehicle photo deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete photo',
        variant: 'destructive',
      });
    },
  });

  // Set primary photo mutation
  const setPrimaryPhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      console.log('⭐ [VehiclePhotos] Setting primary photo:', photoId);

      const { error } = await supabase.rpc('set_vehicle_primary_photo', {
        p_photo_id: photoId,
      });

      if (error) {
        console.error('❌ [VehiclePhotos] Set primary error:', error);
        throw error;
      }

      console.log('✅ [VehiclePhotos] Primary photo set');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehiclePhotoKeys.all(vehicleId) });
      toast({
        title: 'Success',
        description: 'Primary photo updated',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to set primary photo',
        variant: 'destructive',
      });
    },
  });

  // Get primary photo
  const primaryPhoto = photos.find(p => p.is_primary);

  return {
    photos,
    primaryPhoto,
    isLoading,
    isFetching,
    error,
    refetch,
    uploadPhoto: uploadPhotoMutation.mutateAsync,
    updatePhoto: updatePhotoMutation.mutateAsync,
    deletePhoto: deletePhotoMutation.mutateAsync,
    setPrimaryPhoto: setPrimaryPhotoMutation.mutateAsync,
    isUploading: uploadPhotoMutation.isPending,
    isUpdating: updatePhotoMutation.isPending,
    isDeleting: deletePhotoMutation.isPending,
    isSettingPrimary: setPrimaryPhotoMutation.isPending,
  };
}
