import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AccessDocument, AccessDocumentInsert, accessDocumentSchema } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { useAuth } from '@/contexts/AuthContext';

// Query keys for cache management
export const accessDocumentKeys = {
  all: () => ['access-documents'] as const,
  lists: () => ['access-documents', 'list'] as const,
  list: (filters?: AccessDocumentFilters) => ['access-documents', 'list', ...(filters ? [JSON.stringify(filters)] : [])] as const,
  detail: (id: string) => ['access-documents', 'detail', id] as const,
  byProperty: (propertyId: string) => ['access-documents', 'property', propertyId] as const,
  byVendor: (vendorId: string) => ['access-documents', 'vendor', vendorId] as const,
  expiring: (days: number) => ['access-documents', 'expiring', days] as const,
} as const;

// Filter types
export interface AccessDocumentFilters {
  property_id?: string;
  vendor_id?: string;
  document_type?: string;
  status?: 'active' | 'expiring_soon' | 'expired';
  search?: string;
}

// Fetch access documents with optional filters
const fetchAccessDocuments = async (filters?: AccessDocumentFilters): Promise<AccessDocument[]> => {
  console.log('📄 [AccessDocuments] Fetching documents', filters ? `with filters: ${JSON.stringify(filters)}` : '');

  let query = supabase
    .from('access_documents_view')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters?.property_id) {
    query = query.eq('property_id', filters.property_id);
  }
  if (filters?.vendor_id) {
    query = query.eq('vendor_id', filters.vendor_id);
  }
  if (filters?.document_type) {
    query = query.eq('document_type', filters.document_type);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.search) {
    query = query.or(`document_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ [AccessDocuments] Fetch error:', error.message, error.code);
    throw new Error(error.message || 'Failed to fetch documents');
  }

  console.log('✅ [AccessDocuments] Fetched:', data?.length || 0, 'documents');
  return (data || []) as AccessDocument[];
};

// Main hook for access documents
export function useAccessDocuments(filters?: AccessDocumentFilters) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLogs();
  const { user, profile } = useAuth();
  const currentUserId = profile?.user_id || user?.id;

  // Query for fetching documents
  const {
    data: documents = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: accessDocumentKeys.list(filters),
    queryFn: () => fetchAccessDocuments(filters),
    staleTime: 30 * 1000, // 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Create document mutation
  const createDocumentMutation = useMutation({
    mutationFn: async (data: AccessDocumentInsert) => {
      console.log('📄 [AccessDocuments] Creating document:', data.document_name);

      // Validate with schema
      accessDocumentSchema.parse(data);

      const { data: document, error } = await supabase
        .from('access_documents')
        .insert([{
          ...data,
          uploaded_by: currentUserId,
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ [AccessDocuments] Create error:', error.message, error.code, error.details);
        throw new Error(error.message || 'Failed to create document');
      }

      console.log('✅ [AccessDocuments] Document created');
      return document as AccessDocument;
    },
    onSuccess: async (document) => {
      await logActivity('ACCESS_DOCUMENT_CREATED', {
        documentId: document.access_document_id,
        documentName: document.document_name,
        documentType: document.document_type,
      });

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: accessDocumentKeys.lists() });

      toast({
        title: 'Success',
        description: `Document "${document.document_name}" uploaded successfully`,
      });
    },
    onError: (error) => {
      console.error('❌ [AccessDocuments] Create error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload document',
        variant: 'destructive',
      });
    },
  });

  // Update document mutation
  const updateDocumentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AccessDocumentInsert> }) => {
      console.log('📄 [AccessDocuments] Updating document:', id);

      const { data: document, error } = await supabase
        .from('access_documents')
        .update(data)
        .eq('access_document_id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ [AccessDocuments] Update error:', error);
        throw error;
      }

      console.log('✅ [AccessDocuments] Document updated');
      return document as AccessDocument;
    },
    onSuccess: async (document) => {
      await logActivity('ACCESS_DOCUMENT_UPDATED', {
        documentId: document.access_document_id,
        documentName: document.document_name,
      });

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: accessDocumentKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: accessDocumentKeys.detail(document.access_document_id) });

      toast({
        title: 'Success',
        description: 'Document updated successfully',
      });
    },
    onError: (error) => {
      console.error('❌ [AccessDocuments] Update error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update document',
        variant: 'destructive',
      });
    },
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('📄 [AccessDocuments] Deleting document:', id);

      // First get the document to delete the file from storage
      const { data: doc } = await supabase
        .from('access_documents')
        .select('file_url')
        .eq('access_document_id', id)
        .single();

      if (doc?.file_url) {
        // Extract file path from URL and delete from storage
        try {
          const url = new URL(doc.file_url);
          const pathParts = url.pathname.split('/');
          const filePath = pathParts.slice(-2).join('/');
          await supabase.storage.from('property-documents').remove([filePath]);
        } catch (e) {
          console.warn('Could not delete file from storage:', e);
        }
      }

      const { error } = await supabase
        .from('access_documents')
        .delete()
        .eq('access_document_id', id);

      if (error) {
        console.error('❌ [AccessDocuments] Delete error:', error);
        throw error;
      }

      console.log('✅ [AccessDocuments] Document deleted');
    },
    onSuccess: async (_, id) => {
      await logActivity('ACCESS_DOCUMENT_DELETED', { documentId: id });

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: accessDocumentKeys.lists() });

      toast({
        title: 'Success',
        description: 'Document deleted successfully',
      });
    },
    onError: (error) => {
      console.error('❌ [AccessDocuments] Delete error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete document',
        variant: 'destructive',
      });
    },
  });

  // Calculate stats
  const stats = {
    total: documents.length,
    active: documents.filter(d => d.status === 'active').length,
    expiringSoon: documents.filter(d => d.status === 'expiring_soon').length,
    expired: documents.filter(d => d.status === 'expired').length,
  };

  return {
    documents,
    stats,
    isLoading,
    isFetching,
    error,
    refetch,
    createDocument: createDocumentMutation.mutateAsync,
    updateDocument: updateDocumentMutation.mutateAsync,
    deleteDocument: deleteDocumentMutation.mutateAsync,
    isCreating: createDocumentMutation.isPending,
    isUpdating: updateDocumentMutation.isPending,
    isDeleting: deleteDocumentMutation.isPending,
  };
}

// Hook to get expiring documents
export function useExpiringAccessDocuments(days: number = 30) {
  return useQuery({
    queryKey: accessDocumentKeys.expiring(days),
    queryFn: async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const { data, error } = await supabase
        .from('access_documents_view')
        .select('*')
        .not('expiry_date', 'is', null)
        .lte('expiry_date', futureDate.toISOString().split('T')[0])
        .gte('expiry_date', new Date().toISOString().split('T')[0])
        .order('expiry_date', { ascending: true });

      if (error) throw error;
      return (data || []) as AccessDocument[];
    },
  });
}

// Hook to download access documents
export function useAccessDocumentDownload() {
  const { toast } = useToast();

  const downloadDocument = async (document: AccessDocument) => {
    try {
      console.log('📥 [AccessDocuments] Downloading:', document.document_name);

      // Extract bucket and path from file_url
      const url = new URL(document.file_url);
      const pathParts = url.pathname.split('/');
      const bucket = 'property-documents';
      const filePath = pathParts.slice(-2).join('/');

      // Get signed URL for download
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 60); // 60 second expiry

      if (error) throw error;

      if (data) {
        // Create temporary link and trigger download
        const link = window.document.createElement('a');
        link.href = data.signedUrl;
        link.download = document.file_name;
        link.click();

        toast({
          title: 'Success',
          description: 'Download started',
        });
      }
    } catch (error) {
      console.error('❌ [AccessDocuments] Download error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to download document',
        variant: 'destructive',
      });
    }
  };

  return { downloadDocument };
}
