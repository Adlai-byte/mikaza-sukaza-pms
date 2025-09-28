import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ChecklistItem {
  checklist_id: string;
  checklist_name: string;
  description?: string;
  is_completed: boolean;
  due_date?: string;
  priority: string;
  assigned_to?: string;
}

interface CheckListsTabProps {
  propertyId: string;
}

export function CheckListsTab({ propertyId }: CheckListsTabProps) {
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const emptyItem = {
    checklist_name: '',
    description: '',
    is_completed: false,
    due_date: '',
    priority: 'medium',
    assigned_to: '',
  };

  const [formData, setFormData] = useState(emptyItem);

  useEffect(() => {
    fetchChecklists();
  }, [propertyId]);

  const fetchChecklists = async () => {
    try {
      const { data, error } = await supabase
        .from('property_checklists')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setChecklists(data || []);
    } catch (error) {
      console.error('Error fetching checklists:', error);
      toast({
        title: "Error",
        description: "Failed to load checklists",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('property_checklists')
          .update(formData)
          .eq('checklist_id', editingItem.checklist_id);

        if (error) throw error;
        
        setChecklists(prev => prev.map(item => 
          item.checklist_id === editingItem.checklist_id 
            ? { ...item, ...formData }
            : item
        ));
        
        toast({
          title: "Success",
          description: "Checklist item updated successfully",
        });
      } else {
        // Create new item
        const { data, error } = await supabase
          .from('property_checklists')
          .insert({
            ...formData,
            property_id: propertyId,
          })
          .select()
          .single();

        if (error) throw error;
        
        setChecklists(prev => [...prev, data]);
        
        toast({
          title: "Success",
          description: "Checklist item added successfully",
        });
      }

      resetForm();
    } catch (error) {
      console.error('Error saving checklist item:', error);
      toast({
        title: "Error",
        description: "Failed to save checklist item",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (checklistId: string) => {
    try {
      const { error } = await supabase
        .from('property_checklists')
        .delete()
        .eq('checklist_id', checklistId);

      if (error) throw error;
      
      setChecklists(prev => prev.filter(item => item.checklist_id !== checklistId));
      
      toast({
        title: "Success",
        description: "Checklist item deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting checklist item:', error);
      toast({
        title: "Error",
        description: "Failed to delete checklist item",
        variant: "destructive",
      });
    }
  };

  const toggleComplete = async (checklistId: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('property_checklists')
        .update({ is_completed: !isCompleted })
        .eq('checklist_id', checklistId);

      if (error) throw error;
      
      setChecklists(prev => prev.map(item => 
        item.checklist_id === checklistId 
          ? { ...item, is_completed: !isCompleted }
          : item
      ));
      
      toast({
        title: "Success",
        description: `Item marked as ${!isCompleted ? 'completed' : 'pending'}`,
      });
    } catch (error) {
      console.error('Error updating checklist item:', error);
      toast({
        title: "Error",
        description: "Failed to update checklist item",
        variant: "destructive",
      });
    }
  };

  const startEdit = (item: ChecklistItem) => {
    setEditingItem(item);
    setFormData({
      checklist_name: item.checklist_name,
      description: item.description || '',
      is_completed: item.is_completed,
      due_date: item.due_date || '',
      priority: item.priority,
      assigned_to: item.assigned_to || '',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData(emptyItem);
    setEditingItem(null);
    setShowForm(false);
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-64 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Check Lists</CardTitle>
            <Button onClick={() => setShowForm(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Warning Message */}
          {checklists.length === 0 && !showForm && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Warning: No check list has been made to this property.
              </AlertDescription>
            </Alert>
          )}

          {/* Checklist Form */}
          {showForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{editingItem ? 'Edit Checklist Item' : 'Add New Checklist Item'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="checklist_name">Checklist Name</Label>
                  <Input
                    id="checklist_name"
                    value={formData.checklist_name}
                    onChange={(e) => handleInputChange('checklist_name', e.target.value)}
                    placeholder="Enter checklist item name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Optional description..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => handleInputChange('due_date', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="assigned_to">Assigned To</Label>
                    <Input
                      id="assigned_to"
                      value={formData.assigned_to}
                      onChange={(e) => handleInputChange('assigned_to', e.target.value)}
                      placeholder="Person responsible"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="is_completed" 
                    checked={formData.is_completed}
                    onCheckedChange={(checked) => handleInputChange('is_completed', checked)}
                  />
                  <Label htmlFor="is_completed">Mark as completed</Label>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                    {editingItem ? 'Update' : 'Save'}
                  </Button>
                  <Button onClick={resetForm} variant="destructive">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Checklists List */}
          {checklists.length === 0 && !showForm ? (
            <div className="text-center py-8 text-muted-foreground">
              No checklist items created for this property.
            </div>
          ) : (
            <div className="space-y-4">
              {checklists.map((item) => (
                <Card key={item.checklist_id} className={item.is_completed ? 'opacity-75' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <Checkbox
                          checked={item.is_completed}
                          onCheckedChange={() => toggleComplete(item.checklist_id, item.is_completed)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className={`font-semibold ${item.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                              {item.checklist_name}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                              {item.priority}
                            </span>
                          </div>
                          {item.description && (
                            <p className={`text-sm mb-2 ${item.is_completed ? 'line-through text-muted-foreground' : 'text-muted-foreground'}`}>
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {item.due_date && (
                              <span>Due: {new Date(item.due_date).toLocaleDateString()}</span>
                            )}
                            {item.assigned_to && (
                              <span>Assigned to: {item.assigned_to}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(item)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(item.checklist_id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}