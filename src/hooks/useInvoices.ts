import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Invoice, InvoiceInsert, InvoiceLineItem, InvoiceLineItemInsert } from '@/lib/schemas';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLogs } from '@/hooks/useActivityLogs';

// Query keys
export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (filters?: InvoiceFilters) => [...invoiceKeys.lists(), filters] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
  byProperty: (propertyId: string) => [...invoiceKeys.all, 'property', propertyId] as const,
  byBooking: (bookingId: string) => [...invoiceKeys.all, 'booking', bookingId] as const,
};

export interface InvoiceFilters {
  property_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  guest_name?: string;
}

// Fetch all invoices with filters
const fetchInvoices = async (filters?: InvoiceFilters): Promise<Invoice[]> => {
  let query = supabase
    .from('invoices')
    .select(`
      *,
      property:properties(property_id, property_name),
      booking:property_bookings!invoices_booking_id_fkey(booking_id, guest_name, check_in_date, check_out_date),
      line_items:invoice_line_items(*),
      created_user:users!invoices_created_by_fkey(user_id, first_name, last_name, email)
    `)
    .order('issue_date', { ascending: false });

  if (filters?.property_id) {
    query = query.eq('property_id', filters.property_id);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.date_from) {
    query = query.gte('issue_date', filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte('issue_date', filters.date_to);
  }

  if (filters?.guest_name) {
    query = query.ilike('guest_name', `%${filters.guest_name}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as Invoice[];
};

// Fetch single invoice by ID
const fetchInvoice = async (invoiceId: string): Promise<Invoice> => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      property:properties(property_id, property_name, location:property_location(*)),
      booking:property_bookings!invoices_booking_id_fkey(booking_id, guest_name, guest_email, guest_phone, check_in_date, check_out_date),
      line_items:invoice_line_items(*),
      created_user:users!invoices_created_by_fkey(user_id, first_name, last_name, email)
    `)
    .eq('invoice_id', invoiceId)
    .single();

  if (error) throw error;
  return data as Invoice;
};

// Create invoice with line items
const createInvoice = async (invoice: InvoiceInsert, lineItems: InvoiceLineItemInsert[]): Promise<Invoice> => {
  // Create invoice first
  const { data: invoiceData, error: invoiceError } = await supabase
    .from('invoices')
    .insert(invoice)
    .select()
    .single();

  if (invoiceError) throw invoiceError;

  // Create line items
  if (lineItems.length > 0) {
    const lineItemsWithInvoiceId = lineItems.map((item) => ({
      ...item,
      invoice_id: invoiceData.invoice_id,
    }));

    const { error: lineItemsError } = await supabase
      .from('invoice_line_items')
      .insert(lineItemsWithInvoiceId);

    if (lineItemsError) throw lineItemsError;
  }

  // Fetch complete invoice with line items
  return fetchInvoice(invoiceData.invoice_id!);
};

// Update invoice
const updateInvoice = async ({ invoiceId, updates }: { invoiceId: string; updates: Partial<Invoice> }): Promise<Invoice> => {
  const { data, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('invoice_id', invoiceId)
    .select()
    .single();

  if (error) throw error;
  return data as Invoice;
};

// Delete invoice (cascade deletes line items)
const deleteInvoice = async (invoiceId: string): Promise<{ invoiceId: string; invoice: any }> => {
  // Fetch invoice details before deleting for logging
  const { data: invoice } = await supabase
    .from('invoices')
    .select('invoice_id, invoice_number, guest_name, total_amount, status, property_id')
    .eq('invoice_id', invoiceId)
    .single();

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('invoice_id', invoiceId);

  if (error) throw error;
  return { invoiceId, invoice };
};

// Add line item to invoice
const addLineItem = async (lineItem: InvoiceLineItemInsert): Promise<InvoiceLineItem> => {
  const { data, error } = await supabase
    .from('invoice_line_items')
    .insert(lineItem)
    .select()
    .single();

  if (error) throw error;
  return data as InvoiceLineItem;
};

// Update line item
const updateLineItem = async ({ lineItemId, updates }: { lineItemId: string; updates: Partial<InvoiceLineItem> }): Promise<InvoiceLineItem> => {
  const { data, error } = await supabase
    .from('invoice_line_items')
    .update(updates)
    .eq('line_item_id', lineItemId)
    .select()
    .single();

  if (error) throw error;
  return data as InvoiceLineItem;
};

// Delete line item
const deleteLineItem = async (lineItemId: string): Promise<{ lineItemId: string; lineItem: any }> => {
  // Fetch line item details before deleting for logging
  const { data: lineItem } = await supabase
    .from('invoice_line_items')
    .select('line_item_id, description, quantity, unit_price, invoice_id')
    .eq('line_item_id', lineItemId)
    .single();

  const { error } = await supabase
    .from('invoice_line_items')
    .delete()
    .eq('line_item_id', lineItemId);

  if (error) throw error;
  return { lineItemId, lineItem };
};

// Mark invoice as sent
const markInvoiceAsSent = async (invoiceId: string): Promise<Invoice> => {
  const { data, error } = await supabase
    .from('invoices')
    .update({ status: 'sent', sent_date: new Date().toISOString() })
    .eq('invoice_id', invoiceId)
    .select()
    .single();

  if (error) throw error;
  return data as Invoice;
};

// Send invoice email via Edge Function
interface SendInvoiceEmailParams {
  invoiceId: string;
  recipientEmail: string;
  subject?: string;
  message?: string;
  ccEmails?: string[];
  pdfAttachment?: string; // Base64 encoded PDF
}

const sendInvoiceEmail = async (params: SendInvoiceEmailParams): Promise<void> => {
  console.log('📧 [sendInvoiceEmail] Starting email send with params:', {
    invoiceId: params.invoiceId,
    recipientEmail: params.recipientEmail,
    hasSubject: !!params.subject,
    hasMessage: !!params.message,
    ccEmailsCount: params.ccEmails?.length || 0,
  });

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    console.error('❌ [sendInvoiceEmail] Not authenticated');
    throw new Error('Not authenticated');
  }

  console.log('✅ [sendInvoiceEmail] Session valid, calling edge function...');

  const response = await supabase.functions.invoke('send-invoice-email', {
    body: params,
  });

  console.log('📬 [sendInvoiceEmail] Edge function response:', {
    hasError: !!response.error,
    error: response.error,
    data: response.data,
    status: (response as any).status,
  });

  if (response.error) {
    console.error('❌ [sendInvoiceEmail] Edge function error:', response.error);
    throw new Error(response.error.message || 'Failed to send email');
  }

  if (!response.data?.success) {
    console.error('❌ [sendInvoiceEmail] Email send failed:', response.data);
    throw new Error(response.data?.error || 'Failed to send email');
  }

  console.log('✅ [sendInvoiceEmail] Email sent successfully!');
};

// Mark invoice as paid
const markInvoiceAsPaid = async ({ invoiceId, paymentMethod, paidDate }: { invoiceId: string; paymentMethod?: string; paidDate?: string }): Promise<Invoice> => {
  // First get the invoice to know the total
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('total_amount')
    .eq('invoice_id', invoiceId)
    .single();

  if (fetchError) throw fetchError;

  const { data, error } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      amount_paid: invoice.total_amount,
      paid_date: paidDate || new Date().toISOString(),
      payment_method: paymentMethod,
    })
    .eq('invoice_id', invoiceId)
    .select()
    .single();

  if (error) throw error;
  return data as Invoice;
};

