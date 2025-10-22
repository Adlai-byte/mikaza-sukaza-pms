import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BillTemplate,
  BillTemplateItem,
  BillTemplateInsert,
  BillTemplateItemInsert,
  BillTemplateWithItems,
  BillTemplatePropertyAssignment,
  BillTemplatePropertyAssignmentInsert,
} from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";

// Query keys for cache management
export const billTemplateKeys = {
  all: () => ['billTemplates'] as const,
  lists: () => ['billTemplates', 'list'] as const,
  list: (propertyId?: string) => ['billTemplates', 'list', propertyId] as const,
  details: () => ['billTemplates', 'detail'] as const,
  detail: (id: string) => ['billTemplates', 'detail', id] as const,
} as const;

// =============================================
// FETCH FUNCTIONS
// =============================================

/**
 * Fetch all bill templates for a property
 * If propertyId is provided, fetch templates assigned to that property
 * Otherwise, fetch all global templates
 */
const fetchBillTemplates = async (propertyId?: string): Promise<BillTemplateWithItems[]> => {
  console.log('📋 Fetching bill templates for property:', propertyId);

  if (propertyId) {
    // Fetch templates assigned to this property via the view
    const { data: viewData, error: viewError } = await supabase
      .from('bill_templates_with_properties')
      .select('*');

    if (viewError) {
      console.error('❌ Bill templates view fetch error:', viewError);
      throw viewError;
    }

    // Filter templates that are assigned to this property
    const templatesForProperty = (viewData || []).filter((template: any) => {
      const assignedProps = template.assigned_properties || [];
      return assignedProps.some((p: any) => p.property_id === propertyId);
    });

    // Fetch items for these templates
    const templatesWithItems = await Promise.all(
      templatesForProperty.map(async (template: any) => {
        const { data: items } = await supabase
          .from('bill_template_items')
          .select('*')
          .eq('template_id', template.template_id)
          .order('line_number', { ascending: true });

        const total_amount = (items || []).reduce((sum: number, item: any) => {
          const lineTotal = item.quantity * item.unit_price;
          const taxAmount = item.tax_amount || (lineTotal * (item.tax_rate / 100));
          return sum + lineTotal + taxAmount;
        }, 0);

        return {
          ...template,
          items: items || [],
          total_amount,
        };
      })
    );

    console.log('✅ Fetched bill templates for property:', templatesWithItems.length);
    return templatesWithItems as BillTemplateWithItems[];
  } else {
    // Fetch all templates with items
    let query = supabase
      .from('bill_templates')
      .select(`
        *,
        items:bill_template_items(*)
      `)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('❌ Bill templates fetch error:', error);
      throw error;
    }

    // Fetch property assignments for all templates
    const templateIds = (data || []).map((t: any) => t.template_id);
    const { data: assignments } = await supabase
      .from('bill_template_property_assignments')
      .select('*, property:properties(property_id, property_name)')
      .in('template_id', templateIds);

    // Group assignments by template_id
    const assignmentsByTemplate = (assignments || []).reduce((acc: any, assignment: any) => {
      if (!acc[assignment.template_id]) {
        acc[assignment.template_id] = [];
      }
      acc[assignment.template_id].push({
        property_id: assignment.property.property_id,
        property_name: assignment.property.property_name,
      });
      return acc;
    }, {});

    // Calculate total for each template and add assignments
    const templatesWithTotals = (data || []).map((template: any) => {
      const items = template.items || [];
      const total_amount = items.reduce((sum: number, item: any) => {
        const lineTotal = item.quantity * item.unit_price;
        const taxAmount = item.tax_amount || (lineTotal * (item.tax_rate / 100));
        return sum + lineTotal + taxAmount;
      }, 0);

      return {
        ...template,
        total_amount,
        assigned_properties: assignmentsByTemplate[template.template_id] || [],
      };
    });

    console.log('✅ Fetched bill templates:', templatesWithTotals.length);
    return templatesWithTotals as BillTemplateWithItems[];
  }
};

