import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Edit,
  Trash2,
  CheckSquare,
  Calendar,
  User,
  AlertTriangle,
  Clock,
  Search,
  CheckCircle2,
  Circle,
  Flag,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ListTabSkeleton, TabLoadingSpinner } from './PropertyEditSkeleton';

interface ChecklistItem {
  checklist_id: string;
  property_id: string;
  checklist_name: string;
  description?: string;
  is_completed: boolean;
  due_date?: string;
  priority: string;
  assigned_to?: string;
  created_at?: string;
}

interface CheckListsTabOptimizedProps {
  propertyId: string;
}

// Query keys
const checklistsKeys = {
  all: (propertyId: string) => ['checklists', propertyId] as const,
};

// Fetch checklists
const fetchChecklists = async (propertyId: string): Promise<ChecklistItem[]> => {
  const { data, error } = await supabase
    .from('property_checklists')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

const priorityConfig = {
  low: { color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50', icon: '🟢' },
  medium: { color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50', icon: '🟡' },
  high: { color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50', icon: '🔴' },
};

export function CheckListsTabOptimized({ propertyId }: CheckListsTabOptimizedProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddChecklistForm, setShowAddChecklistForm] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<ChecklistItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const emptyChecklist = {
    checklist_name: '',
    description: '',
    is_completed: false,
    due_date: '',
    priority: 'medium',
    assigned_to: '',
  };

  const [formData, setFormData] = useState(emptyChecklist);

  // Fetch checklists query
  const {
    data: checklists = [],
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: checklistsKeys.all(propertyId),
    queryFn: () => fetchChecklists(propertyId),
    enabled: !!propertyId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Filter checklists based on search
  const filteredChecklists = checklists.filter(checklist =>
    `${checklist.checklist_name} ${checklist.description} ${checklist.assigned_to}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  // Add checklist mutation
  const addChecklistMutation = useMutation({
    mutationFn: async (checklistData: typeof emptyChecklist) => {
      const { data, error } = await supabase
        .from('property_checklists')
        .insert([{ ...checklistData, property_id: propertyId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checklistsKeys.all(propertyId) });
      toast({
        title: 'Success',
        description: 'Checklist item added successfully',
      });
      handleCloseForm();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add checklist item',
        variant: 'destructive',
      });
    },
  });

  // Update checklist mutation
  const updateChecklistMutation = useMutation({
    mutationFn: async ({ checklistId, updates }: { checklistId: string; updates: Partial<ChecklistItem> }) => {
      const { data, error } = await supabase
        .from('property_checklists')
        .update(updates)
        .eq('checklist_id', checklistId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checklistsKeys.all(propertyId) });
      toast({
        title: 'Success',
        description: 'Checklist item updated successfully',
      });
      handleCloseForm();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update checklist item',
        variant: 'destructive',
      });
    },
  });

  // Delete checklist mutation
  const deleteChecklistMutation = useMutation({
    mutationFn: async (checklistId: string) => {
      const { error } = await supabase
        .from('property_checklists')
        .delete()
        .eq('checklist_id', checklistId);

      if (error) throw error;
      return checklistId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checklistsKeys.all(propertyId) });
      toast({
        title: 'Success',
        description: 'Checklist item removed successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove checklist item',
        variant: 'destructive',
      });
    },
  });

  // Toggle completion mutation
  const toggleCompletionMutation = useMutation({
    mutationFn: async ({ checklistId, isCompleted }: { checklistId: string; isCompleted: boolean }) => {
      const { data, error } = await supabase
        .from('property_checklists')
        .update({ is_completed: !isCompleted })
        .eq('checklist_id', checklistId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: checklistsKeys.all(propertyId) });
      toast({
        title: 'Success',
        description: `Item marked as ${data.is_completed ? 'completed' : 'pending'}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update checklist item',
        variant: 'destructive',
      });
    },
  });

  // Show loading skeleton on initial load
  if (isLoading) {
    return <ListTabSkeleton title="Checklists" />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-destructive mb-4">
          <CheckSquare className="h-12 w-12 mx-auto mb-2" />
          <p>Failed to load checklists</p>
        </div>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: checklistsKeys.all(propertyId) })}>
          Try Again
        </Button>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingChecklist) {
      updateChecklistMutation.mutate({
        checklistId: editingChecklist.checklist_id,
        updates: formData,
      });
    } else {
      addChecklistMutation.mutate(formData);
    }
  };

  const handleEdit = (checklist: ChecklistItem) => {
    setEditingChecklist(checklist);
    setFormData({
      checklist_name: checklist.checklist_name,
      description: checklist.description || '',
      is_completed: checklist.is_completed,
      due_date: checklist.due_date || '',
      priority: checklist.priority,
      assigned_to: checklist.assigned_to || '',
    });
    setShowAddChecklistForm(true);
  };

  const handleCloseForm = () => {
    setShowAddChecklistForm(false);
    setEditingChecklist(null);
    setFormData(emptyChecklist);
  };

  const handleToggleCompletion = (checklist: ChecklistItem) => {
    toggleCompletionMutation.mutate({
      checklistId: checklist.checklist_id,
      isCompleted: checklist.is_completed,
    });
  };

  const getOverdueStatus = (dueDate: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const completedCount = checklists.filter(item => item.is_completed).length;
  const overdueCount = checklists.filter(item => !item.is_completed && getOverdueStatus(item.due_date || '')).length;
  const highPriorityCount = checklists.filter(item => !item.is_completed && item.priority === 'high').length;

  return (
    <div className="space-y-6 relative">
      {/* Loading overlay for background fetching */}
      {isFetching && !isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-md">
          <TabLoadingSpinner message="Updating checklists..." />
        </div>
      )}

      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CheckSquare className="h-6 w-6" />
            Property Checklists
          </h2>
          <p className="text-muted-foreground">
            Manage tasks, maintenance items, and property to-dos
          </p>
        </div>
        <Dialog open={showAddChecklistForm} onOpenChange={setShowAddChecklistForm}>
          <DialogTrigger asChild>
            <Button
              className="bg-primary hover:bg-primary/90 shadow-lg"
              disabled={addChecklistMutation.isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingChecklist ? 'Edit Checklist Item' : 'Add New Checklist Item'}
                </DialogTitle>
                <DialogDescription>
                  {editingChecklist
                    ? 'Update the checklist item information below.'
                    : 'Create a new task or checklist item for this property.'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="checklist_name">Task Name *</Label>
                  <Input
                    id="checklist_name"
                    value={formData.checklist_name}
                    onChange={(e) => setFormData({ ...formData, checklist_name: e.target.value })}
                    placeholder="e.g., Check HVAC filters"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description or notes..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">🟢 Low Priority</SelectItem>
                        <SelectItem value="medium">🟡 Medium Priority</SelectItem>
                        <SelectItem value="high">🔴 High Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assigned_to">Assigned To</Label>
                    <Input
                      id="assigned_to"
                      value={formData.assigned_to}
                      onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                      placeholder="Person responsible"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_completed"
                    checked={formData.is_completed}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_completed: checked === true })}
                  />
                  <Label htmlFor="is_completed">Mark as completed</Label>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseForm}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addChecklistMutation.isPending || updateChecklistMutation.isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  {addChecklistMutation.isPending || updateChecklistMutation.isPending
                    ? 'Saving...'
                    : editingChecklist
                    ? 'Update'
                    : 'Add Task'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      {checklists.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search tasks by name, description, or assignee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 text-center">
            <CheckSquare className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-900">{checklists.length}</p>
            <p className="text-sm text-blue-700">Total Tasks</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-900">{completedCount}</p>
            <p className="text-sm text-green-700">Completed</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-900">{overdueCount}</p>
            <p className="text-sm text-red-700">Overdue</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4 text-center">
            <Flag className="h-8 w-8 text-amber-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-900">{highPriorityCount}</p>
            <p className="text-sm text-amber-700">High Priority</p>
          </CardContent>
        </Card>
      </div>

      {/* Checklists List */}
      {filteredChecklists.length === 0 ? (
        <div className="text-center py-12">
          <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {searchQuery ? 'No matching tasks found' : 'No Tasks Created'}
          </h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery
              ? 'Try adjusting your search terms'
              : 'Create checklists to track maintenance, inspections, and property tasks.'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setShowAddChecklistForm(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Add First Task
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredChecklists.map((checklist) => {
            const isOverdue = getOverdueStatus(checklist.due_date || '');
            const priorityInfo = priorityConfig[checklist.priority as keyof typeof priorityConfig] || priorityConfig.medium;

            return (
              <Card
                key={checklist.checklist_id}
                className={`hover:shadow-lg transition-all duration-300 hover:scale-[1.01] border-l-4 ${
                  checklist.is_completed
                    ? 'border-l-green-500 opacity-75'
                    : isOverdue
                    ? 'border-l-red-500'
                    : 'border-l-primary'
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <Checkbox
                        checked={checklist.is_completed}
                        onCheckedChange={() => handleToggleCompletion(checklist)}
                        disabled={toggleCompletionMutation.isPending}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className={`font-semibold text-lg ${checklist.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                            {checklist.checklist_name}
                          </h3>
                          <Badge className={`${priorityInfo.color} text-white`}>
                            {priorityInfo.icon} {checklist.priority}
                          </Badge>
                          {isOverdue && !checklist.is_completed && (
                            <Badge variant="destructive">
                              <Clock className="h-3 w-3 mr-1" />
                              Overdue
                            </Badge>
                          )}
                          {checklist.is_completed && (
                            <Badge className="bg-green-500 text-white">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                        </div>

                        {checklist.description && (
                          <p className={`text-sm mb-3 ${checklist.is_completed ? 'line-through text-muted-foreground' : 'text-muted-foreground'}`}>
                            {checklist.description}
                          </p>
                        )}

                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          {checklist.due_date && (
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4" />
                              <span>Due: {new Date(checklist.due_date).toLocaleDateString()}</span>
                            </div>
                          )}
                          {checklist.assigned_to && (
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4" />
                              <span>{checklist.assigned_to}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(checklist)}
                        disabled={updateChecklistMutation.isPending}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deleteChecklistMutation.isPending}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Task</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove "{checklist.checklist_name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteChecklistMutation.mutate(checklist.checklist_id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}