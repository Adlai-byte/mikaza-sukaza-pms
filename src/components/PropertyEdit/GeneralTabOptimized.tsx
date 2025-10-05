import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { TabLoadingSpinner } from './PropertyEditSkeleton';
import { LocationMap } from '@/components/ui/location-map-new';
import { Property, PropertyLocation, PropertyCommunication, PropertyAccess, PropertyExtras } from '@/lib/schemas';

interface ExtendedProperty extends Property {
  property_location?: PropertyLocation[];
  property_communication?: PropertyCommunication[];
  property_access?: PropertyAccess[];
  property_extras?: PropertyExtras[];
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
  console.log('🏠 [GeneralTabOptimized] Component rendered with property:', {
    property,
    propertyId: property?.property_id,
    propertyName: property?.property_name,
    // Check both field name formats
    hasLocation: !!(property?.location || property?.property_location),
    hasCommunication: !!(property?.communication || property?.property_communication),
    hasAccess: !!(property?.access || property?.property_access),
    hasExtras: !!(property?.extras || property?.property_extras),
    // Show actual data
    location: property?.location,
    property_location: property?.property_location,
    communication: property?.communication,
    property_communication: property?.property_communication,
    access: property?.access,
    property_access: property?.property_access,
    extras: property?.extras,
    property_extras: property?.property_extras
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showLocationMap, setShowLocationMap] = useState(false);

  // Helper to get location data (handle both array and single object, and both field name formats)
  const getLocation = () => {
    // Check both aliased name (location) and full table name (property_location)
    const loc = property.location || property.property_location;
    if (Array.isArray(loc)) return loc[0];
    return loc as any;
  };
  const getCommunication = () => {
    const comm = property.communication || property.property_communication;
    if (Array.isArray(comm)) return comm[0];
    return comm as any;
  };
  const getAccess = () => {
    const acc = property.access || property.property_access;
    if (Array.isArray(acc)) return acc[0];
    return acc as any;
  };
  const getExtras = () => {
    const ext = property.extras || property.property_extras;
    if (Array.isArray(ext)) return ext[0];
    return ext as any;
  };

  const locationData = getLocation();
  const communicationData = getCommunication();
  const accessData = getAccess();
  const extrasData = getExtras();

  const [formData, setFormData] = useState({
    // Basic Information
    is_active: property.is_active || false,
    is_booking: property.is_booking || false,
    is_pets_allowed: property.is_pets_allowed || false,
    property_name: property.property_name || '',
    property_type: property.property_type || '',

    // Property Details
    capacity: String(property.capacity || ''),
    max_capacity: String(property.max_capacity || ''),
    size_sqf: String(property.size_sqf || ''),
    num_bedrooms: String(property.num_bedrooms || ''),
    num_bathrooms: String(property.num_bathrooms || ''),
    num_half_bath: String(property.num_half_bath || ''),
    num_wcs: String(property.num_wcs || ''),
    num_kitchens: String(property.num_kitchens || ''),
    num_living_rooms: String(property.num_living_rooms || ''),

    // Location
    address: locationData?.address || '',
    city: locationData?.city || '',
    state: locationData?.state || '',
    postal_code: locationData?.postal_code || '',
    latitude: String(locationData?.latitude || ''),
    longitude: String(locationData?.longitude || ''),

    // Communication
    phone_number: communicationData?.phone_number || '',
    wifi_name: communicationData?.wifi_name || '',
    wifi_password: communicationData?.wifi_password || '',

    // Access
    gate_code: accessData?.gate_code || '',
    door_lock_password: accessData?.door_lock_password || '',
    alarm_passcode: accessData?.alarm_passcode || '',

    // Extras
    storage_number: extrasData?.storage_number || '',
    storage_code: extrasData?.storage_code || '',
    front_desk: extrasData?.front_desk || '',
    garage_number: extrasData?.garage_number || '',
    mailing_box: extrasData?.mailing_box || '',
    pool_access_code: extrasData?.pool_access_code || '',
  });

  // Re-initialize formData when property changes (after save/reload)
  useEffect(() => {
    const loc = getLocation();
    const comm = getCommunication();
    const acc = getAccess();
    const ext = getExtras();

    console.log('🔄 [GeneralTabOptimized] Property changed, re-initializing form data:', {
      property_id: property.property_id,
      property_name: property.property_name,
      locationData: loc,
      locationAddress: loc?.address,
      locationCity: loc?.city,
      communicationData: comm,
      commPhone: comm?.phone_number,
      commWifi: comm?.wifi_name,
      accessData: acc,
      accessGate: acc?.gate_code,
      extrasData: ext,
      extrasStorage: ext?.storage_number
    });

    setFormData({
      // Basic Information
      is_active: property.is_active || false,
      is_booking: property.is_booking || false,
      is_pets_allowed: property.is_pets_allowed || false,
      property_name: property.property_name || '',
      property_type: property.property_type || '',

      // Property Details
      capacity: String(property.capacity || ''),
      max_capacity: String(property.max_capacity || ''),
      size_sqf: String(property.size_sqf || ''),
      num_bedrooms: String(property.num_bedrooms || ''),
      num_bathrooms: String(property.num_bathrooms || ''),
      num_half_bath: String(property.num_half_bath || ''),
      num_wcs: String(property.num_wcs || ''),
      num_kitchens: String(property.num_kitchens || ''),
      num_living_rooms: String(property.num_living_rooms || ''),

      // Location
      address: loc?.address || '',
      city: loc?.city || '',
      state: loc?.state || '',
      postal_code: loc?.postal_code || '',
      latitude: String(loc?.latitude || ''),
      longitude: String(loc?.longitude || ''),

      // Communication
      phone_number: comm?.phone_number || '',
      wifi_name: comm?.wifi_name || '',
      wifi_password: comm?.wifi_password || '',

      // Access
      gate_code: acc?.gate_code || '',
      door_lock_password: acc?.door_lock_password || '',
      alarm_passcode: acc?.alarm_passcode || '',

      // Extras
      storage_number: ext?.storage_number || '',
      storage_code: ext?.storage_code || '',
      front_desk: ext?.front_desk || '',
      garage_number: ext?.garage_number || '',
      mailing_box: ext?.mailing_box || '',
      pool_access_code: ext?.pool_access_code || '',
    });

    // Reset unsaved changes when property changes
    setHasUnsavedChanges(false);
  }, [property, property.property_id]); // Re-run when property object changes

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

  // React Query mutation for saving with optimistic updates
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

      const rootUpdates: Partial<Property> = {
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
      };

      // Update main property
      console.log('📊 [GeneralTab] Updating main properties table:', rootUpdates);
      const { error: propError } = await supabase
        .from('properties')
        .update(rootUpdates)
        .eq('property_id', propertyId);
      if (propError) {
        console.error('❌ [GeneralTab] Properties table update error:', propError);
        throw propError;
      }
      console.log('✅ [GeneralTab] Properties table updated successfully');

      // Helper function to upsert related tables using Supabase's upsert
      const upsertTable = async (tableName: 'property_location' | 'property_communication' | 'property_access' | 'property_extras', data: Record<string, unknown>) => {
        console.log(`🔄 [GeneralTab] Upserting ${tableName}:`, data);

        const { error } = await supabase
          .from(tableName as any)
          .upsert({ ...data, property_id: propertyId }, {
            onConflict: 'property_id',
            ignoreDuplicates: false
          });

        if (error) {
          console.error(`❌ [GeneralTab] ${tableName} upsert error:`, error);
          throw error;
        }
        console.log(`✅ [GeneralTab] ${tableName} upserted successfully`);
      };

      // Update all tables in parallel for maximum speed
      await Promise.all([
        upsertTable('property_location', {
          address: formValues.address || null,
          city: formValues.city || null,
          state: formValues.state || null,
          postal_code: formValues.postal_code || null,
          latitude: toNumberOrNull(formValues.latitude),
          longitude: toNumberOrNull(formValues.longitude),
        }),
        upsertTable('property_communication', {
          phone_number: formValues.phone_number,
          wifi_name: formValues.wifi_name,
          wifi_password: formValues.wifi_password,
        }),
        upsertTable('property_access', {
          gate_code: formValues.gate_code,
          door_lock_password: formValues.door_lock_password,
          alarm_passcode: formValues.alarm_passcode,
        }),
        upsertTable('property_extras', {
          storage_number: formValues.storage_number,
          storage_code: formValues.storage_code,
          front_desk: formValues.front_desk,
          garage_number: formValues.garage_number,
          mailing_box: formValues.mailing_box,
          pool_access_code: formValues.pool_access_code,
        })
      ]);

      return formValues;
    },
    onMutate: async (formValues) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['properties'] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['properties']);

      // Optimistically update the cache
      queryClient.setQueryData(['properties'], (old: any) => {
        if (!old) return old;
        return old.map((p: any) =>
          p.property_id === property.property_id
            ? { ...p, ...formValues, updated_at: new Date().toISOString() }
            : p
        );
      });

      setHasUnsavedChanges(false);
      // Notify parent that changes are saved
      window.dispatchEvent(new CustomEvent('property-edit-unsaved-changes', { detail: { hasChanges: false } }));

      return { previousData };
    },
    onSuccess: (data) => {
      console.log('🎉 [GeneralTab] Save mutation successful:', data);

      toast({
        title: '✅ Property Saved',
        description: 'Changes saved successfully',
        className: 'border-green-200 bg-green-50 text-green-800',
      });

      // Invalidate both list and detail queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['properties', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['properties', 'detail', property.property_id] });

      console.log('🔄 [GeneralTab] Invalidated queries for property:', property.property_id);
    },
    onError: (error, formValues, context) => {
      // Rollback optimistic update on error
      if (context?.previousData) {
        queryClient.setQueryData(['properties'], context.previousData);
      }

      console.error('Error saving property:', error);
      toast({
        title: 'Error',
        description: (error as Error)?.message || 'Failed to save property details',
        variant: 'destructive',
      });

      setHasUnsavedChanges(true);
    },
  });

  const handleInputChange = (field: keyof FormData, value: string | boolean | number) => {
    console.log('📝 [GeneralTab] Input changed:', { field, value, oldValue: formData[field as keyof typeof formData] });
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    setHasUnsavedChanges(true);

    // Notify parent about unsaved changes
    window.dispatchEvent(new CustomEvent('property-edit-unsaved-changes', { detail: { hasChanges: true } }));

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

  const handleLocationSelect = (lat: number, lng: number, address?: string) => {
    handleInputChange('latitude', lat.toString());
    handleInputChange('longitude', lng.toString());
    if (address && !formData.address) {
      handleInputChange('address', address);
    }
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
              <Input
                id="wifi_password"
                type="password"
                value={formData.wifi_password}
                onChange={(e) => handleInputChange('wifi_password', e.target.value)}
                className="h-11"
                placeholder="Password"
              />
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
              <Input
                id="gate_code"
                value={formData.gate_code}
                onChange={(e) => handleInputChange('gate_code', e.target.value)}
                className="h-11"
                placeholder="Gate access code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="door_lock_password" className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Door Lock Code
              </Label>
              <Input
                id="door_lock_password"
                value={formData.door_lock_password}
                onChange={(e) => handleInputChange('door_lock_password', e.target.value)}
                className="h-11"
                placeholder="Door passcode"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alarm_passcode" className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Alarm Code
              </Label>
              <Input
                id="alarm_passcode"
                value={formData.alarm_passcode}
                onChange={(e) => handleInputChange('alarm_passcode', e.target.value)}
                className="h-11"
                placeholder="Alarm passcode"
              />
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
              <Input
                id="storage_code"
                value={formData.storage_code}
                onChange={(e) => handleInputChange('storage_code', e.target.value)}
                className="h-11"
                placeholder="Storage access code"
              />
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
              <Input
                id="pool_access_code"
                value={formData.pool_access_code}
                onChange={(e) => handleInputChange('pool_access_code', e.target.value)}
                className="h-11"
                placeholder="Pool code"
              />
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
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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