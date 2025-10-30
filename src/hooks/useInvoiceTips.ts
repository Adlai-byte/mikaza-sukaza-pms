import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Types for invoice tips
export interface InvoiceTip {
  tip_id: string;
  invoice_id: string;
  recipient_user_id: string;
  tip_amount: number;
  tip_percentage?: number | null;
  tip_reason?: string | null;
  guest_notes?: string | null;
  status: 'pending' | 'processed' | 'paid' | 'cancelled';
  commission_id?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  recipient?: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    user_type: string;
  };
  invoice?: {
    invoice_id: string;
    invoice_number: string;
    guest_name: string;
  };
  commission?: {
    commission_id: string;
    status: string;
  };
}

export interface InvoiceTipInsert {
  invoice_id: string;
  recipient_user_id: string;
  tip_amount: number;
  tip_percentage?: number | null;
  tip_reason?: string | null;
  guest_notes?: string | null;
  status?: 'pending' | 'processed' | 'paid' | 'cancelled';
}

// Query keys
export const invoiceTipKeys = {
  all: ['invoice-tips'] as const,
  lists: () => [...invoiceTipKeys.all, 'list'] as const,
  list: (filters?: InvoiceTipFilters) => [...invoiceTipKeys.lists(), filters] as const,
  details: () => [...invoiceTipKeys.all, 'detail'] as const,
  detail: (id: string) => [...invoiceTipKeys.details(), id] as const,
  byInvoice: (invoiceId: string) => [...invoiceTipKeys.all, 'invoice', invoiceId] as const,
  byRecipient: (userId: string) => [...invoiceTipKeys.all, 'recipient', userId] as const,
};

export interface InvoiceTipFilters {
  invoice_id?: string;
  recipient_user_id?: string;
  status?: string;
}

// Fetch all invoice tips with filters
const fetchInvoiceTips = async (filters?: InvoiceTipFilters): Promise<InvoiceTip[]> => {
  let query = supabase
    .from('invoice_tips')
    .select(`
      *,
      recipient:users!invoice_tips_recipient_user_id_fkey(user_id, first_name, last_name, email, user_type),
      invoice:invoices(invoice_id, invoice_number, guest_name),
      commission:commissions(commission_id, status)
    `)
    .order('created_at', { ascending: false });

  if (filters?.invoice_id) {
    query = query.eq('invoice_id', filters.invoice_id);
  }

  if (filters?.recipient_user_id) {
    query = query.eq('recipient_user_id', filters.recipient_user_id);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as InvoiceTip[];
};

// Fetch single invoice tip by ID
const fetchInvoiceTip = async (tipId: string): Promise<InvoiceTip> => {
  const { data, error } = await supabase
    .from('invoice_tips')
    .select(`
      *,
      recipient:users!invoice_tips_recipient_user_id_fkey(user_id, first_name, last_name, email, user_type),
      invoice:invoices(invoice_id, invoice_number, guest_name),
      commission:commissions(commission_id, status)
    `)
    .eq('tip_id', tipId)
    .single();

  if (error) throw error;
  return data as InvoiceTip;
};

// Create invoice tip
const createInvoiceTip = async (tip: InvoiceTipInsert): Promise<InvoiceTip> => {
  const { data, error } = await supabase
    .from('invoice_tips')
    .insert(tip)
    .select()
    .single();

  if (error) throw error;
  return fetchInvoiceTip(data.tip_id);
};

// Update invoice tip
const updateInvoiceTip = async ({
  tipId,
  updates
}: {
  tipId: string;
  updates: Partial<InvoiceTip>
}): Promise<InvoiceTip> => {
  const { data, error } = await supabase
    .from('invoice_tips')
    .update(updates)
    .eq('tip_id', tipId)
    .select()
    .single();

  if (error) throw error;
  return fetchInvoiceTip(data.tip_id);
};

// Delete invoice tip
const deleteInvoiceTip = async (tipId: string): Promise<void> => {
  const { error } = await supabase
    .from('invoice_tips')
    .delete()
    .eq('tip_id', tipId);

  if (error) throw error;
};

// Process tip (convert to commission)
const processInvoiceTip = async (tipId: string): Promise<InvoiceTip> => {
  return updateInvoiceTip({
    tipId,
    updates: { status: 'processed' },
  });
};

// Mark tip as paid
const markTipAsPaid = async (tipId: string): Promise<InvoiceTip> => {
  return updateInvoiceTip({
    tipId,
    updates: { status: 'paid' },
  });
};

// Fetch tips summary
const fetchTipsSummary = async (userId?: string) => {
  let query = supabase.from('tips_summary').select('*');

  if (userId) {
    query = query.eq('recipient_user_id', userId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
};

// Hooks
export function useInvoiceTips(filters?: InvoiceTipFilters) {
  const { data: tips = [], isLoading, error, refetch } = useQuery({
    queryKey: invoiceTipKeys.list(filters),
    queryFn: () => fetchInvoiceTips(filters),
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    tips,
    loading: isLoading,
    error,
    refetch,
  };
}

export function useInvoiceTip(tipId: string) {
  const { data: tip, isLoading, error, refetch } = useQuery({
    queryKey: invoiceTipKeys.detail(tipId),
    queryFn: () => fetchInvoiceTip(tipId),
    enabled: !!tipId && tipId.length > 0,
    staleTime: 30 * 1000,
  });

  return {
    tip,
    loading: isLoading,
    error,
    refetch,
  };
}

export function useCreateInvoiceTip() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInvoiceTip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceTipKeys.lists() });
      toast({
        title: 'Success',
        description: 'Tip added successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add tip',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateInvoiceTip() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateInvoiceTip,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: invoiceTipKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceTipKeys.detail(data.tip_id) });
      toast({
        title: 'Success',
        description: 'Tip updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update tip',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteInvoiceTip() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteInvoiceTip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceTipKeys.lists() });
      toast({
        title: 'Success',
        description: 'Tip deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete tip',
        variant: 'destructive',
      });
    },
  });
}

export function useProcessInvoiceTip() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: processInvoiceTip,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: invoiceTipKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceTipKeys.detail(data.tip_id) });
      // Also invalidate commissions as a new commission was created
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      toast({
        title: 'Success',
        description: 'Tip processed and converted to commission',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process tip',
        variant: 'destructive',
      });
    },
  });
}

export function useMarkTipAsPaid() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markTipAsPaid,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: invoiceTipKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceTipKeys.detail(data.tip_id) });
      toast({
        title: 'Success',
        description: 'Tip marked as paid',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark tip as paid',
        variant: 'destructive',
      });
    },
  });
}

export function useTipsSummary(userId?: string) {
  const { data: summary = [], isLoading, error, refetch } = useQuery({
    queryKey: [...invoiceTipKeys.all, 'summary', userId],
    queryFn: () => fetchTipsSummary(userId),
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    summary,
    loading: isLoading,
    error,
    refetch,
  };
}