/**
 * Fetch single bill template with items
 */
const fetchBillTemplateDetail = async (templateId: string): Promise<BillTemplateWithItems> => {
  console.log('📋 Fetching bill template detail:', templateId);

  const { data, error } = await supabase
    .from('bill_templates')
    .select(`
      *,
      items:bill_template_items(*)
    `)
    .eq('template_id', templateId)
    .single();

  if (error) {
    console.error('❌ Bill template detail fetch error:', error);
    throw error;
  }

  // Calculate total
  const items = data.items || [];
  const total_amount = items.reduce((sum: number, item: any) => {
    const lineTotal = item.quantity * item.unit_price;
    const taxAmount = item.tax_amount || (lineTotal * (item.tax_rate / 100));
    return sum + lineTotal + taxAmount;
  }, 0);

  console.log('✅ Fetched bill template detail:', data);
  return { ...data, total_amount } as BillTemplateWithItems;
};

// =============================================
// CREATE FUNCTIONS
// =============================================

/**
 * Create new bill template with line items
 */
const createBillTemplate = async (data: {
  template: BillTemplateInsert;
  items: BillTemplateItemInsert[];
}): Promise<BillTemplate> => {
  console.log('📋 Creating bill template:', data);

  // 1. Create template
  const { data: templateData, error: templateError } = await supabase
    .from('bill_templates')
    .insert(data.template)
    .select()
    .single();

  if (templateError) {
    console.error('❌ Template creation error:', templateError);
    throw templateError;
  }

  // 2. Create line items
  if (data.items.length > 0) {
    const itemsWithTemplateId = data.items.map((item) => ({
      ...item,
      template_id: templateData.template_id,
    }));

    const { error: itemsError } = await supabase
      .from('bill_template_items')
      .insert(itemsWithTemplateId);

    if (itemsError) {
      console.error('❌ Template items creation error:', itemsError);
      // Rollback: delete template
      await supabase
        .from('bill_templates')
        .delete()
        .eq('template_id', templateData.template_id);
      throw itemsError;
    }
  }

  console.log('✅ Bill template created:', templateData);
  return templateData as BillTemplate;
};

// =============================================
// UPDATE FUNCTIONS
// =============================================

/**
 * Update bill template and its items
 */
const updateBillTemplate = async (data: {
  templateId: string;
  template: Partial<BillTemplateInsert>;
  items?: BillTemplateItemInsert[];
}): Promise<BillTemplate> => {
  console.log('📋 Updating bill template:', data);

  // 1. Update template
  const { data: templateData, error: templateError } = await supabase
    .from('bill_templates')
    .update(data.template)
    .eq('template_id', data.templateId)
    .select()
    .single();

  if (templateError) {
    console.error('❌ Template update error:', templateError);
    throw templateError;
  }

  // 2. Update items if provided
  if (data.items) {
    // Delete existing items
    await supabase
      .from('bill_template_items')
      .delete()
      .eq('template_id', data.templateId);

    // Insert new items
    if (data.items.length > 0) {
      const itemsWithTemplateId = data.items.map((item) => ({
        ...item,
        template_id: data.templateId,
      }));

      const { error: itemsError } = await supabase
        .from('bill_template_items')
        .insert(itemsWithTemplateId);

      if (itemsError) {
        console.error('❌ Template items update error:', itemsError);
        throw itemsError;
      }
    }
  }

  console.log('✅ Bill template updated:', templateData);
  return templateData as BillTemplate;
};

/**
 * Toggle template active status
 */
const toggleTemplateActive = async (data: {
  templateId: string;
  isActive: boolean;
}): Promise<void> => {
  console.log('📋 Toggling template active status:', data);

  const { error } = await supabase
    .from('bill_templates')
    .update({ is_active: data.isActive })
    .eq('template_id', data.templateId);

  if (error) {
    console.error('❌ Toggle active error:', error);
    throw error;
  }

  console.log('✅ Template active status toggled');
};

// =============================================
// DELETE FUNCTIONS
// =============================================

