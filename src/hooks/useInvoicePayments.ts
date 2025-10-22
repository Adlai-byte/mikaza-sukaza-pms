import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { InvoicePayment, InvoicePaymentInsert } from '@/lib/schemas';
import { useAuth } from '@/contexts/AuthContext';
import { invoiceKeys } from './useInvoices';

// Query keys
export const invoicePaymentKeys = {
  all: ['invoice-payments'] as const,
  lists: () => [...invoicePaymentKeys.all, 'list'] as const,
  list: (invoiceId?: string) => [...invoicePaymentKeys.lists(), invoiceId] as const,
  details: () => [...invoicePaymentKeys.all, 'detail'] as const,
  detail: (id: string) => [...invoicePaymentKeys.details(), id] as const,
};

// Fetch payments for a specific invoice
const fetchInvoicePayments = async (invoiceId: string): Promise<InvoicePayment[]> => {
  const { data, error } = await supabase
    .from('invoice_payments')
    .select(`
      *,
      created_user:users!invoice_payments_created_by_fkey(user_id, first_name, last_name, email)
    `)
    .eq('invoice_id', invoiceId)
    .order('payment_date', { ascending: false });

  if (error) throw error;
  return (data || []) as InvoicePayment[];
};

// Fetch single payment
const fetchPayment = async (paymentId: string): Promise<InvoicePayment> => {
  const { data, error } = await supabase
    .from('invoice_payments')
    .select(`
      *,
      created_user:users!invoice_payments_created_by_fkey(user_id, first_name, last_name, email)
    `)
    .eq('payment_id', paymentId)
    .single();

  if (error) throw error;
  return data as InvoicePayment;
};

// Create payment
const createPayment = async (payment: InvoicePaymentInsert): Promise<InvoicePayment> => {
  const { data, error } = await supabase
    .from('invoice_payments')
    .insert(payment)
    .select()
    .single();

  if (error) throw error;
  return data as InvoicePayment;
};

// Update payment
const updatePayment = async (paymentId: string, updates: Partial<InvoicePaymentInsert>): Promise<InvoicePayment> => {
  const { data, error } = await supabase
    .from('invoice_payments')
    .update(updates)
    .eq('payment_id', paymentId)
    .select()
    .single();

  if (error) throw error;
  return data as InvoicePayment;
};

// Delete payment
const deletePayment = async (paymentId: string): Promise<void> => {
  const { error } = await supabase
    .from('invoice_payments')
    .delete()
    .eq('payment_id', paymentId);

  if (error) throw error;
};

// Get payment summary for an invoice
export interface PaymentSummary {
  total_paid: number;
  payment_count: number;
  last_payment_date?: string;
  remaining_balance: number;
}

const fetchPaymentSummary = async (invoiceId: string): Promise<PaymentSummary> => {
  // Get invoice total
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('total_amount, amount_paid')
    .eq('invoice_id', invoiceId)
    .single();

  if (invoiceError) throw invoiceError;

  // Get payments
  const { data: payments, error: paymentsError } = await supabase
    .from('invoice_payments')
    .select('amount, payment_date')
    .eq('invoice_id', invoiceId);

  if (paymentsError) throw paymentsError;

  const totalPaid = invoice.amount_paid || 0;
  const lastPayment = payments && payments.length > 0
    ? payments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0]
    : null;

  return {
    total_paid: totalPaid,
    payment_count: payments?.length || 0,
    last_payment_date: lastPayment?.payment_date,
    remaining_balance: invoice.total_amount - totalPaid,
  };
};

// Hooks
export function useInvoicePayments(invoiceId: string) {
  const { data: payments = [], isLoading, error, refetch } = useQuery({
    queryKey: invoicePaymentKeys.list(invoiceId),
    queryFn: () => fetchInvoicePayments(invoiceId),
    enabled: !!invoiceId,
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    payments,
    loading: isLoading,
    error,
    refetch,
  };
}

export function usePayment(paymentId: string) {
  const { data: payment, isLoading, error, refetch } = useQuery({
    queryKey: invoicePaymentKeys.detail(paymentId),
    queryFn: () => fetchPayment(paymentId),
    enabled: !!paymentId,
    staleTime: 30 * 1000,
  });

  return {
    payment,
    loading: isLoading,
    error,
    refetch,
  };
}

export function usePaymentSummary(invoiceId: string) {
  const { data: summary, isLoading, error, refetch } = useQuery({
    queryKey: [...invoicePaymentKeys.list(invoiceId), 'summary'],
    queryFn: () => fetchPaymentSummary(invoiceId),
    enabled: !!invoiceId,
    staleTime: 30 * 1000,
  });

  return {
    summary,
    loading: isLoading,
    error,
    refetch,
  };
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (payment: InvoicePaymentInsert) => {
      const paymentWithUser = {
        ...payment,
        created_by: user?.user_id,
      };
      return createPayment(paymentWithUser);
    },
    onSuccess: (data) => {
      // Invalidate payment queries
      queryClient.invalidateQueries({ queryKey: invoicePaymentKeys.list(data.invoice_id) });
      // Invalidate invoice queries (since amount_paid changes)
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(data.invoice_id) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });

      toast({
        title: 'Payment Recorded',
        description: `Payment of $${data.amount.toFixed(2)} recorded successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record payment',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ paymentId, updates }: { paymentId: string; updates: Partial<InvoicePaymentInsert> }) =>
      updatePayment(paymentId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: invoicePaymentKeys.list(data.invoice_id) });
      queryClient.invalidateQueries({ queryKey: invoicePaymentKeys.detail(data.payment_id) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(data.invoice_id) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });

      toast({
        title: 'Payment Updated',
        description: 'Payment information updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update payment',
        variant: 'destructive',
      });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deletePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoicePaymentKeys.all });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.all });

      toast({
        title: 'Payment Deleted',
        description: 'Payment record deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete payment',
        variant: 'destructive',
      });
    },
  });
}
