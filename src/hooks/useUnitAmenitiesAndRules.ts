/**
 * Hook for managing per-unit amenities and rules
 * Provides queries and mutations for unit-specific amenities/rules
 * Units without settings inherit from property-level
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { propertyKeys } from "@/hooks/usePropertiesOptimized";
import { Amenity, Rule } from "@/lib/schemas";

// Query keys for unit amenities/rules
export const unitFeatureKeys = {
  all: ['unit_features'] as const,
  amenities: (unitId: string) => [...unitFeatureKeys.all, 'amenities', unitId] as const,
  rules: (unitId: string) => [...unitFeatureKeys.all, 'rules', unitId] as const,
};

// Types
interface UnitAmenityRow {
  unit_id: string;
  amenity_id: string;
  created_at: string;
  amenity: {
    amenity_id: string;
    amenity_name: string;
  };
}

interface UnitRuleRow {
  unit_id: string;
  rule_id: string;
  created_at: string;
  rule: {
    rule_id: string;
    rule_name: string;
  };
}

interface UpdateUnitAmenitiesInput {
  unitId: string;
  amenityIds: string[];
}

interface UpdateUnitRulesInput {
  unitId: string;
  ruleIds: string[];
}

/**
 * Fetch amenities for a specific unit
 */
export function useUnitAmenities(unitId: string | null) {
  return useQuery({
    queryKey: unitFeatureKeys.amenities(unitId || ''),
    queryFn: async () => {
      if (!unitId) return [];

      const { data, error } = await supabase
        .from('unit_amenities')
        .select(`
          unit_id,
          amenity_id,
          created_at,
          amenity:amenities(amenity_id, amenity_name)
        `)
        .eq('unit_id', unitId);

      if (error) throw error;

      // Transform to Amenity[]
      return (data as UnitAmenityRow[] || []).map(row => ({
        amenity_id: row.amenity.amenity_id,
        amenity_name: row.amenity.amenity_name,
      })) as Amenity[];
    },
    enabled: !!unitId,
  });
}

/**
 * Fetch rules for a specific unit
 */
export function useUnitRules(unitId: string | null) {
  return useQuery({
    queryKey: unitFeatureKeys.rules(unitId || ''),
    queryFn: async () => {
      if (!unitId) return [];

      const { data, error } = await supabase
        .from('unit_rules')
        .select(`
          unit_id,
          rule_id,
          created_at,
          rule:rules(rule_id, rule_name)
        `)
        .eq('unit_id', unitId);

      if (error) throw error;

      // Transform to Rule[]
      return (data as UnitRuleRow[] || []).map(row => ({
        rule_id: row.rule.rule_id,
        rule_name: row.rule.rule_name,
      })) as Rule[];
    },
    enabled: !!unitId,
  });
}

/**
 * Check if unit has custom amenities (vs inheriting from property)
 */
export function useHasUnitAmenities(unitId: string | null) {
  return useQuery({
    queryKey: [...unitFeatureKeys.amenities(unitId || ''), 'exists'] as const,
    queryFn: async () => {
      if (!unitId) return false;

      const { count, error } = await supabase
        .from('unit_amenities')
        .select('*', { count: 'exact', head: true })
        .eq('unit_id', unitId);

      if (error) throw error;
      return (count || 0) > 0;
    },
    enabled: !!unitId,
  });
}

/**
 * Check if unit has custom rules (vs inheriting from property)
 */
export function useHasUnitRules(unitId: string | null) {
  return useQuery({
    queryKey: [...unitFeatureKeys.rules(unitId || ''), 'exists'] as const,
    queryFn: async () => {
      if (!unitId) return false;

      const { count, error } = await supabase
        .from('unit_rules')
        .select('*', { count: 'exact', head: true })
        .eq('unit_id', unitId);

      if (error) throw error;
      return (count || 0) > 0;
    },
    enabled: !!unitId,
  });
}

/**
 * Update unit amenities (delete all, insert new)
 */