/**
 * Delete bill template (cascade deletes items)
 */
const deleteBillTemplate = async (templateId: string): Promise<void> => {
  console.log('📋 Deleting bill template:', templateId);

  const { error } = await supabase
    .from('bill_templates')
    .delete()
    .eq('template_id', templateId);

  if (error) {
    console.error('❌ Template deletion error:', error);
    throw error;
  }

  console.log('✅ Bill template deleted');
};

// =============================================
// DUPLICATE FUNCTIONS
// =============================================

/**
 * Duplicate a bill template with all its items
 */
const duplicateBillTemplate = async (data: {
  templateId: string;
  newName?: string;
}): Promise<BillTemplate> => {
  console.log('📋 Duplicating bill template:', data);

  // 1. Fetch original template with items
  const { data: originalTemplate, error: fetchError } = await supabase
    .from('bill_templates')
    .select(`
      *,
      items:bill_template_items(*)
    `)
    .eq('template_id', data.templateId)
    .single();

  if (fetchError) {
    console.error('❌ Template fetch error:', fetchError);
    throw fetchError;
  }

  // 2. Create new template (copy of original, marked as global)
  const newTemplateName = data.newName || `${originalTemplate.template_name} (Copy)`;
  const { data: newTemplate, error: templateError } = await supabase
    .from('bill_templates')
    .insert({
      property_id: null, // Make it global
      template_name: newTemplateName,
      description: originalTemplate.description,
      is_active: originalTemplate.is_active,
      is_global: true, // Always make duplicates global
      display_order: originalTemplate.display_order,
    })
    .select()
    .single();

  if (templateError) {
    console.error('❌ Template duplication error:', templateError);
    throw templateError;
  }

  // 3. Copy line items
  if (originalTemplate.items && originalTemplate.items.length > 0) {
    const newItems = originalTemplate.items.map((item: BillTemplateItem) => ({
      template_id: newTemplate.template_id,
      line_number: item.line_number,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_rate: item.tax_rate,
      tax_amount: item.tax_amount,
      item_type: item.item_type,
    }));

    const { error: itemsError } = await supabase
      .from('bill_template_items')
      .insert(newItems);

    if (itemsError) {
      console.error('❌ Template items duplication error:', itemsError);
      // Rollback: delete template
      await supabase
        .from('bill_templates')
        .delete()
        .eq('template_id', newTemplate.template_id);
      throw itemsError;
    }
  }

  console.log('✅ Bill template duplicated:', newTemplate);
  return newTemplate as BillTemplate;
};

// =============================================
// PROPERTY ASSIGNMENT FUNCTIONS
// =============================================

/**
 * Assign a template to multiple properties
 */
const assignTemplateToProperties = async (data: {
  templateId: string;
  propertyIds: string[];
}): Promise<void> => {
  console.log('📋 Assigning template to properties:', data);

  // First, mark the template as global if it isn't already
  const { error: updateError } = await supabase
    .from('bill_templates')
    .update({ is_global: true, property_id: null })
    .eq('template_id', data.templateId);

  if (updateError) {
    console.error('❌ Template update error:', updateError);
    throw updateError;
  }

  // Create assignments
  const assignments = data.propertyIds.map((propertyId) => ({
    template_id: data.templateId,
    property_id: propertyId,
  }));

  const { error: assignError } = await supabase
    .from('bill_template_property_assignments')
    .upsert(assignments, {
      onConflict: 'template_id,property_id',
      ignoreDuplicates: true,
    });

  if (assignError) {
    console.error('❌ Assignment error:', assignError);
    throw assignError;
  }

  console.log('✅ Template assigned to properties');
};

/**
 * Unassign a template from a property
 */
const unassignTemplateFromProperty = async (data: {
  templateId: string;
  propertyId: string;
}): Promise<void> => {
  console.log('📋 Unassigning template from property:', data);

  const { error } = await supabase
    .from('bill_template_property_assignments')
    .delete()
    .eq('template_id', data.templateId)
    .eq('property_id', data.propertyId);

  if (error) {
    console.error('❌ Unassignment error:', error);
    throw error;
  }

  console.log('✅ Template unassigned from property');
};

