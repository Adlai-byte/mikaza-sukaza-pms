import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Document, DocumentInsert, DocumentSummary, DocumentStats } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { useAuth } from "@/contexts/AuthContext";

// Query keys for cache management
export const documentKeys = {
  all: () => ['documents'] as const,
  lists: () => ['documents', 'list'] as const,
  list: (filters?: DocumentFilters) => ['documents', 'list', ...(filters ? [JSON.stringify(filters)] : [])] as const,
  details: () => ['documents', 'detail'] as const,
  detail: (id: string) => ['documents', 'detail', id] as const,
  category: (category: string) => ['documents', 'category', category] as const,
  property: (propertyId: string) => ['documents', 'property', propertyId] as const,
  stats: () => ['documents', 'stats'] as const,
  versions: (documentId: string) => ['documents', 'versions', documentId] as const,
  expiring: (days: number) => ['documents', 'expiring', days] as const,
} as const;

// Filter types
export interface DocumentFilters {
  category?: string;
  property_id?: string;
  status?: string;
  search?: string;
  tag?: string;
  expiring_within_days?: number;
}

// Fetch all documents with optional filters
const fetchDocuments = async (filters?: DocumentFilters): Promise<DocumentSummary[]> => {
  console.log('📄 [Documents] Fetching documents', filters ? `with filters: ${JSON.stringify(filters)}` : '');

  let query = supabase
    .from('document_summary')
    .select('*')
    .eq('is_current_version', true) // Only show current versions by default
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters?.category) {
    query = query.eq('category', filters.category);
  }
  if (filters?.property_id) {
    query = query.eq('property_id', filters.property_id);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.search) {
    query = query.or(`document_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }
  if (filters?.tag) {
    query = query.contains('tags', [filters.tag]);
  }
  if (filters?.expiring_within_days) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + filters.expiring_within_days);
    query = query
      .not('expiry_date', 'is', null)
      .lte('expiry_date', futureDate.toISOString().split('T')[0])
      .gte('expiry_date', new Date().toISOString().split('T')[0]);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ [Documents] Fetch error:', error);
    throw error;
  }

  console.log('✅ [Documents] Fetched:', data?.length || 0, 'documents');
  return (data || []) as DocumentSummary[];
};

// Fetch single document detail
const fetchDocumentDetail = async (documentId: string): Promise<Document> => {
  console.log('📄 [Documents] Fetching document detail:', documentId);

  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      property:properties(property_id, property_name),
      uploaded_user:users!documents_uploaded_by_fkey(user_id, first_name, last_name, email)
    `)
    .eq('document_id', documentId)
    .single();

  if (error) {
    console.error('❌ [Documents] Detail fetch error:', error);
    throw error;
  }

  console.log('✅ [Documents] Fetched document detail');
  return data as Document;
};

