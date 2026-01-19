import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

// Transaction types
export type TransactionType =
  | 'booking'
  | 'invoice'
  | 'payment'
  | 'expense'
  | 'key_borrowing'
  | 'check_in_out';

// Unified timeline item
export interface PropertyTransactionItem {
  id: string;
  type: TransactionType;
  date: string;
  status: string;
  title: string;
  description: string;
  amount?: number;
  amountType?: 'income' | 'expense' | 'neutral';
  metadata: Record<string, any>;
}

// Summary stats
export interface PropertyTransactionStats {
  totalBookings: number;
  totalInvoices: number;
  totalExpenses: number;
  totalIncome: number;
  totalExpenseAmount: number;
  keyBorrowingsOut: number;
  checkInsOuts: number;
}

// Filter options
export interface TransactionFilters {
  startDate: string;
  endDate: string;
  types: TransactionType[];
}

// Query keys
export const propertyTransactionKeys = {
  all: ['property-transactions'] as const,
  property: (propertyId: string) => [...propertyTransactionKeys.all, propertyId] as const,
  propertyWithFilters: (propertyId: string, filters: TransactionFilters) =>
    [...propertyTransactionKeys.property(propertyId), JSON.stringify(filters)] as const,
};

// Default filters (last 30 days, all types)
export const defaultTransactionFilters: TransactionFilters = {
  startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
  endDate: format(new Date(), 'yyyy-MM-dd'),
  types: ['booking', 'invoice', 'payment', 'expense', 'key_borrowing', 'check_in_out'],
};

// Fetch bookings for property
const fetchPropertyBookings = async (
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<PropertyTransactionItem[]> => {
  const { data, error } = await supabase
    .from('property_bookings')
    .select('*')
    .eq('property_id', propertyId)
    .gte('created_at', startDate)
    .lte('created_at', endDate + 'T23:59:59')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching bookings:', error);
    return [];
  }

  return (data || []).map((booking) => ({
    id: booking.booking_id,
    type: 'booking' as TransactionType,
    date: booking.created_at,
    status: booking.booking_status || 'pending',
    title: `Booking - ${booking.guest_name || 'Guest'}`,
    description: `${format(new Date(booking.check_in_date), 'MMM d')} - ${format(new Date(booking.check_out_date), 'MMM d, yyyy')}`,
    amount: booking.total_amount || booking.base_amount || undefined,
    amountType: 'income' as const,
    metadata: booking,
  }));
};

// Fetch invoices for property
const fetchPropertyInvoices = async (
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<PropertyTransactionItem[]> => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      booking:property_bookings!invoices_booking_id_fkey(property_id)
    `)
    .gte('issue_date', startDate)
    .lte('issue_date', endDate)
    .order('issue_date', { ascending: false });

  if (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }

  // Filter invoices for this property (via booking relationship)
  const propertyInvoices = (data || []).filter(
    (inv) => inv.booking?.property_id === propertyId
  );

  const items: PropertyTransactionItem[] = [];

  propertyInvoices.forEach((invoice) => {
    // Add invoice created item
    items.push({
      id: invoice.invoice_id,
      type: 'invoice' as TransactionType,
      date: invoice.issue_date,
      status: invoice.status || 'draft',
      title: `Invoice #${invoice.invoice_number || invoice.invoice_id.slice(0, 8)}`,
      description: invoice.guest_name || 'Guest invoice',
      amount: invoice.total_amount || undefined,
      amountType: 'income' as const,
      metadata: invoice,
    });

    // Add payment item if paid
    if (invoice.paid_date && invoice.amount_paid && invoice.amount_paid > 0) {
      items.push({
        id: `${invoice.invoice_id}-payment`,
        type: 'payment' as TransactionType,
        date: invoice.paid_date,
        status: 'completed',
        title: `Payment Received`,
        description: `Invoice #${invoice.invoice_number || invoice.invoice_id.slice(0, 8)}`,
        amount: invoice.amount_paid,
        amountType: 'income' as const,
        metadata: { ...invoice, transactionType: 'payment' },
      });
    }
  });

  return items;
};

// Fetch expenses for property
const fetchPropertyExpenses = async (
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<PropertyTransactionItem[]> => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('property_id', propertyId)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .order('expense_date', { ascending: false });

  if (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }

  return (data || []).map((expense) => ({
    id: expense.expense_id,
    type: 'expense' as TransactionType,
    date: expense.expense_date,
    status: expense.payment_status || 'pending',
    title: expense.category ? `${expense.category.charAt(0).toUpperCase() + expense.category.slice(1)} Expense` : 'Expense',
    description: expense.description || expense.vendor_name || 'Property expense',
    amount: expense.amount || undefined,
    amountType: 'expense' as const,
    metadata: expense,
  }));
};

