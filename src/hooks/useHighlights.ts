import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PropertyHighlight, PropertyHighlightInsert, PropertyHighlightFilters } from '@/lib/schemas';
import { useActivityLogs } from '@/hooks/useActivityLogs';

/**
 * Fetch all property highlights with optional filters
 */
export function usePropertyHighlights(filters?: PropertyHighlightFilters) {
  return useQuery({
    queryKey: ['property_highlights', filters],
    queryFn: async () => {
      let query = supabase
        .from('property_highlights')
        .select(`
          *,
          property:properties(property_id, property_name)
        `)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (filters?.property_id) {
        query = query.eq('property_id', filters.property_id);
      }

      if (filters?.highlight_type) {
        query = query.eq('highlight_type', filters.highlight_type);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PropertyHighlight[];
    },
  });
}

/**
 * Fetch a single property highlight by ID
 */
export function usePropertyHighlight(highlightId: string | null) {
  return useQuery({
    queryKey: ['property_highlight', highlightId],
    queryFn: async () => {
      if (!highlightId) return null;

      const { data, error } = await supabase
        .from('property_highlights')
        .select(`
          *,
          property:properties(property_id, property_name)
        `)
        .eq('highlight_id', highlightId)
        .single();

      if (error) throw error;
      return data as PropertyHighlight;
    },
    enabled: !!highlightId,
  });
}

/**
 * Create a new property highlight
 */
export function useCreatePropertyHighlight() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: async (highlight: PropertyHighlightInsert) => {
      const { data, error } = await supabase
        .from('property_highlights')
        .insert(highlight)
        .select(`
          *,
          property:properties(property_id, property_name)
        `)
        .single();

      if (error) throw error;
      return data as PropertyHighlight;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['property_highlights'] });
      queryClient.invalidateQueries({ queryKey: ['property_highlight', data.highlight_id] });

      logActivity('highlight_created', {
        highlight_id: data.highlight_id,
        property_id: data.property_id,
        title: data.title,
        highlight_type: data.highlight_type,
      });

      toast({
        title: 'Highlight created',
        description: `"${data.title}" has been created successfully.`,
      });
    },
    onError: (error) => {
      console.error('Error creating property highlight:', error);
      toast({
        title: 'Error',
        description: 'Failed to create highlight. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update an existing property highlight
 */
export function useUpdatePropertyHighlight() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: async ({
      highlightId,
      updates
    }: {
      highlightId: string;
      updates: Partial<PropertyHighlightInsert>
    }) => {
      const { data, error } = await supabase
        .from('property_highlights')
        .update(updates)
        .eq('highlight_id', highlightId)
        .select(`
          *,
          property:properties(property_id, property_name)
        `)
        .single();

      if (error) throw error;
      return data as PropertyHighlight;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['property_highlights'] });
      queryClient.invalidateQueries({ queryKey: ['property_highlight', data.highlight_id] });

      logActivity('highlight_updated', {
        highlight_id: data.highlight_id,
        property_id: data.property_id,
        title: data.title,
      });

      toast({
        title: 'Highlight updated',
        description: `"${data.title}" has been updated successfully.`,
      });
    },
    onError: (error) => {
      console.error('Error updating property highlight:', error);
      toast({
        title: 'Error',
        description: 'Failed to update highlight. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete a property highlight
 */
export function useDeletePropertyHighlight() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: async (highlightId: string) => {
      // Fetch highlight details before deletion for logging
      const { data: highlight } = await supabase
        .from('property_highlights')
        .select('highlight_id, property_id, title, highlight_type')
        .eq('highlight_id', highlightId)
        .single();

      const { error } = await supabase
        .from('property_highlights')
        .delete()
        .eq('highlight_id', highlightId);

      if (error) throw error;
      return { highlightId, highlight };
    },
    onSuccess: ({ highlightId, highlight }) => {
      queryClient.invalidateQueries({ queryKey: ['property_highlights'] });
      queryClient.invalidateQueries({ queryKey: ['property_highlight', highlightId] });

      logActivity('highlight_deleted', {
        highlight_id: highlightId,
        property_id: highlight?.property_id,
        title: highlight?.title,
        highlight_type: highlight?.highlight_type,
      });

      toast({
        title: 'Highlight deleted',
        description: 'Property highlight has been deleted successfully.',
      });
    },
    onError: (error) => {
      console.error('Error deleting property highlight:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete highlight. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Toggle highlight active status
 */
export function useToggleHighlightStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: async ({
      highlightId,
      isActive
    }: {
      highlightId: string;
      isActive: boolean
    }) => {
      const { data, error } = await supabase
        .from('property_highlights')
        .update({ is_active: isActive })
        .eq('highlight_id', highlightId)
        .select(`
          *,
          property:properties(property_id, property_name)
        `)
        .single();

      if (error) throw error;
      return data as PropertyHighlight;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['property_highlights'] });
      queryClient.invalidateQueries({ queryKey: ['property_highlight', data.highlight_id] });

      logActivity('highlight_status_changed', {
        highlight_id: data.highlight_id,
        property_id: data.property_id,
        title: data.title,
        new_status: data.is_active ? 'active' : 'inactive',
      });

      toast({
        title: 'Status updated',
        description: `"${data.title}" has been ${data.is_active ? 'activated' : 'deactivated'}.`,
      });
    },
    onError: (error) => {
      console.error('Error toggling highlight status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Reorder highlights (update display_order)
 */
export function useReorderHighlights() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: async (highlights: { highlight_id: string; display_order: number }[]) => {
      const updates = highlights.map(({ highlight_id, display_order }) =>
        supabase
          .from('property_highlights')
          .update({ display_order })
          .eq('highlight_id', highlight_id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        throw errors[0].error;
      }

      return highlights;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['property_highlights'] });

      logActivity('highlights_reordered', {
        count: data.length,
        highlight_ids: data.map(h => h.highlight_id),
      });

      toast({
        title: 'Order updated',
        description: 'Highlights have been reordered successfully.',
      });
    },
    onError: (error) => {
      console.error('Error reordering highlights:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder highlights. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Bulk delete multiple highlights
 */
export function useBulkDeleteHighlights() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: async (highlightIds: string[]) => {
      const { error } = await supabase
        .from('property_highlights')
        .delete()
        .in('highlight_id', highlightIds);

      if (error) throw error;
      return highlightIds;
    },
    onSuccess: (highlightIds) => {
      queryClient.invalidateQueries({ queryKey: ['property_highlights'] });

      logActivity('highlights_bulk_deleted', {
        count: highlightIds.length,
        highlight_ids: highlightIds,
      });

      toast({
        title: 'Highlights deleted',
        description: `${highlightIds.length} highlight(s) have been deleted successfully.`,
      });
    },
    onError: (error) => {
      console.error('Error bulk deleting highlights:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete highlights. Please try again.',
        variant: 'destructive',
      });
    },
  });
}
