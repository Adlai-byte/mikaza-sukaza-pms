import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Property, PropertyInsert, User, Amenity, Rule } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useActivityLogs } from "@/hooks/useActivityLogs";

export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  const fetchProperties = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching properties...');
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
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
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Properties fetch error:', error);
        throw error;
      }
      
      console.log('✅ Raw properties data:', data);
      
      // Transform the data to match our Property type
      const transformedData = (data || []).map((property: any) => ({
        ...property,
        amenities: property.amenities?.map((pa: any) => pa.amenities) || [],
        rules: property.rules?.map((pr: any) => pr.rules) || [],
      })) as Property[];
      
      console.log('✅ Transformed properties data:', transformedData);
      console.log('📊 Properties count:', transformedData.length);
      
      setProperties(transformedData);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast({
        title: "Error",
        description: "Failed to fetch properties",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      console.log('⏰ Properties loading finished');
    }
  };

  const fetchAmenities = async () => {
    try {
      const { data, error } = await supabase
        .from('amenities')
        .select('*')
        .order('amenity_name');

      if (error) throw error;
      setAmenities(data || []);
    } catch (error) {
      console.error('Error fetching amenities:', error);
    }
  };

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from('rules')
        .select('*')
        .order('rule_name');

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Error fetching rules:', error);
    }
  };

  const createProperty = async (propertyData: PropertyInsert & {
    location?: any;
    communication?: any;
    access?: any;
    extras?: any;
    units?: any[];
    amenity_ids?: string[];
    rule_ids?: string[];
    images?: { url: string; title?: string; is_primary?: boolean }[];
  }) => {
    try {
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

      toast({
        title: "Success",
        description: "Property created successfully",
      });

      await fetchProperties();
      return property;
    } catch (error) {
      console.error('Error creating property:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create property",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateProperty = async (propertyId: string, propertyData: Partial<PropertyInsert> & {
    location?: any;
    communication?: any;
    access?: any;
    extras?: any;
    units?: any[];
    amenity_ids?: string[];
    rule_ids?: string[];
    images?: { url: string; title?: string; is_primary?: boolean }[];
  }) => {
    try {
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

      toast({
        title: "Success",
        description: "Property updated successfully",
      });

      await fetchProperties();
    } catch (error) {
      console.error('Error updating property:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update property",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteProperty = async (propertyId: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('property_id', propertyId);

      if (error) throw error;

      await logActivity('PROPERTY_DELETED', { propertyId }, undefined, 'Admin');

      toast({
        title: "Success",
        description: "Property deleted successfully",
      });

      await fetchProperties();
    } catch (error) {
      console.error('Error deleting property:', error);
      toast({
        title: "Error",
        description: "Failed to delete property",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    Promise.all([
      fetchProperties(),
      fetchAmenities(),
      fetchRules()
    ]);
  }, []);

  return {
    properties,
    loading,
    amenities,
    rules,
    createProperty,
    updateProperty,
    deleteProperty,
    refetch: fetchProperties,
  };
}