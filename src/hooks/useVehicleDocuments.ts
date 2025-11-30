import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { VehicleDocument, VehicleDocumentInsert } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Query keys
export const vehicleDocumentKeys = {
  all: (vehicleId: string) => ['vehicle-documents', vehicleId] as const,
};

// Fetch vehicle documents
const fetchVehicleDocuments = async (vehicleId: string): Promise<VehicleDocument[]> => {
  console.log('📄 [VehicleDocuments] Fetching documents for vehicle:', vehicleId);

  const { data, error } = await supabase
    .from('vehicle_documents')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ [VehicleDocuments] Fetch error:', error);
    throw error;
  }

  console.log('✅ [VehicleDocuments] Fetched:', data?.length || 0, 'documents');
  return (data || []) as VehicleDocument[];
};

// Upload document to storage
const uploadDocumentToStorage = async (file: File, vehicleId: string): Promise<string> => {
  console.log('📤 [VehicleDocuments] Uploading document for vehicle:', vehicleId);

  // Create filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${vehicleId}/${Date.now()}.${fileExt}`;
  const filePath = `vehicles/${fileName}`;

  // Upload to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('property-documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('❌ [VehicleDocuments] Upload error:', uploadError);
    throw uploadError;
  }

  // Get public URL (signed for private bucket)
  const { data: { publicUrl } } = supabase.storage
    .from('property-documents')
    .getPublicUrl(filePath);

  console.log('✅ [VehicleDocuments] Document uploaded:', publicUrl);
  return publicUrl;
};

// Hook for managing vehicle documents
export function useVehicleDocuments(vehicleId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const currentUserId = profile?.user_id || user?.id;

  // Fetch documents query
  const {
    data: documents = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: vehicleDocumentKeys.all(vehicleId),
    queryFn: () => fetchVehicleDocuments(vehicleId),
    enabled: !!vehicleId,
    staleTime: 30 * 1000,
    refetchOnMount: true,
  });

  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async ({
      file,
      documentType,
      documentName,
      expiryDate,
      notes,
    }: {
      file: File;
      documentType: 'registration' | 'insurance' | 'inspection' | 'other';
      documentName?: string;
      expiryDate?: string;
      notes?: string;
    }) => {
      console.log('📄 [VehicleDocuments] Uploading document:', file.name);

      // Upload file to storage
      const documentUrl = await uploadDocumentToStorage(file, vehicleId);

      // Create database record
      const documentData: VehicleDocumentInsert = {
        vehicle_id: vehicleId,
        document_type: documentType,
        document_name: documentName || file.name,
        document_url: documentUrl,
        file_size: file.size,
        mime_type: file.type,
        expiry_date: expiryDate || undefined,
        notes: notes || undefined,
      };

      const { data, error } = await supabase
        .from('vehicle_documents')
        .insert([{ ...documentData, uploaded_by: currentUserId }])
        .select()
        .single();

      if (error) {
        console.error('❌ [VehicleDocuments] Database insert error:', error);
        throw error;
      }

      console.log('✅ [VehicleDocuments] Document saved to database');
      return data as VehicleDocument;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: vehicleDocumentKeys.all(vehicleId),
        refetchType: 'active',
      });
      toast({
        title: 'Document Uploaded',
        description: 'Vehicle document uploaded successfully',
      });
    },
    onError: (error: any) => {
      console.error('❌ [VehicleDocuments] Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload document',
        variant: 'destructive',
      });
    },
  });

  // Update document mutation
  const updateDocumentMutation = useMutation({
    mutationFn: async ({
      documentId,
      updates,
    }: {
      documentId: string;
      updates: Partial<VehicleDocumentInsert>;
    }) => {
      const { data, error } = await supabase
        .from('vehicle_documents')
        .update(updates)
        .eq('document_id', documentId)
        .select()
        .single();

      if (error) throw error;
      return data as VehicleDocument;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: vehicleDocumentKeys.all(vehicleId),
        refetchType: 'active',
      });
      toast({
        title: 'Document Updated',
        description: 'Document information updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update document',
        variant: 'destructive',
      });
    },
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      // Get document URL first to delete from storage
      const document = documents.find((d) => d.document_id === documentId);

      if (document) {
        // Extract file path from URL
        const url = new URL(document.document_url);
        const filePath = url.pathname.split('/').slice(-2).join('/'); // Get 'vehicles/filename'

        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('property-documents')
          .remove([filePath]);

        if (storageError) {
          console.error('Storage deletion error:', storageError);
          // Continue with database deletion even if storage fails
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('vehicle_documents')
        .delete()
        .eq('document_id', documentId);

      if (error) throw error;
      return documentId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: vehicleDocumentKeys.all(vehicleId),
        refetchType: 'active',
      });
      toast({
        title: 'Document Deleted',
        description: 'Document removed successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete document',
        variant: 'destructive',
      });
    },
  });

  return {
    documents,
    isLoading,
    isFetching,
    error,
    refetch,
    uploadDocument: uploadDocumentMutation.mutateAsync,
    updateDocument: updateDocumentMutation.mutateAsync,
    deleteDocument: deleteDocumentMutation.mutateAsync,
    isUploading: uploadDocumentMutation.isPending,
    isUpdating: updateDocumentMutation.isPending,
    isDeleting: deleteDocumentMutation.isPending,
  };
}
