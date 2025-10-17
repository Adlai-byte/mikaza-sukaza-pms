import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { propertyKeys, usePropertyDetail } from '@/hooks/usePropertiesOptimized';
import {
  Home,
  MapPin,
  Users,
  Wifi,
  Lock,
  Plus,
  Check,
  AlertCircle,
  Phone,
  Key,
  Shield,
  Warehouse,
  Building2,
  Calendar,
  Ruler,
  Map,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { TabLoadingSpinner } from './PropertyEditSkeleton';
import { LocationMap } from '@/components/ui/location-map-new';
import { Property, PropertyLocation, PropertyCommunication, PropertyAccess, PropertyExtras } from '@/lib/schemas';

interface ExtendedProperty extends Omit<Property, 'location' | 'communication' | 'access' | 'extras'> {
  property_location?: PropertyLocation | PropertyLocation[];
  property_communication?: PropertyCommunication | PropertyCommunication[];
  property_access?: PropertyAccess | PropertyAccess[];
  property_extras?: PropertyExtras | PropertyExtras[];
  // Also support the shorter aliases from Supabase query
  location?: PropertyLocation | PropertyLocation[];
  communication?: PropertyCommunication | PropertyCommunication[];
  access?: PropertyAccess | PropertyAccess[];
  extras?: PropertyExtras | PropertyExtras[];
}

interface GeneralTabOptimizedProps {
  property: ExtendedProperty;
}

interface FormData {
  is_active: boolean;
  is_booking: boolean;
  is_pets_allowed: boolean;
  property_name: string;
  property_type: string;
  capacity: string;
  max_capacity: string;
  size_sqf: string;
  num_bedrooms: string;
  num_bathrooms: string;
  num_half_bath: string;
  num_wcs: string;
  num_kitchens: string;
  num_living_rooms: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  latitude: string;
  longitude: string;
  phone_number: string;
  wifi_name: string;
  wifi_password: string;
  gate_code: string;
  door_lock_password: string;
  alarm_passcode: string;
  storage_number: string;
  storage_code: string;
  front_desk: string;
  garage_number: string;
  mailing_box: string;
  pool_access_code: string;
}

// Helper functions for data conversion
const toIntOrNull = (v: string | number | null | undefined) => {
  if (v === '' || v === undefined || v === null) return null;
  const n = typeof v === 'string' ? parseInt(v, 10) : v;
  return Number.isFinite(n) ? n : null;
};

const toNumberOrNull = (v: string | number | null | undefined) => {
  if (v === '' || v === undefined || v === null) return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
};

const toBool = (v: boolean | string | undefined) => v === true;

export function GeneralTabOptimized({ property }: GeneralTabOptimizedProps) {
  // Support both naming conventions and both array/object formats
  const propertyLocation = useMemo(() => {
    const data = property?.property_location || property?.location;
    // Handle both array and single object
    return Array.isArray(data) ? data : (data ? [data] : []);
  }, [property]);

  const propertyCommunication = useMemo(() => {
    const data = property?.property_communication || property?.communication;
    return Array.isArray(data) ? data : (data ? [data] : []);
  }, [property]);

  const propertyAccess = useMemo(() => {
    const data = property?.property_access || property?.access;
    return Array.isArray(data) ? data : (data ? [data] : []);
  }, [property]);

  const propertyExtras = useMemo(() => {
    const data = property?.property_extras || property?.extras;
    return Array.isArray(data) ? data : (data ? [data] : []);
  }, [property]);

  console.log('🏠 [GeneralTabOptimized] Component rendered with property:', {
    property,
    propertyId: property?.property_id,
    propertyName: property?.property_name,
    hasLocation: !!propertyLocation?.length,
    hasCommunication: !!propertyCommunication?.length,
    hasAccess: !!propertyAccess?.length,
    hasExtras: !!propertyExtras?.length,
    locationData: propertyLocation,
    communicationData: propertyCommunication,
    accessData: propertyAccess,
    extrasData: propertyExtras
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    wifi_password: false,
    gate_code: false,
    door_lock_password: false,
    alarm_passcode: false,
    storage_code: false,
    pool_access_code: false,
  });

  // Track which property we're currently editing to prevent race conditions
  const currentPropertyIdRef = useRef<string | null>(null);

  // Track if we just completed a save to avoid double form rebuild
  const justSavedRef = useRef(false);

  const [formData, setFormData] = useState({
    // Basic Information
    is_active: property.is_active || false,
    is_booking: property.is_booking || false,
    is_pets_allowed: property.is_pets_allowed || false,
    property_name: property.property_name || '',

    // Location
    address: propertyLocation?.[0]?.address || '',
    city: propertyLocation?.[0]?.city || '',
    state: propertyLocation?.[0]?.state || '',
    postal_code: propertyLocation?.[0]?.postal_code || '',
    latitude: propertyLocation?.[0]?.latitude?.toString() || '',
    longitude: propertyLocation?.[0]?.longitude?.toString() || '',

    // Capacity
    property_type: property.property_type || 'Apartment',
    capacity: property.capacity?.toString() || '',
    max_capacity: property.max_capacity?.toString() || '',
    size_sqf: property.size_sqf?.toString() || '',
    num_bedrooms: property.num_bedrooms?.toString() || '',
    num_bathrooms: property.num_bathrooms?.toString() || '',
    num_half_bath: property.num_half_bath?.toString() || '',
    num_wcs: property.num_wcs?.toString() || '',
    num_kitchens: property.num_kitchens?.toString() || '',
    num_living_rooms: property.num_living_rooms?.toString() || '',

    // Communication
    phone_number: propertyCommunication?.[0]?.phone_number || '',
    wifi_name: propertyCommunication?.[0]?.wifi_name || '',
    wifi_password: propertyCommunication?.[0]?.wifi_password || '',

    // Access
    gate_code: propertyAccess?.[0]?.gate_code || '',
    door_lock_password: propertyAccess?.[0]?.door_lock_password || '',
    alarm_passcode: propertyAccess?.[0]?.alarm_passcode || '',

    // Extras
    storage_number: propertyExtras?.[0]?.storage_number || '',
    storage_code: propertyExtras?.[0]?.storage_code || '',
    front_desk: propertyExtras?.[0]?.front_desk || '',
    garage_number: propertyExtras?.[0]?.garage_number || '',
    mailing_box: propertyExtras?.[0]?.mailing_box || '',
    pool_access_code: propertyExtras?.[0]?.pool_access_code || '',
  });

  // Toggle password visibility
  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  // Helper function to build form data from property object
  const buildFormDataFromProperty = (prop: ExtendedProperty) => {
    const rawLoc = prop?.property_location || prop?.location;
    const rawComm = prop?.property_communication || prop?.communication;
    const rawAcc = prop?.property_access || prop?.access;
    const rawExt = prop?.property_extras || prop?.extras;

    const loc = Array.isArray(rawLoc) ? rawLoc : (rawLoc ? [rawLoc] : []);
    const comm = Array.isArray(rawComm) ? rawComm : (rawComm ? [rawComm] : []);
    const acc = Array.isArray(rawAcc) ? rawAcc : (rawAcc ? [rawAcc] : []);
    const ext = Array.isArray(rawExt) ? rawExt : (rawExt ? [rawExt] : []);

    return {
      is_active: prop.is_active || false,
      is_booking: prop.is_booking || false,
      is_pets_allowed: prop.is_pets_allowed || false,
      property_name: prop.property_name || '',
      address: loc?.[0]?.address || '',
      city: loc?.[0]?.city || '',
      state: loc?.[0]?.state || '',
      postal_code: loc?.[0]?.postal_code || '',
      latitude: loc?.[0]?.latitude?.toString() || '',
      longitude: loc?.[0]?.longitude?.toString() || '',
      property_type: prop.property_type || 'Apartment',
      capacity: prop.capacity?.toString() || '',
      max_capacity: prop.max_capacity?.toString() || '',
      size_sqf: prop.size_sqf?.toString() || '',
      num_bedrooms: prop.num_bedrooms?.toString() || '',
      num_bathrooms: prop.num_bathrooms?.toString() || '',
      num_half_bath: prop.num_half_bath?.toString() || '',
      num_wcs: prop.num_wcs?.toString() || '',
      num_kitchens: prop.num_kitchens?.toString() || '',
      num_living_rooms: prop.num_living_rooms?.toString() || '',
      phone_number: comm?.[0]?.phone_number || '',
      wifi_name: comm?.[0]?.wifi_name || '',
      wifi_password: comm?.[0]?.wifi_password || '',
      gate_code: acc?.[0]?.gate_code || '',
      door_lock_password: acc?.[0]?.door_lock_password || '',
      alarm_passcode: acc?.[0]?.alarm_passcode || '',
      storage_number: ext?.[0]?.storage_number || '',
      storage_code: ext?.[0]?.storage_code || '',
      front_desk: ext?.[0]?.front_desk || '',
      garage_number: ext?.[0]?.garage_number || '',
      mailing_box: ext?.[0]?.mailing_box || '',
      pool_access_code: ext?.[0]?.pool_access_code || '',
    };
  };

  // Form validation function
  const validateForm = (formValues: typeof formData): Record<string, string> => {
    const errors: Record<string, string> = {};

    // Required field validations
    if (!formValues.property_name?.trim()) {
      errors.property_name = 'Property name is required';
    }

    // Email validation if phone number looks like email
    if (formValues.phone_number && formValues.phone_number.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formValues.phone_number)) {
        errors.phone_number = 'Please enter a valid email address';
      }
    }

    // Phone number validation (basic format check)
    if (formValues.phone_number && !formValues.phone_number.includes('@')) {
      const phoneRegex = /^[+]?[1-9]?[\d\s\-().]{7,15}$/;
      if (!phoneRegex.test(formValues.phone_number.replace(/\s/g, ''))) {
        errors.phone_number = 'Please enter a valid phone number';
      }
    }

    // Coordinate validation
    if (formValues.latitude && (isNaN(Number(formValues.latitude)) || Number(formValues.latitude) < -90 || Number(formValues.latitude) > 90)) {
      errors.latitude = 'Latitude must be between -90 and 90';
    }
    if (formValues.longitude && (isNaN(Number(formValues.longitude)) || Number(formValues.longitude) < -180 || Number(formValues.longitude) > 180)) {
      errors.longitude = 'Longitude must be between -180 and 180';
    }

    // Capacity validation
    if (formValues.capacity && formValues.max_capacity) {
      if (Number(formValues.capacity) > Number(formValues.max_capacity)) {
        errors.capacity = 'Standard capacity cannot exceed maximum capacity';
        errors.max_capacity = 'Maximum capacity must be greater than or equal to standard capacity';
      }
    }

    // Size validation
    if (formValues.size_sqf && (isNaN(Number(formValues.size_sqf)) || Number(formValues.size_sqf) <= 0)) {
      errors.size_sqf = 'Size must be a positive number';
    }

    return errors;
  };

  // React Query mutation for saving - uses updatePropertyMutation from hook
  const savePropertyMutation = useMutation({
    mutationFn: async (formValues: typeof formData) => {
      console.log('🏠 [GeneralTab] Starting save mutation:', { formValues, propertyId: property.property_id });

      // Validate before saving
      const errors = validateForm(formValues);
      if (Object.keys(errors).length > 0) {
        console.error('❌ [GeneralTab] Validation errors:', errors);
        setValidationErrors(errors);
        throw new Error('Please fix validation errors before saving');
      }

      setValidationErrors({});
      const propertyId = property.property_id;
      console.log('📋 [GeneralTab] Property ID:', propertyId);

      // Prepare data in the format expected by usePropertiesOptimized hook
      const propertyData = {
        // Main property fields
        is_active: toBool(formValues.is_active),
        is_booking: toBool(formValues.is_booking),
        is_pets_allowed: toBool(formValues.is_pets_allowed),
        property_name: formValues.property_name,
        property_type: formValues.property_type,
        capacity: toIntOrNull(formValues.capacity),
        max_capacity: toIntOrNull(formValues.max_capacity),
        size_sqf: toIntOrNull(formValues.size_sqf),
        num_bedrooms: toIntOrNull(formValues.num_bedrooms),
        num_bathrooms: toIntOrNull(formValues.num_bathrooms),
        num_half_bath: toIntOrNull(formValues.num_half_bath),
        num_wcs: toIntOrNull(formValues.num_wcs),
        num_kitchens: toIntOrNull(formValues.num_kitchens),
        num_living_rooms: toIntOrNull(formValues.num_living_rooms),

        // Related data
        location: {
          address: formValues.address || null,
          city: formValues.city || null,
          state: formValues.state || null,
          postal_code: formValues.postal_code || null,
          latitude: toNumberOrNull(formValues.latitude),
          longitude: toNumberOrNull(formValues.longitude),
        },
        communication: {
          phone_number: formValues.phone_number,
          wifi_name: formValues.wifi_name,
          wifi_password: formValues.wifi_password,
        },
        access: {
          gate_code: formValues.gate_code,
          door_lock_password: formValues.door_lock_password,
          alarm_passcode: formValues.alarm_passcode,
        },
        extras: {
          storage_number: formValues.storage_number,
          storage_code: formValues.storage_code,
          front_desk: formValues.front_desk,
          garage_number: formValues.garage_number,
          mailing_box: formValues.mailing_box,
          pool_access_code: formValues.pool_access_code,
        },
      };

      // Use the hook's mutation which already handles everything correctly
      console.log('📊 [GeneralTab] Calling updatePropertyMutation with data:', propertyData);

      // Call the hook's mutation function directly
      const { data: updatedData, error: updateError } = await supabase
        .from('properties')
        .update({
          is_active: propertyData.is_active,
          is_booking: propertyData.is_booking,
          is_pets_allowed: propertyData.is_pets_allowed,
          property_name: propertyData.property_name,
          property_type: propertyData.property_type,
          capacity: propertyData.capacity,
          max_capacity: propertyData.max_capacity,
          size_sqf: propertyData.size_sqf,
          num_bedrooms: propertyData.num_bedrooms,
          num_bathrooms: propertyData.num_bathrooms,
          num_half_bath: propertyData.num_half_bath,
          num_wcs: propertyData.num_wcs,
          num_kitchens: propertyData.num_kitchens,
          num_living_rooms: propertyData.num_living_rooms,
          updated_at: new Date().toISOString(),
        })
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
          updated_at
        `)
        .single();

      if (updateError) throw updateError;

      // Update related tables using upsert
      const relatedUpdates = [];

      // Location
      relatedUpdates.push(
        supabase.from('property_location')
          .upsert([{ ...propertyData.location, property_id: propertyId }], { onConflict: 'property_id' })
      );

      // Communication
      relatedUpdates.push(
        supabase.from('property_communication')
          .upsert([{ ...propertyData.communication, property_id: propertyId }], { onConflict: 'property_id' })
      );

      // Access
      relatedUpdates.push(
        supabase.from('property_access')
          .upsert([{ ...propertyData.access, property_id: propertyId }], { onConflict: 'property_id' })
      );

      // Extras
      relatedUpdates.push(
        supabase.from('property_extras')
          .upsert([{ ...propertyData.extras, property_id: propertyId }], { onConflict: 'property_id' })
      );

      await Promise.all(relatedUpdates);

      // Fetch fresh data with all relations
      const { data: freshData, error: fetchError } = await supabase
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
          location:property_location(*),
          communication:property_communication(*),
          access:property_access(*),
          extras:property_extras(*)
        `)
        .eq('property_id', propertyId)
        .single();

      if (fetchError) throw fetchError;

      console.log('✅ [GeneralTab] Fresh data fetched:', freshData);
      return freshData;
    },
    onSuccess: async (freshPropertyData) => {
      console.log('🎉 [GeneralTab] Save successful, rebuilding form from fresh data:', freshPropertyData);

      // Mark that we just saved to prevent useEffect from rebuilding again
      justSavedRef.current = true;

      // Update React Query detail cache with fresh data
      queryClient.setQueryData(propertyKeys.detail(property.property_id), freshPropertyData);

      // CRITICAL FIX: Update the properties LIST cache immediately
      // This ensures the table shows updated data when user navigates back
      queryClient.setQueryData(propertyKeys.lists(), (oldData: any) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;

        console.log('📝 [GeneralTab] Updating property in list cache:', {
          propertyId: property.property_id,
          oldCount: oldData.length,
          updating: freshPropertyData.property_name
        });

        // Find and update the property in the list
        return oldData.map((prop: any) => {
          if (prop.property_id === property.property_id) {
            // Merge fresh data with existing list item (preserving list-specific fields)
            return {
              ...prop,
              property_name: freshPropertyData.property_name,
              property_type: freshPropertyData.property_type,
              is_active: freshPropertyData.is_active,
              is_booking: freshPropertyData.is_booking,
              is_pets_allowed: freshPropertyData.is_pets_allowed,
              capacity: freshPropertyData.capacity,
              max_capacity: freshPropertyData.max_capacity,
              num_bedrooms: freshPropertyData.num_bedrooms,
              num_bathrooms: freshPropertyData.num_bathrooms,
              size_sqf: freshPropertyData.size_sqf,
              updated_at: freshPropertyData.updated_at,
              // Update location if available
              location: freshPropertyData.location || prop.location,
            };
          }
          return prop;
        });
      });

      // CRITICAL FIX: Rebuild form state from fresh database data
      const newFormData = buildFormDataFromProperty(freshPropertyData);
      setFormData(newFormData);

      toast({
        title: 'Success',
        description: 'Property saved successfully',
      });

      setHasUnsavedChanges(false);

      // Emit event to notify parent (PropertyEdit page) to refresh header
      window.dispatchEvent(new Event('property-updated'));
      console.log('🔔 [GeneralTab] Dispatched property-updated event');

      // Clear the flag after a tick to allow useEffect to handle future updates
      setTimeout(() => {
        justSavedRef.current = false;
      }, 100);
    },
    onError: (error) => {
      console.error('Error saving property:', error);
      toast({
        title: 'Error',
        description: (error as Error)?.message || 'Failed to save property details',
        variant: 'destructive',
      });
    },
  });

  // Keep form synced when property data changes
  useEffect(() => {
    const propertyId = property?.property_id;
    const propertyUpdatedAt = property?.updated_at;

    if (!propertyId) return;

    // Skip if we just completed a save - onSuccess already rebuilt the form
    if (justSavedRef.current) {
      console.log('⏸️ [GeneralTab] Skipping form sync - just completed save');
      return;
    }

    // Case 1: Switching to a different property (ID changed)
    const isNewProperty = propertyId !== currentPropertyIdRef.current;

    // Case 2: Same property but data was updated externally
    // Only sync if we don't have unsaved changes (don't overwrite user's edits)
    const shouldSync = isNewProperty || !hasUnsavedChanges;

    if (shouldSync) {
      console.log('🔄 [GeneralTab] Syncing form with property data:', {
        propertyId,
        isNewProperty,
        hasUnsavedChanges,
        propertyName: property?.property_name,
        updatedAt: propertyUpdatedAt
      });

      currentPropertyIdRef.current = propertyId;

      // Use helper function to build form data
      const newFormData = buildFormDataFromProperty(property);

      console.log('📝 [GeneralTab] Rebuilt form data:', newFormData);

      setFormData(newFormData);

      // Only clear unsaved changes flag if this was a property switch
      if (isNewProperty) {
        setHasUnsavedChanges(false);
      }
    } else {
      console.log('⏸️ [GeneralTab] Skipping form sync - has unsaved changes');
    }
  }, [property?.property_id, property?.updated_at, hasUnsavedChanges]); // Watch for data changes

  // Listen for the save event from the parent component
  useEffect(() => {
    const onSave = () => {
      if (hasUnsavedChanges) {
        (async () => {
          try {
            await savePropertyMutation.mutateAsync(formData as FormData);
          } catch (error) {
            console.error('❌ [GeneralTab] saveProperty failed:', error);
          }
        })();
      }
    };
    window.addEventListener('property-edit-save', onSave as EventListener);
    return () => window.removeEventListener('property-edit-save', onSave);
  }, [formData, hasUnsavedChanges, savePropertyMutation]);

  // Emit unsaved changes event to parent for tab switching confirmation
  useEffect(() => {
    const event = new CustomEvent('property-edit-unsaved-changes', {
      detail: { hasChanges: hasUnsavedChanges }
    });
    window.dispatchEvent(event);
    console.log('🔔 [GeneralTab] Dispatched unsaved changes event:', hasUnsavedChanges);
  }, [hasUnsavedChanges]);

  const handleInputChange = (field: keyof FormData, value: string | boolean | number) => {
    console.log('📝 [GeneralTab] Input changed:', { field, value, oldValue: formData[field as keyof typeof formData] });
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    setHasUnsavedChanges(true);

    // Clear validation error for this field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Real-time validation for specific fields
    if (field === 'capacity' || field === 'max_capacity') {
      const errors = validateForm(newFormData);
      setValidationErrors(prev => ({
        ...prev,
        ...(errors.capacity && { capacity: errors.capacity }),
        ...(errors.max_capacity && { max_capacity: errors.max_capacity })
      }));
    }
  };

  const handleSave = () => {
    console.log('💾 [GeneralTab] Save button clicked:', { hasUnsavedChanges, formData });
    (async () => {
      try {
        await savePropertyMutation.mutateAsync(formData as FormData);
      } catch (error) {
        console.error('❌ [GeneralTab] saveProperty failed:', error);
      }
    })();
  };

  const handleLocationSelect = (
    lat: number,
    lng: number,
    address?: string,
    city?: string,
    state?: string,
    postal_code?: string,
    country?: string
  ) => {
    console.log('📍 handleLocationSelect called with:', { lat, lng, address, city, state, postal_code, country });

    // Always update coordinates
    handleInputChange('latitude', lat.toString());
    handleInputChange('longitude', lng.toString());

    // CRITICAL FIX: Always update address fields when provided (not just when empty)
    if (address) {
      console.log('📍 Setting address to:', address);
      handleInputChange('address', address);
    }
    if (city) {
      console.log('📍 Setting city to:', city);
      handleInputChange('city', city);
    }
    if (state) {
      console.log('📍 Setting state to:', state);
      handleInputChange('state', state);
    }
    if (postal_code) {
      console.log('📍 Setting postal_code to:', postal_code);
      handleInputChange('postal_code', postal_code);
    }

    console.log('📍 Location selected - form data will be updated');
    setShowLocationMap(false);
  };

  const propertyTypes = ['Apartment', 'House', 'Condo', 'Villa', 'Studio', 'Townhouse'];

  return (
    <div className="space-y-8 relative">
      {/* Loading overlay */}
      {savePropertyMutation.isPending && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-md">
          <TabLoadingSpinner message="Saving property details..." />
        </div>
      )}

      {/* Unsaved changes indicator */}
      {hasUnsavedChanges && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-amber-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-amber-800">You have unsaved changes</p>
              <p className="text-sm text-amber-700">Don't forget to save your changes before leaving this tab.</p>
            </div>
          </div>
        </div>
      )}

      {/* Status Badges */}
      <div className="flex gap-4 flex-wrap">
        <Badge variant={formData.is_active ? "default" : "secondary"} className="text-sm py-1 px-3">
          <div className={`w-2 h-2 rounded-full mr-2 ${formData.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
          {formData.is_active ? 'Active' : 'Inactive'}
        </Badge>
        <Badge variant={formData.is_booking ? "default" : "outline"} className="text-sm py-1 px-3">
          <Calendar className="w-3 h-3 mr-2" />
          {formData.is_booking ? 'Bookable' : 'Not Bookable'}
        </Badge>
        <Badge variant={formData.is_pets_allowed ? "default" : "outline"} className="text-sm py-1 px-3">
          🐕 {formData.is_pets_allowed ? 'Pets Allowed' : 'No Pets'}
        </Badge>
      </div>

      {/* Basic Information */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
          <CardTitle className="flex items-center gap-3 text-blue-900">
            <Home className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <Checkbox
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
              <Label htmlFor="active" className="font-medium">Property Active</Label>
            </div>
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <Checkbox
                id="booking"
                checked={formData.is_booking}
                onCheckedChange={(checked) => handleInputChange('is_booking', checked)}
              />
              <Label htmlFor="booking" className="font-medium">Available for Booking</Label>
            </div>
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <Checkbox
                id="pets"
                checked={formData.is_pets_allowed}
                onCheckedChange={(checked) => handleInputChange('is_pets_allowed', checked)}
              />
              <Label htmlFor="pets" className="font-medium">Pets Allowed</Label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="property_name" className="text-sm font-medium">Property Name *</Label>
              <Input
                id="property_name"
                value={formData.property_name}
                onChange={(e) => handleInputChange('property_name', e.target.value)}
                className={`h-11 ${validationErrors.property_name ? 'border-red-500 focus:border-red-500' : ''}`}
                placeholder="Enter property name"
              />
              {validationErrors.property_name && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.property_name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Property Type</Label>
              <Select value={formData.property_type} onValueChange={(value) => handleInputChange('property_type', value)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {propertyTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
          <CardTitle className="flex items-center gap-3 text-green-900">
            <MapPin className="h-5 w-5" />
            Location Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium">Street Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              rows={2}
              placeholder="Enter complete address"
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm font-medium">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className="h-11"
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state" className="text-sm font-medium">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                className="h-11"
                placeholder="State"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code" className="text-sm font-medium">Postal Code</Label>
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) => handleInputChange('postal_code', e.target.value)}
                className="h-11"
                placeholder="ZIP/Postal Code"
              />
            </div>
          </div>

          {/* Map Selection Button */}
          <div className="flex justify-center pt-4">
            <Button
              type="button"
              onClick={() => setShowLocationMap(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
              size="lg"
            >
              <MapPin className="mr-2 h-5 w-5" />
              {(formData.latitude && formData.longitude) ? 'Update Location on Map' : 'Select Location on Map'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Capacity & Layout */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
          <CardTitle className="flex items-center gap-3 text-purple-900">
            <Users className="h-5 w-5" />
            Capacity & Layout
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="capacity" className="text-sm font-medium">Standard Capacity</Label>
              <Select value={formData.capacity?.toString()} onValueChange={(value) => handleInputChange('capacity', parseInt(value))}>
                <SelectTrigger className={`h-11 ${validationErrors.capacity ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Select capacity" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(20)].map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1} guests</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.capacity && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.capacity}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_capacity" className="text-sm font-medium">Maximum Capacity</Label>
              <Select value={formData.max_capacity?.toString()} onValueChange={(value) => handleInputChange('max_capacity', parseInt(value))}>
                <SelectTrigger className={`h-11 ${validationErrors.max_capacity ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Select max capacity" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(25)].map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1} guests</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.max_capacity && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.max_capacity}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="size_sqf" className="text-sm font-medium flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                Size (sqft)
              </Label>
              <Input
                id="size_sqf"
                type="number"
                value={formData.size_sqf}
                onChange={(e) => handleInputChange('size_sqf', e.target.value)}
                className={`h-11 ${validationErrors.size_sqf ? 'border-red-500 focus:border-red-500' : ''}`}
                placeholder="Square feet"
              />
              {validationErrors.size_sqf && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.size_sqf}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">🛏️ Bedrooms</Label>
              <Select value={formData.num_bedrooms?.toString()} onValueChange={(value) => handleInputChange('num_bedrooms', parseInt(value))}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="0" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(10)].map((_, i) => (
                    <SelectItem key={i} value={i.toString()}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">🛁 Bathrooms</Label>
              <Select value={formData.num_bathrooms?.toString()} onValueChange={(value) => handleInputChange('num_bathrooms', parseInt(value))}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="0" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(10)].map((_, i) => (
                    <SelectItem key={i} value={i.toString()}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">🚿 Half Baths</Label>
              <Select value={formData.num_half_bath?.toString()} onValueChange={(value) => handleInputChange('num_half_bath', parseInt(value))}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="0" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(5)].map((_, i) => (
                    <SelectItem key={i} value={i.toString()}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">🚽 WCs</Label>
              <Select value={formData.num_wcs?.toString()} onValueChange={(value) => handleInputChange('num_wcs', parseInt(value))}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="0" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(10)].map((_, i) => (
                    <SelectItem key={i} value={i.toString()}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">🍳 Kitchens</Label>
              <Select value={formData.num_kitchens?.toString()} onValueChange={(value) => handleInputChange('num_kitchens', parseInt(value))}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="1" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(5)].map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">🛋️ Living Rooms</Label>
              <Select value={formData.num_living_rooms?.toString()} onValueChange={(value) => handleInputChange('num_living_rooms', parseInt(value))}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="1" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(5)].map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Communication & Connectivity */}
      <Card className="border-l-4 border-l-cyan-500">
        <CardHeader className="bg-gradient-to-r from-cyan-50 to-cyan-100">
          <CardTitle className="flex items-center gap-3 text-cyan-900">
            <Wifi className="h-5 w-5" />
            Communication & Connectivity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="phone_number" className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="phone_number"
                value={formData.phone_number}
                onChange={(e) => handleInputChange('phone_number', e.target.value)}
                className={`h-11 ${validationErrors.phone_number ? 'border-red-500 focus:border-red-500' : ''}`}
                placeholder="(555) 123-4567 or email@domain.com"
              />
              {validationErrors.phone_number && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.phone_number}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="wifi_name" className="text-sm font-medium">WiFi Network Name</Label>
              <Input
                id="wifi_name"
                value={formData.wifi_name}
                onChange={(e) => handleInputChange('wifi_name', e.target.value)}
                className="h-11"
                placeholder="Network SSID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wifi_password" className="text-sm font-medium">WiFi Password</Label>
              <div className="relative">
                <Input
                  id="wifi_password"
                  type={showPasswords.wifi_password ? "text" : "password"}
                  value={formData.wifi_password}
                  onChange={(e) => handleInputChange('wifi_password', e.target.value)}
                  className="h-11 pr-10"
                  placeholder="Password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility('wifi_password')}
                >
                  {showPasswords.wifi_password ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Access & Security */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="bg-gradient-to-r from-red-50 to-red-100">
          <CardTitle className="flex items-center gap-3 text-red-900">
            <Shield className="h-5 w-5" />
            Access & Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="gate_code" className="text-sm font-medium flex items-center gap-2">
                <Key className="h-4 w-4" />
                Gate Code
              </Label>
              <div className="relative">
                <Input
                  id="gate_code"
                  type={showPasswords.gate_code ? "text" : "password"}
                  value={formData.gate_code}
                  onChange={(e) => handleInputChange('gate_code', e.target.value)}
                  className="h-11 pr-10"
                  placeholder="Gate access code"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility('gate_code')}
                >
                  {showPasswords.gate_code ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="door_lock_password" className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Door Lock Code
              </Label>
              <div className="relative">
                <Input
                  id="door_lock_password"
                  type={showPasswords.door_lock_password ? "text" : "password"}
                  value={formData.door_lock_password}
                  onChange={(e) => handleInputChange('door_lock_password', e.target.value)}
                  className="h-11 pr-10"
                  placeholder="Door passcode"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility('door_lock_password')}
                >
                  {showPasswords.door_lock_password ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="alarm_passcode" className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Alarm Code
              </Label>
              <div className="relative">
                <Input
                  id="alarm_passcode"
                  type={showPasswords.alarm_passcode ? "text" : "password"}
                  value={formData.alarm_passcode}
                  onChange={(e) => handleInputChange('alarm_passcode', e.target.value)}
                  className="h-11 pr-10"
                  placeholder="Alarm passcode"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility('alarm_passcode')}
                >
                  {showPasswords.alarm_passcode ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Amenities */}
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-amber-100">
          <CardTitle className="flex items-center gap-3 text-amber-900">
            <Plus className="h-5 w-5" />
            Additional Amenities
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="storage_number" className="text-sm font-medium flex items-center gap-2">
                <Warehouse className="h-4 w-4" />
                Storage Number
              </Label>
              <Input
                id="storage_number"
                value={formData.storage_number}
                onChange={(e) => handleInputChange('storage_number', e.target.value)}
                className="h-11"
                placeholder="Storage unit #"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storage_code" className="text-sm font-medium">Storage Code</Label>
              <div className="relative">
                <Input
                  id="storage_code"
                  type={showPasswords.storage_code ? "text" : "password"}
                  value={formData.storage_code}
                  onChange={(e) => handleInputChange('storage_code', e.target.value)}
                  className="h-11 pr-10"
                  placeholder="Storage access code"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility('storage_code')}
                >
                  {showPasswords.storage_code ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="front_desk" className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Front Desk Info
              </Label>
              <Input
                id="front_desk"
                value={formData.front_desk}
                onChange={(e) => handleInputChange('front_desk', e.target.value)}
                className="h-11"
                placeholder="Front desk details"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="garage_number" className="text-sm font-medium">🚗 Garage Number</Label>
              <Input
                id="garage_number"
                value={formData.garage_number}
                onChange={(e) => handleInputChange('garage_number', e.target.value)}
                className="h-11"
                placeholder="Parking spot #"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mailing_box" className="text-sm font-medium">📮 Mailbox Number</Label>
              <Input
                id="mailing_box"
                value={formData.mailing_box}
                onChange={(e) => handleInputChange('mailing_box', e.target.value)}
                className="h-11"
                placeholder="Mailbox #"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pool_access_code" className="text-sm font-medium">🏊 Pool Access Code</Label>
              <div className="relative">
                <Input
                  id="pool_access_code"
                  type={showPasswords.pool_access_code ? "text" : "password"}
                  value={formData.pool_access_code}
                  onChange={(e) => handleInputChange('pool_access_code', e.target.value)}
                  className="h-11 pr-10"
                  placeholder="Pool code"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility('pool_access_code')}
                >
                  {showPasswords.pool_access_code ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Section */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                <AlertCircle className="w-3 h-3 mr-1" />
                Unsaved changes
              </Badge>
            )}
            {!hasUnsavedChanges && !savePropertyMutation.isPending && (
              <Badge variant="outline" className="text-green-600 border-green-300">
                <Check className="w-3 h-3 mr-1" />
                All changes saved
              </Badge>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={savePropertyMutation.isPending || !hasUnsavedChanges}
            className="bg-primary hover:bg-primary/90 shadow-lg min-w-[120px]"
          >
            {savePropertyMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Location Map Modal */}
      <LocationMap
        isOpen={showLocationMap}
        onClose={() => setShowLocationMap(false)}
        onLocationSelect={handleLocationSelect}
        initialLat={formData.latitude ? parseFloat(String(formData.latitude)) : undefined}
        initialLng={formData.longitude ? parseFloat(String(formData.longitude)) : undefined}
        initialAddress={formData.address}
      />
    </div>
  );
}