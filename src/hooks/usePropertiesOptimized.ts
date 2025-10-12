import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Property, PropertyInsert, Amenity, Rule } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { CACHE_CONFIG, OptimisticUpdates, getCacheManagers } from "@/lib/cache-manager";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";

// Query keys for cache management
export const propertyKeys = {
  all: ['properties'] as const,
  lists: () => [...propertyKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...propertyKeys.lists(), { filters }] as const,
  details: () => [...propertyKeys.all, 'detail'] as const,
  detail: (id: string) => [...propertyKeys.details(), id] as const,
  amenities: ['amenities'] as const,
  rules: ['rules'] as const,
};

// Fetch properties for LIST VIEW - lightweight query with only essential data
const fetchPropertiesList = async (): Promise<Property[]> => {
  console.log('🔍 Fetching properties list (optimized query)...');
  const { data, error } = await supabase
    .from('properties')
    .select(`
      property_id,
      owner_id,
      property_name,
      property_type,
      is_active,
      is_booking,
      is_pets_allowed,
      capacity,
      max_capacity,
      num_bedrooms,
      num_bathrooms,
      size_sqf,
      created_at,
      updated_at,
      owner:users!properties_owner_id_fkey(
        user_id,
        first_name,
        last_name,
        email
      ),
      location:property_location(
        city,
        address
      ),
      images:property_images(
        image_id,
        image_url,
        is_primary
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Properties list fetch error:', error);
    throw error;
  }

  console.log('✅ Fetched properties list:', data?.length || 0, 'properties (lightweight)');
  return (data || []) as Property[];
};

// Fetch single property with ALL details - for edit/detail view
const fetchPropertyDetail = async (propertyId: string): Promise<Property> => {
  console.log('🔍 Fetching property detail for:', propertyId);
  const { data, error } = await supabase
    .from('properties')
    .select(`
      property_id,
      owner_id,
      property_name,
      property_type,
      is_active,
      is_booking,
      is_pets_allowed,
      capacity,
      max_capacity,
      num_bedrooms,
      num_bathrooms,
      num_half_bath,
      num_wcs,
      num_kitchens,
      num_living_rooms,
      size_sqf,
      created_at,
      updated_at,
      owner:users!properties_owner_id_fkey(
        user_id,
        first_name,
        last_name,
        email
      ),
      location:property_location(*),
      communication:property_communication(*),
      access:property_access(*),
      extras:property_extras(*),
      units(*),
      images:property_images(*),
      amenities:property_amenities(
        amenities(*)
      ),
      rules:property_rules(
        rules(*)
      )
    `)
    .eq('property_id', propertyId)
    .single();

  if (error) {
    console.error('❌ Property detail fetch error:', error);
    throw error;
  }

  // Debug: Log raw data from Supabase
  console.log('📊 Raw Supabase data:', {
    hasData: !!data,
    dataKeys: data ? Object.keys(data) : [],
    property_id: data?.property_id,
    property_name: data?.property_name,
    location: data?.location,
    communication: data?.communication,
    access: data?.access,
    extras: data?.extras,
    fullData: data
  });

  // Safety check: If data has nested 'data' property (raw response), extract it
  // Supabase response has: { error, data, count, status }
  let actualData = data;
  if (data && typeof data === 'object' && 'data' in data && 'error' in data && 'status' in data) {
    console.warn('⚠️ Detected raw Supabase response wrapper, extracting nested data...');
    actualData = (data as any).data;
  }

  if (!actualData) {
    throw new Error('No property data returned');
  }

  if (!actualData.property_id) {
    console.error('❌ Property data missing property_id:', actualData);
    throw new Error('Invalid property data: missing property_id');
  }

  // Transform the data to match our Property type
  const transformedData = {
    ...actualData,
    amenities: actualData.amenities?.map((pa: any) => pa.amenities) || [],
    rules: actualData.rules?.map((pr: any) => pr.rules) || [],
  } as Property;

  console.log('✅ Transformed property detail:', {
    property_id: transformedData.property_id,
    property_name: transformedData.property_name,
    hasAllFields: !!transformedData.property_id,
    location: transformedData.location,
    communication: transformedData.communication,
    access: transformedData.access,
    extras: transformedData.extras
  });

  return transformedData;
};

// Fetch amenities
const fetchAmenities = async (): Promise<Amenity[]> => {
  const { data, error } = await supabase
    .from('amenities')
    .select('*')
    .order('amenity_name');

  if (error) throw error;
  return data || [];
};

// Fetch rules
const fetchRules = async (): Promise<Rule[]> => {
  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .order('rule_name');

  if (error) throw error;
  return data || [];
};

export function usePropertiesOptimized() {
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  // Properties query with advanced caching - using lightweight list query
  const {
    data: properties = [],
    isLoading: loading,
    isFetching,
    error: propertiesError,
    refetch,
  } = useQuery({
    queryKey: propertyKeys.lists(),
    queryFn: fetchPropertiesList, // Using optimized list query
    staleTime: CACHE_CONFIG.SHORT, // Reduced to 5 minutes for fresher data
    gcTime: CACHE_CONFIG.GC_MEDIUM, // 2 hours
    // Reduced background refetching to avoid excessive queries
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes (was 5)
    refetchIntervalInBackground: false, // Disabled for better performance
  });

  // Amenities query with ultra-long caching (static data)
  const { data: amenities = [] } = useQuery({
    queryKey: propertyKeys.amenities,
    queryFn: fetchAmenities,
    staleTime: CACHE_CONFIG.ULTRA_LONG, // 24 hours
    gcTime: CACHE_CONFIG.GC_ULTRA_LONG, // 48 hours
  });

  // Rules query with ultra-long caching (static data)
  const { data: rules = [] } = useQuery({
    queryKey: propertyKeys.rules,
    queryFn: fetchRules,
    staleTime: CACHE_CONFIG.ULTRA_LONG, // 24 hours
    gcTime: CACHE_CONFIG.GC_ULTRA_LONG, // 48 hours
  });

  // Create property mutation with optimistic updates and retry logic
  const createPropertyMutation = useMutation({
    retry: 2, // Retry failed mutations twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
    mutationFn: async (propertyData: PropertyInsert & {
      location?: any;
      communication?: any;
      access?: any;
      extras?: any;
      units?: any[];
      amenity_ids?: string[];
      rule_ids?: string[];
      images?: { url: string; title?: string; is_primary?: boolean }[];
    }) => {
      // Check permission
      if (!hasPermission(PERMISSIONS.PROPERTIES_CREATE)) {
        throw new Error("You don't have permission to create properties");
      }

      // Extract related data
      const { location, communication, access, extras, units, amenity_ids, rule_ids, images, ...mainPropertyData } = propertyData;

      // Create the main property
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .insert([mainPropertyData as any])
        .select()
        .single();

      if (propertyError) throw propertyError;

      const propertyId = property.property_id;

      // Create related records in parallel
      const promises = [];

      // Location
      if (location) {
        promises.push(
          supabase.from('property_location').insert([{ ...location, property_id: propertyId }])
        );
      }

      // Communication
      if (communication) {
        promises.push(
          supabase.from('property_communication').insert([{ ...communication, property_id: propertyId }])
        );
      }

      // Access
      if (access) {
        promises.push(
          supabase.from('property_access').insert([{ ...access, property_id: propertyId }])
        );
      }

      // Extras
      if (extras) {
        promises.push(
          supabase.from('property_extras').insert([{ ...extras, property_id: propertyId }])
        );
      }

      // Units
      if (units && units.length > 0) {
        const unitsWithPropertyId = units.map(unit => ({ ...unit, property_id: propertyId }));
        promises.push(
          supabase.from('units').insert(unitsWithPropertyId)
        );
      }

      // Amenities
      if (amenity_ids && amenity_ids.length > 0) {
        const propertyAmenities = amenity_ids.map(amenity_id => ({ property_id: propertyId, amenity_id }));
        promises.push(
          supabase.from('property_amenities').insert(propertyAmenities)
        );
      }

      // Rules
      if (rule_ids && rule_ids.length > 0) {
        const propertyRules = rule_ids.map(rule_id => ({ property_id: propertyId, rule_id }));
        promises.push(
          supabase.from('property_rules').insert(propertyRules)
        );
      }

      // Images
      if (images && images.length > 0) {
        const propertyImages = images.map(image => ({ ...image, property_id: propertyId, image_url: image.url }));
        promises.push(
          supabase.from('property_images').insert(propertyImages)
        );
      }

      await Promise.all(promises);

      await logActivity('PROPERTY_CREATED', {
        propertyType: propertyData.property_type,
        ownerId: propertyData.owner_id
      }, undefined, 'Admin');

      return property;
    },
    onMutate: async (propertyData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: propertyKeys.lists() });

      // Snapshot the previous value
      const previousProperties = queryClient.getQueryData(propertyKeys.lists());

      // Optimistically update the cache
      const tempProperty = {
        property_id: `temp-${Date.now()}`,
        ...propertyData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      OptimisticUpdates.addItem(queryClient, propertyKeys.lists(), tempProperty);

      // Return context with the previous data
      return { previousProperties };
    },
    onSuccess: (data) => {
      // Invalidate and refetch to get the real data
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });

      // Prefetch related data
      getCacheManagers().then(({ prefetchManager }) => {
        if (prefetchManager && data?.property_id) {
          prefetchManager.prefetchPropertyDetails([data.property_id]);
        }
      }).catch(error => {
        console.warn('Failed to get cache managers for prefetching:', error);
      });

      toast({
        title: "Success",
        description: "Property created successfully",
      });
    },
    onError: (error, propertyData, context) => {
      // Rollback optimistic update
      if (context?.previousProperties) {
        queryClient.setQueryData(propertyKeys.lists(), context.previousProperties);
      }

      console.error('Error creating property:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create property",
        variant: "destructive",
      });
    },
  });

  // Update property mutation with retry logic
  const updatePropertyMutation = useMutation({
    retry: 2, // Retry failed mutations twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
    mutationFn: async ({ propertyId, propertyData }: {
      propertyId: string;
      propertyData: Partial<PropertyInsert> & {
        location?: any;
        communication?: any;
        access?: any;
        extras?: any;
        units?: any[];
        amenity_ids?: string[];
        rule_ids?: string[];
        images?: { url: string; title?: string; is_primary?: boolean }[];
      };
    }) => {
      // Check permission
      if (!hasPermission(PERMISSIONS.PROPERTIES_EDIT)) {
        throw new Error("You don't have permission to edit properties");
      }

      const { location, communication, access, extras, units, amenity_ids, rule_ids, images, ...mainPropertyData } = propertyData;

      // Update main property - filter out undefined values
      const updateData = Object.fromEntries(
        Object.entries(mainPropertyData).filter(([_, value]) => value !== undefined)
      );

      if (Object.keys(updateData).length > 0) {
        const { error: propertyError } = await supabase
          .from('properties')
          .update(updateData as any)
          .eq('property_id', propertyId);

        if (propertyError) throw propertyError;
      }

      // Update related records
      const promises = [];

      // Location
      if (location) {
        promises.push(
          supabase.from('property_location')
            .upsert([{ ...location, property_id: propertyId }], { onConflict: 'property_id' })
        );
      }

      // Communication
      if (communication) {
        promises.push(
          supabase.from('property_communication')
            .upsert([{ ...communication, property_id: propertyId }], { onConflict: 'property_id' })
        );
      }

      // Access
      if (access) {
        promises.push(
          supabase.from('property_access')
            .upsert([{ ...access, property_id: propertyId }], { onConflict: 'property_id' })
        );
      }

      // Extras
      if (extras) {
        promises.push(
          supabase.from('property_extras')
            .upsert([{ ...extras, property_id: propertyId }], { onConflict: 'property_id' })
        );
      }

      // Handle units - delete and recreate
      if (units !== undefined) {
        await supabase.from('units').delete().eq('property_id', propertyId);

        if (units.length > 0) {
          const unitsWithPropertyId = units.map(unit => ({ ...unit, property_id: propertyId }));
          promises.push(
            supabase.from('units').insert(unitsWithPropertyId)
          );
        }
      }

      // Handle amenity updates
      if (amenity_ids !== undefined) {
        // Remove existing amenities
        await supabase.from('property_amenities').delete().eq('property_id', propertyId);

        // Add new amenities
        if (amenity_ids.length > 0) {
          const propertyAmenities = amenity_ids.map(amenity_id => ({ property_id: propertyId, amenity_id }));
          promises.push(
            supabase.from('property_amenities').insert(propertyAmenities)
          );
        }
      }

      // Handle rule updates
      if (rule_ids !== undefined) {
        // Remove existing rules
        await supabase.from('property_rules').delete().eq('property_id', propertyId);

        // Add new rules
        if (rule_ids.length > 0) {
          const propertyRules = rule_ids.map(rule_id => ({ property_id: propertyId, rule_id }));
          promises.push(
            supabase.from('property_rules').insert(propertyRules)
          );
        }
      }

      // Handle image updates
      if (images !== undefined) {
        // Remove existing images
        await supabase.from('property_images').delete().eq('property_id', propertyId);

        // Add new images
        if (images.length > 0) {
          const propertyImages = images.map(image => ({
            ...image,
            property_id: propertyId,
            image_url: image.url,
            image_title: image.title
          }));
          promises.push(
            supabase.from('property_images').insert(propertyImages)
          );
        }
      }

      await Promise.all(promises);

      await logActivity('PROPERTY_UPDATED', {
        propertyId,
        updatedFields: Object.keys(mainPropertyData)
      }, undefined, 'Admin');

      return propertyId;
    },
    onMutate: async ({ propertyId, propertyData }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: propertyKeys.lists() });

      // Snapshot the previous value
      const previousProperties = queryClient.getQueryData(propertyKeys.lists());

      // Optimistically update the cache
      OptimisticUpdates.updateProperty(queryClient, propertyId, propertyData);

      // Return context with the previous data
      return { previousProperties };
    },
    onSuccess: () => {
      // Invalidate and refetch properties
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });
      toast({
        title: "Success",
        description: "Property updated successfully",
      });
    },
    onError: (error, { propertyId, propertyData }, context) => {
      // Rollback optimistic update
      if (context?.previousProperties) {
        queryClient.setQueryData(propertyKeys.lists(), context.previousProperties);
      }

      console.error('Error updating property:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update property",
        variant: "destructive",
      });
    },
  });

  // Delete property mutation with retry logic
  const deletePropertyMutation = useMutation({
    retry: 1, // Only retry once for delete operations
    retryDelay: 1000, // 1 second delay before retry
    mutationFn: async (propertyId: string) => {
      // Check permission - only Admin can delete properties
      if (!hasPermission(PERMISSIONS.PROPERTIES_DELETE)) {
        throw new Error("You don't have permission to delete properties");
      }

      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('property_id', propertyId);

      if (error) throw error;

      await logActivity('PROPERTY_DELETED', { propertyId }, undefined, 'Admin');
      return propertyId;
    },
    onMutate: async (propertyId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: propertyKeys.lists() });

      // Snapshot the previous value
      const previousProperties = queryClient.getQueryData(propertyKeys.lists());

      // Optimistically remove from cache
      OptimisticUpdates.removeItem(queryClient, propertyKeys.lists(), propertyId, 'property_id');

      // Return context with the previous data
      return { previousProperties };
    },
    onSuccess: () => {
      // Invalidate and refetch properties
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });
      toast({
        title: "Success",
        description: "Property deleted successfully",
      });
    },
    onError: (error, propertyId, context) => {
      // Rollback optimistic update
      if (context?.previousProperties) {
        queryClient.setQueryData(propertyKeys.lists(), context.previousProperties);
      }

      console.error('Error deleting property:', error);
      toast({
        title: "Error",
        description: "Failed to delete property",
        variant: "destructive",
      });
    },
  });

  // Handle errors
  if (propertiesError) {
    toast({
      title: "Error",
      description: "Failed to fetch properties",
      variant: "destructive",
    });
  }

  return {
    properties,
    loading,
    isFetching,
    error: propertiesError,
    amenities,
    rules,
    createProperty: createPropertyMutation.mutate,
    updateProperty: (propertyId: string, propertyData: any) =>
      updatePropertyMutation.mutate({ propertyId, propertyData }),
    deleteProperty: deletePropertyMutation.mutate,
    refetch,
    // Mutation states for UI feedback
    isCreating: createPropertyMutation.isPending,
    isUpdating: updatePropertyMutation.isPending,
    isDeleting: deletePropertyMutation.isPending,
  };
}

// Hook for fetching a single property with full details (for edit page)
export function usePropertyDetail(propertyId: string | undefined) {
  const queryClient = useQueryClient();

  const {
    data: property,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: propertyKeys.detail(propertyId || ''),
    queryFn: () => fetchPropertyDetail(propertyId!),
    enabled: !!propertyId, // Only fetch when propertyId is provided
    staleTime: CACHE_CONFIG.SHORT, // 5 minutes
    gcTime: CACHE_CONFIG.GC_MEDIUM, // 2 hours
    retry: 2, // Retry failed requests twice
  });

  return {
    property,
    loading: isLoading,
    isFetching,
    error,
    refetch,
  };
}