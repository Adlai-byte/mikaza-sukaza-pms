import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckInOutRecord, CheckInOutRecordInsert, CheckInOutFilters } from '@/lib/schemas';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { generateAndUploadCheckInOutPDF, AccessInfo } from '@/lib/check-in-out-pdf';

/**
 * Fetch access information for a check-in/out record
 * Uses unit-specific credentials if available, falls back to property-level
 */
async function fetchAccessInfo(propertyId: string, bookingId?: string | null): Promise<AccessInfo | undefined> {
  try {
    // First check if booking has a unit
    let unitId: string | null = null;
    let unitName: string | null = null;

    if (bookingId) {
      const { data: booking } = await supabase
        .from('property_bookings')
        .select('unit_id, unit:units(unit_id, property_name)')
        .eq('booking_id', bookingId)
        .single();

      if (booking?.unit_id) {
        unitId = booking.unit_id;
        unitName = (booking.unit as any)?.property_name || null;
      }
    }

    // If booking has a unit, try to get unit-specific credentials first
    if (unitId) {
      const [{ data: unitComm }, { data: unitAccess }] = await Promise.all([
        supabase.from('unit_communication').select('*').eq('unit_id', unitId).maybeSingle(),
        supabase.from('unit_access').select('*').eq('unit_id', unitId).maybeSingle(),
      ]);

      // Get property-level for fallback
      const [{ data: propComm }, { data: propAccess }] = await Promise.all([
        supabase.from('property_communication').select('*').eq('property_id', propertyId).maybeSingle(),
        supabase.from('property_access').select('*').eq('property_id', propertyId).maybeSingle(),
      ]);

      // Merge unit and property credentials (unit takes precedence)
      return {
        wifi_name: unitComm?.wifi_name ?? propComm?.wifi_name,
        wifi_password: unitComm?.wifi_password ?? propComm?.wifi_password,
        phone_number: unitComm?.phone_number ?? propComm?.phone_number,
        gate_code: unitAccess?.gate_code ?? propAccess?.gate_code,
        door_lock_password: unitAccess?.door_lock_password ?? propAccess?.door_lock_password,
        alarm_passcode: unitAccess?.alarm_passcode ?? propAccess?.alarm_passcode,
        source: unitComm || unitAccess ? 'unit' : 'property',
        unit_name: unitName,
      };
    }

    // No unit - use property-level credentials
    const [{ data: propComm }, { data: propAccess }] = await Promise.all([
      supabase.from('property_communication').select('*').eq('property_id', propertyId).maybeSingle(),
      supabase.from('property_access').select('*').eq('property_id', propertyId).maybeSingle(),
    ]);

    if (!propComm && !propAccess) return undefined;

    return {
      wifi_name: propComm?.wifi_name,
      wifi_password: propComm?.wifi_password,
      phone_number: propComm?.phone_number,
      gate_code: propAccess?.gate_code,
      door_lock_password: propAccess?.door_lock_password,
      alarm_passcode: propAccess?.alarm_passcode,
      source: 'property',
    };
  } catch (error) {
    console.error('Error fetching access info for PDF:', error);
    return undefined;
  }
}

