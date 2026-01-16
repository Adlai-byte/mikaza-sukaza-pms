import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertTriangle,
  Plus,
  X,
  Save,
  Building,
  User,
  DollarSign,
  AlertCircle,
  Flag,
  Tag,
  MapPin,
  Upload,
  Image as ImageIcon,
  Layers,
} from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { Issue, IssueInsert } from '@/lib/schemas';
import { usePropertiesOptimized } from '@/hooks/usePropertiesOptimized';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatUserDisplay } from '@/lib/user-display';
import { useTranslation } from 'react-i18next';

interface IssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: IssueInsert, photos: File[]) => void;
  isSubmitting?: boolean;
  issue?: Issue | null;
}

export function IssueDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  issue,
}: IssueDialogProps) {
  const { t } = useTranslation();
  const isEditing = !!issue;
  const { properties } = usePropertiesOptimized();

  // Fetch users for assignee selection
  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('user_id, first_name, last_name, email, user_type')
        .eq('is_active', true)
        .order('first_name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const [formData, setFormData] = useState<IssueInsert>({
    property_id: issue?.property_id || '',
    unit_id: issue?.unit_id || null,
    title: issue?.title || '',
    description: issue?.description || '',
    category: issue?.category || 'other',
    priority: issue?.priority || 'medium',
    status: issue?.status || 'open',
    assigned_to: issue?.assigned_to || null,
    location: issue?.location || '',
    estimated_cost: issue?.estimated_cost || null,
    actual_cost: issue?.actual_cost || null,
    resolution_notes: issue?.resolution_notes || '',
  });

  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        property_id: issue?.property_id || '',
        unit_id: issue?.unit_id || null,
        title: issue?.title || '',
        description: issue?.description || '',
        category: issue?.category || 'other',
        priority: issue?.priority || 'medium',
        status: issue?.status || 'open',
        assigned_to: issue?.assigned_to || null,
        location: issue?.location || '',
        estimated_cost: issue?.estimated_cost || null,
        actual_cost: issue?.actual_cost || null,
        resolution_notes: issue?.resolution_notes || '',
      });
      setSelectedPhotos([]);
      setErrors({});
    }
  }, [open, issue]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.property_id) {
      newErrors.property_id = t('issueDialog.validation.propertyRequired');
    }

    if (!formData.title.trim()) {
      newErrors.title = t('issueDialog.validation.titleRequired');
    }

    if (formData.estimated_cost !== null && formData.estimated_cost < 0) {
      newErrors.estimated_cost = t('issueDialog.validation.costNegative');
    }

    if (formData.actual_cost !== null && formData.actual_cost < 0) {
      newErrors.actual_cost = t('issueDialog.validation.costNegative');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit(formData, selectedPhotos);
  };

  const handleChange = (field: keyof IssueInsert, value: any) => {
    setFormData(prev => {
      const updates: Partial<IssueInsert> = { [field]: value };
      // Clear unit_id when property changes
      if (field === 'property_id') {
        updates.unit_id = null;
      }
      return { ...prev, ...updates };
    });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedPhotos(prev => [...prev, ...files]);
    }
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-300';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'on_hold': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const selectedProperty = properties.find(p => p.property_id === formData.property_id);
  const selectedUser = users.find(u => u.user_id === formData.assigned_to);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <AlertTriangle className="h-6 w-6 text-primary" />
            {isEditing ? t('issueDialog.editIssue') : t('issueDialog.reportNewIssue')}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t('issueDialog.editDescription')
              : t('issueDialog.reportDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Property Selection */}
          <div className="space-y-2">
            <Label htmlFor="property_id" className="required flex items-center gap-2">
              <Building className="h-4 w-4" />
              {t('issueDialog.propertyRequired')}
            </Label>
            <Select
              value={formData.property_id}
              onValueChange={(value) => handleChange('property_id', value)}
              disabled={isEditing}
            >
              <SelectTrigger className={errors.property_id ? 'border-red-500' : ''}>
                <SelectValue placeholder={t('issueDialog.selectProperty')} />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.property_id} value={property.property_id!}>
                    {property.property_name} - {property.property_type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.property_id && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.property_id}
              </p>
            )}
            {selectedProperty && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-2">
                  <p className="text-sm text-blue-800">{selectedProperty.property_name}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Unit Selection - Only show if property has units */}
          {selectedProperty && selectedProperty.units && selectedProperty.units.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="unit_id" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                {t('issueDialog.unit', 'Unit (Optional)')}
              </Label>
              <Select
                value={formData.unit_id || 'entire_property'}
                onValueChange={(value) => handleChange('unit_id', value === 'entire_property' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('issueDialog.selectUnit', 'Select unit...')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entire_property">
                    {t('issueDialog.entireProperty', 'Entire Property / Common Areas')}
                  </SelectItem>
                  {selectedProperty.units.map((unit) => (
                    <SelectItem key={unit.unit_id} value={unit.unit_id}>
                      {unit.unit_name || `Unit ${unit.unit_number}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('issueDialog.unitHint', 'Leave as "Entire Property" for issues affecting common areas or the whole building')}
              </p>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="required">
              {t('issueDialog.issueTitleRequired')}
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder={t('issueDialog.issueTitlePlaceholder')}
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('issueDialog.detailedDescription')}</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder={t('issueDialog.detailedDescriptionPlaceholder')}
              className="min-h-[100px]"
            />
          </div>

          {/* Category, Priority, Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                {t('issueDialog.category')}
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value: any) => handleChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">{t('issueDialog.categories.maintenance')}</SelectItem>
                  <SelectItem value="damage">{t('issueDialog.categories.damage')}</SelectItem>
                  <SelectItem value="repair_needed">{t('issueDialog.categories.repairNeeded')}</SelectItem>
                  <SelectItem value="cleaning">{t('issueDialog.categories.cleaning')}</SelectItem>
                  <SelectItem value="plumbing">{t('issueDialog.categories.plumbing')}</SelectItem>
                  <SelectItem value="electrical">{t('issueDialog.categories.electrical')}</SelectItem>
                  <SelectItem value="appliance">{t('issueDialog.categories.appliance')}</SelectItem>
                  <SelectItem value="hvac">{t('issueDialog.categories.hvac')}</SelectItem>
                  <SelectItem value="other">{t('issueDialog.categories.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority" className="flex items-center gap-2">
                <Flag className="h-4 w-4" />
                {t('issueDialog.priority')}
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => handleChange('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('issueDialog.priorities.low')}</SelectItem>
                  <SelectItem value="medium">{t('issueDialog.priorities.medium')}</SelectItem>
                  <SelectItem value="high">{t('issueDialog.priorities.high')}</SelectItem>
                  <SelectItem value="urgent">{t('issueDialog.priorities.urgent')}</SelectItem>
                </SelectContent>
              </Select>
              <Badge className={getPriorityColor(formData.priority)}>
                {t(`issueDialog.priorities.${formData.priority}`)}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {t('issueDialog.status')}
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => handleChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">{t('issueDialog.statuses.open')}</SelectItem>
                  <SelectItem value="in_progress">{t('issueDialog.statuses.inProgress')}</SelectItem>
                  <SelectItem value="resolved">{t('issueDialog.statuses.resolved')}</SelectItem>
                  <SelectItem value="closed">{t('issueDialog.statuses.closed')}</SelectItem>
                  <SelectItem value="on_hold">{t('issueDialog.statuses.onHold')}</SelectItem>
                </SelectContent>
              </Select>
              <Badge className={getStatusColor(formData.status)}>
                {t(`issueDialog.statuses.${formData.status === 'in_progress' ? 'inProgress' : formData.status === 'on_hold' ? 'onHold' : formData.status}`)}
              </Badge>
            </div>
          </div>

          {/* Location and Assignee */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t('issueDialog.locationOptional')}
              </Label>
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder={t('issueDialog.locationPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned_to" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {t('issueDialog.assignToOptional')}
              </Label>
              <Combobox
                options={[
                  { value: 'none', label: t('issueDialog.unassigned', 'Unassigned') },
                  ...users.map((user) => ({
                    value: user.user_id,
                    label: formatUserDisplay(user),
                  })),
                ]}
                value={formData.assigned_to || 'none'}
                onValueChange={(value) => handleChange('assigned_to', value === 'none' ? null : value)}
                placeholder={t('issueDialog.selectUser', 'Select user...')}
                searchPlaceholder={t('issueDialog.searchUser', 'Search users...')}
                emptyText={t('issueDialog.noUserFound', 'No user found.')}
                preserveSearch={true}
              />
              {selectedUser && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-2">
                    <p className="text-sm text-green-800">
                      {formatUserDisplay(selectedUser)}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Cost Tracking */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimated_cost" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {t('issueDialog.estimatedCost')}
              </Label>
              <Input
                id="estimated_cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.estimated_cost || ''}
                onChange={(e) => handleChange('estimated_cost', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={t('issueDialog.costPlaceholder')}
                className={errors.estimated_cost ? 'border-red-500' : ''}
              />
              {errors.estimated_cost && (
                <p className="text-sm text-red-500">{errors.estimated_cost}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="actual_cost" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {t('issueDialog.actualCost')}
              </Label>
              <Input
                id="actual_cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.actual_cost || ''}
                onChange={(e) => handleChange('actual_cost', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={t('issueDialog.costPlaceholder')}
                className={errors.actual_cost ? 'border-red-500' : ''}
              />
              {errors.actual_cost && (
                <p className="text-sm text-red-500">{errors.actual_cost}</p>
              )}
            </div>
          </div>

          {/* Resolution Notes */}
          {(formData.status === 'resolved' || formData.status === 'closed') && (
            <div className="space-y-2">
              <Label htmlFor="resolution_notes">{t('issueDialog.resolutionNotes')}</Label>
              <Textarea
                id="resolution_notes"
                value={formData.resolution_notes || ''}
                onChange={(e) => handleChange('resolution_notes', e.target.value)}
                placeholder={t('issueDialog.resolutionNotesPlaceholder')}
                className="min-h-[100px]"
              />
            </div>
          )}

          {/* Photo Upload */}
          {!isEditing && (
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                {t('issueDialog.photosOptional')}
              </Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                  id="photo-upload"
                />
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {t('issueDialog.uploadPhotos')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('issueDialog.fileFormat')}
                  </p>
                </label>
              </div>

              {/* Preview selected photos */}
              {selectedPhotos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {selectedPhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removePhoto(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <p className="text-xs text-center mt-1 truncate">{photo.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              <X className="mr-2 h-4 w-4" />
              {t('issueDialog.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting
                ? isEditing
                  ? t('issueDialog.updating')
                  : t('issueDialog.creating')
                : isEditing
                  ? t('issueDialog.updateIssue')
                  : t('issueDialog.createIssue')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