/**
 * Fetch property assignments for a template
 */
const fetchTemplatePropertyAssignments = async (
  templateId: string
): Promise<BillTemplatePropertyAssignment[]> => {
  console.log('📋 Fetching template property assignments:', templateId);

  const { data, error } = await supabase
    .from('bill_template_property_assignments')
    .select('*')
    .eq('template_id', templateId);

  if (error) {
    console.error('❌ Assignments fetch error:', error);
    throw error;
  }

  console.log('✅ Fetched property assignments:', data?.length || 0);
  return data as BillTemplatePropertyAssignment[];
};

// =============================================
// REACT QUERY HOOKS
// =============================================

/**
 * Hook to fetch bill templates for a property
 */
export function useBillTemplates(propertyId?: string) {
  return useQuery({
    queryKey: billTemplateKeys.list(propertyId),
    queryFn: () => fetchBillTemplates(propertyId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch single bill template detail
 */
export function useBillTemplateDetail(templateId: string | undefined) {
  return useQuery({
    queryKey: billTemplateKeys.detail(templateId || ''),
    queryFn: () => fetchBillTemplateDetail(templateId!),
    enabled: !!templateId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to create bill template
 */
export function useCreateBillTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createBillTemplate,
    onSuccess: () => {
      // Invalidate all template lists
      queryClient.invalidateQueries({ queryKey: billTemplateKeys.lists() });
      toast({
        title: 'Template Created',
        description: 'Bill template created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create template',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update bill template
 */
export function useUpdateBillTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: updateBillTemplate,
    onSuccess: (_, variables) => {
      // Invalidate template lists and detail
      queryClient.invalidateQueries({ queryKey: billTemplateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: billTemplateKeys.detail(variables.templateId) });
      toast({
        title: 'Template Updated',
        description: 'Bill template updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update template',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to toggle template active status
 */
export function useToggleTemplateActive() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: toggleTemplateActive,
    onSuccess: () => {
      // Invalidate template lists
      queryClient.invalidateQueries({ queryKey: billTemplateKeys.lists() });
      toast({
        title: 'Status Updated',
        description: 'Template status updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update template status',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete bill template
 */
export function useDeleteBillTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteBillTemplate,
    onSuccess: () => {
      // Invalidate template lists
      queryClient.invalidateQueries({ queryKey: billTemplateKeys.lists() });
      toast({
        title: 'Template Deleted',
        description: 'Bill template deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete template',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to duplicate bill template
 */
export function useDuplicateBillTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: duplicateBillTemplate,
    onSuccess: () => {
      // Invalidate template lists
      queryClient.invalidateQueries({ queryKey: billTemplateKeys.lists() });
      toast({
        title: 'Template Duplicated',
        description: 'Bill template duplicated successfully. You can now assign it to properties.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to duplicate template',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to assign template to properties
 */
export function useAssignTemplateToProperties() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: assignTemplateToProperties,
    onSuccess: () => {
      // Invalidate template lists
      queryClient.invalidateQueries({ queryKey: billTemplateKeys.lists() });
      toast({
        title: 'Template Assigned',
        description: 'Template assigned to properties successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign template',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to unassign template from property
 */
export function useUnassignTemplateFromProperty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: unassignTemplateFromProperty,
    onSuccess: () => {
      // Invalidate template lists
      queryClient.invalidateQueries({ queryKey: billTemplateKeys.lists() });
      toast({
        title: 'Template Unassigned',
        description: 'Template unassigned from property successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to unassign template',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to fetch template property assignments
 */
export function useTemplatePropertyAssignments(templateId: string | undefined) {
  return useQuery({
    queryKey: ['billTemplateAssignments', templateId],
    queryFn: () => fetchTemplatePropertyAssignments(templateId!),
    enabled: !!templateId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
