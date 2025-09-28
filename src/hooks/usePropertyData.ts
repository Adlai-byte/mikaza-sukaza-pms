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
        title: "Error",
        description: "Failed to load property data",
        variant: "destructive",
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
        title: "Success",
        description: "Property updated successfully",
      });

    } catch (error) {
      console.error('Error updating property:', error);
      toast({
        title: "Error",
        description: "Failed to update property",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [propertyId, data, toast]);

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
    refreshData
  };
}