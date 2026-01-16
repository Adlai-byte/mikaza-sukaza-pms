import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Property, PropertyInsert, Amenity, Rule } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { CACHE_CONFIG } from "@/lib/cache-config";
import { OptimisticUpdates } from "@/lib/cache-manager-simplified";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { jobKeys } from "@/hooks/useJobs";
import { issueKeys } from "@/hooks/useIssues";
import type {
  PropertyLocationInsert,
  PropertyCommunicationInsert,
  PropertyAccessInsert,
  PropertyExtrasInsert,
  UnitInsert,
  PropertyAmenityJoin,
  PropertyRuleJoin,
} from "@/lib/database-types";

// Query keys for cache management - SINGLE SOURCE OF TRUTH
export const propertyKeys = {
  all: () => ['properties'],
  lists: () => ['properties', 'list'],
  list: (filters?: Record<string, unknown>) => ['properties', 'list', ...(filters ? [JSON.stringify(filters)] : [])],
  details: () => ['properties', 'detail'],
  detail: (id: string) => ['properties', 'detail', id],
  amenities: () => ['amenities'],
  rules: () => ['rules'],
} as const;

// Fetch properties for LIST VIEW - optimized query (includes primary image and units for booking)
const fetchPropertiesList = async (): Promise<Property[]> => {
  console.log('🔍 Fetching properties list...');
  const { data, error } = await supabase
    .from('properties')
    .select(`
      property_id,
      owner_id,
      property_name,
      property_type,
      is_active,
      is_booking,
      capacity,
      num_bedrooms,
      num_bathrooms,
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
      images:property_images!property_images_property_id_fkey(
        image_id,
        image_url,
        image_title,
        is_primary
      ),
      units(
        unit_id,
        property_name,
        license_number,
        folio,
        owner_id,
        num_bedrooms,
        num_bathrooms,
        owner:users!units_owner_id_fkey(
          user_id,
          first_name,
          last_name,
          email
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Properties list fetch error:', error);
    throw error;
  }

  console.log('✅ Fetched properties list:', data?.length || 0, 'properties');
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
    actualData = (data as { data: typeof data }).data;
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
    amenities: actualData.amenities?.map((pa: PropertyAmenityJoin) => pa.amenities) || [],
    rules: actualData.rules?.map((pr: PropertyRuleJoin) => pr.rules) || [],
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
  console.log('🔍 Fetching amenities from database...');
  const { data, error } = await supabase
    .from('amenities')
    .select('*')
    .order('amenity_name');

  if (error) {
    console.error('❌ Error fetching amenities:', error);
    throw error;
  }
  console.log('✅ Fetched amenities:', data?.length || 0, 'items');
  return data || [];
};

// Fetch rules
const fetchRules = async (): Promise<Rule[]> => {
  console.log('🔍 Fetching rules from database...');
  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .order('rule_name');

  if (error) {
    console.error('❌ Error fetching rules:', error);
    throw error;
  }
  console.log('✅ Fetched rules:', data?.length || 0, 'items');
  return data || [];
};

export function usePropertiesOptimized() {
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  // Properties query - OPTIMIZED CACHING
  // Properties are semi-static data, they don't change frequently
  // Cache for 3 minutes, keep in memory for 15 minutes
  const {
    data: properties = [],
    isLoading: loading,
    isFetching,
    error: propertiesError,
    refetch,
  } = useQuery({
    queryKey: propertyKeys.lists(),
    queryFn: fetchPropertiesList,
    staleTime: 3 * 60 * 1000, // 3 minutes - data considered fresh (increased from 1 min)
    gcTime: 15 * 60 * 1000, // 15 minutes - keep in cache (increased from 10 min)
    refetchOnMount: true, // Refetch if data is stale (ensures new data after invalidation)
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Amenities query - OPTIMIZED CACHING
  // Amenities are reference data that rarely change
  // Cache for 10 minutes, keep in memory for 30 minutes
  const { data: amenities = [] } = useQuery({
    queryKey: propertyKeys.amenities(),
    queryFn: fetchAmenities,
    staleTime: 10 * 60 * 1000, // 10 minutes - data considered fresh
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache
    refetchOnMount: false, // Don't refetch if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Rules query - OPTIMIZED CACHING
  // Rules are reference data that rarely change
  // Cache for 10 minutes, keep in memory for 30 minutes
  const { data: rules = [] } = useQuery({
    queryKey: propertyKeys.rules(),
    queryFn: fetchRules,
    staleTime: 10 * 60 * 1000, // 10 minutes - data considered fresh
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache
    refetchOnMount: false, // Don't refetch if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Create property mutation with optimistic updates and retry logic
  const createPropertyMutation = useMutation({
    retry: 2, // Retry failed mutations twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
    mutationFn: async (propertyData: PropertyInsert & {
      location?: Omit<PropertyLocationInsert, "property_id" | "location_id">;
      communication?: Omit<PropertyCommunicationInsert, "property_id" | "communication_id">;
      access?: Omit<PropertyAccessInsert, "property_id" | "access_id">;
      extras?: Omit<PropertyExtrasInsert, "property_id" | "extras_id">;
      units?: Omit<UnitInsert, "property_id" | "unit_id">[];
      amenity_ids?: string[];
      rule_ids?: string[];
      images?: { url: string; title?: string; is_primary?: boolean }[];
    }) => {
      console.log('🏠 [PROPERTY] Create property started:', {
        property_name: propertyData.property_name,
        property_type: propertyData.property_type,
        owner_id: propertyData.owner_id,
        timestamp: new Date().toISOString()
      });

      // Check permission
      if (!hasPermission(PERMISSIONS.PROPERTIES_CREATE)) {
        console.error('❌ [PROPERTY] Permission denied for property creation');
        throw new Error("You don't have permission to create properties");
      }

      console.log('✅ [PROPERTY] Permission granted for creation');

      // Extract related data
      const { location, communication, access, extras, units, amenity_ids, rule_ids, images, ...mainPropertyData } = propertyData;

      console.log('💾 [PROPERTY] Creating main property record...');
      // Create the main property
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .insert([mainPropertyData as any])
        .select()
        .single();

      if (propertyError) {
        console.error('❌ [PROPERTY] Property creation failed:', {
          error: propertyError.message,
          timestamp: new Date().toISOString()
        });
        throw propertyError;
      }

      console.log('✅ [PROPERTY] Main property created:', {
        property_id: property.property_id,
        property_name: property.property_name
      });

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
        console.log('📸 [PROPERTY] Inserting property images:', images);
        const propertyImages = images.map(image => ({
          property_id: propertyId,
          image_url: image.url,
          image_title: image.title || null,
          is_primary: image.is_primary || false
        }));
        console.log('📸 [PROPERTY] Formatted images for insert:', propertyImages);
        promises.push(
          supabase.from('property_images').insert(propertyImages)
            .then(({ error }) => {
              if (error) {
                console.error('❌ [PROPERTY] Image insert error:', error);
                throw error;
              }
              console.log('✅ [PROPERTY] Images inserted successfully');
            })
        );
      }

      await Promise.all(promises);

      await logActivity('PROPERTY_CREATED', {
        propertyType: propertyData.property_type,
        ownerId: propertyData.owner_id
      });

      return property;
    },
    onMutate: async (propertyData) => {
      // Optimistically update the cache
      const tempProperty = {
        property_id: `temp-${Date.now()}`,
        ...propertyData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Use OptimisticUpdates helper with automatic rollback
      const rollback = OptimisticUpdates.addProperty(queryClient, tempProperty);

      // Return context with rollback function
      return { rollback };
    },
    onSuccess: async (data) => {
      console.log('✅ [PROPERTY] Creation succeeded, updating cache...');

      // Cancel any outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: propertyKeys.lists() });

      // Get current cache data
      const currentData = queryClient.getQueryData<Property[]>(propertyKeys.lists()) || [];

      // Remove any temporary/optimistic entries and add the real property
      const filteredData = currentData.filter(p => !p.property_id.startsWith('temp-'));

      // Create a complete property object with the returned data
      const newProperty: Property = {
        ...data,
        owner: null, // Will be populated on next fetch
        location: null,
        images: [],
        units: [],
      };

      // Add the new property at the beginning of the list
      const updatedData = [newProperty, ...filteredData];

      // Update cache with the new data
      queryClient.setQueryData(propertyKeys.lists(), updatedData);

      console.log('✅ [PROPERTY] Cache updated with new property, count:', updatedData.length);

      // Mark queries as stale but don't refetch immediately
      // This allows the optimistic update to persist and avoids race conditions
      // with database replication lag. React Query will refetch when appropriate.
      queryClient.invalidateQueries({
        queryKey: propertyKeys.lists(),
        refetchType: 'none' // Don't refetch - the cache already has the new property
      });

      // Invalidate jobs and issues queries so unit selectors update
      queryClient.invalidateQueries({ queryKey: jobKeys.all() });
      queryClient.invalidateQueries({ queryKey: issueKeys.all() });

      toast({
        title: "Success",
        description: "Property created successfully",
      });
    },
    onError: (error, propertyData, context) => {
      // Rollback optimistic update using the rollback function
      context?.rollback?.();

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
        location?: Omit<PropertyLocationInsert, "property_id" | "location_id">;
        communication?: Omit<PropertyCommunicationInsert, "property_id" | "communication_id">;
        access?: Omit<PropertyAccessInsert, "property_id" | "access_id">;
        extras?: Omit<PropertyExtrasInsert, "property_id" | "extras_id">;
        units?: Omit<UnitInsert, "property_id" | "unit_id">[];
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

      // Update main property - include all explicitly set values (including null)
      const updateData = Object.fromEntries(
        Object.entries(mainPropertyData)
          .filter(([_, value]) => value !== undefined)
      );
      
      console.log('📝 [PropertyEdit] Processing update:', {
        propertyId,
        updateData,
        originalData: mainPropertyData,
        hasChanges: Object.keys(updateData).length > 0
      });

      console.log('📝 [PropertyEdit] Updating with data:', {
        propertyId,
        updateData,
        originalData: mainPropertyData
      });

      // Always perform the update even if updateData is empty to trigger timestamps
      const { data: updatedData, error: propertyError } = await supabase
        .from('properties')
        .update({
          ...updateData,
          updated_at: new Date().toISOString() // Force update timestamp
        } as any)
        .eq('property_id', propertyId)
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
          owner:users!properties_owner_id_fkey (
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
        .single();

      if (propertyError) {
        console.error('❌ [PropertyEdit] Update failed:', propertyError);
        throw propertyError;
      }

      console.log('✅ [PropertyEdit] Update successful:', {
        propertyId,
        updatedFields: Object.keys(updateData),
        newData: updatedData
      });

      // Update related records with error handling
      const relatedUpdates = [];

      // Location
      if (location !== undefined) {
        relatedUpdates.push(
          supabase.from('property_location')
            .upsert([{ ...location, property_id: propertyId }], { onConflict: 'property_id' })
            .then(({ error }) => {
              if (error) throw new Error(`Failed to update location: ${error.message}`);
            })
        );
      }

      // Communication
      if (communication !== undefined) {
        relatedUpdates.push(
          supabase.from('property_communication')
            .upsert([{ ...communication, property_id: propertyId }], { onConflict: 'property_id' })
            .then(({ error }) => {
              if (error) throw new Error(`Failed to update communication: ${error.message}`);
            })
        );
      }

      // Access
      if (access !== undefined) {
        relatedUpdates.push(
          supabase.from('property_access')
            .upsert([{ ...access, property_id: propertyId }], { onConflict: 'property_id' })
            .then(({ error }) => {
              if (error) throw new Error(`Failed to update access: ${error.message}`);
            })
        );
      }

      // Extras
      if (extras !== undefined) {
        relatedUpdates.push(
          supabase.from('property_extras')
            .upsert([{ ...extras, property_id: propertyId }], { onConflict: 'property_id' })
            .then(({ error }) => {
              if (error) throw new Error(`Failed to update extras: ${error.message}`);
            })
        );
      }

      // Handle units - delete and recreate
      if (units !== undefined) {
        await supabase.from('units').delete().eq('property_id', propertyId);

        if (units.length > 0) {
          const unitsWithPropertyId = units.map(unit => ({ ...unit, property_id: propertyId }));
          relatedUpdates.push(
            supabase.from('units').insert(unitsWithPropertyId)
              .then(({ error }) => {
                if (error) throw new Error(`Failed to update units: ${error.message}`);
              })
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
          relatedUpdates.push(
            supabase.from('property_amenities').insert(propertyAmenities)
              .then(({ error }) => {
                if (error) throw new Error(`Failed to update amenities: ${error.message}`);
              })
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
          relatedUpdates.push(
            supabase.from('property_rules').insert(propertyRules)
              .then(({ error }) => {
                if (error) throw new Error(`Failed to update rules: ${error.message}`);
              })
          );
        }
      }

      // Handle image updates
      if (images !== undefined) {
        console.log('📸 [PROPERTY] Updating property images');
        // Remove existing images
        await supabase.from('property_images').delete().eq('property_id', propertyId);

        // Add new images
        if (images.length > 0) {
          const propertyImages = images.map(image => ({
            property_id: propertyId,
            image_url: image.url,
            image_title: image.title || null,
            is_primary: image.is_primary || false
          }));
          console.log('📸 [PROPERTY] Formatted images for update:', propertyImages);
          relatedUpdates.push(
            supabase.from('property_images').insert(propertyImages)
              .then(({ error }) => {
                if (error) {
                  console.error('❌ [PROPERTY] Image update error:', error);
                  throw new Error(`Failed to update images: ${error.message}`);
                }
                console.log('✅ [PROPERTY] Images updated successfully');
              })
          );
        }
      }

      await Promise.all(relatedUpdates);

      await logActivity('PROPERTY_UPDATED', {
        propertyId,
        updatedFields: Object.keys(mainPropertyData)
      });

      return propertyId;
    },
    onMutate: async ({ propertyId, propertyData }) => {
      console.log('📝 [PropertyEdit] Starting update for property:', propertyId);

      // Optimistically update the cache using the helper
      const rollback = OptimisticUpdates.updateProperty(queryClient, propertyId, propertyData);

      return { rollback };
    },
    onSuccess: async (propertyId) => {
      console.log('✅ [PropertyEdit] Update succeeded, updating cache and refetching...');

      // Immediately fetch the latest data for both detail and list
      const [freshDetailData, freshListData] = await Promise.all([
        fetchPropertyDetail(propertyId),
        fetchPropertiesList()
      ]);
      
      // Update both caches immediately
      queryClient.setQueryData(propertyKeys.detail(propertyId), freshDetailData);
      queryClient.setQueryData(propertyKeys.lists(), freshListData);
      
      // Then invalidate and refetch all queries to ensure full consistency
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: propertyKeys.detail(propertyId),
          refetchType: 'all'
        }),
        queryClient.invalidateQueries({
          queryKey: propertyKeys.lists(),
          refetchType: 'all'
        })
      ]);

      console.log('✅ [PropertyEdit] Cache invalidated and fresh data fetched for property:', propertyId);

      // Invalidate jobs and issues queries so unit selectors update when units change
      queryClient.invalidateQueries({ queryKey: jobKeys.all() });
      queryClient.invalidateQueries({ queryKey: issueKeys.all() });

      toast({
        title: "Success",
        description: "Property updated successfully",
      });
    },
    onError: (error, { propertyId }, context) => {
      console.error('❌ [PropertyEdit] Update error:', error);

      // Rollback optimistic update
      context?.rollback?.();

      // Force refetch to ensure consistent state
      queryClient.invalidateQueries({ queryKey: propertyKeys.all() });

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
      const propertyToDelete = properties.find(p => p.property_id === propertyId);

      console.log('🗑️ [PROPERTY] Delete property started:', {
        propertyId,
        property_name: propertyToDelete?.property_name,
        property_type: propertyToDelete?.property_type,
        timestamp: new Date().toISOString()
      });

      // Check permission - only Admin can delete properties
      if (!hasPermission(PERMISSIONS.PROPERTIES_DELETE)) {
        console.error('❌ [PROPERTY] Permission denied for property deletion');
        throw new Error("You don't have permission to delete properties");
      }

      console.log('✅ [PROPERTY] Permission granted for deletion');

      console.log('💀 [PROPERTY] Deleting property from database...');
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('property_id', propertyId);

      if (error) {
        console.error('❌ [PROPERTY] Property deletion failed:', {
          propertyId,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        throw error;
      }

      console.log('✅ [PROPERTY] Property deleted successfully:', {
        propertyId,
        property_name: propertyToDelete?.property_name,
        timestamp: new Date().toISOString()
      });

      await logActivity('PROPERTY_DELETED', { propertyId });
      return propertyId;
    },
    onMutate: async (propertyId) => {
      // Optimistically remove from cache using helper
      const rollback = OptimisticUpdates.removeProperty(queryClient, propertyId);

      // Return context with rollback function
      return { rollback };
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
      context?.rollback?.();

      console.error('Error deleting property:', error);
      toast({
        title: "Error",
        description: "Failed to delete property",
        variant: "destructive",
      });
    },
  });

  return {
    properties,
    loading,
    isFetching,
    error: propertiesError,
    amenities,
    rules,
    createProperty: createPropertyMutation.mutateAsync,
    updateProperty: (propertyId: string, propertyData: Partial<PropertyInsert> & {
      location?: Omit<PropertyLocationInsert, "property_id" | "location_id">;
      communication?: Omit<PropertyCommunicationInsert, "property_id" | "communication_id">;
      access?: Omit<PropertyAccessInsert, "property_id" | "access_id">;
      extras?: Omit<PropertyExtrasInsert, "property_id" | "extras_id">;
      units?: Omit<UnitInsert, "property_id" | "unit_id">[];
      amenity_ids?: string[];
      rule_ids?: string[];
      images?: { url: string; title?: string; is_primary?: boolean }[];
    }) => updatePropertyMutation.mutateAsync({ propertyId, propertyData }),
    deleteProperty: deletePropertyMutation.mutateAsync,
    refetch,
    // Mutation states for UI feedback
    isCreating: createPropertyMutation.isPending,
    isUpdating: updatePropertyMutation.isPending,
    isDeleting: deletePropertyMutation.isPending,
  };
}

// Hook for fetching a single property with full details (for edit page)
export function usePropertyDetail(propertyId: string | undefined) {
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
    // Enable caching - realtime subscriptions will invalidate when data changes
    staleTime: 5 * 60 * 1000, // 5 minutes - consider data fresh
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache for quick navigation
    retry: 2, // Retry failed requests twice
    refetchOnMount: 'always', // Refetch on mount but use cached data while loading
    refetchOnWindowFocus: false, // Don't refetch on focus - realtime handles updates
  });

  return {
    property,
    loading: isLoading,
    isFetching,
    error,
    refetch,
  };
}