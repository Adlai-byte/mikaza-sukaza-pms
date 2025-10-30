import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PropertyImage, PropertyImageWithDetails, MediaFilters } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// Query keys for cache management
export const mediaKeys = {
  all: () => ['media'] as const,
  lists: () => ['media', 'list'] as const,
  list: (filters?: MediaFilters) => ['media', 'list', ...(filters ? [JSON.stringify(filters)] : [])] as const,
  details: () => ['media', 'detail'] as const,
  detail: (id: string) => ['media', 'detail', id] as const,
  property: (propertyId: string) => ['media', 'property', propertyId] as const,
  stats: () => ['media', 'stats'] as const,
  storageSize: () => ['media', 'storage-size'] as const,
} as const;

// Fetch all media with optional filters
const fetchMedia = async (filters?: MediaFilters): Promise<PropertyImageWithDetails[]> => {
  console.log('🖼️ [Media] Fetching media', filters ? `with filters: ${JSON.stringify(filters)}` : '');

  let query = supabase
    .from('property_images')
    .select(`
      *,
      property:properties(property_id, property_name, property_type)
    `)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters?.property_id) {
    query = query.eq('property_id', filters.property_id);
  }
  if (filters?.is_primary !== undefined) {
    query = query.eq('is_primary', filters.is_primary);
  }
  if (filters?.search) {
    query = query.or(`image_title.ilike.%${filters.search}%,image_description.ilike.%${filters.search}%`);
  }
  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ [Media] Fetch error:', error);
    throw error;
  }

  console.log('✅ [Media] Fetched:', data?.length || 0, 'images');
  return (data || []) as PropertyImageWithDetails[];
};

// Fetch single media detail
const fetchMediaDetail = async (imageId: string): Promise<PropertyImageWithDetails> => {
  console.log('🖼️ [Media] Fetching media detail:', imageId);

  const { data, error } = await supabase
    .from('property_images')
    .select(`
      *,
      property:properties(property_id, property_name, property_type)
    `)
    .eq('image_id', imageId)
    .single();

  if (error) {
    console.error('❌ [Media] Detail fetch error:', error);
    throw error;
  }

  console.log('✅ [Media] Fetched media detail');
  return data as PropertyImageWithDetails;
};