// Create invoice from booking
const createInvoiceFromBooking = async (bookingId: string): Promise<Invoice> => {
  // Fetch booking details
  const { data: booking, error: bookingError } = await supabase
    .from('property_bookings')
    .select('*, property:properties(property_id, property_name)')
    .eq('booking_id', bookingId)
    .single();

  if (bookingError) throw bookingError;

  // Calculate number of nights
  const checkIn = new Date(booking.check_in_date);
  const checkOut = new Date(booking.check_out_date);
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  // Create line items - check if booking has a bill template
  let lineItems: InvoiceLineItemInsert[] = [];
  let lineNumber = 1;

  // If booking has a bill template, use it for line items
  if (booking.bill_template_id) {
    console.log('📋 [useInvoices] Using bill template for invoice:', booking.bill_template_id);

    const { data: template, error: templateError } = await supabase
      .from('bill_templates')
      .select(`
        *,
        items:bill_template_items(*)
      `)
      .eq('template_id', booking.bill_template_id)
      .single();

    if (!templateError && template && template.items) {
      // Use template items with booking-specific context
      template.items.forEach((item: any) => {
        const lineTotal = item.quantity * item.unit_price;
        const itemTaxAmount = item.tax_amount || (lineTotal * (item.tax_rate / 100));

        // For accommodation items, adjust description to include dates and nights
        let description = item.description;
        if (item.item_type === 'accommodation') {
          description = `${item.description} - ${nights} night${nights > 1 ? 's' : ''} (${booking.check_in_date} to ${booking.check_out_date})`;
        }

        lineItems.push({
          invoice_id: '',
          line_number: lineNumber++,
          description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate || 0,
          tax_amount: itemTaxAmount,
          item_type: item.item_type || 'other',
        });
      });

      console.log(`✅ [useInvoices] Created ${lineItems.length} line items from template`);
    } else {
      console.log('⚠️ [useInvoices] Template not found or has no items, falling back to booking fields');
    }
  }

  // Fallback: If no template or template failed, use booking fields (existing behavior)
  if (lineItems.length === 0) {
    console.log('📋 [useInvoices] Using booking fields for line items (no template)');

    // Accommodation charges
    if (booking.base_amount && booking.base_amount > 0) {
      lineItems.push({
        invoice_id: '',
        line_number: lineNumber++,
        description: `Accommodation - ${nights} night${nights > 1 ? 's' : ''} (${booking.check_in_date} to ${booking.check_out_date})`,
        quantity: nights,
        unit_price: booking.base_amount / nights,
        tax_rate: 0,
        tax_amount: 0,
        item_type: 'accommodation',
      });
    }

    // Cleaning fee
    if (booking.cleaning_fee && booking.cleaning_fee > 0) {
      lineItems.push({
        invoice_id: '',
        line_number: lineNumber++,
        description: 'Cleaning Fee',
        quantity: 1,
        unit_price: booking.cleaning_fee,
        tax_rate: 0,
        tax_amount: 0,
        item_type: 'cleaning',
      });
    }

    // Extra charges
    if (booking.extras_amount && booking.extras_amount > 0) {
      lineItems.push({
        invoice_id: '',
        line_number: lineNumber++,
        description: 'Additional Services',
        quantity: 1,
        unit_price: booking.extras_amount,
        tax_rate: 0,
        tax_amount: 0,
        item_type: 'extras',
      });
    }

    // Taxes
    if (booking.tax_amount && booking.tax_amount > 0) {
      lineItems.push({
        invoice_id: '',
        line_number: lineNumber++,
        description: 'Taxes',
        quantity: 1,
        unit_price: booking.tax_amount,
        tax_rate: 0,
        tax_amount: 0,
        item_type: 'tax',
      });
    }
  }

  // Create invoice
  const invoiceData: InvoiceInsert = {
    booking_id: bookingId,
    property_id: booking.property_id,
    guest_name: booking.guest_name,
    guest_email: booking.guest_email || undefined,
    guest_phone: booking.guest_phone || undefined,
    issue_date: new Date().toISOString().split('T')[0],
    due_date: booking.check_in_date, // Due on check-in
    status: 'draft',
    subtotal: 0, // Will be calculated by triggers
    tax_amount: 0,
    total_amount: 0,
    amount_paid: 0,
    payment_method: booking.payment_method || undefined,
    terms: 'Payment due on check-in date',
  };

  return createInvoice(invoiceData, lineItems);
};