// Fetch key borrowings for property
const fetchPropertyKeyBorrowings = async (
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<PropertyTransactionItem[]> => {
  const { data, error } = await supabase
    .from('key_borrowings')
    .select('*')
    .eq('property_id', propertyId)
    .gte('checked_out_at', startDate)
    .lte('checked_out_at', endDate + 'T23:59:59')
    .order('checked_out_at', { ascending: false });

  if (error) {
    console.error('Error fetching key borrowings:', error);
    return [];
  }

  const items: PropertyTransactionItem[] = [];

  (data || []).forEach((borrowing) => {
    // Add check-out item
    items.push({
      id: borrowing.id,
      type: 'key_borrowing' as TransactionType,
      date: borrowing.checked_out_at,
      status: borrowing.status || 'borrowed',
      title: `Key Checked Out`,
      description: `${borrowing.quantity}x ${borrowing.key_type?.replace('_', ' ')} to ${borrowing.borrower_name}`,
      amountType: 'neutral' as const,
      metadata: { ...borrowing, action: 'checkout' },
    });

    // Add check-in item if returned
    if (borrowing.checked_in_at) {
      items.push({
        id: `${borrowing.id}-return`,
        type: 'key_borrowing' as TransactionType,
        date: borrowing.checked_in_at,
        status: 'returned',
        title: `Key Returned`,
        description: `${borrowing.quantity}x ${borrowing.key_type?.replace('_', ' ')} from ${borrowing.borrower_name}`,
        amountType: 'neutral' as const,
        metadata: { ...borrowing, action: 'checkin' },
      });
    }
  });

  return items;
};

// Fetch check-in/out records for property
const fetchPropertyCheckInOutRecords = async (
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<PropertyTransactionItem[]> => {
  const { data, error } = await supabase
    .from('check_in_out_records')
    .select('*')
    .eq('property_id', propertyId)
    .gte('record_date', startDate)
    .lte('record_date', endDate)
    .order('record_date', { ascending: false });

  if (error) {
    console.error('Error fetching check-in/out records:', error);
    return [];
  }

  return (data || []).map((record) => ({
    id: record.record_id,
    type: 'check_in_out' as TransactionType,
    date: record.record_date,
    status: record.status || 'completed',
    title: record.record_type === 'check_in' ? 'Guest Check-in' : 'Guest Check-out',
    description: record.resident_name || 'Guest',
    amountType: 'neutral' as const,
    metadata: record,
  }));
};

// Calculate stats from timeline items
const calculateStats = (items: PropertyTransactionItem[]): PropertyTransactionStats => {
  const stats: PropertyTransactionStats = {
    totalBookings: 0,
    totalInvoices: 0,
    totalExpenses: 0,
    totalIncome: 0,
    totalExpenseAmount: 0,
    keyBorrowingsOut: 0,
    checkInsOuts: 0,
  };

  items.forEach((item) => {
    switch (item.type) {
      case 'booking':
        stats.totalBookings++;
        if (item.amount) stats.totalIncome += item.amount;
        break;
      case 'invoice':
        stats.totalInvoices++;
        break;
      case 'payment':
        if (item.amount) stats.totalIncome += item.amount;
        break;
      case 'expense':
        stats.totalExpenses++;
        if (item.amount) stats.totalExpenseAmount += item.amount;
        break;
      case 'key_borrowing':
        if (item.metadata?.action === 'checkout') {
          stats.keyBorrowingsOut++;
        }
        break;
      case 'check_in_out':
        stats.checkInsOuts++;
        break;
    }
  });

  return stats;
};

// Main fetch function
const fetchPropertyTransactions = async (
  propertyId: string,
  filters: TransactionFilters
): Promise<{ items: PropertyTransactionItem[]; stats: PropertyTransactionStats }> => {
  const { startDate, endDate, types } = filters;

  // Build promises based on enabled types
  const fetchPromises: Promise<PropertyTransactionItem[]>[] = [];

  if (types.includes('booking')) {
    fetchPromises.push(fetchPropertyBookings(propertyId, startDate, endDate));
  }

  if (types.includes('invoice') || types.includes('payment')) {
    fetchPromises.push(fetchPropertyInvoices(propertyId, startDate, endDate));
  }

  if (types.includes('expense')) {
    fetchPromises.push(fetchPropertyExpenses(propertyId, startDate, endDate));
  }

  if (types.includes('key_borrowing')) {
    fetchPromises.push(fetchPropertyKeyBorrowings(propertyId, startDate, endDate));
  }

  if (types.includes('check_in_out')) {
    fetchPromises.push(fetchPropertyCheckInOutRecords(propertyId, startDate, endDate));
  }

  // Fetch all in parallel
  const results = await Promise.all(fetchPromises);

  // Flatten and filter by enabled types
  let allItems = results.flat();

  // Filter out payment items if payment type is not enabled
  if (!types.includes('payment')) {
    allItems = allItems.filter((item) => item.type !== 'payment');
  }

  // Filter out invoice items if invoice type is not enabled
  if (!types.includes('invoice')) {
    allItems = allItems.filter((item) => item.type !== 'invoice');
  }

  // Sort by date descending
  allItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    items: allItems,
    stats: calculateStats(allItems),
  };
};

// Main hook
export function usePropertyTransactions(
  propertyId: string | null,
  filters: TransactionFilters = defaultTransactionFilters
) {
  return useQuery({
    queryKey: propertyTransactionKeys.propertyWithFilters(propertyId || '', filters),
    queryFn: () => fetchPropertyTransactions(propertyId!, filters),
    enabled: !!propertyId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export default usePropertyTransactions;
