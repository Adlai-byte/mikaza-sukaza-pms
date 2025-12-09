import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ExpenseNote, ExpenseNoteInsert } from '@/lib/schemas';
import { useAuth } from '@/contexts/AuthContext';
import { expenseKeys } from './useExpenses';

// Query keys
export const expenseNoteKeys = {
  all: ['expense-notes'] as const,
  byExpense: (expenseId: string) => [...expenseNoteKeys.all, 'expense', expenseId] as const,
};

// Fetch notes for an expense
const fetchExpenseNotes = async (expenseId: string): Promise<ExpenseNote[]> => {
  const { data, error } = await supabase
    .from('expense_notes')
    .select(`
      *,
      author:users!expense_notes_author_id_fkey(user_id, first_name, last_name, email)
    `)
    .eq('expense_id', expenseId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as ExpenseNote[];
};

// Create note
const createNote = async (note: ExpenseNoteInsert): Promise<ExpenseNote> => {
  const { data, error } = await supabase
    .from('expense_notes')
    .insert(note)
    .select()
    .single();

  if (error) throw error;
  return data as ExpenseNote;
};

// Update note
const updateNote = async ({
  noteId,
  noteText
}: {
  noteId: string;
  noteText: string;
}): Promise<ExpenseNote> => {
  const { data, error } = await supabase
    .from('expense_notes')
    .update({ note_text: noteText })
    .eq('note_id', noteId)
    .select()
    .single();

  if (error) throw error;
  return data as ExpenseNote;
};

// Delete note
const deleteNote = async (noteId: string): Promise<{ noteId: string; expenseId?: string }> => {
  // Fetch note to get expense_id for cache invalidation
  const { data: note } = await supabase
    .from('expense_notes')
    .select('note_id, expense_id')
    .eq('note_id', noteId)
    .single();

  const { error } = await supabase
    .from('expense_notes')
    .delete()
    .eq('note_id', noteId);

  if (error) throw error;
  return { noteId, expenseId: note?.expense_id };
};

// =============================================
// HOOKS
// =============================================

// Hook to fetch notes for an expense
export function useExpenseNotes(expenseId: string | null) {
  return useQuery({
    queryKey: expenseNoteKeys.byExpense(expenseId || ''),
    queryFn: () => fetchExpenseNotes(expenseId!),
    enabled: !!expenseId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to create a note
export function useCreateExpenseNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      expenseId: string;
      noteText: string;
      authorName?: string;
    }) => {
      const { expenseId, noteText, authorName } = params;

      // Get author name from user if not provided
      const displayName = authorName ||
        (user?.user_metadata?.first_name && user?.user_metadata?.last_name
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
          : user?.email?.split('@')[0] || 'Unknown');

      const note: ExpenseNoteInsert = {
        expense_id: expenseId,
        note_text: noteText,
        author_id: user?.id,
        author_name: displayName,
      };

      return createNote(note);
    },
    onSuccess: (data) => {
      // Invalidate notes query
      queryClient.invalidateQueries({
        queryKey: expenseNoteKeys.byExpense(data.expense_id)
      });
      // Also invalidate expense queries to refresh counts
      queryClient.invalidateQueries({
        queryKey: expenseKeys.all
      });

      toast({
        title: 'Success',
        description: 'Note added successfully',
      });
    },
    onError: (error: Error) => {
      console.error('Failed to add note:', error);
      toast({
        title: 'Error',
        description: 'Failed to add note. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// Hook to update a note
export function useUpdateExpenseNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: updateNote,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: expenseNoteKeys.byExpense(data.expense_id)
      });

      toast({
        title: 'Success',
        description: 'Note updated',
      });
    },
    onError: (error: Error) => {
      console.error('Failed to update note:', error);
      toast({
        title: 'Error',
        description: 'Failed to update note',
        variant: 'destructive',
      });
    },
  });
}

// Hook to delete a note
export function useDeleteExpenseNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteNote,
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: expenseNoteKeys.all
      });
      queryClient.invalidateQueries({
        queryKey: expenseKeys.all
      });

      toast({
        title: 'Success',
        description: 'Note deleted successfully',
      });
    },
    onError: (error: Error) => {
      console.error('Failed to delete note:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete note. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// Bulk create multiple notes
export function useBulkCreateExpenseNotes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      expenseId: string;
      notes: Array<{ text: string }>;
      authorName?: string;
    }) => {
      const { expenseId, notes, authorName } = params;

      // Get author name from user if not provided
      const displayName = authorName ||
        (user?.user_metadata?.first_name && user?.user_metadata?.last_name
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
          : user?.email?.split('@')[0] || 'Unknown');

      const results: ExpenseNote[] = [];
      const errors: string[] = [];

      for (const { text } of notes) {
        try {
          const note: ExpenseNoteInsert = {
            expense_id: expenseId,
            note_text: text,
            author_id: user?.id,
            author_name: displayName,
          };

          const result = await createNote(note);
          results.push(result);
        } catch (err: any) {
          errors.push(err.message);
        }
      }

      return { results, errors, expenseId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: expenseNoteKeys.byExpense(data.expenseId)
      });
      queryClient.invalidateQueries({
        queryKey: expenseKeys.all
      });

      if (data.errors.length > 0) {
        toast({
          title: 'Partial Success',
          description: `${data.results.length} note(s) added. ${data.errors.length} failed.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: `${data.results.length} note(s) added successfully`,
        });
      }
    },
    onError: (error: Error) => {
      console.error('Failed to add notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to add notes. Please try again.',
        variant: 'destructive',
      });
    },
  });
}