export function useUpdateUnitAmenities() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ unitId, amenityIds }: UpdateUnitAmenitiesInput) => {
      // Delete existing unit amenities
      const { error: deleteError } = await supabase
        .from('unit_amenities')
        .delete()
        .eq('unit_id', unitId);

      if (deleteError) throw deleteError;

      // Insert new amenities (if any)
      if (amenityIds.length > 0) {
        const inserts = amenityIds.map(amenityId => ({
          unit_id: unitId,
          amenity_id: amenityId,
        }));

        const { error: insertError } = await supabase
          .from('unit_amenities')
          .insert(inserts);

        if (insertError) throw insertError;
      }

      return { unitId, count: amenityIds.length };
    },
    onSuccess: ({ unitId }) => {
      queryClient.invalidateQueries({ queryKey: unitFeatureKeys.amenities(unitId) });
      queryClient.invalidateQueries({ queryKey: propertyKeys.all() });
      toast({
        title: "Success",
        description: "Unit amenities updated",
      });
    },
    onError: (error: Error) => {
      console.error('Error updating unit amenities:', error);
      toast({
        title: "Error",
        description: "Failed to update unit amenities",
        variant: "destructive",
      });
    },
  });
}

/**
 * Update unit rules (delete all, insert new)
 */
export function useUpdateUnitRules() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ unitId, ruleIds }: UpdateUnitRulesInput) => {
      // Delete existing unit rules
      const { error: deleteError } = await supabase
        .from('unit_rules')
        .delete()
        .eq('unit_id', unitId);

      if (deleteError) throw deleteError;

      // Insert new rules (if any)
      if (ruleIds.length > 0) {
        const inserts = ruleIds.map(ruleId => ({
          unit_id: unitId,
          rule_id: ruleId,
        }));

        const { error: insertError } = await supabase
          .from('unit_rules')
          .insert(inserts);

        if (insertError) throw insertError;
      }

      return { unitId, count: ruleIds.length };
    },
    onSuccess: ({ unitId }) => {
      queryClient.invalidateQueries({ queryKey: unitFeatureKeys.rules(unitId) });
      queryClient.invalidateQueries({ queryKey: propertyKeys.all() });
      toast({
        title: "Success",
        description: "Unit rules updated",
      });
    },
    onError: (error: Error) => {
      console.error('Error updating unit rules:', error);
      toast({
        title: "Error",
        description: "Failed to update unit rules",
        variant: "destructive",
      });
    },
  });
}

/**
 * Clear unit amenities (revert to property-level inheritance)
 */
export function useClearUnitAmenities() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (unitId: string) => {
      const { error } = await supabase
        .from('unit_amenities')
        .delete()
        .eq('unit_id', unitId);

      if (error) throw error;
      return unitId;
    },
    onSuccess: (unitId) => {
      queryClient.invalidateQueries({ queryKey: unitFeatureKeys.amenities(unitId) });
      queryClient.invalidateQueries({ queryKey: propertyKeys.all() });
      toast({
        title: "Success",
        description: "Unit amenities cleared (will use property defaults)",
      });
    },
    onError: (error: Error) => {
      console.error('Error clearing unit amenities:', error);
      toast({
        title: "Error",
        description: "Failed to clear unit amenities",
        variant: "destructive",
      });
    },
  });
}

/**
 * Clear unit rules (revert to property-level inheritance)
 */
export function useClearUnitRules() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (unitId: string) => {
      const { error } = await supabase
        .from('unit_rules')
        .delete()
        .eq('unit_id', unitId);

      if (error) throw error;
      return unitId;
    },
    onSuccess: (unitId) => {
      queryClient.invalidateQueries({ queryKey: unitFeatureKeys.rules(unitId) });
      queryClient.invalidateQueries({ queryKey: propertyKeys.all() });
      toast({
        title: "Success",
        description: "Unit rules cleared (will use property defaults)",
      });
    },
    onError: (error: Error) => {
      console.error('Error clearing unit rules:', error);
      toast({
        title: "Error",
        description: "Failed to clear unit rules",
        variant: "destructive",
      });
    },
  });
}

/**
 * Helper to get effective amenities for a unit (with property fallback)
 * Returns the amenity IDs and a flag indicating source
 */
export function getEffectiveUnitAmenities(
  unitAmenities: Amenity[] | undefined,
  propertyAmenities: Amenity[] | undefined
): { amenities: Amenity[]; source: 'unit' | 'property' } {
  if (unitAmenities && unitAmenities.length > 0) {
    return { amenities: unitAmenities, source: 'unit' };
  }
  return { amenities: propertyAmenities || [], source: 'property' };
}

/**
 * Helper to get effective rules for a unit (with property fallback)
 * Returns the rule IDs and a flag indicating source
 */
export function getEffectiveUnitRules(
  unitRules: Rule[] | undefined,
  propertyRules: Rule[] | undefined
): { rules: Rule[]; source: 'unit' | 'property' } {
  if (unitRules && unitRules.length > 0) {
    return { rules: unitRules, source: 'unit' };
  }
  return { rules: propertyRules || [], source: 'property' };
}
