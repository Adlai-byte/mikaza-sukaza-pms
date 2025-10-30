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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  CheckSquare,
  Plus,
  X,
  Save,
  Building,
  User,
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  Flag,
  Tag,
  Trash2,
} from 'lucide-react';
import { Task, TaskInsert, TaskChecklistInsert } from '@/lib/schemas';
import { usePropertiesOptimized } from '@/hooks/usePropertiesOptimized';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatUserDisplay } from '@/lib/user-display';

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TaskInsert, checklists: TaskChecklistInsert[]) => void;
  isSubmitting?: boolean;
  task?: Task | null;
}

export function TaskDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  task,
}: TaskDialogProps) {
  const isEditing = !!task;
  const { properties } = usePropertiesOptimized();

  // Fetch users for assignee selection
  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('user_id, first_name, last_name, email, photo_url, user_type')
        .eq('is_active', true)
        .order('first_name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const [formData, setFormData] = useState<TaskInsert>({
    title: task?.title || '',
    description: task?.description || '',
    property_id: task?.property_id || null,
    assigned_to: task?.assigned_to || null,
    status: task?.status || 'pending',
    priority: task?.priority || 'medium',
    category: task?.category || 'other',
    due_date: task?.due_date || '',
    due_time: task?.due_time || '',
  });

  const [checklists, setChecklists] = useState<Array<{ item_text: string; order_index: number }>>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        title: task?.title || '',
        description: task?.description || '',
        property_id: task?.property_id || null,
        assigned_to: task?.assigned_to || null,
        status: task?.status || 'pending',
        priority: task?.priority || 'medium',
        category: task?.category || 'other',
        due_date: task?.due_date || '',
        due_time: task?.due_time || '',
      });
      setChecklists([]);
      setNewChecklistItem('');
      setErrors({});
    }
  }, [open, task]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    }

    if (formData.due_date && formData.due_date.length > 0 && !/^\d{4}-\d{2}-\d{2}$/.test(formData.due_date)) {
      newErrors.due_date = 'Invalid date format';
    }

    if (formData.due_time && formData.due_time.length > 0 && !/^\d{2}:\d{2}(:\d{2})?$/.test(formData.due_time)) {
      newErrors.due_time = 'Invalid time format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Convert empty strings to null for optional fields
    const cleanedData = {
      ...formData,
      due_date: formData.due_date?.trim() || null,
      due_time: formData.due_time?.trim() || null,
      description: formData.description?.trim() || null,
    };

    onSubmit(cleanedData, checklists);
  };

  const handleChange = (field: keyof TaskInsert, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklists(prev => [
        ...prev,
        { item_text: newChecklistItem.trim(), order_index: prev.length }
      ]);
      setNewChecklistItem('');
    }
  };

  const removeChecklistItem = (index: number) => {
    setChecklists(prev => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, order_index: i })));
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
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const selectedProperty = properties.find(p => p.property_id === formData.property_id);
  const selectedUser = users.find(u => u.user_id === formData.assigned_to);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <CheckSquare className="h-6 w-6 text-primary" />
            {isEditing ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update task details and checklist items'
              : 'Fill in the details to create a new task'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="required">
              Task Title *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Enter task title..."
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Enter task description..."
              className="min-h-[100px]"
            />
          </div>

          {/* Property and Assignee Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="property_id" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Property (Optional)
              </Label>
              <Select
                value={formData.property_id || 'none'}
                onValueChange={(value) => handleChange('property_id', value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a property..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No property</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.property_id} value={property.property_id!}>
                      {property.property_name} - {property.property_type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProperty && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-2">
                    <p className="text-sm text-blue-800">{selectedProperty.property_name}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned_to" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Assign To (Optional)
              </Label>
              <Select
                value={formData.assigned_to || 'none'}
                onValueChange={(value) => handleChange('assigned_to', value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {formatUserDisplay(user)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          {/* Status, Priority, Category */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status" className="flex items-center gap-2">
                <Flag className="h-4 w-4" />
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => handleChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Badge className={getStatusColor(formData.status)}>
                {formData.status.replace('_', ' ')}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Priority
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => handleChange('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Badge className={getPriorityColor(formData.priority)}>
                {formData.priority}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Category
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value: any) => handleChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="check_in_prep">Check-in Prep</SelectItem>
                  <SelectItem value="check_out_prep">Check-out Prep</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due_date" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Due Date (Optional)
              </Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date || ''}
                onChange={(e) => handleChange('due_date', e.target.value)}
                className={errors.due_date ? 'border-red-500' : ''}
              />
              {errors.due_date && (
                <p className="text-sm text-red-500">{errors.due_date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_time" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Due Time (Optional)
              </Label>
              <Input
                id="due_time"
                type="time"
                value={formData.due_time || ''}
                onChange={(e) => handleChange('due_time', e.target.value)}
                className={errors.due_time ? 'border-red-500' : ''}
              />
              {errors.due_time && (
                <p className="text-sm text-red-500">{errors.due_time}</p>
              )}
            </div>
          </div>

          {/* Checklist Builder */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Checklist Items (Optional)
            </Label>
            <div className="flex gap-2">
              <Input
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                placeholder="Add a checklist item..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addChecklistItem();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addChecklistItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {checklists.length > 0 && (
              <div className="space-y-2 mt-4">
                {checklists.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded border bg-muted/30"
                  >
                    <Checkbox checked={false} disabled />
                    <span className="flex-1 text-sm">{item.item_text}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChecklistItem(index)}
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting
                ? isEditing
                  ? 'Updating...'
                  : 'Creating...'
                : isEditing
                  ? 'Update Task'
                  : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
