import React, { useState, useEffect, useMemo } from 'react';
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
import { useBookings } from '@/hooks/useBookings';
import { useAuth } from '@/contexts/AuthContext';
import { CheckInOutRecord, ChecklistItem, ChecklistResponse, Attachment, Booking } from '@/lib/schemas';
import { formatUserDisplay } from '@/lib/user-display';
import { Upload, FileText, Image as ImageIcon, X, Save, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

const checkInOutFormSchema = z.object({
  property_id: z.string().min(1, 'Property is required'),
  booking_id: z.string().optional(),
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
  viewMode?: boolean;
}

export function CheckInOutDialog({ open, onClose, record, viewMode = false }: CheckInOutDialogProps) {
  const { user } = useAuth();
  const { properties = [], loading: propertiesLoading, error: propertiesError } = useProperties();
  const { users: allUsers = [], loading: usersLoading } = useUsersOptimized();

  // Filter to show only ops and admin users for the agent selection
  const users = useMemo(() => {
    return allUsers.filter(u => u.user_type === 'ops' || u.user_type === 'admin');
  }, [allUsers]);

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedRecordType, setSelectedRecordType] = useState<'check_in' | 'check_out'>('check_in');

  // Fetch templates - don't filter by property initially to show all available templates
  const { data: allTemplates = [], isLoading: templatesLoading } = useChecklistTemplates({
    template_type: selectedRecordType,
    is_active: true,
  });

  // Filter templates to show those matching the selected property OR templates without a property (available for all)
  const templates = useMemo(() => {
    if (!selectedPropertyId) return allTemplates;
    return allTemplates.filter(t =>
      t.property_id === selectedPropertyId || t.property_id === null
    );
  }, [allTemplates, selectedPropertyId]);

  // Fetch bookings for linking
  const { data: allBookings = [], isLoading: bookingsLoading } = useBookings();

  // Filter bookings by selected property and show only active/confirmed bookings
  const propertyBookings = useMemo(() => {
    if (!selectedPropertyId) return [];
    return allBookings.filter((b: Booking) =>
      b.property_id === selectedPropertyId &&
      ['confirmed', 'checked_in', 'pending'].includes(b.booking_status || '')
    );
  }, [allBookings, selectedPropertyId]);

  // Debug logging - AFTER all declarations
  useEffect(() => {
    console.log('🏢 CheckInOutDialog - Properties:', {
      count: properties.length,
      loading: propertiesLoading,
      error: propertiesError,
      data: properties
    });
  }, [properties, propertiesLoading, propertiesError]);

  useEffect(() => {
    console.log('📋 CheckInOutDialog - Templates:', {
      allTemplatesCount: allTemplates.length,
      filteredTemplatesCount: templates.length,
      loading: templatesLoading,
      selectedPropertyId,
      selectedRecordType,
      allTemplates,
      filteredTemplates: templates
    });
  }, [allTemplates, templates, templatesLoading, selectedPropertyId, selectedRecordType]);

  useEffect(() => {
    console.log('👥 CheckInOutDialog - Users:', {
      allUsersCount: allUsers.length,
      filteredUsersCount: users.length,
      loading: usersLoading,
      users
    });
  }, [allUsers, users, usersLoading]);

  const [checklistResponses, setChecklistResponses] = useState<ChecklistResponse[]>([]);
  const [photos, setPhotos] = useState<Attachment[]>([]);
  const [documents, setDocuments] = useState<Attachment[]>([]);
  const [signatureData, setSignatureData] = useState<string>('');
  const [signatureName, setSignatureName] = useState<string>('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [signatureResetKey, setSignatureResetKey] = useState(0);

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
  const watchBookingId = watch('booking_id');

  useEffect(() => {
    setSelectedPropertyId(watchPropertyId || '');
  }, [watchPropertyId]);

  useEffect(() => {
    setSelectedRecordType(watchRecordType || 'check_in');
  }, [watchRecordType]);

  // Auto-populate fields when a booking is selected
  useEffect(() => {
    if (watchBookingId && watchBookingId !== 'none') {
      const selectedBooking = propertyBookings.find((b: Booking) => b.booking_id === watchBookingId);
      if (selectedBooking) {
        // Set resident name from guest name
        setValue('resident_name', selectedBooking.guest_name || '');
        setValue('resident_contact', selectedBooking.guest_email || selectedBooking.guest_phone || '');

        // Set date based on record type
        if (watchRecordType === 'check_in' && selectedBooking.check_in_date) {
          setValue('record_date', selectedBooking.check_in_date.split('T')[0]);
        } else if (watchRecordType === 'check_out' && selectedBooking.check_out_date) {
          setValue('record_date', selectedBooking.check_out_date.split('T')[0]);
        }
      }
    }
  }, [watchBookingId, propertyBookings, watchRecordType, setValue]);

  // Reset form when opening for a NEW record (no existing record)
  useEffect(() => {
    if (open && !record) {
      // Reset form to default values
      reset({
        record_type: 'check_in',
        record_date: new Date().toISOString().split('T')[0],
        agent_id: user?.id,
        property_id: '',
        booking_id: '',
        resident_name: '',
        resident_contact: '',
        template_id: '',
        notes: '',
      });
      // Reset non-form state
      setChecklistResponses([]);
      setPhotos([]);
      setDocuments([]);
      setSignatureData('');
      setSignatureName('');
      // Increment key to force SignaturePad remount and clear internal state
      setSignatureResetKey(prev => prev + 1);
    }
  }, [open, record, reset, user?.id]);

  // Load record data when editing
  useEffect(() => {
    if (record) {
      setValue('property_id', record.property_id);
      setValue('booking_id', record.booking_id || '');
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
      console.log(`📤 [CheckInOut] Uploading ${type}:`, file.name, file.size);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `check-in-out/${type}s/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error(`❌ [CheckInOut] Upload error:`, uploadError);
        throw uploadError;
      }

      console.log(`✅ [CheckInOut] Upload successful:`, filePath);

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      console.log(`🔗 [CheckInOut] Public URL:`, publicUrl);

      const attachment: Attachment = {
        url: publicUrl,
        name: file.name,
        type: file.type,
        size: file.size,
        caption: '',
        timestamp: new Date().toISOString(),
      };

      if (type === 'photo') {
        setPhotos(prev => {
          const newPhotos = [...prev, attachment];
          console.log(`📷 [CheckInOut] Photos array now has ${newPhotos.length} items`);
          return newPhotos;
        });
      } else {
        setDocuments(prev => {
          const newDocs = [...prev, attachment];
          console.log(`📄 [CheckInOut] Documents array now has ${newDocs.length} items`);
          return newDocs;
        });
      }
    } catch (error: any) {
      console.error(`❌ [CheckInOut] Error uploading ${type}:`, error);
      // Show error to user instead of silently failing
      alert(`Failed to upload ${type}: ${error.message || 'Unknown error'}. Please try again.`);
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
    console.log('📝 Form submitted with data:', data);
    console.log('👤 Current user:', user);

    // Log detailed state for debugging
    console.log('📷 Photos state:', photos.length, 'items:', photos.map(p => p.name));
    console.log('📄 Documents state:', documents.length, 'items:', documents.map(d => d.name));
    console.log('✍️ Signature state:', signatureData ? `${signatureData.length} chars` : 'empty');
    console.log('👤 Signature name:', signatureName || 'empty');

    const recordData = {
      property_id: data.property_id,
      booking_id: data.booking_id && data.booking_id !== 'none' ? data.booking_id : null,
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

    console.log('💾 Record data to be saved:', {
      ...recordData,
      photos: `${recordData.photos.length} photos`,
      documents: `${recordData.documents.length} documents`,
      signature_data: recordData.signature_data ? `${recordData.signature_data.length} chars` : null,
    });

    if (record) {
      console.log('✏️ Updating existing record:', record.record_id);
      updateMutation.mutate({
        recordId: record.record_id,
        updates: recordData,
      }, {
        onSuccess: () => {
          console.log('✅ Record updated successfully');
          onClose();
          reset();
        },
        onError: (error) => {
          console.error('❌ Error updating record:', error);
        },
      });
    } else {
      console.log('➕ Creating new record');
      createMutation.mutate(recordData, {
        onSuccess: () => {
          console.log('✅ Record created successfully');
          onClose();
          reset();
          setChecklistResponses([]);
          setPhotos([]);
          setDocuments([]);
          setSignatureData('');
          setSignatureName('');
        },
        onError: (error) => {
          console.error('❌ Error creating record:', error);
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {viewMode ? 'View' : record ? 'Edit' : 'New'} Check-{watchRecordType === 'check_in' ? 'In' : 'Out'} Record
          </DialogTitle>
        </DialogHeader>

        <form id="check-in-out-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto space-y-6 min-h-0">
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
                    disabled={viewMode}
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
                  <Input type="date" {...register('record_date')} disabled={viewMode} />
                  {errors.record_date && (
                    <p className="text-sm text-destructive mt-1">{errors.record_date.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="property_id" className="flex items-center gap-1">
                  Property
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={watchPropertyId}
                  onValueChange={(value) => setValue('property_id', value)}
                  disabled={viewMode || propertiesLoading}
                >
                  <SelectTrigger className={errors.property_id ? 'border-destructive focus-visible:ring-destructive' : ''}>
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
                  <p className="text-sm text-destructive mt-1 font-medium">
                    ⚠️ {errors.property_id.message}
                  </p>
                )}
              </div>

              {/* Booking Selector - Link to existing booking */}
              <div>
                <Label htmlFor="booking_id" className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  Link to Booking (Optional)
                </Label>
                <Select
                  value={watchBookingId || 'none'}
                  onValueChange={(value) => setValue('booking_id', value === 'none' ? '' : value)}
                  disabled={viewMode || bookingsLoading || !selectedPropertyId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !selectedPropertyId
                        ? "Select a property first"
                        : bookingsLoading
                        ? "Loading bookings..."
                        : "Select a booking to link"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No booking (manual entry)</SelectItem>
                    {propertyBookings.length === 0 && selectedPropertyId && !bookingsLoading ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No active bookings for this property
                      </div>
                    ) : (
                      propertyBookings.map((booking: Booking) => (
                        <SelectItem key={booking.booking_id} value={booking.booking_id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{booking.guest_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {booking.check_in_date ? format(new Date(booking.check_in_date), 'MMM dd') : '?'} - {booking.check_out_date ? format(new Date(booking.check_out_date), 'MMM dd, yyyy') : '?'}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {watchBookingId && watchBookingId !== 'none'
                    ? "Guest info and date auto-filled from booking"
                    : "Link this record to a booking for better tracking"
                  }
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="resident_name" className="flex items-center gap-1">
                    Resident Name
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    {...register('resident_name')}
                    placeholder="Full name"
                    className={errors.resident_name ? 'border-destructive focus-visible:ring-destructive' : ''}
                    disabled={viewMode}
                  />
                  {errors.resident_name && (
                    <p className="text-sm text-destructive mt-1 font-medium">
                      ⚠️ {errors.resident_name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="resident_contact">Contact (Optional)</Label>
                  <Input {...register('resident_contact')} placeholder="Phone or email" disabled={viewMode} />
                </div>
              </div>

              <div>
                <Label htmlFor="agent_id">Agent (Staff Member)</Label>
                <Select
                  value={watch('agent_id')}
                  onValueChange={(value) => setValue('agent_id', value)}
                  disabled={viewMode || usersLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={usersLoading ? "Loading staff members..." : "Select staff member performing inspection"} />
                  </SelectTrigger>
                  <SelectContent>
                    {users.length === 0 && !usersLoading ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No staff members available
                      </div>
                    ) : (
                      users.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id!}>
                          {formatUserDisplay(user)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  The staff member conducting this check-in/out ({users.length} available)
                </p>
              </div>

              <div>
                <Label htmlFor="template_id">Checklist Template (Optional)</Label>
                <Select
                  value={watchTemplateId || 'none'}
                  onValueChange={(value) => setValue('template_id', value === 'none' ? '' : value)}
                  disabled={viewMode || templatesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={templatesLoading ? "Loading templates..." : "Select template"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {templates.length === 0 && !templatesLoading ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {selectedPropertyId
                          ? `No ${selectedRecordType.replace('_', '-')} templates for this property`
                          : `No ${selectedRecordType.replace('_', '-')} templates available`}
                      </div>
                    ) : (
                      templates.map((template) => (
                        <SelectItem key={template.template_id} value={template.template_id}>
                          {template.template_name}
                          {!template.property_id && " (All Properties)"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Available templates: {templates.length} {selectedRecordType.replace('_', '-')} template(s)
                </p>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea {...register('notes')} rows={4} placeholder="Additional notes..." disabled={viewMode} />
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
                                      handleChecklistResponse(item.id, checked as boolean, response?.notes)
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

                              {/* Notes field - separate from response to prevent clearing */}
                              <div className="mt-3 pt-3 border-t border-dashed">
                                <Label className="text-xs text-muted-foreground">Notes</Label>
                                <Textarea
                                  value={response?.notes || ''}
                                  onChange={(e) =>
                                    handleChecklistResponse(
                                      item.id,
                                      response?.response !== undefined ? response.response : (item.type === 'checkbox' ? false : ''),
                                      e.target.value
                                    )
                                  }
                                  placeholder="Optional notes for this item..."
                                  className="mt-1"
                                  rows={2}
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
                key={record?.record_id || `new-${signatureResetKey}`}
                onSave={setSignatureData}
                signatureName={signatureName}
                onNameChange={setSignatureName}
                initialSignature={signatureData}
                viewMode={viewMode}
                disabled={viewMode}
              />
            </TabsContent>
          </Tabs>
        </form>

        {/* Footer buttons - always visible outside scrollable area */}
        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
          <Button type="button" variant="outline" onClick={onClose}>
            {viewMode ? 'Close' : 'Cancel'}
          </Button>
          {!viewMode && (
            <Button
              type="submit"
              form="check-in-out-form"
              disabled={createMutation.isPending || updateMutation.isPending || uploadingFile}
              onClick={() => {
                console.log('🔘 Submit button clicked, Form errors:', errors);
                // If there are validation errors, show them in console
                if (Object.keys(errors).length > 0) {
                  console.error('❌ Form has validation errors:', errors);
                  Object.entries(errors).forEach(([field, error]) => {
                    console.error(`  - ${field}: ${(error as any)?.message}`);
                  });
                }
              }}
            >
              <Save className="h-4 w-4 mr-2" />
              {record ? 'Update' : 'Create'} Record
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
