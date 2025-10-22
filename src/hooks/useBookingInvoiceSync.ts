import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { bookingKeys } from './useBookings';
import { invoiceKeys } from './useInvoices';

/**
 * Hook for synchronizing payment and status between bookings and invoices
 * Provides bidirectional sync and payment tracking
 */

// =====================================================
// PAYMENT SYNC FUNCTIONS
// =====================================================

/**
 * Sync invoice payment to booking
 * When invoice is paid, update booking payment_status
 */
const syncInvoicePaymentToBooking = async (invoiceId: string): Promise<void> => {
  // Get invoice details
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('booking_id, total_amount, amount_paid, status')
    .eq('invoice_id', invoiceId)
    .single();

  if (invoiceError) throw invoiceError;
  if (!invoice.booking_id) {
    throw new Error('Invoice is not linked to a booking');
  }

  // Determine booking payment status based on invoice
  let bookingPaymentStatus: string;
  if (invoice.status === 'paid' && invoice.amount_paid >= invoice.total_amount) {
    bookingPaymentStatus = 'paid';
  } else if (invoice.amount_paid > 0) {
    bookingPaymentStatus = 'partially_paid';
  } else {
    bookingPaymentStatus = 'pending';
  }

  // Update booking
  const { error: updateError } = await supabase
    .from('property_bookings')
    .update({
      payment_status: bookingPaymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('booking_id', invoice.booking_id);

  if (updateError) throw updateError;
};

/**
 * Sync booking payment to invoice
 * When booking payment is received, update invoice
 */
const syncBookingPaymentToInvoice = async (bookingId: string, amountPaid: number): Promise<void> => {
  // Get booking's invoice
  const { data: booking, error: bookingError } = await supabase
    .from('property_bookings')
    .select('invoice_id, total_amount, payment_status')
    .eq('booking_id', bookingId)
    .single();

  if (bookingError) throw bookingError;
  if (!booking.invoice_id) {
    throw new Error('Booking does not have an associated invoice');
  }

  // Determine invoice status based on payment
  let invoiceStatus: string;
  if (amountPaid >= (booking.total_amount || 0)) {
    invoiceStatus = 'paid';
  } else if (amountPaid > 0) {
    // Keep current status but update amount_paid
    invoiceStatus = 'sent'; // Assume it was sent if payment is being made
  } else {
    invoiceStatus = 'draft';
  }

  // Update invoice
  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      amount_paid: amountPaid,
      status: invoiceStatus,
      paid_date: invoiceStatus === 'paid' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('invoice_id', booking.invoice_id);

  if (updateError) throw updateError;
};

/**
 * Record a partial payment on an invoice
 */
const recordPartialPayment = async ({
  invoiceId,
  amount,
  paymentMethod
}: {
  invoiceId: string;
  amount: number;
  paymentMethod?: string;
}): Promise<void> => {
  // Get current invoice
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('amount_paid, total_amount, booking_id')
    .eq('invoice_id', invoiceId)
    .single();

  if (fetchError) throw fetchError;

  const newAmountPaid = (invoice.amount_paid || 0) + amount;
  const isPaid = newAmountPaid >= invoice.total_amount;

  // Update invoice
  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      amount_paid: newAmountPaid,
      status: isPaid ? 'paid' : 'sent',
      paid_date: isPaid ? new Date().toISOString() : null,
      payment_method: paymentMethod || invoice.payment_method,
      updated_at: new Date().toISOString(),
    })
    .eq('invoice_id', invoiceId);

  if (updateError) throw updateError;

  // Sync to booking if linked
  if (invoice.booking_id) {
    await syncInvoicePaymentToBooking(invoiceId);
  }
};

/**
 * Link an existing invoice to a booking
 */
const linkInvoiceToBooking = async (invoiceId: string, bookingId: string): Promise<void> => {
  // Update invoice with booking reference
  const { error: invoiceError } = await supabase
    .from('invoices')
    .update({ booking_id: bookingId })
    .eq('invoice_id', invoiceId);

  if (invoiceError) throw invoiceError;

  // Update booking with invoice reference
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('status')
    .eq('invoice_id', invoiceId)
    .single();

  if (fetchError) throw fetchError;

  const { error: bookingError } = await supabase
    .from('property_bookings')
    .update({
      invoice_id: invoiceId,
      invoice_status: invoice.status,
    })
    .eq('booking_id', bookingId);

  if (bookingError) throw bookingError;
};

/**
 * Unlink invoice from booking
 */
const unlinkInvoiceFromBooking = async (invoiceId: string): Promise<void> => {
  // Get invoice to find booking_id
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('booking_id')
    .eq('invoice_id', invoiceId)
    .single();

  if (fetchError) throw fetchError;

  // Remove booking_id from invoice
  const { error: invoiceError } = await supabase
    .from('invoices')
    .update({ booking_id: null })
    .eq('invoice_id', invoiceId);

  if (invoiceError) throw invoiceError;

  // Reset booking invoice fields
  if (invoice.booking_id) {
    const { error: bookingError } = await supabase
      .from('property_bookings')
      .update({
        invoice_id: null,
        invoice_status: 'not_generated',
      })
      .eq('booking_id', invoice.booking_id);

    if (bookingError) throw bookingError;
  }
};

// =====================================================
// REACT HOOKS
// =====================================================

/**
 * Hook to sync invoice payment to booking
 */
export function useSyncInvoicePaymentToBooking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncInvoicePaymentToBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
    onError: (error: Error) => {
      toast({
        title: 'Sync Error',
        description: error.message || 'Failed to sync invoice payment to booking',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to sync booking payment to invoice
 */
export function useSyncBookingPaymentToInvoice() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookingId, amountPaid }: { bookingId: string; amountPaid: number }) =>
      syncBookingPaymentToInvoice(bookingId, amountPaid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
    onError: (error: Error) => {
      toast({
        title: 'Sync Error',
        description: error.message || 'Failed to sync booking payment to invoice',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to record a partial payment
 */
export function useRecordPartialPayment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recordPartialPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      toast({
        title: 'Payment Recorded',
        description: 'Partial payment has been recorded successfully',
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

/**
 * Hook to link an invoice to a booking
 */
export function useLinkInvoiceToBooking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, bookingId }: { invoiceId: string; bookingId: string }) =>
      linkInvoiceToBooking(invoiceId, bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      toast({
        title: 'Success',
        description: 'Invoice linked to booking successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to link invoice to booking',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to unlink an invoice from a booking
 */
export function useUnlinkInvoiceFromBooking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unlinkInvoiceFromBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      toast({
        title: 'Success',
        description: 'Invoice unlinked from booking',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to unlink invoice',
        variant: 'destructive',
      });
    },
  });
}
