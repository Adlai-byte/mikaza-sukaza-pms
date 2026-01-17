import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCreatePropertyHighlight, useUpdatePropertyHighlight } from '@/hooks/useHighlights';
import { useProperties } from '@/hooks/useProperties';
import { propertyHighlightSchema, PropertyHighlight, HIGHLIGHT_ICONS } from '@/lib/schemas';
import { Loader2, Star, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HighlightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlight?: PropertyHighlight | null;
  propertyId?: string; // Pre-select property when creating from property edit page
}

export function HighlightDialog({ open, onOpenChange, highlight, propertyId }: HighlightDialogProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { properties = [] } = useProperties();
  const createMutation = useCreatePropertyHighlight();
  const updateMutation = useUpdatePropertyHighlight();

  const form = useForm({
    resolver: zodResolver(propertyHighlightSchema),
    defaultValues: {
      property_id: '',
      title: '',
      description: '',
      icon_name: '',
      highlight_type: 'feature' as const,
      photos: [],
      display_order: 0,
      is_active: true,
    },
  });

  // Reset form when dialog opens or highlight changes
  useEffect(() => {
    if (open) {
      if (highlight) {
        form.reset({
          property_id: highlight.property_id,
          title: highlight.title,
          description: highlight.description || '',
          icon_name: highlight.icon_name || '',
          highlight_type: highlight.highlight_type || 'feature',
          photos: highlight.photos || [],
          display_order: highlight.display_order ?? 0,
          is_active: highlight.is_active ?? true,
        });
      } else {
        form.reset({
          property_id: propertyId || '', // Pre-select property if provided
          title: '',
          description: '',
          icon_name: '',
          highlight_type: 'feature',
          photos: [],
          display_order: 0,
          is_active: true,
        });
      }
    }
  }, [open, highlight, propertyId, form]);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (highlight) {
        await updateMutation.mutateAsync({
          highlightId: highlight.highlight_id,
          updates: data,
        });
      } else {
        await createMutation.mutateAsync(data);
      }
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving highlight:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            {highlight ? 'Edit Highlight' : 'Create New Highlight'}
          </DialogTitle>
          <DialogDescription>
            {highlight
              ? 'Update the property highlight details below.'
              : 'Add a new highlight to showcase property features and amenities.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Property Selection */}
            <FormField
              control={form.control}
              name="property_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialogs.highlight.fields.property')} *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                    disabled={!!highlight || !!propertyId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('dialogs.highlight.fields.selectProperty')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {properties
                        .filter((property) =>
                          typeof property.property_id === 'string' &&
                          property.property_id.length > 0
                        ) // Filter out properties without valid non-empty string IDs
                        .map((property) => (
                          <SelectItem key={property.property_id} value={property.property_id!}>
                            {property.property_name || 'Unnamed Property'}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The property this highlight belongs to
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialogs.highlight.fields.title')} *</FormLabel>
                  <FormControl>
                    <Input placeholder={t('dialogs.highlight.fields.titlePlaceholder')} {...field} />
                  </FormControl>
                  <FormDescription>
                    A catchy title for this highlight
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialogs.highlight.fields.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('dialogs.highlight.fields.descriptionPlaceholder')}
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Additional details about this highlight
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-6 md:grid-cols-2">
              {/* Highlight Type */}
              <FormField
                control={form.control}
                name="highlight_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialogs.highlight.fields.type')} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'feature'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('dialogs.highlight.fields.selectType')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="feature">{t('highlights.types.feature')}</SelectItem>
                        <SelectItem value="amenity">{t('highlights.types.amenity')}</SelectItem>
                        <SelectItem value="location">{t('highlights.types.location')}</SelectItem>
                        <SelectItem value="access">{t('highlights.types.access')}</SelectItem>
                        <SelectItem value="view">{t('highlights.types.view')}</SelectItem>
                        <SelectItem value="other">{t('highlights.types.other')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>{t('dialogs.highlight.fields.typeDescription')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Icon Selection */}
              <FormField
                control={form.control}
                name="icon_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialogs.highlight.fields.icon')}</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('dialogs.highlight.fields.selectIcon')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[200px]">
                        <SelectItem value="none">{t('dialogs.highlight.fields.noIcon')}</SelectItem>
                        {Object.entries(HIGHLIGHT_ICONS)
                          .filter(([key]) => key) // Filter out empty keys
                          .map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 text-yellow-500" />
                                {label}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>{t('dialogs.highlight.fields.iconDescription')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Display Order */}
              <FormField
                control={form.control}
                name="display_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialogs.highlight.fields.displayOrder')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder={t('dialogs.highlight.fields.displayOrderPlaceholder')}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Lower numbers appear first
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Active Toggle */}
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-col justify-end">
                    <FormLabel>{t('dialogs.highlight.fields.activeStatus')}</FormLabel>
                    <div className="flex items-center gap-3 py-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <span className="text-sm text-muted-foreground">
                        {field.value ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <FormDescription>
                      Only active highlights are visible
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {highlight ? 'Update Highlight' : 'Create Highlight'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