// Fetch document versions
const fetchDocumentVersions = async (documentId: string): Promise<Document[]> => {
  console.log('📄 [Documents] Fetching document versions:', documentId);

  // Get the parent document id (in case we're passed a version)
  const { data: currentDoc } = await supabase
    .from('documents')
    .select('document_id, parent_document_id')
    .eq('document_id', documentId)
    .single();

  if (!currentDoc) {
    throw new Error('Document not found');
  }

  const rootDocumentId = currentDoc.parent_document_id || currentDoc.document_id;

  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      uploaded_user:users!documents_uploaded_by_fkey(user_id, first_name, last_name, email)
    `)
    .or(`document_id.eq.${rootDocumentId},parent_document_id.eq.${rootDocumentId}`)
    .order('version_number', { ascending: false });

  if (error) {
    console.error('❌ [Documents] Versions fetch error:', error);
    throw error;
  }

  console.log('✅ [Documents] Fetched versions:', data?.length || 0);
  return (data || []) as Document[];
};

// Fetch document stats
const fetchDocumentStats = async (): Promise<DocumentStats[]> => {
  console.log('📊 [Documents] Fetching document stats');

  const { data, error } = await supabase
    .from('document_stats_by_category')
    .select('*');

  if (error) {
    console.error('❌ [Documents] Stats fetch error:', error);
    throw error;
  }

  console.log('✅ [Documents] Fetched stats for', data?.length || 0, 'categories');
  return (data || []) as DocumentStats[];
};

// Hook for fetching documents with filters
export function useDocuments(filters?: DocumentFilters) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLogs();
  const { hasPermission } = usePermissions();
  const { user, profile } = useAuth();
  const currentUserId = profile?.user_id || user?.id;

  // Documents query
  const {
    data: documents = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: documentKeys.list(filters),
    queryFn: () => fetchDocuments(filters),
    staleTime: 30 * 1000, // 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Create document mutation
  const createDocumentMutation = useMutation({
    mutationFn: async (data: DocumentInsert) => {
      console.log('📄 [Documents] Creating document:', data.document_name);

      // Permission check based on category
      const permissionMap: Record<string, string> = {
        contracts: PERMISSIONS.DOCUMENTS_CONTRACTS_MANAGE,
        employee: PERMISSIONS.DOCUMENTS_EMPLOYEE_MANAGE,
        access: PERMISSIONS.DOCUMENTS_ACCESS_CREATE,
        coi: PERMISSIONS.DOCUMENTS_COI_MANAGE,
        service: PERMISSIONS.DOCUMENTS_SERVICE_MANAGE,
        messages: PERMISSIONS.DOCUMENTS_MESSAGES_MANAGE,
      };

      if (!hasPermission(permissionMap[data.category])) {
        throw new Error("You don't have permission to create this type of document");
      }

      const { data: document, error } = await supabase
        .from('documents')
        .insert([{
          ...data,
          uploaded_by: currentUserId,
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ [Documents] Create error:', error);
        throw error;
      }

      console.log('✅ [Documents] Document created');
      return document as Document;
    },
    onSuccess: async (document) => {
      await logActivity('DOCUMENT_CREATED', {
        documentId: document.document_id,
        documentName: document.document_name,
        category: document.category,
      });

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: documentKeys.stats() });

      toast({
        title: "Success",
        description: `Document "${document.document_name}" created successfully`,
      });
    },
    onError: (error) => {
      console.error('❌ [Documents] Create error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create document",
        variant: "destructive",
      });
    },
  });

  // Update document mutation
  const updateDocumentMutation = useMutation({
    mutationFn: async ({ documentId, data }: { documentId: string; data: Partial<DocumentInsert> }) => {
      console.log('📄 [Documents] Updating document:', documentId);

      const { data: document, error } = await supabase
        .from('documents')
        .update(data)
        .eq('document_id', documentId)
        .select()
        .single();

      if (error) {
        console.error('❌ [Documents] Update error:', error);
        throw error;
      }

      console.log('✅ [Documents] Document updated');
      return document as Document;
    },
    onSuccess: async (document) => {
      await logActivity('DOCUMENT_UPDATED', {
        documentId: document.document_id,
        documentName: document.document_name,
        category: document.category,
      });

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: documentKeys.detail(document.document_id) });

      toast({
        title: "Success",
        description: "Document updated successfully",
      });
    },
    onError: (error) => {
      console.error('❌ [Documents] Update error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update document",
        variant: "destructive",
      });
    },
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      console.log('📄 [Documents] Deleting document:', documentId);

      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('document_id', documentId);

      if (error) {
        console.error('❌ [Documents] Delete error:', error);
        throw error;
      }

      console.log('✅ [Documents] Document deleted');
    },
    onSuccess: async (_, documentId) => {
      await logActivity('DOCUMENT_DELETED', { documentId });

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: documentKeys.stats() });

      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    },
    onError: (error) => {
      console.error('❌ [Documents] Delete error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete document",
        variant: "destructive",
      });
    },
  });

  // Log document access
  const logDocumentAccess = async (documentId: string, action: 'viewed' | 'downloaded') => {
    try {
      await supabase.rpc('log_document_access', {
        p_document_id: documentId,
        p_action: action,
      });
      console.log(`✅ [Documents] Logged ${action} for document:`, documentId);
    } catch (error) {
      console.error('❌ [Documents] Failed to log access:', error);
      // Don't throw - access logging failure shouldn't break the app
    }
  };

  return {
    documents,
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
    logDocumentAccess,
  };
}

// Hook for fetching single document detail
export function useDocumentDetail(documentId: string) {
  const { logDocumentAccess } = useDocuments();

  const {
    data: document,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: documentKeys.detail(documentId),
    queryFn: async () => {
      const doc = await fetchDocumentDetail(documentId);
      // Log view access
      await logDocumentAccess(documentId, 'viewed');
      return doc;
    },
    enabled: !!documentId,
    staleTime: 30 * 1000,
  });

  return {
    document,
    isLoading,
    error,
    refetch,
  };
}

// Hook for fetching document versions
export function useDocumentVersions(documentId: string) {
  const {
    data: versions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: documentKeys.versions(documentId),
    queryFn: () => fetchDocumentVersions(documentId),
    enabled: !!documentId,
    staleTime: 30 * 1000,
  });

  return {
    versions,
    isLoading,
    error,
    refetch,
  };
}

// Hook for fetching document stats
export function useDocumentStats() {
  const {
    data: stats = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: documentKeys.stats(),
    queryFn: fetchDocumentStats,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
}

// Helper to get bucket name from document category
// NOTE: All document types now use 'property-documents' bucket
// The 'employee-documents' and 'message-templates' buckets were never created
// Documents are organized by folder paths instead (e.g., employee/{user_id}/, messages/)
const getBucketForCategory = (category: string): string => {
  // Consolidate all document types into property-documents bucket
  // This bucket is known to exist and has proper RLS policies
  return 'property-documents';
};

// Hook for downloading documents
export function useDocumentDownload() {
  const { toast } = useToast();
  const { logDocumentAccess } = useDocuments();

  const downloadDocument = async (doc: DocumentSummary | Document) => {
    try {
      console.log('📥 [Documents] Downloading:', doc.document_name);

      // Validate file_url exists
      if (!doc.file_url) {
        throw new Error('Document has no file URL');
      }

      // Determine bucket from document category (most reliable)
      // This ensures we use the correct bucket even if URL parsing fails
      const categoryBucket = doc.category ? getBucketForCategory(doc.category) : null;

      // Extract file path from URL
      let bucket: string;
      let filePath: string;

      try {
        // Handle both full URLs and relative paths
        const isFullUrl = doc.file_url.startsWith('http://') || doc.file_url.startsWith('https://');

        if (isFullUrl) {
          const url = new URL(doc.file_url);
          const pathParts = url.pathname.split('/').filter(Boolean);

          // Find 'storage' or 'object' in path to determine bucket location
          const storageIndex = pathParts.findIndex(p => p === 'storage' || p === 'object');
          if (storageIndex >= 0 && pathParts.length > storageIndex + 2) {
            // Skip 'storage/v1/object/public/' or similar patterns
            const publicIndex = pathParts.indexOf('public');
            if (publicIndex >= 0 && pathParts.length > publicIndex + 1) {
              bucket = pathParts[publicIndex + 1];
              filePath = pathParts.slice(publicIndex + 2).join('/');
            } else {
              // Fallback to category-based bucket
              bucket = categoryBucket || pathParts[pathParts.length - 2] || 'property-documents';
              filePath = pathParts[pathParts.length - 1];
            }
          } else {
            // Simple case: use category bucket
            bucket = categoryBucket || pathParts[pathParts.length - 2] || 'property-documents';
            filePath = pathParts[pathParts.length - 1];
          }
        } else {
          // Relative path - assume it's bucket/path format
          const parts = doc.file_url.split('/').filter(Boolean);
          bucket = categoryBucket || parts[0] || 'property-documents';
          filePath = parts.slice(1).join('/');
        }
      } catch (parseError) {
        console.error('❌ [Documents] URL parsing error:', parseError);
        // Use category-based bucket as primary fallback
        bucket = categoryBucket || 'property-documents';
        filePath = doc.file_url.split('/').pop() || doc.file_name;
      }

      // Final fallback: if bucket doesn't match expected patterns, use property-documents
      // NOTE: employee-documents and message-templates buckets don't exist - they were never created
      // All documents are now stored in property-documents bucket
      const validBuckets = ['property-documents'];
      if (!validBuckets.includes(bucket)) {
        console.log('📥 [Documents] Non-existent bucket detected:', bucket, '- using property-documents');
        // If the URL was pointing to employee-documents or message-templates,
        // we need to adjust the path to include the category prefix
        if (bucket === 'employee-documents') {
          // Legacy path: {user_id}/{timestamp}_{filename}
          // New path: employee/{user_id}/{timestamp}_{filename}
          filePath = `employee/${filePath}`;
        } else if (bucket === 'message-templates') {
          // Legacy path: {timestamp}_{filename}
          // New path: messages/{timestamp}_{filename}
          filePath = `messages/${filePath}`;
        }
        bucket = 'property-documents';
      }

      console.log('📥 [Documents] Bucket:', bucket, 'Path:', filePath, 'Category:', doc.category);

      // Get signed URL for download with longer expiry (5 minutes)
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 300); // 5 minute expiry

      if (error) {
        // Provide helpful message for missing files (legacy documents)
        if (error.message?.includes('Object not found') || error.message?.includes('not found')) {
          throw new Error(
            'File not found in storage. This document may need to be re-uploaded. ' +
            'The original upload may have failed due to a missing storage bucket.'
          );
        }
        throw error;
      }

      if (data) {
        // Create temporary link and trigger download using global document object
        const link = globalThis.document.createElement('a');
        link.href = data.signedUrl;
        link.download = doc.file_name;
        link.style.display = 'none';
        globalThis.document.body.appendChild(link);
        link.click();
        globalThis.document.body.removeChild(link);

        // Log download
        await logDocumentAccess(doc.document_id, 'downloaded');

        toast({
          title: "Success",
          description: "Document download started",
        });
      }
    } catch (error) {
      console.error('❌ [Documents] Download error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download document",
        variant: "destructive",
      });
    }
  };

  // View document in new tab using signed URL
  const viewDocument = async (doc: DocumentSummary | Document) => {
    try {
      console.log('👁️ [Documents] Viewing:', doc.document_name);

      // Validate file_url exists
      if (!doc.file_url) {
        throw new Error('Document has no file URL');
      }

      // Determine bucket from document category
      const categoryBucket = doc.category ? getBucketForCategory(doc.category) : null;

      // Extract file path from URL
      let bucket: string;
      let filePath: string;

      try {
        const isFullUrl = doc.file_url.startsWith('http://') || doc.file_url.startsWith('https://');

        if (isFullUrl) {
          const url = new URL(doc.file_url);
          const pathParts = url.pathname.split('/').filter(Boolean);

          const publicIndex = pathParts.indexOf('public');
          if (publicIndex >= 0 && pathParts.length > publicIndex + 1) {
            bucket = pathParts[publicIndex + 1];
            filePath = pathParts.slice(publicIndex + 2).join('/');
          } else {
            bucket = categoryBucket || 'property-documents';
            filePath = pathParts[pathParts.length - 1];
          }
        } else {
          const parts = doc.file_url.split('/').filter(Boolean);
          bucket = categoryBucket || parts[0] || 'property-documents';
          filePath = parts.slice(1).join('/');
        }
      } catch (parseError) {
        console.error('❌ [Documents] URL parsing error:', parseError);
        bucket = categoryBucket || 'property-documents';
        filePath = doc.file_url.split('/').pop() || doc.file_name;
      }

      // Fix legacy bucket paths
      const validBuckets = ['property-documents'];
      if (!validBuckets.includes(bucket)) {
        console.log('👁️ [Documents] Non-existent bucket detected:', bucket, '- using property-documents');
        if (bucket === 'employee-documents') {
          filePath = `employee/${filePath}`;
        } else if (bucket === 'message-templates') {
          filePath = `messages/${filePath}`;
        }
        bucket = 'property-documents';
      }

      console.log('👁️ [Documents] Bucket:', bucket, 'Path:', filePath);

      // Get signed URL for viewing (5 minutes)
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 300);

      if (error) {
        // Provide helpful message for missing files (legacy documents)
        if (error.message?.includes('Object not found') || error.message?.includes('not found')) {
          throw new Error(
            'File not found in storage. This document may need to be re-uploaded. ' +
            'The original upload may have failed due to a missing storage bucket.'
          );
        }
        throw error;
      }

      if (data) {
        // Open in new tab
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');

        // Log view
        await logDocumentAccess(doc.document_id, 'viewed');
      }
    } catch (error) {
      console.error('❌ [Documents] View error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to view document",
        variant: "destructive",
      });
    }
  };

  return { downloadDocument, viewDocument };
}
