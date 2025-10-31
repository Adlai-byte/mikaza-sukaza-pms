import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Amenity, Rule } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { propertyKeys } from "./usePropertiesOptimized";

// Amenities Hooks
export function useAmenities() {
  return useQuery({
    queryKey: propertyKeys.amenities(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('amenities')
        .select('*')
        .order('amenity_name');

      if (error) throw error;
      return data as Amenity[];
    },
  });
}

export function useCreateAmenity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (amenityName: string) => {
      const { data, error } = await supabase
        .from('amenities')
        .insert([{ amenity_name: amenityName }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.amenities() });
      toast({
        title: "Success",
        description: "Amenity created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create amenity",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateAmenity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ amenityId, amenityName }: { amenityId: string; amenityName: string }) => {
      const { data, error } = await supabase
        .from('amenities')
        .update({ amenity_name: amenityName })
        .eq('amenity_id', amenityId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.amenities() });
      toast({
        title: "Success",
        description: "Amenity updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update amenity",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteAmenity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (amenityId: string) => {
      const { error } = await supabase
        .from('amenities')
        .delete()
        .eq('amenity_id', amenityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.amenities() });
      toast({
        title: "Success",
        description: "Amenity deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete amenity",
        variant: "destructive",
      });
    },
  });
}

// Rules Hooks
export function useRules() {
  return useQuery({
    queryKey: propertyKeys.rules(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rules')
        .select('*')
        .order('rule_name');

      if (error) throw error;
      return data as Rule[];
    },
  });
}

export function useCreateRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ruleName: string) => {
      const { data, error } = await supabase
        .from('rules')
        .insert([{ rule_name: ruleName }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.rules() });
      toast({
        title: "Success",
        description: "Rule created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create rule",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ ruleId, ruleName }: { ruleId: string; ruleName: string }) => {
      const { data, error } = await supabase
        .from('rules')
        .update({ rule_name: ruleName })
        .eq('rule_id', ruleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.rules() });
      toast({
        title: "Success",
        description: "Rule updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update rule",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('rules')
        .delete()
        .eq('rule_id', ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.rules() });
      toast({
        title: "Success",
        description: "Rule deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete rule",
        variant: "destructive",
      });
    },
  });
}