// Hooks
export function useInvoices(filters?: InvoiceFilters) {
  const { data: invoices = [], isLoading, error, refetch } = useQuery({
    queryKey: invoiceKeys.list(filters),
    queryFn: () => fetchInvoices(filters),
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    invoices,
    loading: isLoading,
    error,
    refetch,
  };
}

export function useInvoice(invoiceId: string) {
  const { data: invoice, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: invoiceKeys.detail(invoiceId),
    queryFn: () => fetchInvoice(invoiceId),
    enabled: !!invoiceId && invoiceId.length > 0,
    staleTime: 30 * 1000,
    retry: 2,
  });

  // Debug logging for invoice loading
  React.useEffect(() => {
    if (invoiceId) {
      console.log('🔍 [useInvoice] Loading invoice:', {
        invoiceId,
        isLoading,
        isFetching,
        hasData: !!invoice,
        error: error?.message,
      });
    }
  }, [invoiceId, isLoading, isFetching, invoice, error]);

  return {
    invoice,
    loading: isLoading,
    isFetching,
    error,
    refetch,
  };
}

export function useCreateInvoice() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoice, lineItems }: { invoice: InvoiceInsert; lineItems: InvoiceLineItemInsert[] }) =>
      createInvoice(invoice, lineItems),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      toast({
        title: 'Success',
        description: 'Invoice created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create invoice',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateInvoice() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateInvoice,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(data.invoice_id!) });
      toast({
        title: 'Success',
        description: 'Invoice updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update invoice',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteInvoice() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: deleteInvoice,
    onSuccess: ({ invoiceId, invoice }) => {
      // Log the delete action
      logActivity('invoice_deleted', {
        invoice_id: invoiceId,
        invoice_number: invoice?.invoice_number || 'N/A',
        guest_name: invoice?.guest_name || 'Unknown Guest',
        total_amount: invoice?.total_amount,
        status: invoice?.status,
        property_id: invoice?.property_id,
      });

      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      toast({
        title: 'Success',
        description: 'Invoice deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete invoice',
        variant: 'destructive',
      });
    },
  });
}

