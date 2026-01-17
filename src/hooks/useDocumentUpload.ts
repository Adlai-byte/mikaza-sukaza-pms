import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DocumentInsert, ALLOWED_DOCUMENT_TYPES, MAX_FILE_SIZES } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { documentKeys } from "@/hooks/useDocuments";

// File validation result
interface FileValidation {
  isValid: boolean;
  error?: string;
}

// Upload progress state
interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

// Bucket mapping based on document category
// NOTE: All document types now use 'property-documents' bucket
// The 'employee-documents' and 'message-templates' buckets were never created
// Documents are organized by folder paths instead (e.g., employee/{user_id}/, messages/)
const getBucketForCategory = (category: string): string => {
  // Consolidate all document types into property-documents bucket
  // This bucket is known to exist and has proper RLS policies
  return 'property-documents';
};

// Get all allowed MIME types
const getAllowedMimeTypes = (): string[] => {
  return Object.values(ALLOWED_DOCUMENT_TYPES).flat();
};

// Validate file
export const validateFile = (
  file: File,
  category: string
): FileValidation => {
  // Check file size
  const bucket = getBucketForCategory(category);
  const maxSize = MAX_FILE_SIZES[bucket as keyof typeof MAX_FILE_SIZES];

  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / 1024 / 1024).toFixed(0);
    return {
      isValid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }

  // Check MIME type
  const allowedTypes = getAllowedMimeTypes();
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type "${file.type}" is not allowed`,
    };
  }

  return { isValid: true };
};

// Generate file path for storage
// All paths include category prefix for organization within property-documents bucket
const generateFilePath = (
  category: string,
  propertyId: string | null | undefined,
  userId: string,
  fileName: string
): string => {
  const timestamp = Date.now();
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

  if (category === 'employee') {
    // Employee docs: employee/{user_id}/{timestamp}_{filename}
    return `employee/${userId}/${timestamp}_${cleanFileName}`;
  } else if (category === 'messages') {
    // Message templates: messages/{timestamp}_{filename}
    return `messages/${timestamp}_${cleanFileName}`;
  } else {
    // Property documents: {category}/{property_id?}/{timestamp}_{filename}
    const folder = category; // contracts, access, coi, service
    if (propertyId) {
      return `${folder}/${propertyId}/${timestamp}_${cleanFileName}`;
    }
    return `${folder}/${timestamp}_${cleanFileName}`;
  }
};

// Hook for uploading documents
export function useDocumentUpload() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const currentUserId = profile?.user_id || user?.id;

  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  // Upload file to storage
  const uploadFileMutation = useMutation({
    mutationFn: async ({
      file,
      documentData,
    }: {
      file: File;
      documentData: Omit<DocumentInsert, 'file_url' | 'file_name' | 'file_type' | 'file_size'>;
    }) => {
      console.log('📤 [Upload] Starting upload:', file.name);

      // Validate file
      const validation = validateFile(file, documentData.category);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      setUploadProgress({
        fileName: file.name,
        progress: 0,
        status: 'uploading',
      });

      // Determine bucket and file path
      const bucket = getBucketForCategory(documentData.category);
      const filePath = generateFilePath(
        documentData.category,
        documentData.property_id,
        currentUserId!,
        file.name
      );

      console.log('📤 [Upload] Uploading to:', bucket, filePath);

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('❌ [Upload] Storage error:', uploadError);
        throw uploadError;
      }

      setUploadProgress({
        fileName: file.name,
        progress: 50,
        status: 'processing',
      });

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (!urlData) {
        throw new Error('Failed to get file URL');
      }

      console.log('✅ [Upload] File uploaded, creating document record');

      setUploadProgress({
        fileName: file.name,
        progress: 75,
        status: 'processing',
      });

      // Create document record
      const { data: document, error: dbError } = await supabase
        .from('documents')
        .insert([{
          ...documentData,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: currentUserId,
        }])
        .select()
        .single();

      if (dbError) {
        console.error('❌ [Upload] Database error:', dbError);
        // Try to delete uploaded file
        await supabase.storage.from(bucket).remove([filePath]);
        throw dbError;
      }

      setUploadProgress({
        fileName: file.name,
        progress: 100,
        status: 'completed',
      });

      console.log('✅ [Upload] Document created:', document.document_id);
      return document;
    },
    onSuccess: (document) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: documentKeys.stats() });

      toast({
        title: "Success",
        description: `Document "${document.document_name}" uploaded successfully`,
      });

      // Clear progress after a delay
      setTimeout(() => setUploadProgress(null), 2000);
    },
    onError: (error) => {
      console.error('❌ [Upload] Upload failed:', error);

      setUploadProgress(prev => prev ? {
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed',
      } : null);

      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive",
      });

      // Clear progress after showing error
      setTimeout(() => setUploadProgress(null), 3000);
    },
  });

  // Upload new version of existing document
  const uploadVersionMutation = useMutation({
    mutationFn: async ({
      file,
      parentDocumentId,
    }: {
      file: File;
      parentDocumentId: string;
    }) => {
      console.log('📤 [Upload] Uploading new version for:', parentDocumentId);

      // Get parent document to validate category
      const { data: parentDoc, error: fetchError } = await supabase
        .from('documents')
        .select('category, property_id')
        .eq('document_id', parentDocumentId)
        .single();

      if (fetchError || !parentDoc) {
        throw new Error('Parent document not found');
      }

      // Validate file
      const validation = validateFile(file, parentDoc.category);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      setUploadProgress({
        fileName: file.name,
        progress: 0,
        status: 'uploading',
      });

      // Determine bucket and file path
      const bucket = getBucketForCategory(parentDoc.category);
      const filePath = generateFilePath(
        parentDoc.category,
        parentDoc.property_id,
        currentUserId!,
        file.name
      );

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      setUploadProgress({
        fileName: file.name,
        progress: 50,
        status: 'processing',
      });

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (!urlData) {
        throw new Error('Failed to get file URL');
      }

      // Use the RPC function to create new version
      const { data: newDocumentId, error: rpcError } = await supabase
        .rpc('create_document_version', {
          p_parent_document_id: parentDocumentId,
          p_file_url: urlData.publicUrl,
          p_file_name: file.name,
          p_file_type: file.type,
          p_file_size: file.size,
        });

      if (rpcError) {
        console.error('❌ [Upload] Version creation error:', rpcError);
        // Try to delete uploaded file
        await supabase.storage.from(bucket).remove([filePath]);
        throw rpcError;
      }

      setUploadProgress({
        fileName: file.name,
        progress: 100,
        status: 'completed',
      });

      console.log('✅ [Upload] New version created:', newDocumentId);
      return newDocumentId;
    },
    onSuccess: (_, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(variables.parentDocumentId) });
      queryClient.invalidateQueries({ queryKey: documentKeys.versions(variables.parentDocumentId) });

      toast({
        title: "Success",
        description: "New document version uploaded successfully",
      });

      setTimeout(() => setUploadProgress(null), 2000);
    },
    onError: (error) => {
      console.error('❌ [Upload] Version upload failed:', error);

      setUploadProgress(prev => prev ? {
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed',
      } : null);

      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload new version",
        variant: "destructive",
      });

      setTimeout(() => setUploadProgress(null), 3000);
    },
  });

  // Reset upload progress
  const resetProgress = () => {
    setUploadProgress(null);
  };

  return {
    uploadFile: uploadFileMutation.mutateAsync,
    uploadVersion: uploadVersionMutation.mutateAsync,
    uploadProgress,
    isUploading: uploadFileMutation.isPending || uploadVersionMutation.isPending,
    resetProgress,
    validateFile,
  };
}

// Hook for bulk upload
export function useBulkDocumentUpload() {
  const { uploadFile } = useDocumentUpload();
  const [bulkProgress, setBulkProgress] = useState<{
    total: number;
    completed: number;
    failed: number;
    current?: string;
  } | null>(null);

  const uploadMultiple = async (
    files: File[],
    getDocumentData: (file: File) => Omit<DocumentInsert, 'file_url' | 'file_name' | 'file_type' | 'file_size'>
  ) => {
    setBulkProgress({
      total: files.length,
      completed: 0,
      failed: 0,
    });

    const results = [];

    for (const file of files) {
      try {
        setBulkProgress(prev => prev ? { ...prev, current: file.name } : null);

        const documentData = getDocumentData(file);
        await new Promise((resolve, reject) => {
          uploadFile(
            { file, documentData },
            {
              onSuccess: () => {
                setBulkProgress(prev => prev ? {
                  ...prev,
                  completed: prev.completed + 1,
                } : null);
                resolve(true);
              },
              onError: (error) => {
                setBulkProgress(prev => prev ? {
                  ...prev,
                  failed: prev.failed + 1,
                } : null);
                reject(error);
              },
            }
          );
        });

        results.push({ file: file.name, success: true });
      } catch (error) {
        results.push({
          file: file.name,
          success: false,
          error: error instanceof Error ? error.message : 'Upload failed',
        });
      }
    }

    setBulkProgress(null);
    return results;
  };

  return {
    uploadMultiple,
    bulkProgress,
    isBulkUploading: bulkProgress !== null,
  };
}
