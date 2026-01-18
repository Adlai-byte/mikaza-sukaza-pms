import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChecklistTemplate, ChecklistTemplateInsert } from '@/lib/schemas';
import { useActivityLogs } from '@/hooks/useActivityLogs';

export interface ChecklistTemplateFilters {
  property_id?: string;
  template_type?: 'check_in' | 'check_out' | 'inspection';
  is_active?: boolean;
}

export function useChecklistTemplates(filters?: ChecklistTemplateFilters) {
  return useQuery({
    queryKey: ['checklist_templates', filters],
    queryFn: async () => {
      let query = supabase
        .from('checklist_templates')
        .select(`
          *,
          property:properties(property_id, property_name),
          creator:users!checklist_templates_created_by_fkey(user_id, first_name, last_name, user_type)
        `)
        .order('created_at', { ascending: false });

      if (filters?.property_id) {
        query = query.eq('property_id', filters.property_id);
      }

      if (filters?.template_type) {
        query = query.eq('template_type', filters.template_type);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ChecklistTemplate[];
    },
  });
}

export function useChecklistTemplate(templateId: string | null) {
  return useQuery({
    queryKey: ['checklist_template', templateId],
    queryFn: async () => {
      if (!templateId) return null;

      const { data, error } = await supabase
        .from('checklist_templates')
        .select(`
          *,
          property:properties(property_id, property_name),
          creator:users!checklist_templates_created_by_fkey(user_id, first_name, last_name, user_type)
        `)
        .eq('template_id', templateId)
        .single();

      if (error) throw error;
      return data as ChecklistTemplate;
    },
    enabled: !!templateId,
  });
}

export function useCreateChecklistTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: async (template: ChecklistTemplateInsert) => {
      const { data, error } = await supabase
        .from('checklist_templates')
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['checklist_templates'] });

      logActivity('checklist_template_created', {
        template_id: data.template_id,
        template_name: data.template_name,
        template_type: data.template_type,
        property_id: data.property_id,
      });

      toast({
        title: 'Template created',
        description: 'Checklist template has been created successfully.',
      });
    },
    onError: (error) => {
      console.error('Error creating checklist template:', error);
      toast({
        title: 'Error',
        description: 'Failed to create checklist template. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateChecklistTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: async ({ templateId, updates }: { templateId: string; updates: Partial<ChecklistTemplateInsert> }) => {
      const { data, error } = await supabase
        .from('checklist_templates')
        .update(updates)
        .eq('template_id', templateId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['checklist_templates'] });
      queryClient.invalidateQueries({ queryKey: ['checklist_template', data.template_id] });

      logActivity('checklist_template_updated', {
        template_id: data.template_id,
        template_name: data.template_name,
        template_type: data.template_type,
      });

      toast({
        title: 'Template updated',
        description: 'Checklist template has been updated successfully.',
      });
    },
    onError: (error) => {
      console.error('Error updating checklist template:', error);
      toast({
        title: 'Error',
        description: 'Failed to update checklist template. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteChecklistTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: async (templateId: string) => {
      // Fetch template details before deletion for logging
      const { data: template } = await supabase
        .from('checklist_templates')
        .select('template_id, template_name, template_type, property_id')
        .eq('template_id', templateId)
        .single();

      const { error } = await supabase
        .from('checklist_templates')
        .delete()
        .eq('template_id', templateId);

      if (error) throw error;
      return { templateId, template };
    },
    onSuccess: ({ templateId, template }) => {
      queryClient.invalidateQueries({ queryKey: ['checklist_templates'] });

      logActivity('checklist_template_deleted', {
        template_id: templateId,
        template_name: template?.template_name || 'Unknown Template',
        template_type: template?.template_type,
        property_id: template?.property_id,
      });

      toast({
        title: 'Template deleted',
        description: 'Checklist template has been deleted successfully.',
      });
    },
    onError: (error) => {
      console.error('Error deleting checklist template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete checklist template. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export interface DuplicateChecklistTemplateInput {
  templateId: string;
  newName?: string;
}

export function useDuplicateChecklistTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: async ({ templateId, newName }: DuplicateChecklistTemplateInput) => {
      // Fetch the original template
      const { data: originalTemplate, error: fetchError } = await supabase
        .from('checklist_templates')
        .select('*')
        .eq('template_id', templateId)
        .single();

      if (fetchError) throw fetchError;
      if (!originalTemplate) throw new Error('Template not found');

      // Create a new template with copied data
      const newTemplateName = newName || `${originalTemplate.template_name} (Copy)`;

      const { data: newTemplate, error: insertError } = await supabase
        .from('checklist_templates')
        .insert({
          property_id: originalTemplate.property_id,
          template_name: newTemplateName,
          template_type: originalTemplate.template_type,
          description: originalTemplate.description,
          checklist_items: originalTemplate.checklist_items,
          is_active: originalTemplate.is_active,
          // created_by will be set by RLS/trigger or can be explicitly set
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return { newTemplate, originalTemplate };
    },
    onSuccess: ({ newTemplate, originalTemplate }) => {
      queryClient.invalidateQueries({ queryKey: ['checklist_templates'] });

      logActivity('checklist_template_duplicated', {
        original_template_id: originalTemplate.template_id,
        original_template_name: originalTemplate.template_name,
        new_template_id: newTemplate.template_id,
        new_template_name: newTemplate.template_name,
        template_type: newTemplate.template_type,
      });

      toast({
        title: 'Template duplicated',
        description: `"${newTemplate.template_name}" has been created successfully.`,
      });
    },
    onError: (error) => {
      console.error('Error duplicating checklist template:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate checklist template. Please try again.',
        variant: 'destructive',
      });
    },
  });
}
