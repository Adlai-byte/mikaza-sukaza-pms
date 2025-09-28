import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PropertyData {
  property: any;
  providers: any[];
  vehicles: any[];
  financialEntries: any[];
  checklists: any[];
  bookings: any[];
  notes: any[];
  qrCodes: any[];
  bookingRates: any;
}

// Helpers to sanitize and coerce form values before saving
const toIntOrNull = (v: any) => {
  if (v === '' || v === undefined || v === null) return null;
  const n = typeof v === 'string' ? parseInt(v, 10) : v;
  return Number.isFinite(n) ? n : null;
};
const toNumberOrNull = (v: any) => {
  if (v === '' || v === undefined || v === null) return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
};
const toBool = (v: any) => v === true; // guard against "indeterminate" from Radix

export function usePropertyData(propertyId: string) {
  const [data, setData] = useState<PropertyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchAllPropertyData = useCallback(async () => {
    if (!propertyId) return;

    try {
      setLoading(true);

      // Fetch all property data in parallel
      const [
        propertyResult,
        providersResult,
        vehiclesResult,
        financialResult,
        checklistsResult,
        bookingsResult,
        notesResult,
        qrCodesResult,
        bookingRatesResult
      ] = await Promise.all([
        supabase
          .from('properties')
          .select(`
            *,
            property_location(*),
            property_communication(*),
            property_access(*),
            property_extras(*),
            units(*),
            property_images(*),
            property_amenities(amenities(*)),
            property_rules(rules(*))
          `)
          .eq('property_id', propertyId)
          .single(),

        supabase
          .from('property_providers')
          .select('*')
          .eq('property_id', propertyId)
          .order('created_at', { ascending: false }),

        supabase
          .from('property_vehicles')
          .select('*')
          .eq('property_id', propertyId)
          .order('created_at', { ascending: false }),

        supabase
          .from('property_financial_entries')
          .select('*')
          .eq('property_id', propertyId)
          .order('entry_date', { ascending: false }),

        supabase
          .from('property_checklists')
          .select('*')
          .eq('property_id', propertyId)
          .order('created_at', { ascending: false }),

        supabase
          .from('property_bookings')
          .select('*')
          .eq('property_id', propertyId)
          .order('check_in_date', { ascending: false }),

        supabase
          .from('property_notes')
          .select('*')
          .eq('property_id', propertyId)
          .order('created_at', { ascending: false }),

        supabase
          .from('property_qr_codes')
          .select('*')
          .eq('property_id', propertyId)
          .order('created_at', { ascending: false }),

        supabase
          .from('property_booking_rates')
          .select('*')
          .eq('property_id', propertyId)
          .maybeSingle()
      ]);

      // Check for errors
      if (propertyResult.error) throw propertyResult.error;
      if (providersResult.error) throw providersResult.error;
      if (vehiclesResult.error) throw vehiclesResult.error;
      if (financialResult.error) throw financialResult.error;
      if (checklistsResult.error) throw checklistsResult.error;
      if (bookingsResult.error) throw bookingsResult.error;
      if (notesResult.error) throw notesResult.error;
      if (qrCodesResult.error) throw qrCodesResult.error;
      if (bookingRatesResult.error) throw bookingRatesResult.error;

      setData({
        property: propertyResult.data,
        providers: providersResult.data || [],
        vehicles: vehiclesResult.data || [],
        financialEntries: financialResult.data || [],
        checklists: checklistsResult.data || [],
        bookings: bookingsResult.data || [],
        notes: notesResult.data || [],
        qrCodes: qrCodesResult.data || [],
        bookingRates: bookingRatesResult.data || null
      });
    } catch (error) {
      console.error('Error fetching property data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load property data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [propertyId, toast]);

  const updatePropertyData = useCallback(async (updates: Partial<any>) => {
    if (!propertyId || !data) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('properties')
        .update(updates)
        .eq('property_id', propertyId);

      if (error) throw error;

      // Update local state
      setData(prev => prev ? {
        ...prev,
        property: { ...prev.property, ...updates }
      } : null);

      toast({
        title: 'Success',
        description: 'Property updated successfully',
      });
    } catch (error) {
      console.error('Error updating property:', error);
      toast({
        title: 'Error',
        description: 'Failed to update property',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [propertyId, data, toast]);

  // Save General tab details (root + child tables)
  const updateGeneralDetails = useCallback(async (form: any) => {
    if (!propertyId) return;

    try {
      setSaving(true);

      const rootUpdates: any = {
        is_active: toBool(form.is_active),
        is_booking: toBool(form.is_booking),
        is_pets_allowed: toBool(form.is_pets_allowed),
        property_name: form.property_name,
        property_type: form.property_type,
        capacity: toIntOrNull(form.capacity),
        max_capacity: toIntOrNull(form.max_capacity),
        size_sqf: toIntOrNull(form.size_sqf),
        num_bedrooms: toIntOrNull(form.num_bedrooms),
        num_bathrooms: toIntOrNull(form.num_bathrooms),
        num_half_bath: toIntOrNull(form.num_half_bath),
        num_wcs: toIntOrNull(form.num_wcs),
        num_kitchens: toIntOrNull(form.num_kitchens),
        num_living_rooms: toIntOrNull(form.num_living_rooms),
      };

      // Update main property row
      const { error: propError } = await supabase
        .from('properties')
        .update(rootUpdates)
        .eq('property_id', propertyId);
      if (propError) throw propError;

      // property_location
      {
        const { data: exists, error } = await supabase
          .from('property_location')
          .select('property_id')
          .eq('property_id', propertyId)
          .maybeSingle();
        if (error && (error as any).code !== 'PGRST116') throw error;
        if (exists) {
          const { error: upd } = await supabase
            .from('property_location')
            .update({
              address: form.address || null,
              city: form.city || null,
              state: form.state || null,
              postal_code: form.postal_code || null,
              latitude: toNumberOrNull(form.latitude),
              longitude: toNumberOrNull(form.longitude),
            })
            .eq('property_id', propertyId);
          if (upd) throw upd;
        } else {
          const { error: ins } = await supabase
            .from('property_location')
            .insert({
              property_id: propertyId,
              address: form.address || null,
              city: form.city || null,
              state: form.state || null,
              postal_code: form.postal_code || null,
              latitude: toNumberOrNull(form.latitude),
              longitude: toNumberOrNull(form.longitude),
            });
          if (ins) throw ins;
        }
      }

      // property_communication
      {
        const { data: exists, error } = await supabase
          .from('property_communication')
          .select('property_id')
          .eq('property_id', propertyId)
          .maybeSingle();
        if (error && (error as any).code !== 'PGRST116') throw error;
        if (exists) {
          const { error: upd } = await supabase
            .from('property_communication')
            .update({
              phone_number: form.phone_number,
              wifi_name: form.wifi_name,
              wifi_password: form.wifi_password,
            })
            .eq('property_id', propertyId);
          if (upd) throw upd;
        } else {
          const { error: ins } = await supabase
            .from('property_communication')
            .insert({
              property_id: propertyId,
              phone_number: form.phone_number,
              wifi_name: form.wifi_name,
              wifi_password: form.wifi_password,
            });
          if (ins) throw ins;
        }
      }

      // property_access
      {
        const { data: exists, error } = await supabase
          .from('property_access')
          .select('property_id')
          .eq('property_id', propertyId)
          .maybeSingle();
        if (error && (error as any).code !== 'PGRST116') throw error;
        if (exists) {
          const { error: upd } = await supabase
            .from('property_access')
            .update({
              gate_code: form.gate_code,
              door_lock_password: form.door_lock_password,
              alarm_passcode: form.alarm_passcode,
            })
            .eq('property_id', propertyId);
          if (upd) throw upd;
        } else {
          const { error: ins } = await supabase
            .from('property_access')
            .insert({
              property_id: propertyId,
              gate_code: form.gate_code,
              door_lock_password: form.door_lock_password,
              alarm_passcode: form.alarm_passcode,
            });
          if (ins) throw ins;
        }
      }

      // property_extras
      {
        const { data: exists, error } = await supabase
          .from('property_extras')
          .select('property_id')
          .eq('property_id', propertyId)
          .maybeSingle();
        if (error && (error as any).code !== 'PGRST116') throw error;
        if (exists) {
          const { error: upd } = await supabase
            .from('property_extras')
            .update({
              storage_number: form.storage_number,
              storage_code: form.storage_code,
              front_desk: form.front_desk,
              garage_number: form.garage_number,
              mailing_box: form.mailing_box,
              pool_access_code: form.pool_access_code,
            })
            .eq('property_id', propertyId);
          if (upd) throw upd;
        } else {
          const { error: ins } = await supabase
            .from('property_extras')
            .insert({
              property_id: propertyId,
              storage_number: form.storage_number,
              storage_code: form.storage_code,
              front_desk: form.front_desk,
              garage_number: form.garage_number,
              mailing_box: form.mailing_box,
              pool_access_code: form.pool_access_code,
            });
          if (ins) throw ins;
        }
      }

      toast({ title: 'Success', description: 'Property details saved' });
      await fetchAllPropertyData();
    } catch (error) {
      console.error('Error saving property details:', error);
      toast({
        title: 'Error',
        description: (error as any)?.message || 'Failed to save property details',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [propertyId, toast, fetchAllPropertyData]);

  const refreshData = useCallback(() => {
    fetchAllPropertyData();
  }, [fetchAllPropertyData]);

  useEffect(() => {
    fetchAllPropertyData();
  }, [fetchAllPropertyData]);

  return {
    data,
    loading,
    saving,
    updateProperty: updatePropertyData,
    updateGeneralDetails,
    refreshData,
  } as const;
}
