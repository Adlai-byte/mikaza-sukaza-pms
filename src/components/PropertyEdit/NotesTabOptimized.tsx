import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Edit,
  Trash2,
  Pin,
  PinOff,
  FileText,
  AlertTriangle,
  MessageSquare,
  Calendar,
  Search,
  Filter,
  Paperclip,
  Image,
  File,
  X,
  Download,
  Upload,
  Loader2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NoteAttachment {
  url: string;
  name: string;
  type: string;
  size: number;
  uploaded_at: string;
}

interface Note {
  note_id: string;
  property_id: string;
  note_title?: string;
  note_content: string;
  note_type: string;
  is_pinned: boolean;
  attachments: NoteAttachment[];
  created_at: string;
  updated_at: string;
}

interface NotesTabOptimizedProps {
  propertyId: string;
}

const fetchNotes = async (propertyId: string): Promise<Note[]> => {
  const { data, error } = await supabase
    .from('property_notes')
    .select('*')
    .eq('property_id', propertyId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export function NotesTabOptimized({ propertyId }: NotesTabOptimizedProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const emptyNote = {
    note_title: '',
    note_content: '',
    note_type: 'general',
    is_pinned: false,
    attachments: [] as NoteAttachment[],
  };

  const [formData, setFormData] = useState(emptyNote);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const { data: notes = [], isLoading, isFetching, error } = useQuery({
    queryKey: ['property-notes', propertyId],
    queryFn: () => fetchNotes(propertyId),
    enabled: !!propertyId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const createNoteMutation = useMutation({
    mutationFn: async (noteData: Omit<Note, 'note_id' | 'created_at' | 'updated_at' | 'property_id'>) => {
      const { data, error } = await supabase
        .from('property_notes')
        .insert([{ ...noteData, property_id: propertyId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['property-notes', propertyId],
        refetchType: 'active',
      });
      toast({
        title: "Success",
        description: "Note created successfully",
      });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create note",
        variant: "destructive",
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, updates }: { noteId: string; updates: Partial<Note> }) => {
      const { data, error } = await supabase
        .from('property_notes')
        .update(updates)
        .eq('note_id', noteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['property-notes', propertyId],
        refetchType: 'active',
      });
      toast({
        title: "Success",
        description: "Note updated successfully",
      });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update note",
        variant: "destructive",
      });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('property_notes')
        .delete()
        .eq('note_id', noteId);

      if (error) throw error;
      return noteId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['property-notes', propertyId],
        refetchType: 'active',
      });
      toast({
        title: "Success",
        description: "Note deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete note",
        variant: "destructive",
      });
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ noteId, isPinned }: { noteId: string; isPinned: boolean }) => {
      const { data, error } = await supabase
        .from('property_notes')
        .update({ is_pinned: !isPinned })
        .eq('note_id', noteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: ['property-notes', propertyId],
        refetchType: 'active',
      });
      toast({
        title: "Success",
        description: `Note ${data.is_pinned ? 'pinned' : 'unpinned'} successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update note",
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    if (!formData.note_content.trim()) {
      toast({
        title: "Error",
        description: "Note content is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);

      // Upload pending files first
      let newAttachments: NoteAttachment[] = [];
      if (pendingFiles.length > 0) {
        newAttachments = await uploadFiles(pendingFiles);
      }

      // Combine existing and new attachments
      const allAttachments = [...formData.attachments, ...newAttachments];

      const noteData = {
        ...formData,
        attachments: allAttachments,
      };

      if (editingNote) {
        updateNoteMutation.mutate({
          noteId: editingNote.note_id,
          updates: noteData,
        });
      } else {
        createNoteMutation.mutate(noteData);
      }
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        title: "Error",
        description: "Failed to upload attachments",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const startEdit = (note: Note) => {
    setEditingNote(note);
    setFormData({
      note_title: note.note_title || '',
      note_content: note.note_content,
      note_type: note.note_type,
      is_pinned: note.is_pinned,
      attachments: note.attachments || [],
    });
    setPendingFiles([]);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData(emptyNote);
    setEditingNote(null);
    setPendingFiles([]);
    setShowForm(false);
  };

  // File upload helpers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setPendingFiles(prev => [...prev, ...newFiles]);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const uploadFiles = async (files: File[]): Promise<NoteAttachment[]> => {
    const uploadedAttachments: NoteAttachment[] = [];

    for (const file of files) {
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `notes/${propertyId}/${timestamp}_${sanitizedName}`;

      const { data, error } = await supabase.storage
        .from('property-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from('property-documents')
        .getPublicUrl(data.path);

      uploadedAttachments.push({
        url: urlData.publicUrl,
        name: file.name,
        type: file.type,
        size: file.size,
        uploaded_at: new Date().toISOString(),
      });
    }

    return uploadedAttachments;
  };

  const isImageFile = (type: string) => type.startsWith('image/');

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    return File;
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getNoteTypeColor = (type: string) => {
    switch (type) {
      case 'important': return 'bg-red-100 text-red-800 border-red-200';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'guest': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getNoteTypeIcon = (type: string) => {
    switch (type) {
      case 'important': return AlertTriangle;
      case 'maintenance': return Calendar;
      case 'guest': return MessageSquare;
      default: return FileText;
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

  const filteredNotes = notes.filter(note => {
    const matchesSearch = (note.note_title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         note.note_content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || note.note_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const pinnedNotes = filteredNotes.filter(note => note.is_pinned);
  const regularNotes = filteredNotes.filter(note => !note.is_pinned);

  const getStatistics = () => {
    const totalNotes = notes.length;
    const pinnedCount = notes.filter(note => note.is_pinned).length;
    const importantCount = notes.filter(note => note.note_type === 'important').length;
    const recentCount = notes.filter(note => {
      const noteDate = new Date(note.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return noteDate > weekAgo;
    }).length;

    return { totalNotes, pinnedCount, importantCount, recentCount };
  };

  const { totalNotes, pinnedCount, importantCount, recentCount } = getStatistics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-8 mb-2" />
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-6 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-destructive mb-4">
          <FileText className="h-12 w-12 mx-auto mb-2" />
          <p>Failed to load notes</p>
        </div>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['property-notes', propertyId] })}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Notes</p>
                <p className="text-2xl font-bold text-gray-900">{totalNotes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Pin className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pinned</p>
                <p className="text-2xl font-bold text-gray-900">{pinnedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Important</p>
                <p className="text-2xl font-bold text-gray-900">{importantCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Recent</p>
                <p className="text-2xl font-bold text-gray-900">{recentCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">Property Notes</CardTitle>
                <p className="text-blue-100 text-sm">Manage property notes and reminders</p>
              </div>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              disabled={isFetching}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Note
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48 pl-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Note Form */}
          {/* Note Dialog */}
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingNote ? 'Edit Note' : 'Add New Note'}</DialogTitle>
                <DialogDescription>
                  {editingNote ? 'Update the note information below.' : 'Create a new note for this property.'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
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
                  <Label htmlFor="note_content">Note Content *</Label>
                  <Textarea
                    id="note_content"
                    value={formData.note_content}
                    onChange={(e) => handleInputChange('note_content', e.target.value)}
                    placeholder="Enter your note content..."
                    rows={4}
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_pinned"
                    checked={formData.is_pinned}
                    onCheckedChange={(checked) => handleInputChange('is_pinned', checked)}
                  />
                  <Label htmlFor="is_pinned" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Pin this note
                  </Label>
                </div>

                {/* File Attachments Section */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Attachments
                  </Label>

                  {/* File Input */}
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Add Files
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Images, PDFs, Documents (Max 50MB each)
                    </span>
                  </div>

                  {/* Existing Attachments */}
                  {formData.attachments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Existing attachments:</p>
                      <div className="flex flex-wrap gap-2">
                        {formData.attachments.map((attachment, index) => {
                          const FileIcon = getFileIcon(attachment.type);
                          return (
                            <div
                              key={index}
                              className="flex items-center gap-2 bg-gray-100 rounded-md px-2 py-1 text-sm"
                            >
                              {isImageFile(attachment.type) ? (
                                <img
                                  src={attachment.url}
                                  alt={attachment.name}
                                  className="h-6 w-6 object-cover rounded"
                                />
                              ) : (
                                <FileIcon className="h-4 w-4 text-gray-500" />
                              )}
                              <span className="truncate max-w-[150px]">{attachment.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={() => removeExistingAttachment(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Pending Files */}
                  {pendingFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Files to upload:</p>
                      <div className="flex flex-wrap gap-2">
                        {pendingFiles.map((file, index) => {
                          const FileIcon = getFileIcon(file.type);
                          return (
                            <div
                              key={index}
                              className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md px-2 py-1 text-sm"
                            >
                              {isImageFile(file.type) ? (
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={file.name}
                                  className="h-6 w-6 object-cover rounded"
                                />
                              ) : (
                                <FileIcon className="h-4 w-4 text-blue-500" />
                              )}
                              <span className="truncate max-w-[150px]">{file.name}</span>
                              <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={() => removePendingFile(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button onClick={resetForm} variant="outline" disabled={isUploading}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={createNoteMutation.isPending || updateNoteMutation.isPending || isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (createNoteMutation.isPending || updateNoteMutation.isPending) ? 'Saving...' : (editingNote ? 'Update Note' : 'Save Note')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Empty State */}
          {filteredNotes.length === 0 && !showForm && (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No notes found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || filterType !== 'all' ? 'No notes match your search criteria.' : 'Get started by adding your first note.'}
              </p>
              {(!searchQuery && filterType === 'all') && (
                <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Note
                </Button>
              )}
            </div>
          )}

          {/* Pinned Notes */}
          {pinnedNotes.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Pin className="h-5 w-5 text-yellow-600" />
                Pinned Notes
              </h3>
              <div className="space-y-4">
                {pinnedNotes.map((note) => {
                  const TypeIcon = getNoteTypeIcon(note.note_type);
                  return (
                    <Card key={note.note_id} className="border-yellow-200 bg-yellow-50/50 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Pin className="h-4 w-4 text-yellow-600" />
                              {note.note_title && (
                                <h4 className="font-semibold text-gray-900">{note.note_title}</h4>
                              )}
                              <Badge className={getNoteTypeColor(note.note_type)}>
                                <TypeIcon className="h-3 w-3 mr-1" />
                                {getNoteTypeLabel(note.note_type)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
                              {note.note_content}
                            </p>
                            {/* Attachments Display */}
                            {note.attachments && note.attachments.length > 0 && (
                              <div className="mb-3">
                                <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                                  <Paperclip className="h-3 w-3" />
                                  <span>{note.attachments.length} attachment{note.attachments.length > 1 ? 's' : ''}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {note.attachments.map((attachment, idx) => {
                                    const FileIcon = getFileIcon(attachment.type);
                                    return (
                                      <a
                                        key={idx}
                                        href={attachment.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 bg-white border rounded-md px-2 py-1 text-xs hover:bg-gray-50 transition-colors"
                                      >
                                        {isImageFile(attachment.type) ? (
                                          <img
                                            src={attachment.url}
                                            alt={attachment.name}
                                            className="h-8 w-8 object-cover rounded"
                                          />
                                        ) : (
                                          <FileIcon className="h-4 w-4 text-gray-500" />
                                        )}
                                        <span className="truncate max-w-[100px]">{attachment.name}</span>
                                        <Download className="h-3 w-3 text-gray-400" />
                                      </a>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Created: {new Date(note.created_at).toLocaleDateString()}</span>
                              {note.updated_at !== note.created_at && (
                                <span>Updated: {new Date(note.updated_at).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 ml-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => togglePinMutation.mutate({ noteId: note.note_id, isPinned: note.is_pinned })}
                              className="h-8 w-8 p-0"
                              title="Unpin note"
                              disabled={togglePinMutation.isPending}
                            >
                              <PinOff className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(note)}
                              className="h-8 w-8 p-0"
                              title="Edit note"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteNoteMutation.mutate(note.note_id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete note"
                              disabled={deleteNoteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Regular Notes */}
          {regularNotes.length > 0 && (
            <div>
              {pinnedNotes.length > 0 && (
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Other Notes</h3>
              )}
              <div className="space-y-4">
                {regularNotes.map((note) => {
                  const TypeIcon = getNoteTypeIcon(note.note_type);
                  return (
                    <Card key={note.note_id} className="shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {note.note_title && (
                                <h4 className="font-semibold text-gray-900">{note.note_title}</h4>
                              )}
                              <Badge className={getNoteTypeColor(note.note_type)}>
                                <TypeIcon className="h-3 w-3 mr-1" />
                                {getNoteTypeLabel(note.note_type)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
                              {note.note_content}
                            </p>
                            {/* Attachments Display */}
                            {note.attachments && note.attachments.length > 0 && (
                              <div className="mb-3">
                                <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                                  <Paperclip className="h-3 w-3" />
                                  <span>{note.attachments.length} attachment{note.attachments.length > 1 ? 's' : ''}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {note.attachments.map((attachment, idx) => {
                                    const FileIcon = getFileIcon(attachment.type);
                                    return (
                                      <a
                                        key={idx}
                                        href={attachment.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 bg-gray-100 border rounded-md px-2 py-1 text-xs hover:bg-gray-200 transition-colors"
                                      >
                                        {isImageFile(attachment.type) ? (
                                          <img
                                            src={attachment.url}
                                            alt={attachment.name}
                                            className="h-8 w-8 object-cover rounded"
                                          />
                                        ) : (
                                          <FileIcon className="h-4 w-4 text-gray-500" />
                                        )}
                                        <span className="truncate max-w-[100px]">{attachment.name}</span>
                                        <Download className="h-3 w-3 text-gray-400" />
                                      </a>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Created: {new Date(note.created_at).toLocaleDateString()}</span>
                              {note.updated_at !== note.created_at && (
                                <span>Updated: {new Date(note.updated_at).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 ml-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => togglePinMutation.mutate({ noteId: note.note_id, isPinned: note.is_pinned })}
                              className="h-8 w-8 p-0"
                              title="Pin note"
                              disabled={togglePinMutation.isPending}
                            >
                              <Pin className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(note)}
                              className="h-8 w-8 p-0"
                              title="Edit note"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteNoteMutation.mutate(note.note_id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete note"
                              disabled={deleteNoteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}