// Upload media to storage and create database record
const uploadMedia = async (file: File, metadata: Partial<PropertyImage>): Promise<PropertyImage> => {
  console.log('📤 [Media] Uploading media:', file.name);

  // 1. Upload file to Supabase Storage
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `property-images/${metadata.property_id}/${fileName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('property-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    console.error('❌ [Media] Upload error:', uploadError);
    throw uploadError;
  }

  // 2. Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('property-images')
    .getPublicUrl(filePath);

  // 3. Create database record
  const { data: imageData, error: dbError } = await supabase
    .from('property_images')
    .insert({
      property_id: metadata.property_id,
      image_url: publicUrl,
      image_title: metadata.image_title || file.name,
      image_description: metadata.image_description,
      is_primary: metadata.is_primary || false,
      display_order: metadata.display_order || 0,
      tags: metadata.tags || [],
    })
    .select()
    .single();

  if (dbError) {
    console.error('❌ [Media] Database insert error:', dbError);
    // Attempt to clean up uploaded file
    await supabase.storage.from('property-images').remove([filePath]);
    throw dbError;
  }

  console.log('✅ [Media] Upload complete');
  return imageData as PropertyImage;
};

// Update media metadata
const updateMedia = async (imageId: string, updates: Partial<PropertyImage>): Promise<PropertyImage> => {
  console.log('✏️ [Media] Updating media:', imageId);

  const { data, error } = await supabase
    .from('property_images')
    .update({
      image_title: updates.image_title,
      image_description: updates.image_description,
      is_primary: updates.is_primary,
      display_order: updates.display_order,
      tags: updates.tags,
      updated_at: new Date().toISOString(),
    })
    .eq('image_id', imageId)
    .select()
    .single();

  if (error) {
    console.error('❌ [Media] Update error:', error);
    throw error;
  }

  console.log('✅ [Media] Update complete');
  return data as PropertyImage;
};

// Delete media
const deleteMedia = async (imageId: string): Promise<void> => {
  console.log('🗑️ [Media] Deleting media:', imageId);

  // 1. Get image details to find storage path
  const { data: image } = await supabase
    .from('property_images')
    .select('image_url')
    .eq('image_id', imageId)
    .single();

  // 2. Delete database record
  const { error: dbError } = await supabase
    .from('property_images')
    .delete()
    .eq('image_id', imageId);

  if (dbError) {
    console.error('❌ [Media] Delete error:', dbError);
    throw dbError;
  }

  // 3. Delete file from storage (if image exists)
  if (image?.image_url) {
    try {
      // Extract path from URL
      const url = new URL(image.image_url);
      const pathMatch = url.pathname.match(/property-images\/.+/);
      if (pathMatch) {
        await supabase.storage.from('property-images').remove([pathMatch[0].replace('property-images/', '')]);
      }
    } catch (err) {
      console.warn('⚠️ [Media] Could not delete storage file:', err);
      // Don't throw - database record is already deleted
    }
  }

  console.log('✅ [Media] Delete complete');
};

// Set primary image
const setPrimaryImage = async (propertyId: string, imageId: string): Promise<void> => {
  console.log('⭐ [Media] Setting primary image:', imageId, 'for property:', propertyId);

  // 1. Unset all current primary images for this property
  await supabase
    .from('property_images')
    .update({ is_primary: false })
    .eq('property_id', propertyId);

  // 2. Set new primary image
  const { error } = await supabase
    .from('property_images')
    .update({ is_primary: true })
    .eq('image_id', imageId);

  if (error) {
    console.error('❌ [Media] Set primary error:', error);
    throw error;
  }

  console.log('✅ [Media] Primary image set');
};

// Hook: Fetch media list
export function useMedia(filters?: MediaFilters) {
  return useQuery({
    queryKey: mediaKeys.list(filters),
    queryFn: () => fetchMedia(filters),
  });
}

// Hook: Fetch single media
export function useMediaDetail(imageId: string) {
  return useQuery({
    queryKey: mediaKeys.detail(imageId),
    queryFn: () => fetchMediaDetail(imageId),
    enabled: !!imageId,
  });
}

// Hook: Upload media
export function useUploadMedia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ file, metadata }: { file: File; metadata: Partial<PropertyImage> }) =>
      uploadMedia(file, metadata),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    },
    onError: (error) => {
      console.error('Upload media error:', error);
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    },
  });
}

// Hook: Update media
export function useUpdateMedia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ imageId, updates }: { imageId: string; updates: Partial<PropertyImage> }) =>
      updateMedia(imageId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      toast({
        title: "Success",
        description: "Image updated successfully",
      });
    },
    onError: (error) => {
      console.error('Update media error:', error);
      toast({
        title: "Error",
        description: "Failed to update image. Please try again.",
        variant: "destructive",
      });
    },
  });
}

// Hook: Delete media
export function useDeleteMedia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (imageId: string) => deleteMedia(imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      toast({
        title: "Success",
        description: "Image deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Delete media error:', error);
      toast({
        title: "Error",
        description: "Failed to delete image. Please try again.",
        variant: "destructive",
      });
    },
  });
}

// Hook: Set primary image
export function useSetPrimaryImage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ propertyId, imageId }: { propertyId: string; imageId: string }) =>
      setPrimaryImage(propertyId, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      toast({
        title: "Success",
        description: "Primary image set successfully",
      });
    },
    onError: (error) => {
      console.error('Set primary image error:', error);
      toast({
        title: "Error",
        description: "Failed to set primary image. Please try again.",
        variant: "destructive",
      });
    },
  });
}

// Hook: Bulk delete
export function useBulkDeleteMedia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (imageIds: string[]) => {
      await Promise.all(imageIds.map(id => deleteMedia(id)));
    },
    onSuccess: (_, imageIds) => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      queryClient.invalidateQueries({ queryKey: mediaKeys.storageSize() });
      toast({
        title: "Success",
        description: `${imageIds.length} image(s) deleted successfully`,
      });
    },
    onError: (error) => {
      console.error('Bulk delete media error:', error);
      toast({
        title: "Error",
        description: "Failed to delete images. Please try again.",
        variant: "destructive",
      });
    },
  });
}

// Fetch storage usage stats
const fetchStorageSize = async (): Promise<{ totalSize: number; fileCount: number }> => {
  console.log('💾 [Media] Fetching storage size');

  try {
    // List all files in the bucket
    const { data: files, error } = await supabase.storage
      .from('property-images')
      .list('', {
        limit: 1000,
        offset: 0,
      });

    if (error) {
      console.error('❌ [Media] Storage list error:', error);
      throw error;
    }

    // Calculate total size from metadata
    const totalSize = (files || []).reduce((sum, file) => {
      return sum + (file.metadata?.size || 0);
    }, 0);

    console.log('✅ [Media] Storage size:', totalSize, 'bytes,', files?.length || 0, 'files');
    return {
      totalSize,
      fileCount: files?.length || 0,
    };
  } catch (error) {
    console.error('❌ [Media] Failed to fetch storage size:', error);
    return { totalSize: 0, fileCount: 0 };
  }
};

// Hook: Get storage usage stats
export function useStorageSize() {
  return useQuery({
    queryKey: mediaKeys.storageSize(),
    queryFn: fetchStorageSize,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

// Helper function to format bytes to human-readable size
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
