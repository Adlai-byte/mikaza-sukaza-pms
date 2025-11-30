import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BuildingCOI, buildingCOISchema } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';

interface UseBuildingCOIsOptions {
  property_id?: string;
}

export function useBuildingCOIs(options: UseBuildingCOIsOptions = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch building COIs with optional filters
  const {
    data: buildingCOIs = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['building-cois', options],
    queryFn: async () => {
      let query = supabase
        .from('building_cois')
        .select(`
          *,
          property:properties(property_id, property_type),
          created_user:users!building_cois_created_by_fkey(user_id, first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (options.property_id) {
        query = query.eq('property_id', options.property_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching building COIs:', error);
        throw error;
      }

      return data as BuildingCOI[];
    },
  });

  // Get single building COI by property
  const getBuildingCOIByProperty = async (property_id: string) => {
    const { data, error } = await supabase
      .from('building_cois')
      .select(`
        *,
        property:properties(property_id, property_type)
      `)
      .eq('property_id', property_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" error
      throw error;
    }

    return data as BuildingCOI | null;
  };

  // Create new building COI
  const createBuildingCOI = useMutation({
    mutationFn: async (coiData: Partial<BuildingCOI>) => {
      // Validate with schema
      const validated = buildingCOISchema.parse(coiData);

      const { data, error } = await supabase
        .from('building_cois')
        .insert([{
          ...validated,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        }])
        .select(`
          *,
          property:properties(property_id, property_type)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['building-cois'] });
      toast({
        title: 'Building Requirements Added',
        description: 'Building COI requirements have been successfully created.',
      });
    },
    onError: (error: any) => {
      console.error('Error creating building COI:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create building COI requirements. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Update existing building COI
  const updateBuildingCOI = useMutation({
    mutationFn: async ({ building_coi_id, updates }: { building_coi_id: string; updates: Partial<BuildingCOI> }) => {
      const { data, error } = await supabase
        .from('building_cois')
        .update(updates)
        .eq('building_coi_id', building_coi_id)
        .select(`
          *,
          property:properties(property_id, property_type)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['building-cois'] });
      toast({
        title: 'Building Requirements Updated',
        description: 'Building COI requirements have been updated successfully.',
      });
    },
    onError: (error: any) => {
      console.error('Error updating building COI:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update building COI requirements.',
        variant: 'destructive',
      });
    },
  });

  // Delete building COI
  const deleteBuildingCOI = useMutation({
    mutationFn: async (building_coi_id: string) => {
      const { error } = await supabase
        .from('building_cois')
        .delete()
        .eq('building_coi_id', building_coi_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['building-cois'] });
      toast({
        title: 'Building Requirements Deleted',
        description: 'Building COI requirements have been removed.',
      });
    },
    onError: (error: any) => {
      console.error('Error deleting building COI:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete building COI requirements.',
        variant: 'destructive',
      });
    },
  });

  return {
    buildingCOIs,
    isLoading,
    error,
    refetch,
    getBuildingCOIByProperty,
    createBuildingCOI: createBuildingCOI.mutateAsync,
    updateBuildingCOI: updateBuildingCOI.mutateAsync,
    deleteBuildingCOI: deleteBuildingCOI.mutateAsync,
    isCreating: createBuildingCOI.isPending,
    isUpdating: updateBuildingCOI.isPending,
    isDeleting: deleteBuildingCOI.isPending,
  };
}

// Hook to get building COI for a specific property
export function useBuildingCOIByProperty(property_id?: string) {
  return useQuery({
    queryKey: ['building-coi-by-property', property_id],
    queryFn: async () => {
      if (!property_id) return null;

      const { data, error } = await supabase
        .from('building_cois')
        .select(`
          *,
          property:properties(property_id, property_type)
        `)
        .eq('property_id', property_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" error - return null for not found
        throw error;
      }

      return data as BuildingCOI | null;
    },
    enabled: !!property_id,
  });
}

// Hook to validate vendor against building requirements
export function useValidateVendorForBuilding(
  vendor_id?: string,
  property_id?: string
) {
  return useQuery({
    queryKey: ['validate-vendor-building', vendor_id, property_id],
    queryFn: async () => {
      if (!vendor_id || !property_id) return null;

      // Get building requirements
      const { data: buildingCOI, error: buildingError } = await supabase
        .from('building_cois')
        .select('required_coverages')
        .eq('property_id', property_id)
        .single();

      if (buildingError && buildingError.code !== 'PGRST116') {
        throw buildingError;
      }

      // If no building requirements, vendor is valid
      if (!buildingCOI || !buildingCOI.required_coverages) {
        return {
          is_valid: true,
          missing_coverages: [],
          building_has_requirements: false,
        };
      }

      // Get vendor COIs
      const { data: vendorCOIs, error: vendorError } = await supabase
        .from('vendor_cois')
        .select('coverage_type, coverage_amount, status, valid_through')
        .eq('vendor_id', vendor_id)
        .in('status', ['active', 'expiring_soon'])
        .gte('valid_through', new Date().toISOString().split('T')[0]);

      if (vendorError) throw vendorError;

      // Check each required coverage
      const requiredCoverages = buildingCOI.required_coverages as Record<
        string,
        { min_amount: number; required: boolean }
      >;
      const missingCoverages: string[] = [];

      Object.entries(requiredCoverages).forEach(([coverageType, requirements]) => {
        if (!requirements.required) return;

        const vendorCoverage = vendorCOIs?.find(
          (coi) => coi.coverage_type === coverageType
        );

        if (!vendorCoverage) {
          missingCoverages.push(coverageType);
        } else if (vendorCoverage.coverage_amount < requirements.min_amount) {
          missingCoverages.push(`${coverageType} (insufficient coverage)`);
        }
      });

      return {
        is_valid: missingCoverages.length === 0,
        missing_coverages: missingCoverages,
        building_has_requirements: true,
        required_coverages: requiredCoverages,
      };
    },
    enabled: !!vendor_id && !!property_id,
  });
}
