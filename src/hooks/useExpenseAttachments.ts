import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ExpenseAttachment, ExpenseAttachmentInsert } from '@/lib/schemas';
import { useAuth } from '@/contexts/AuthContext';
import { expenseKeys } from './useExpenses';

// Query keys
export const expenseAttachmentKeys = {
  all: ['expense-attachments'] as const,
  byExpense: (expenseId: string) => [...expenseAttachmentKeys.all, 'expense', expenseId] as const,
};

// Fetch attachments for an expense
const fetchExpenseAttachments = async (expenseId: string): Promise<ExpenseAttachment[]> => {
  const { data, error } = await supabase
    .from('expense_attachments')
    .select(`
      *,
      uploader:users!expense_attachments_uploaded_by_fkey(user_id, first_name, last_name, email)
    `)
    .eq('expense_id', expenseId)
    .order('uploaded_at', { ascending: false });

  if (error) throw error;
  return (data || []) as ExpenseAttachment[];
};

// Create attachment
const createAttachment = async (attachment: ExpenseAttachmentInsert): Promise<ExpenseAttachment> => {
  const { data, error } = await supabase
    .from('expense_attachments')
    .insert(attachment)
    .select()
    .single();

  if (error) throw error;
  return data as ExpenseAttachment;
};

// Delete attachment
const deleteAttachment = async (attachmentId: string): Promise<{ attachmentId: string; fileUrl?: string }> => {
  // Fetch attachment to get file URL for storage cleanup
  const { data: attachment } = await supabase
    .from('expense_attachments')
    .select('attachment_id, file_url, expense_id')
    .eq('attachment_id', attachmentId)
    .single();

  const { error } = await supabase
    .from('expense_attachments')
    .delete()
    .eq('attachment_id', attachmentId);

  if (error) throw error;
  return { attachmentId, fileUrl: attachment?.file_url };
};

// Update attachment caption
const updateAttachmentCaption = async ({
  attachmentId,
  caption
}: {
  attachmentId: string;
  caption: string;
}): Promise<ExpenseAttachment> => {
  const { data, error } = await supabase
    .from('expense_attachments')
    .update({ caption })
    .eq('attachment_id', attachmentId)
    .select()
    .single();

  if (error) throw error;
  return data as ExpenseAttachment;
};

// =============================================
// HOOKS
// =============================================

// Hook to fetch attachments for an expense
export function useExpenseAttachments(expenseId: string | null) {
  return useQuery({
    queryKey: expenseAttachmentKeys.byExpense(expenseId || ''),
    queryFn: () => fetchExpenseAttachments(expenseId!),
    enabled: !!expenseId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to create an attachment
export function useCreateExpenseAttachment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      expenseId: string;
      file: File;
      caption?: string;
    }) => {
      const { expenseId, file, caption } = params;

      // Upload file to Supabase Storage
      const timestamp = Date.now();
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `expense-attachments/${expenseId}/${timestamp}_${cleanFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('property-documents')
        .upload(filePath, file, {
          contentType: file.type,
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('property-documents')
        .getPublicUrl(filePath);

      // Create attachment record
      const attachment: ExpenseAttachmentInsert = {
        expense_id: expenseId,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        caption: caption || '',
        uploaded_by: user?.id,
      };

      return createAttachment(attachment);
    },
    onSuccess: (data) => {
      // Invalidate attachments query
      queryClient.invalidateQueries({
        queryKey: expenseAttachmentKeys.byExpense(data.expense_id)
      });
      // Also invalidate expense detail to refresh counts
      queryClient.invalidateQueries({
        queryKey: expenseKeys.all
      });

      toast({
        title: 'Success',
        description: 'File attached successfully',
      });
    },
    onError: (error: Error) => {
      console.error('Failed to attach file:', error);
      toast({
        title: 'Error',
        description: 'Failed to attach file. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// Hook to delete an attachment
export function useDeleteExpenseAttachment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteAttachment,
    onSuccess: (data, variables) => {
      // Try to delete from storage (best effort, don't fail if it doesn't work)
      if (data.fileUrl) {
        const path = data.fileUrl.split('/property-documents/')[1];
        if (path) {
          supabase.storage
            .from('property-documents')
            .remove([path])
            .catch(console.error);
        }
      }

      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: expenseAttachmentKeys.all
      });
      queryClient.invalidateQueries({
        queryKey: expenseKeys.all
      });

      toast({
        title: 'Success',
        description: 'Attachment deleted successfully',
      });
    },
    onError: (error: Error) => {
      console.error('Failed to delete attachment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete attachment. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// Hook to update attachment caption
export function useUpdateExpenseAttachmentCaption() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: updateAttachmentCaption,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: expenseAttachmentKeys.byExpense(data.expense_id)
      });

      toast({
        title: 'Success',
        description: 'Caption updated',
      });
    },
    onError: (error: Error) => {
      console.error('Failed to update caption:', error);
      toast({
        title: 'Error',
        description: 'Failed to update caption',
        variant: 'destructive',
      });
    },
  });
}

// Bulk upload multiple attachments
export function useBulkCreateExpenseAttachments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      expenseId: string;
      files: Array<{ file: File; caption?: string }>;
    }) => {
      const { expenseId, files } = params;
      const results: ExpenseAttachment[] = [];
      const errors: string[] = [];

      for (const { file, caption } of files) {
        try {
          // Upload file to Supabase Storage
          const timestamp = Date.now();
          const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filePath = `expense-attachments/${expenseId}/${timestamp}_${cleanFileName}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('property-documents')
            .upload(filePath, file, {
              contentType: file.type,
              cacheControl: '3600',
            });

          if (uploadError) {
            errors.push(`${file.name}: ${uploadError.message}`);
            continue;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('property-documents')
            .getPublicUrl(filePath);

          // Create attachment record
          const attachment: ExpenseAttachmentInsert = {
            expense_id: expenseId,
            file_url: urlData.publicUrl,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            caption: caption || '',
            uploaded_by: user?.id,
          };

          const result = await createAttachment(attachment);
          results.push(result);
        } catch (err: any) {
          errors.push(`${file.name}: ${err.message}`);
        }
      }

      return { results, errors, expenseId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: expenseAttachmentKeys.byExpense(data.expenseId)
      });
      queryClient.invalidateQueries({
        queryKey: expenseKeys.all
      });

      if (data.errors.length > 0) {
        toast({
          title: 'Partial Success',
          description: `${data.results.length} file(s) uploaded. ${data.errors.length} failed.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: `${data.results.length} file(s) attached successfully`,
        });
      }
    },
    onError: (error: Error) => {
      console.error('Failed to upload files:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload files. Please try again.',
        variant: 'destructive',
      });
    },
  });
}