export function useCheckInOutRecords(filters?: CheckInOutFilters) {
  return useQuery({
    queryKey: ['check_in_out_records', filters],
    staleTime: 0, // Always refetch when invalidated - operational data
    queryFn: async () => {
      // Build select with optional deletedBy relation for deleted records
      const selectFields = filters?.include_deleted
        ? `
          *,
          property:properties(property_id, property_name),
          booking:property_bookings(booking_id, guest_name, check_in_date, check_out_date, booking_status),
          agent:users!check_in_out_records_agent_id_fkey(user_id, first_name, last_name, user_type),
          template:checklist_templates(template_id, template_name, template_type),
          creator:users!check_in_out_records_created_by_fkey(user_id, first_name, last_name, user_type),
          deletedBy:users!check_in_out_records_deleted_by_fkey(user_id, first_name, last_name)
        `
        : `
          *,
          property:properties(property_id, property_name),
          booking:property_bookings(booking_id, guest_name, check_in_date, check_out_date, booking_status),
          agent:users!check_in_out_records_agent_id_fkey(user_id, first_name, last_name, user_type),
          template:checklist_templates(template_id, template_name, template_type),
          creator:users!check_in_out_records_created_by_fkey(user_id, first_name, last_name, user_type)
        `;

      let query = supabase
        .from('check_in_out_records')
        .select(selectFields)
        .order('record_date', { ascending: false });

      // Filter out soft-deleted records by default
      if (!filters?.include_deleted) {
        query = query.is('deleted_at', null);
      }

      if (filters?.property_id) {
        query = query.eq('property_id', filters.property_id);
      }

      if (filters?.booking_id) {
        query = query.eq('booking_id', filters.booking_id);
      }

      if (filters?.record_type) {
        query = query.eq('record_type', filters.record_type);
      }

      if (filters?.agent_id) {
        query = query.eq('agent_id', filters.agent_id);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.start_date) {
        query = query.gte('record_date', filters.start_date);
      }

      if (filters?.end_date) {
        query = query.lte('record_date', filters.end_date);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CheckInOutRecord[];
    },
  });
}

export function useCheckInOutRecord(recordId: string | null) {
  return useQuery({
    queryKey: ['check_in_out_record', recordId],
    staleTime: 0, // Always refetch when invalidated - operational data
    queryFn: async () => {
      if (!recordId) return null;

      const { data, error } = await supabase
        .from('check_in_out_records')
        .select(`
          *,
          property:properties(property_id, property_name),
          booking:property_bookings(booking_id, guest_name, check_in_date, check_out_date, booking_status),
          agent:users!check_in_out_records_agent_id_fkey(user_id, first_name, last_name, user_type),
          template:checklist_templates(template_id, template_name, template_type, checklist_items),
          creator:users!check_in_out_records_created_by_fkey(user_id, first_name, last_name, user_type)
        `)
        .eq('record_id', recordId)
        .single();

      if (error) throw error;
      return data as CheckInOutRecord;
    },
    enabled: !!recordId,
  });
}

export function useCreateCheckInOutRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: async (record: CheckInOutRecordInsert) => {
      console.log('[CheckInOut] Creating record with data:', {
        ...record,
        signature_data: record.signature_data ? `[${record.signature_data.length} chars]` : null,
        photos: record.photos?.length || 0,
        documents: record.documents?.length || 0,
      });

      // Ensure photos and documents are proper arrays
      const recordToInsert = {
        ...record,
        photos: Array.isArray(record.photos) ? record.photos : [],
        documents: Array.isArray(record.documents) ? record.documents : [],
        signature_data: record.signature_data || null,
        signature_name: record.signature_name || null,
      };

      console.log('[CheckInOut] Inserting record:', recordToInsert);

      const { data, error } = await supabase
        .from('check_in_out_records')
        .insert(recordToInsert)
        .select()
        .single();

      if (error) {
        console.error('[CheckInOut] Insert error:', error);
        throw error;
      }

      console.log('[CheckInOut] Record created successfully:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['check_in_out_records'] });

      logActivity('check_in_out_record_created', {
        record_id: data.record_id,
        record_type: data.record_type,
        property_id: data.property_id,
        resident_name: data.resident_name,
        status: data.status,
      });

      toast({
        title: 'Record created',
        description: `${data.record_type === 'check_in' ? 'Check-in' : 'Check-out'} record has been created successfully.`,
      });
    },
    onError: (error) => {
      console.error('Error creating check-in/out record:', error);
      toast({
        title: 'Error',
        description: 'Failed to create check-in/out record. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCheckInOutRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: async ({ recordId, updates }: { recordId: string; updates: Partial<CheckInOutRecordInsert> }) => {
      console.log('[CheckInOut] Updating record:', recordId, {
        ...updates,
        signature_data: updates.signature_data ? `[${updates.signature_data.length} chars]` : null,
        photos: updates.photos?.length || 0,
        documents: updates.documents?.length || 0,
      });

      // Ensure photos and documents are proper arrays if provided
      const updateData: Partial<CheckInOutRecordInsert> = {
        ...updates,
      };

      if (updates.photos !== undefined) {
        updateData.photos = Array.isArray(updates.photos) ? updates.photos : [];
      }
      if (updates.documents !== undefined) {
        updateData.documents = Array.isArray(updates.documents) ? updates.documents : [];
      }

      console.log('[CheckInOut] Update data:', updateData);

      const { data, error } = await supabase
        .from('check_in_out_records')
        .update(updateData)
        .eq('record_id', recordId)
        .select()
        .single();

      if (error) {
        console.error('[CheckInOut] Update error:', error);
        throw error;
      }

      console.log('[CheckInOut] Record updated successfully:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['check_in_out_records'] });
      queryClient.invalidateQueries({ queryKey: ['check_in_out_record', data.record_id] });

      logActivity('check_in_out_record_updated', {
        record_id: data.record_id,
        record_type: data.record_type,
        status: data.status,
      });

      toast({
        title: 'Record updated',
        description: 'Check-in/out record has been updated successfully.',
      });
    },
    onError: (error) => {
      console.error('Error updating check-in/out record:', error);
      toast({
        title: 'Error',
        description: 'Failed to update check-in/out record. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCheckInOutRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: async ({ recordId, userId }: { recordId: string; userId?: string }) => {
      // Fetch record details before soft deletion for logging
      const { data: record } = await supabase
        .from('check_in_out_records')
        .select('record_id, record_type, property_id, resident_name, status')
        .eq('record_id', recordId)
        .single();

      // Soft delete: set deleted_at timestamp and deleted_by user
      const { error } = await supabase
        .from('check_in_out_records')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: userId || null,
        })
        .eq('record_id', recordId);

      if (error) throw error;
      return { recordId, record };
    },
    onSuccess: ({ recordId, record }) => {
      queryClient.invalidateQueries({ queryKey: ['check_in_out_records'] });

      logActivity('check_in_out_record_deleted', {
        record_id: recordId,
        record_type: record?.record_type,
        property_id: record?.property_id,
        resident_name: record?.resident_name,
        status: record?.status,
        soft_delete: true,
      });

      toast({
        title: 'Record deleted',
        description: 'Check-in/out record has been deleted. It can be restored by an administrator.',
      });
    },
    onError: (error) => {
      console.error('Error deleting check-in/out record:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete check-in/out record. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useRestoreCheckInOutRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: async (recordId: string) => {
      // Clear the deleted_at and deleted_by fields to restore
      const { data, error } = await supabase
        .from('check_in_out_records')
        .update({
          deleted_at: null,
          deleted_by: null,
        })
        .eq('record_id', recordId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['check_in_out_records'] });
      queryClient.invalidateQueries({ queryKey: ['check_in_out_record', data.record_id] });

      logActivity('check_in_out_record_restored', {
        record_id: data.record_id,
        record_type: data.record_type,
        property_id: data.property_id,
        resident_name: data.resident_name,
      });

      toast({
        title: 'Record restored',
        description: 'Check-in/out record has been restored successfully.',
      });
    },
    onError: (error) => {
      console.error('Error restoring check-in/out record:', error);
      toast({
        title: 'Error',
        description: 'Failed to restore check-in/out record. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function usePermanentDeleteCheckInOutRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: async (recordId: string) => {
      // Fetch record details before permanent deletion for logging
      const { data: record } = await supabase
        .from('check_in_out_records')
        .select('record_id, record_type, property_id, resident_name, status')
        .eq('record_id', recordId)
        .single();

      // Hard delete - permanently remove from database
      const { error } = await supabase
        .from('check_in_out_records')
        .delete()
        .eq('record_id', recordId);

      if (error) throw error;
      return { recordId, record };
    },
    onSuccess: ({ recordId, record }) => {
      queryClient.invalidateQueries({ queryKey: ['check_in_out_records'] });

      logActivity('check_in_out_record_permanently_deleted', {
        record_id: recordId,
        record_type: record?.record_type,
        property_id: record?.property_id,
        resident_name: record?.resident_name,
        status: record?.status,
      });

      toast({
        title: 'Record permanently deleted',
        description: 'Check-in/out record has been permanently removed.',
      });
    },
    onError: (error) => {
      console.error('Error permanently deleting check-in/out record:', error);
      toast({
        title: 'Error',
        description: 'Failed to permanently delete check-in/out record. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useCompleteCheckInOutRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: async (recordId: string) => {
      // First, fetch the complete record with all relations
      const { data: record, error: fetchError } = await supabase
        .from('check_in_out_records')
        .select(`
          *,
          property:properties(property_id, property_name),
          agent:users!check_in_out_records_agent_id_fkey(user_id, first_name, last_name, user_type),
          template:checklist_templates(template_id, template_name, template_type, checklist_items)
        `)
        .eq('record_id', recordId)
        .single();

      if (fetchError) throw fetchError;

      // Fetch access information (WiFi, door codes) for the PDF
      const accessInfo = await fetchAccessInfo(record.property_id, record.booking_id);

      // Generate and upload PDF
      let pdfUrl = null;
      try {
        const checklistItems = record.template?.checklist_items || [];
        pdfUrl = await generateAndUploadCheckInOutPDF(
          { record, checklistItems, accessInfo },
          supabase
        );
        console.log('✅ PDF generated and uploaded:', pdfUrl);
      } catch (pdfError) {
        console.error('⚠️ Failed to generate PDF:', pdfError);
        // Continue with completion even if PDF fails
      }

      // Update record to completed with PDF URL
      const { data, error } = await supabase
        .from('check_in_out_records')
        .update({
          status: 'completed',
          signature_date: new Date().toISOString(),
          pdf_url: pdfUrl,
        })
        .eq('record_id', recordId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['check_in_out_records'] });
      queryClient.invalidateQueries({ queryKey: ['check_in_out_record', data.record_id] });

      logActivity('check_in_out_record_completed', {
        record_id: data.record_id,
        record_type: data.record_type,
        property_id: data.property_id,
        resident_name: data.resident_name,
        pdf_generated: !!data.pdf_url,
      });

      toast({
        title: 'Record completed',
        description: `${data.record_type === 'check_in' ? 'Check-in' : 'Check-out'} record has been completed successfully.${data.pdf_url ? ' PDF report generated.' : ''}`,
      });
    },
    onError: (error) => {
      console.error('Error completing check-in/out record:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete check-in/out record. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useGenerateCheckInOutPDF() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: async (recordId: string) => {
      // Fetch the complete record with all relations
      const { data: record, error: fetchError } = await supabase
        .from('check_in_out_records')
        .select(`
          *,
          property:properties(property_id, property_name),
          agent:users!check_in_out_records_agent_id_fkey(user_id, first_name, last_name, user_type),
          template:checklist_templates(template_id, template_name, template_type, checklist_items)
        `)
        .eq('record_id', recordId)
        .single();

      if (fetchError) throw fetchError;

      // Fetch access information (WiFi, door codes) for the PDF
      const accessInfo = await fetchAccessInfo(record.property_id, record.booking_id);

      // Generate and upload PDF
      const checklistItems = record.template?.checklist_items || [];
      const pdfUrl = await generateAndUploadCheckInOutPDF(
        { record, checklistItems, accessInfo },
        supabase
      );

      // Update record with PDF URL
      const { data, error } = await supabase
        .from('check_in_out_records')
        .update({ pdf_url: pdfUrl })
        .eq('record_id', recordId)
        .select()
        .single();

      if (error) throw error;
      return { record: data, pdfUrl };
    },
    onSuccess: ({ record, pdfUrl }) => {
      queryClient.invalidateQueries({ queryKey: ['check_in_out_records'] });
      queryClient.invalidateQueries({ queryKey: ['check_in_out_record', record.record_id] });

      logActivity('check_in_out_pdf_generated', {
        record_id: record.record_id,
        record_type: record.record_type,
        property_id: record.property_id,
      });

      toast({
        title: 'PDF Generated',
        description: 'Check-in/out PDF report has been generated successfully.',
      });
    },
    onError: (error: any) => {
      console.error('Error generating PDF:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      toast({
        title: 'PDF Generation Failed',
        description: `Failed to generate PDF: ${errorMessage}`,
        variant: 'destructive',
      });
    },
  });
}
