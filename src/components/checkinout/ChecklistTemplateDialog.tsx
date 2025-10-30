import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { useProperties } from '@/hooks/useProperties';
import { useCreateChecklistTemplate, useUpdateChecklistTemplate } from '@/hooks/useChecklistTemplates';
import { useAuth } from '@/contexts/AuthContext';
import { ChecklistTemplate, ChecklistItem } from '@/lib/schemas';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';

const templateFormSchema = z.object({
  template_name: z.string().min(1, 'Template name is required'),
  template_type: z.enum(['check_in', 'check_out', 'inspection']),
  property_id: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

interface ChecklistTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  template?: ChecklistTemplate | null;
}

export function ChecklistTemplateDialog({ open, onClose, template }: ChecklistTemplateDialogProps) {
  const { user } = useAuth();
  const { data: properties = [] } = useProperties();
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);

  const createMutation = useCreateChecklistTemplate();
  const updateMutation = useUpdateChecklistTemplate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      template_type: 'check_in',
      is_active: true,
    },
  });

  useEffect(() => {
    if (template) {
      setValue('template_name', template.template_name);
      setValue('template_type', template.template_type);
      setValue('property_id', template.property_id || '');
      setValue('description', template.description || '');
      setValue('is_active', template.is_active);
      setChecklistItems((template.checklist_items as ChecklistItem[]) || []);
    } else {
      reset();
      setChecklistItems([]);
    }
  }, [template, setValue, reset]);

  const addChecklistItem = () => {
    const newItem: ChecklistItem = {
      id: `item-${Date.now()}`,
      label: '',
      type: 'checkbox',
      required: false,
      order: checklistItems.length,
    };
    setChecklistItems([...checklistItems, newItem]);
  };

  const updateChecklistItem = (index: number, updates: Partial<ChecklistItem>) => {
    const updated = [...checklistItems];
    updated[index] = { ...updated[index], ...updates };
    setChecklistItems(updated);
  };

  const removeChecklistItem = (index: number) => {
    const updated = checklistItems.filter((_, i) => i !== index);
    // Reorder remaining items
    updated.forEach((item, i) => {
      item.order = i;
    });
    setChecklistItems(updated);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= checklistItems.length) return;

    const updated = [...checklistItems];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];

    // Update order values
    updated.forEach((item, i) => {
      item.order = i;
    });

    setChecklistItems(updated);
  };

  const onSubmit = async (data: TemplateFormData) => {
    const templateData = {
      template_name: data.template_name,
      template_type: data.template_type,
      property_id: data.property_id || null,
      description: data.description || null,
      checklist_items: checklistItems,
      is_active: data.is_active,
      created_by: user?.id || null,
    };

    if (template) {
      updateMutation.mutate({
        templateId: template.template_id,
        updates: templateData,
      }, {
        onSuccess: () => {
          onClose();
          reset();
          setChecklistItems([]);
        },
      });
    } else {
      createMutation.mutate(templateData, {
        onSuccess: () => {
          onClose();
          reset();
          setChecklistItems([]);
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit' : 'New'} Checklist Template
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template_name">Template Name *</Label>
                <Input {...register('template_name')} placeholder="e.g. Standard Check-In" />
                {errors.template_name && (
                  <p className="text-sm text-destructive mt-1">{errors.template_name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="template_type">Type *</Label>
                <Select
                  value={watch('template_type')}
                  onValueChange={(value) => setValue('template_type', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="check_in">Check-In</SelectItem>
                    <SelectItem value="check_out">Check-Out</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="property_id">Property (Optional)</Label>
              <Select
                value={watch('property_id') || 'none'}
                onValueChange={(value) => setValue('property_id', value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Properties</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.property_id} value={property.property_id}>
                      {property.property_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea {...register('description')} rows={2} placeholder="Optional description..." />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="is_active"
                checked={watch('is_active')}
                onCheckedChange={(checked) => setValue('is_active', checked as boolean)}
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active (available for use)
              </Label>
            </div>
          </div>

          {/* Checklist Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Checklist Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addChecklistItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="space-y-2">
              {checklistItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8 border-2 border-dashed rounded-md">
                  No checklist items yet. Click "Add Item" to create one.
                </p>
              ) : (
                checklistItems.map((item, index) => (
                  <Card key={item.id}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex gap-3">
                        <div className="flex flex-col gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => moveItem(index, 'up')}
                            disabled={index === 0}
                            className="h-6 w-6"
                          >
                            <GripVertical className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => moveItem(index, 'down')}
                            disabled={index === checklistItems.length - 1}
                            className="h-6 w-6"
                          >
                            <GripVertical className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Label *</Label>
                              <Input
                                value={item.label}
                                onChange={(e) =>
                                  updateChecklistItem(index, { label: e.target.value })
                                }
                                placeholder="e.g. Check all keys present"
                                className="mt-1"
                              />
                            </div>

                            <div>
                              <Label className="text-xs">Type</Label>
                              <Select
                                value={item.type}
                                onValueChange={(value) =>
                                  updateChecklistItem(index, {
                                    type: value as 'checkbox' | 'text' | 'photo' | 'number',
                                  })
                                }
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="checkbox">Checkbox</SelectItem>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="photo">Photo</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`required-${item.id}`}
                                checked={item.required}
                                onCheckedChange={(checked) =>
                                  updateChecklistItem(index, { required: checked as boolean })
                                }
                              />
                              <Label htmlFor={`required-${item.id}`} className="text-xs cursor-pointer">
                                Required
                              </Label>
                            </div>

                            <span className="text-xs text-muted-foreground">
                              Order: {index + 1}
                            </span>
                          </div>
                        </div>

                        <div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeChecklistItem(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {template ? 'Update' : 'Create'} Template
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
