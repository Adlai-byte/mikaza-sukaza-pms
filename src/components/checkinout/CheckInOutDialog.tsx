import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SignaturePad } from './SignaturePad';
import { useProperties } from '@/hooks/useProperties';
import { useUsersOptimized } from '@/hooks/useUsersOptimized';
import { useChecklistTemplates } from '@/hooks/useChecklistTemplates';
import { useCreateCheckInOutRecord, useUpdateCheckInOutRecord } from '@/hooks/useCheckInOutRecords';
import { useAuth } from '@/contexts/AuthContext';
import { CheckInOutRecord, ChecklistItem, ChecklistResponse, Attachment } from '@/lib/schemas';
import { formatUserDisplay } from '@/lib/user-display';
import { Upload, FileText, Image as ImageIcon, X, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const checkInOutFormSchema = z.object({
  property_id: z.string().min(1, 'Property is required'),
  record_type: z.enum(['check_in', 'check_out']),
  record_date: z.string().min(1, 'Date is required'),
  agent_id: z.string().optional(),
  resident_name: z.string().min(1, 'Resident name is required'),
  resident_contact: z.string().optional(),
  template_id: z.string().optional(),
  notes: z.string().optional(),
});

type CheckInOutFormData = z.infer<typeof checkInOutFormSchema>;

interface CheckInOutDialogProps {
  open: boolean;
  onClose: () => void;
  record?: CheckInOutRecord | null;
}

export function CheckInOutDialog({ open, onClose, record }: CheckInOutDialogProps) {
  const { user } = useAuth();
  const { data: properties = [], isLoading: propertiesLoading, error: propertiesError } = useProperties();
  const { data: users = [] } = useUsersOptimized({ user_types: ['ops', 'admin'] });

  // Debug logging
  useEffect(() => {
    console.log('🏢 CheckInOutDialog - Properties:', {
      count: properties.length,
      loading: propertiesLoading,
      error: propertiesError,
      data: properties
    });
  }, [properties, propertiesLoading, propertiesError]);

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedRecordType, setSelectedRecordType] = useState<'check_in' | 'check_out'>('check_in');
  const { data: templates = [] } = useChecklistTemplates({
    property_id: selectedPropertyId || undefined,
    template_type: selectedRecordType,
    is_active: true,
  });

  const [checklistResponses, setChecklistResponses] = useState<ChecklistResponse[]>([]);
  const [photos, setPhotos] = useState<Attachment[]>([]);
  const [documents, setDocuments] = useState<Attachment[]>([]);
  const [signatureData, setSignatureData] = useState<string>('');
  const [signatureName, setSignatureName] = useState<string>('');
  const [uploadingFile, setUploadingFile] = useState(false);

  const createMutation = useCreateCheckInOutRecord();
  const updateMutation = useUpdateCheckInOutRecord();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CheckInOutFormData>({
    resolver: zodResolver(checkInOutFormSchema),
    defaultValues: {
      record_type: 'check_in',
      record_date: new Date().toISOString().split('T')[0],
      agent_id: user?.id,
    },
  });

  const watchPropertyId = watch('property_id');
  const watchRecordType = watch('record_type');
  const watchTemplateId = watch('template_id');

  useEffect(() => {
    setSelectedPropertyId(watchPropertyId || '');
  }, [watchPropertyId]);

  useEffect(() => {
    setSelectedRecordType(watchRecordType || 'check_in');
  }, [watchRecordType]);

  // Load record data when editing
  useEffect(() => {
    if (record) {
      setValue('property_id', record.property_id);
      setValue('record_type', record.record_type);
      setValue('record_date', record.record_date.split('T')[0]);
      setValue('agent_id', record.agent_id || '');
      setValue('resident_name', record.resident_name || '');
      setValue('resident_contact', record.resident_contact || '');
      setValue('template_id', record.template_id || '');
      setValue('notes', record.notes || '');

      setChecklistResponses(record.checklist_responses as ChecklistResponse[] || []);
      setPhotos(record.photos as Attachment[] || []);
      setDocuments(record.documents as Attachment[] || []);
      setSignatureData(record.signature_data || '');
      setSignatureName(record.signature_name || '');
    }
  }, [record, setValue]);

  // Load checklist items from template
  const selectedTemplate = templates.find(t => t.template_id === watchTemplateId);
  const checklistItems = (selectedTemplate?.checklist_items as ChecklistItem[]) || [];

  const handleFileUpload = async (file: File, type: 'photo' | 'document') => {
    try {
      setUploadingFile(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `check-in-out/${type}s/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const attachment: Attachment = {
        url: publicUrl,
        name: file.name,
        type: file.type,
        size: file.size,
        caption: '',
        timestamp: new Date().toISOString(),
      };

      if (type === 'photo') {
        setPhotos(prev => [...prev, attachment]);
      } else {
        setDocuments(prev => [...prev, attachment]);
      }
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleChecklistResponse = (itemId: string, response: string | boolean, notes?: string) => {
    setChecklistResponses(prev => {
      const existing = prev.find(r => r.item_id === itemId);
      if (existing) {
        return prev.map(r => r.item_id === itemId ? { ...r, response, notes } : r);
      }
      return [...prev, { item_id: itemId, response, notes }];
    });
  };

  const onSubmit = async (data: CheckInOutFormData) => {
    const recordData = {
      property_id: data.property_id,
      record_type: data.record_type,
      record_date: new Date(data.record_date).toISOString(),
      agent_id: data.agent_id || null,
      resident_name: data.resident_name,
      resident_contact: data.resident_contact || null,
      template_id: data.template_id || null,
      checklist_responses: checklistResponses,
      photos: photos,
      documents: documents,
      signature_data: signatureData || null,
      signature_name: signatureName || null,
      signature_date: signatureData ? new Date().toISOString() : null,
      notes: data.notes || null,
      status: 'draft' as const,
      created_by: user?.id || null,
    };

    if (record) {
      updateMutation.mutate({
        recordId: record.record_id,
        updates: recordData,
      }, {
        onSuccess: () => {
          onClose();
          reset();
        },
      });
    } else {
      createMutation.mutate(recordData, {
        onSuccess: () => {
          onClose();
          reset();
          setChecklistResponses([]);
          setPhotos([]);
          setDocuments([]);
          setSignatureData('');
          setSignatureName('');
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {record ? 'Edit' : 'New'} Check-{watchRecordType === 'check_in' ? 'In' : 'Out'} Record
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="checklist">Checklist</TabsTrigger>
              <TabsTrigger value="media">Photos & Docs</TabsTrigger>
              <TabsTrigger value="signature">Signature</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="record_type">Record Type</Label>
                  <Select
                    value={watchRecordType}
                    onValueChange={(value) => setValue('record_type', value as 'check_in' | 'check_out')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="check_in">Check-In</SelectItem>
                      <SelectItem value="check_out">Check-Out</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.record_type && (
                    <p className="text-sm text-destructive mt-1">{errors.record_type.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="record_date">Date</Label>
                  <Input type="date" {...register('record_date')} />
                  {errors.record_date && (
                    <p className="text-sm text-destructive mt-1">{errors.record_date.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="property_id">Property</Label>
                <Select
                  value={watchPropertyId}
                  onValueChange={(value) => setValue('property_id', value)}
                  disabled={propertiesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={propertiesLoading ? "Loading properties..." : "Select property"} />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.length === 0 && !propertiesLoading ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No properties available
                      </div>
                    ) : (
                      properties.map((property) => (
                        <SelectItem key={property.property_id} value={property.property_id}>
                          {property.property_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {propertiesError && (
                  <p className="text-sm text-destructive mt-1">Error loading properties</p>
                )}
                {errors.property_id && (
                  <p className="text-sm text-destructive mt-1">{errors.property_id.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="resident_name">Resident Name</Label>
                  <Input {...register('resident_name')} placeholder="Full name" />
                  {errors.resident_name && (
                    <p className="text-sm text-destructive mt-1">{errors.resident_name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="resident_contact">Contact</Label>
                  <Input {...register('resident_contact')} placeholder="Phone or email" />
                </div>
              </div>

              <div>
                <Label htmlFor="agent_id">Agent</Label>
                <Select
                  value={watch('agent_id')}
                  onValueChange={(value) => setValue('agent_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id!}>
                        {formatUserDisplay(user)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="template_id">Checklist Template (Optional)</Label>
                <Select
                  value={watchTemplateId || 'none'}
                  onValueChange={(value) => setValue('template_id', value === 'none' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.template_id} value={template.template_id}>
                        {template.template_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea {...register('notes')} rows={4} placeholder="Additional notes..." />
              </div>
            </TabsContent>

            {/* Checklist Tab */}
            <TabsContent value="checklist" className="space-y-4 mt-4">
              {checklistItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No checklist template selected. Select a template in the Basic Info tab.
                </p>
              ) : (
                <div className="space-y-4">
                  {checklistItems
                    .sort((a, b) => a.order - b.order)
                    .map((item) => {
                      const response = checklistResponses.find(r => r.item_id === item.id);

                      return (
                        <Card key={item.id}>
                          <CardContent className="pt-6">
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                {item.label}
                                {item.required && <span className="text-destructive">*</span>}
                              </Label>

                              {item.type === 'checkbox' && (
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={response?.response === true}
                                    onCheckedChange={(checked) =>
                                      handleChecklistResponse(item.id, checked as boolean)
                                    }
                                  />
                                  <span className="text-sm">Completed</span>
                                </div>
                              )}

                              {item.type === 'text' && (
                                <Textarea
                                  value={(response?.response as string) || ''}
                                  onChange={(e) =>
                                    handleChecklistResponse(item.id, e.target.value)
                                  }
                                  placeholder="Enter response..."
                                  rows={3}
                                />
                              )}

                              {item.type === 'number' && (
                                <Input
                                  type="number"
                                  value={(response?.response as string) || ''}
                                  onChange={(e) =>
                                    handleChecklistResponse(item.id, e.target.value)
                                  }
                                  placeholder="Enter number..."
                                />
                              )}

                              {item.type === 'photo' && (
                                <div>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleFileUpload(file, 'photo');
                                    }}
                                    className="hidden"
                                    id={`photo-${item.id}`}
                                  />
                                  <Label
                                    htmlFor={`photo-${item.id}`}
                                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent"
                                  >
                                    <ImageIcon className="h-4 w-4" />
                                    Upload Photo
                                  </Label>
                                </div>
                              )}

                              <div className="mt-2">
                                <Label className="text-xs text-muted-foreground">Notes</Label>
                                <Input
                                  value={response?.notes || ''}
                                  onChange={(e) =>
                                    handleChecklistResponse(
                                      item.id,
                                      response?.response || '',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Optional notes..."
                                  className="mt-1"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </TabsContent>

            {/* Photos & Documents Tab */}
            <TabsContent value="media" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Photos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        files.forEach(file => handleFileUpload(file, 'photo'));
                      }}
                      className="hidden"
                      id="photos-upload"
                    />
                    <Label
                      htmlFor="photos-upload"
                      className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Photos
                    </Label>

                    <div className="grid grid-cols-3 gap-4">
                      {photos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={photo.url}
                            alt={photo.caption || `Photo ${index + 1}`}
                            className="w-full h-32 object-cover rounded-md"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                            onClick={() => setPhotos(prev => prev.filter((_, i) => i !== index))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <input
                      type="file"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        files.forEach(file => handleFileUpload(file, 'document'));
                      }}
                      className="hidden"
                      id="documents-upload"
                    />
                    <Label
                      htmlFor="documents-upload"
                      className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Documents
                    </Label>

                    <div className="space-y-2">
                      {documents.map((doc, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-md"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm">{doc.name}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setDocuments(prev => prev.filter((_, i) => i !== index))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Signature Tab */}
            <TabsContent value="signature" className="mt-4">
              <SignaturePad
                onSave={setSignatureData}
                signatureName={signatureName}
                onNameChange={setSignatureName}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending || uploadingFile}
            >
              <Save className="h-4 w-4 mr-2" />
              {record ? 'Update' : 'Create'} Record
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
