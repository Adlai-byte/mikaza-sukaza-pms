import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { VendorCOI, vendorCOISchema } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';

interface UseVendorCOIsOptions {
  vendor_id?: string;
  property_id?: string;
  status?: string;
  coverage_type?: string;
}

export function useVendorCOIs(options: UseVendorCOIsOptions = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch vendor COIs with optional filters
  const {
    data: cois = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['vendor-cois', options],
    queryFn: async () => {
      let query = supabase
        .from('vendor_cois')
        .select(`
          *,
          vendor:providers(provider_id, provider_name, provider_type, contact_person, phone_primary, email),
          property:properties(property_id, property_type),
          uploaded_user:users!vendor_cois_uploaded_by_fkey(user_id, first_name, last_name, email),
          verified_user:users!vendor_cois_verified_by_fkey(user_id, first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (options.vendor_id) {
        query = query.eq('vendor_id', options.vendor_id);
      }
      if (options.property_id) {
        query = query.eq('property_id', options.property_id);
      }
      if (options.status) {
        query = query.eq('status', options.status);
      }
      if (options.coverage_type) {
        query = query.eq('coverage_type', options.coverage_type);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching vendor COIs:', error);
        throw error;
      }

      return data as VendorCOI[];
    },
  });

  // Create new vendor COI
  const createCOI = useMutation({
    mutationFn: async (coiData: Partial<VendorCOI>) => {
      const { data, error } = await supabase
        .from('vendor_cois')
        .insert([{
          ...coiData,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        }])
        .select(`
          *,
          vendor:providers(provider_id, provider_name, provider_type, contact_person, phone_primary, email),
          property:properties(property_id, property_type)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-cois'] });
      queryClient.invalidateQueries({ queryKey: ['coi-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['expiring-cois'] });
      toast({
        title: 'COI Added',
        description: 'Vendor certificate of insurance has been successfully added.',
      });
    },
    onError: (error: any) => {
      console.error('Error creating vendor COI:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add vendor COI. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Update existing vendor COI
  const updateCOI = useMutation({
    mutationFn: async (coiData: Partial<VendorCOI> & { coi_id: string }) => {
      const { coi_id, ...updates } = coiData;

      const { data, error } = await supabase
        .from('vendor_cois')
        .update(updates)
        .eq('coi_id', coi_id)
        .select(`
          *,
          vendor:providers(provider_id, provider_name, provider_type, contact_person, phone_primary, email),
          property:properties(property_id, property_type)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-cois'] });
      queryClient.invalidateQueries({ queryKey: ['coi-dashboard-stats'] });
      toast({
        title: 'COI Updated',
        description: 'Vendor certificate of insurance has been updated.',
      });
    },
    onError: (error: any) => {
      console.error('Error updating vendor COI:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update vendor COI.',
        variant: 'destructive',
      });
    },
  });

  // Delete vendor COI
  const deleteCOI = useMutation({
    mutationFn: async (coi_id: string) => {
      const { error } = await supabase
        .from('vendor_cois')
        .delete()
        .eq('coi_id', coi_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-cois'] });
      queryClient.invalidateQueries({ queryKey: ['coi-dashboard-stats'] });
      toast({
        title: 'COI Deleted',
        description: 'Vendor certificate of insurance has been removed.',
      });
    },
    onError: (error: any) => {
      console.error('Error deleting vendor COI:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete vendor COI.',
        variant: 'destructive',
      });
    },
  });

  // Verify COI
  const verifyCOI = useMutation({
    mutationFn: async (coi_id: string) => {
      const user = (await supabase.auth.getUser()).data.user;

      const { data, error } = await supabase
        .from('vendor_cois')
        .update({
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
        })
        .eq('coi_id', coi_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-cois'] });
      toast({
        title: 'COI Verified',
        description: 'Certificate of insurance has been verified.',
      });
    },
    onError: (error: any) => {
      console.error('Error verifying COI:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to verify COI.',
        variant: 'destructive',
      });
    },
  });

  // Upload COI file to Supabase Storage
  const uploadCOIFile = async (file: File, vendor_id: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${vendor_id}/${Date.now()}.${fileExt}`;
      const filePath = `coi/${fileName}`;

      // Upload to storage (COI documents go in property-documents bucket)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('property-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('property-documents')
        .getPublicUrl(filePath);

      return { file_url: publicUrl, file_name: file.name };
    } catch (error: any) {
      console.error('Error uploading COI file:', error);
      throw error;
    }
  };

  return {
    cois,
    isLoading,
    error,
    refetch,
    createCOI: createCOI.mutateAsync,
    updateCOI: updateCOI.mutateAsync,
    deleteCOI: deleteCOI.mutateAsync,
    verifyCOI: verifyCOI.mutateAsync,
    uploadCOIFile,
    isCreating: createCOI.isPending,
    isUpdating: updateCOI.isPending,
    isDeleting: deleteCOI.isPending,
    isVerifying: verifyCOI.isPending,
  };
}

// Hook to check if vendor has valid COI for specific coverage types
export function useVendorCOIValidation(vendor_id?: string, coverage_types: string[] = ['general_liability']) {
  return useQuery({
    queryKey: ['vendor-coi-validation', vendor_id, coverage_types],
    queryFn: async () => {
      if (!vendor_id) return null;

      const { data, error } = await supabase
        .rpc('check_vendor_coi_valid', {
          p_vendor_id: vendor_id,
          p_coverage_types: coverage_types,
        });

      if (error) throw error;

      return data?.[0] || null;
    },
    enabled: !!vendor_id,
  });
}

// Hook to get expiring COIs
export function useExpiringCOIs(days_ahead: number = 30) {
  return useQuery({
    queryKey: ['expiring-cois', days_ahead],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_expiring_cois', { days_ahead });

      if (error) throw error;
      return data || [];
    },
  });
}