export function useAddLineItem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addLineItem,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(data.invoice_id!) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      toast({
        title: 'Success',
        description: 'Line item added successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add line item',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateLineItem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateLineItem,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(data.invoice_id!) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      toast({
        title: 'Success',
        description: 'Line item updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update line item',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteLineItem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: deleteLineItem,
    onSuccess: ({ lineItemId, lineItem }) => {
      // Log the delete action
      logActivity('invoice_line_item_deleted', {
        line_item_id: lineItemId,
        description: lineItem?.description || 'Unknown Item',
        quantity: lineItem?.quantity,
        unit_price: lineItem?.unit_price,
        invoice_id: lineItem?.invoice_id,
      });

      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      toast({
        title: 'Success',
        description: 'Line item deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete line item',
        variant: 'destructive',
      });
    },
  });
}

export function useMarkInvoiceAsSent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markInvoiceAsSent,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(data.invoice_id!) });
      toast({
        title: 'Success',
        description: 'Invoice marked as sent',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark invoice as sent',
        variant: 'destructive',
      });
    },
  });
}

export function useMarkInvoiceAsPaid() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markInvoiceAsPaid,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(data.invoice_id!) });
      toast({
        title: 'Success',
        description: 'Invoice marked as paid',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark invoice as paid',
        variant: 'destructive',
      });
    },
  });
}

export function useCreateInvoiceFromBooking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInvoiceFromBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      toast({
        title: 'Success',
        description: 'Invoice created from booking',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create invoice from booking',
        variant: 'destructive',
      });
    },
  });
}

export function useSendInvoiceEmail() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendInvoiceEmail,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.invoiceId) });
      toast({
        title: 'Email Sent Successfully',
        description: `Invoice email sent to ${variables.recipientEmail}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Send Email',
        description: error.message || 'An error occurred while sending the email. Please try again.',
        variant: 'destructive',
      });
    },
  });
}
