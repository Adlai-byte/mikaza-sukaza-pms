/**
 * Hook for managing per-unit settings (communication, access, capacity)
 * Provides mutations for updating unit-specific WiFi, door codes, and capacity
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { propertyKeys } from "@/hooks/usePropertiesOptimized";
import { UnitCommunication, UnitAccess } from "@/lib/schemas";

// Types for mutation inputs
interface UpdateUnitCapacityInput {
  unitId: string;
  capacity: number | null;
  maxCapacity: number | null;
}

interface UpsertUnitCommunicationInput {
  unitId: string;
  data: Omit<UnitCommunication, 'comm_id' | 'unit_id' | 'created_at' | 'updated_at'>;
}

interface UpsertUnitAccessInput {
  unitId: string;
  data: Omit<UnitAccess, 'access_id' | 'unit_id' | 'created_at' | 'updated_at'>;
}

/**
 * Hook for managing unit settings
 */
export function useUnitSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Update unit capacity
  const updateCapacityMutation = useMutation({
    mutationFn: async ({ unitId, capacity, maxCapacity }: UpdateUnitCapacityInput) => {
      const { data, error } = await supabase
        .from('units')
        .update({
          capacity,
          max_capacity: maxCapacity,
          updated_at: new Date().toISOString(),
        })
        .eq('unit_id', unitId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.all() });
      toast({
        title: "Success",
        description: "Unit capacity updated",
      });
    },
    onError: (error) => {
      console.error('Error updating unit capacity:', error);
      toast({
        title: "Error",
        description: "Failed to update unit capacity",
        variant: "destructive",
      });
    },
  });

  // Upsert unit communication (create or update)
  const upsertCommunicationMutation = useMutation({
    mutationFn: async ({ unitId, data }: UpsertUnitCommunicationInput) => {
      // Check if record exists
      const { data: existing } = await supabase
        .from('unit_communication')
        .select('comm_id')
        .eq('unit_id', unitId)
        .single();

      if (existing) {
        // Update existing record
        const { data: updated, error } = await supabase
          .from('unit_communication')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('unit_id', unitId)
          .select()
          .single();

        if (error) throw error;
        return updated;
      } else {
        // Insert new record
        const { data: inserted, error } = await supabase
          .from('unit_communication')
          .insert({
            unit_id: unitId,
            ...data,
          })
          .select()
          .single();

        if (error) throw error;
        return inserted;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.all() });
      toast({
        title: "Success",
        description: "Unit WiFi settings updated",
      });
    },
    onError: (error) => {
      console.error('Error updating unit communication:', error);
      toast({
        title: "Error",
        description: "Failed to update unit WiFi settings",
        variant: "destructive",
      });
    },
  });

  // Upsert unit access (create or update)
  const upsertAccessMutation = useMutation({
    mutationFn: async ({ unitId, data }: UpsertUnitAccessInput) => {
      // Check if record exists
      const { data: existing } = await supabase
        .from('unit_access')
        .select('access_id')
        .eq('unit_id', unitId)
        .single();

      if (existing) {
        // Update existing record
        const { data: updated, error } = await supabase
          .from('unit_access')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('unit_id', unitId)
          .select()
          .single();

        if (error) throw error;
        return updated;
      } else {
        // Insert new record
        const { data: inserted, error } = await supabase
          .from('unit_access')
          .insert({
            unit_id: unitId,
            ...data,
          })
          .select()
          .single();

        if (error) throw error;
        return inserted;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.all() });
      toast({
        title: "Success",
        description: "Unit access codes updated",
      });
    },
    onError: (error) => {
      console.error('Error updating unit access:', error);
      toast({
        title: "Error",
        description: "Failed to update unit access codes",
        variant: "destructive",
      });
    },
  });

  // Delete unit communication (clear settings, revert to property-level)
  const deleteCommunicationMutation = useMutation({
    mutationFn: async (unitId: string) => {
      const { error } = await supabase
        .from('unit_communication')
        .delete()
        .eq('unit_id', unitId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.all() });
      toast({
        title: "Success",
        description: "Unit WiFi settings cleared (will use property defaults)",
      });
    },
    onError: (error) => {
      console.error('Error clearing unit communication:', error);
      toast({
        title: "Error",
        description: "Failed to clear unit WiFi settings",
        variant: "destructive",
      });
    },
  });

  // Delete unit access (clear settings, revert to property-level)
  const deleteAccessMutation = useMutation({
    mutationFn: async (unitId: string) => {
      const { error } = await supabase
        .from('unit_access')
        .delete()
        .eq('unit_id', unitId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.all() });
      toast({
        title: "Success",
        description: "Unit access codes cleared (will use property defaults)",
      });
    },
    onError: (error) => {
      console.error('Error clearing unit access:', error);
      toast({
        title: "Error",
        description: "Failed to clear unit access codes",
        variant: "destructive",
      });
    },
  });

  return {
    // Mutations
    updateUnitCapacity: updateCapacityMutation.mutateAsync,
    upsertUnitCommunication: upsertCommunicationMutation.mutateAsync,
    upsertUnitAccess: upsertAccessMutation.mutateAsync,
    clearUnitCommunication: deleteCommunicationMutation.mutateAsync,
    clearUnitAccess: deleteAccessMutation.mutateAsync,
    // Loading states
    isUpdatingCapacity: updateCapacityMutation.isPending,
    isUpdatingCommunication: upsertCommunicationMutation.isPending,
    isUpdatingAccess: upsertAccessMutation.isPending,
  };
}

/**
 * Helper to get effective settings for a unit (with property fallback)
 */
export function getEffectiveUnitSettings(
  unit: {
    capacity?: number | null;
    max_capacity?: number | null;
    communication?: { wifi_name?: string | null; wifi_password?: string | null; phone_number?: string | null } | null;
    access?: { gate_code?: string | null; door_lock_password?: string | null; alarm_passcode?: string | null } | null;
  },
  property: {
    capacity?: number | null;
    max_capacity?: number | null;
    communication?: { wifi_name?: string | null; wifi_password?: string | null; phone_number?: string | null }[] | null;
    access?: { gate_code?: string | null; door_lock_password?: string | null; alarm_passcode?: string | null }[] | null;
  }
) {
  const propComm = property.communication?.[0];
  const propAccess = property.access?.[0];

  return {
    capacity: unit.capacity ?? property.capacity,
    max_capacity: unit.max_capacity ?? property.max_capacity,
    wifi_name: unit.communication?.wifi_name ?? propComm?.wifi_name,
    wifi_password: unit.communication?.wifi_password ?? propComm?.wifi_password,
    phone_number: unit.communication?.phone_number ?? propComm?.phone_number,
    gate_code: unit.access?.gate_code ?? propAccess?.gate_code,
    door_lock_password: unit.access?.door_lock_password ?? propAccess?.door_lock_password,
    alarm_passcode: unit.access?.alarm_passcode ?? propAccess?.alarm_passcode,
    // Flags to indicate if using unit-specific or property-level settings
    hasUnitCapacity: unit.capacity !== null && unit.capacity !== undefined,
    hasUnitCommunication: !!unit.communication,
    hasUnitAccess: !!unit.access,
  };
}
