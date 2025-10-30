import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

/**
 * Hook for managing profile images with proper caching
 *
 * Features:
 * - Caches profile images using React Query
 * - Shares cache across all components
 * - Automatically updates when profile changes
 * - Provides loading and error states
 * - Preloads images for better UX
 */

// Query key for profile image caching
export const profileImageKeys = {
  all: ['profile-image'] as const,
  byUserId: (userId: string) => [...profileImageKeys.all, userId] as const,
  byUrl: (url: string) => [...profileImageKeys.all, 'url', url] as const,
};

interface ProfileImageState {
  /** The cached image URL (with cache-busting parameter if needed) */
  imageUrl: string | null;
  /** Whether the image is currently loading */
  isLoading: boolean;
  /** Whether there was an error loading the image */
  hasError: boolean;
  /** Function to force refresh the image */
  refresh: () => void;
}

/**
 * Preload an image by creating an Image object
 * This helps avoid flashing/flickering when the image loads
 */
const preloadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
};

/**
 * Custom hook for managing profile images with caching
 *
 * @param userId - Optional user ID (defaults to current logged-in user)
 * @returns Profile image state and helpers
 */
export function useProfileImage(userId?: string): ProfileImageState {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [hasError, setHasError] = useState(false);

  // Use provided userId or fall back to current user
  const targetUserId = userId || profile?.user_id;
  const photoUrl = profile?.photo_url;

  // React Query for image caching
  const {
    data: cachedImageUrl,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: profileImageKeys.byUserId(targetUserId || ''),
    queryFn: async () => {
      if (!photoUrl) return null;

      // Preload the image to ensure it's cached
      try {
        await preloadImage(photoUrl);
        setHasError(false);
        return photoUrl;
      } catch (error) {
        console.error('Failed to preload profile image:', error);
        setHasError(true);
        return null;
      }
    },
    enabled: !!targetUserId && !!photoUrl,
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch if data is fresh
    retry: 2, // Retry failed requests twice
  });

  // Update cache when profile photo_url changes
  useEffect(() => {
    if (photoUrl && targetUserId) {
      // Invalidate and refetch when URL changes
      queryClient.invalidateQueries({
        queryKey: profileImageKeys.byUserId(targetUserId),
      });
    }
  }, [photoUrl, targetUserId, queryClient]);

  return {
    imageUrl: cachedImageUrl || null,
    isLoading,
    hasError,
    refresh: () => {
      refetch();
      setHasError(false);
    },
  };
}

/**
 * Manually update the profile image cache
 * Useful for optimistic updates after uploading a new image
 */
export function updateProfileImageCache(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  newImageUrl: string
) {
  queryClient.setQueryData(
    profileImageKeys.byUserId(userId),
    newImageUrl
  );

  // Preload the new image
  preloadImage(newImageUrl).catch(console.error);
}
