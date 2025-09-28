import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Pin, PinOff, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Note {
  note_id: string;
  note_title?: string;
  note_content: string;
  note_type: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface NotesTabProps {
  propertyId: string;
}

export function NotesTab({ propertyId }: NotesTabProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const emptyNote = {
    note_title: '',
    note_content: '',
    note_type: 'general',
    is_pinned: false,
  };

  const [formData, setFormData] = useState(emptyNote);

  useEffect(() => {
    fetchNotes();
  }, [propertyId]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('property_notes')
        .select('*')
        .eq('property_id', propertyId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast({
        title: "Error",
        description: "Failed to load notes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingNote) {
        // Update existing note
        const { error } = await supabase
          .from('property_notes')
          .update(formData)
          .eq('note_id', editingNote.note_id);

        if (error) throw error;
        
        setNotes(prev => prev.map(note => 
          note.note_id === editingNote.note_id 
            ? { ...note, ...formData, updated_at: new Date().toISOString() }
            : note
        ));
        
        toast({
          title: "Success",
          description: "Note updated successfully",
        });
      } else {
        // Create new note
        const { data, error } = await supabase
          .from('property_notes')
          .insert({
            ...formData,
            property_id: propertyId,
          })
          .select()
          .single();

        if (error) throw error;
        
        setNotes(prev => [data, ...prev]);
        
        toast({
          title: "Success",
          description: "Note added successfully",
        });
      }

      resetForm();
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('property_notes')
        .delete()
        .eq('note_id', noteId);

      if (error) throw error;
      
      setNotes(prev => prev.filter(note => note.note_id !== noteId));
      
      toast({
        title: "Success",
        description: "Note deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    }
  };

  const togglePin = async (noteId: string, isPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('property_notes')
        .update({ is_pinned: !isPinned })
        .eq('note_id', noteId);

      if (error) throw error;
      
      setNotes(prev => prev
        .map(note => 
          note.note_id === noteId 
            ? { ...note, is_pinned: !isPinned }
            : note
        )
        .sort((a, b) => {
          if (a.is_pinned !== b.is_pinned) {
            return b.is_pinned ? 1 : -1;
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
      );
      
      toast({
        title: "Success",
        description: `Note ${!isPinned ? 'pinned' : 'unpinned'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive",
      });
    }
  };

  const startEdit = (note: Note) => {
    setEditingNote(note);
    setFormData({
      note_title: note.note_title || '',
      note_content: note.note_content,
      note_type: note.note_type,
      is_pinned: note.is_pinned,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData(emptyNote);
    setEditingNote(null);
    setShowForm(false);
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getNoteTypeColor = (type: string) => {
    switch (type) {
      case 'important': return 'bg-red-100 text-red-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'guest': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getNoteTypeLabel = (type: string) => {
    switch (type) {
      case 'important': return 'Important';
      case 'maintenance': return 'Maintenance';
      case 'guest': return 'Guest';
      default: return 'General';
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
            <CardTitle>Notes</CardTitle>
            <Button onClick={() => setShowForm(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="mr-2 h-4 w-4" />
              Add note
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Warning Message */}
          {notes.length === 0 && !showForm && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Warning: Notes not found
              </AlertDescription>
            </Alert>
          )}

          {/* Note Form */}
          {showForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{editingNote ? 'Edit Note' : 'Add New Note'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="note_title">Note Title (Optional)</Label>
                    <Input
                      id="note_title"
                      value={formData.note_title}
                      onChange={(e) => handleInputChange('note_title', e.target.value)}
                      placeholder="Enter note title..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="note_type">Note Type</Label>
                    <Select value={formData.note_type} onValueChange={(value) => handleInputChange('note_type', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="important">Important</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="guest">Guest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="note_content">Note Content</Label>
                  <Textarea
                    id="note_content"
                    value={formData.note_content}
                    onChange={(e) => handleInputChange('note_content', e.target.value)}
                    placeholder="Enter your note content..."
                    rows={4}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_pinned"
                    checked={formData.is_pinned}
                    onChange={(e) => handleInputChange('is_pinned', e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="is_pinned">Pin this note</Label>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                    {editingNote ? 'Update' : 'Save'}
                  </Button>
                  <Button onClick={resetForm} variant="destructive">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes List */}
          {notes.length === 0 && !showForm ? (
            <div className="text-center py-8 text-muted-foreground">
              No notes found for this property.
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <Card key={note.note_id} className={note.is_pinned ? 'border-yellow-200 bg-yellow-50' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {note.is_pinned && <Pin className="h-4 w-4 text-yellow-600" />}
                          {note.note_title && (
                            <h3 className="font-semibold">{note.note_title}</h3>
                          )}
                          <Badge className={getNoteTypeColor(note.note_type)}>
                            {getNoteTypeLabel(note.note_type)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">
                          {note.note_content}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Created: {new Date(note.created_at).toLocaleDateString()}</span>
                          {note.updated_at !== note.created_at && (
                            <span>Updated: {new Date(note.updated_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => togglePin(note.note_id, note.is_pinned)}
                          className="h-8 w-8 p-0"
                          title={note.is_pinned ? "Unpin note" : "Pin note"}
                        >
                          {note.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(note)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(note.note_id)}
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