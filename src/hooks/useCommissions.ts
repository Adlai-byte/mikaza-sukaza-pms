import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// =====================================================
// TYPES - Commission from Invoice Line Items
// =====================================================

export interface InvoiceCommission {
  line_item_id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  item_type: string;
  created_at: string;
  // Computed
  commission_amount: number;
  // Invoice relation
  invoice: {
    invoice_id: string;
    invoice_number: string;
    guest_name: string;
    guest_email: string | null;
    guest_phone: string | null;
    issue_date: string;
    due_date: string;
    status: string;
    total_amount: number;
    amount_paid: number;
    balance_due: number;
    payment_method: string | null;
    booking_id: string | null;
    property_id: string | null;
    property: {
      property_id: string;
      property_name: string;
    } | null;
    booking: {
      booking_id: string;
      guest_name: string;
      check_in_date: string;
      check_out_date: string;
    } | null;
  };
}

export interface CommissionFilters {
  property_id?: string;
  invoice_status?: string;
  date_from?: string;
  date_to?: string;
}

export interface CommissionSummary {
  total_commissions: number;
  commission_count: number;
  paid_commissions: number;
  paid_count: number;
  pending_commissions: number;
  pending_count: number;
  average_commission: number;
}

export interface CommissionByProperty {
  property_id: string;
  property_name: string;
  total_commissions: number;
  commission_count: number;
}

export interface CommissionByMonth {
  month: string;
  total_commissions: number;
  commission_count: number;
}

// =====================================================
// QUERY KEYS
// =====================================================

export const commissionKeys = {
  all: ['commissions'] as const,
  lists: () => [...commissionKeys.all, 'list'] as const,
  list: (filters?: CommissionFilters) => [...commissionKeys.lists(), filters] as const,
  summary: (dateFrom?: string, dateTo?: string) => [...commissionKeys.all, 'summary', dateFrom, dateTo] as const,
  byProperty: (dateFrom?: string, dateTo?: string) => [...commissionKeys.all, 'by-property', dateFrom, dateTo] as const,
  byMonth: (dateFrom?: string, dateTo?: string) => [...commissionKeys.all, 'by-month', dateFrom, dateTo] as const,
};

// =====================================================
// FETCH FUNCTIONS
// =====================================================

const fetchCommissions = async (filters?: CommissionFilters): Promise<InvoiceCommission[]> => {
  // Query invoice line items where description is 'Commission'
  let query = supabase
    .from('invoice_line_items')
    .select(`
      *,
      invoice:invoices!inner(
        invoice_id,
        invoice_number,
        guest_name,
        guest_email,
        guest_phone,
        issue_date,
        due_date,
        status,
        total_amount,
        amount_paid,
        payment_method,
        booking_id,
        property_id,
        property:properties(property_id, property_name),
        booking:property_bookings!invoices_booking_id_fkey(booking_id, guest_name, check_in_date, check_out_date)
      )
    `)
    .eq('description', 'Commission')
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters?.property_id) {
    query = query.eq('invoice.property_id', filters.property_id);
  }

  if (filters?.invoice_status) {
    query = query.eq('invoice.status', filters.invoice_status);
  }

  if (filters?.date_from) {
    query = query.gte('invoice.issue_date', filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte('invoice.issue_date', filters.date_to);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Map data to include computed fields
  return (data || []).map((item: any) => ({
    ...item,
    commission_amount: (item.quantity || 1) * (item.unit_price || 0),
    invoice: {
      ...item.invoice,
      balance_due: (item.invoice?.total_amount || 0) - (item.invoice?.amount_paid || 0),
    },
  })) as InvoiceCommission[];
};

const fetchCommissionSummary = async (dateFrom?: string, dateTo?: string): Promise<CommissionSummary> => {
  let query = supabase
    .from('invoice_line_items')
    .select(`
      quantity,
      unit_price,
      invoice:invoices!inner(
        status,
        issue_date
      )
    `)
    .eq('description', 'Commission');

  if (dateFrom) {
    query = query.gte('invoice.issue_date', dateFrom);
  }
  if (dateTo) {
    query = query.lte('invoice.issue_date', dateTo);
  }

  const { data, error } = await query;

  if (error) throw error;

  const items = data || [];
  let total = 0;
  let paidTotal = 0;
  let pendingTotal = 0;
  let paidCount = 0;
  let pendingCount = 0;

  items.forEach((item: any) => {
    const amount = (item.quantity || 1) * (item.unit_price || 0);
    total += amount;

    if (item.invoice?.status === 'paid') {
      paidTotal += amount;
      paidCount += 1;
    } else {
      pendingTotal += amount;
      pendingCount += 1;
    }
  });

  return {
    total_commissions: total,
    commission_count: items.length,
    paid_commissions: paidTotal,
    paid_count: paidCount,
    pending_commissions: pendingTotal,
    pending_count: pendingCount,
    average_commission: items.length > 0 ? total / items.length : 0,
  };
};

const fetchCommissionsByProperty = async (dateFrom?: string, dateTo?: string): Promise<CommissionByProperty[]> => {
  let query = supabase
    .from('invoice_line_items')
    .select(`
      quantity,
      unit_price,
      invoice:invoices!inner(
        issue_date,
        property_id,
        property:properties(property_id, property_name)
      )
    `)
    .eq('description', 'Commission');

  if (dateFrom) {
    query = query.gte('invoice.issue_date', dateFrom);
  }
  if (dateTo) {
    query = query.lte('invoice.issue_date', dateTo);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Group by property
  const propertyMap = new Map<string, CommissionByProperty>();

  (data || []).forEach((item: any) => {
    const propertyId = item.invoice?.property_id;
    const propertyName = item.invoice?.property?.property_name || 'Unknown Property';
    const amount = (item.quantity || 1) * (item.unit_price || 0);

    if (!propertyId) return;

    const existing = propertyMap.get(propertyId);
    if (existing) {
      existing.total_commissions += amount;
      existing.commission_count += 1;
    } else {
      propertyMap.set(propertyId, {
        property_id: propertyId,
        property_name: propertyName,
        total_commissions: amount,
        commission_count: 1,
      });
    }
  });

  return Array.from(propertyMap.values()).sort((a, b) => b.total_commissions - a.total_commissions);
};

const fetchCommissionsByMonth = async (dateFrom?: string, dateTo?: string): Promise<CommissionByMonth[]> => {
  let query = supabase
    .from('invoice_line_items')
    .select(`
      quantity,
      unit_price,
      invoice:invoices!inner(
        issue_date
      )
    `)
    .eq('description', 'Commission');

  if (dateFrom) {
    query = query.gte('invoice.issue_date', dateFrom);
  }
  if (dateTo) {
    query = query.lte('invoice.issue_date', dateTo);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Group by month
  const monthMap = new Map<string, CommissionByMonth>();

  (data || []).forEach((item: any) => {
    const issueDate = item.invoice?.issue_date;
    if (!issueDate) return;

    const month = issueDate.substring(0, 7); // YYYY-MM
    const amount = (item.quantity || 1) * (item.unit_price || 0);

    const existing = monthMap.get(month);
    if (existing) {
      existing.total_commissions += amount;
      existing.commission_count += 1;
    } else {
      monthMap.set(month, {
        month,
        total_commissions: amount,
        commission_count: 1,
      });
    }
  });

  return Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));
};

// =====================================================
// HOOKS
// =====================================================

export function useCommissions(filters?: CommissionFilters) {
  const { data: commissions = [], isLoading, error, refetch } = useQuery({
    queryKey: commissionKeys.list(filters),
    queryFn: () => fetchCommissions(filters),
    staleTime: 30 * 1000,
  });

  return {
    commissions,
    loading: isLoading,
    error,
    refetch,
  };
}

export function useCommissionSummary(dateFrom?: string, dateTo?: string) {
  const { data: summary, isLoading, error, refetch } = useQuery({
    queryKey: commissionKeys.summary(dateFrom, dateTo),
    queryFn: () => fetchCommissionSummary(dateFrom, dateTo),
    staleTime: 60 * 1000,
  });

  return {
    summary,
    loading: isLoading,
    error,
    refetch,
  };
}

export function useCommissionsByProperty(dateFrom?: string, dateTo?: string) {
  const { data: commissionsByProperty = [], isLoading, error, refetch } = useQuery({
    queryKey: commissionKeys.byProperty(dateFrom, dateTo),
    queryFn: () => fetchCommissionsByProperty(dateFrom, dateTo),
    staleTime: 60 * 1000,
  });

  return {
    commissionsByProperty,
    loading: isLoading,
    error,
    refetch,
  };
}

export function useCommissionsByMonth(dateFrom?: string, dateTo?: string) {
  const { data: commissionsByMonth = [], isLoading, error, refetch } = useQuery({
    queryKey: commissionKeys.byMonth(dateFrom, dateTo),
    queryFn: () => fetchCommissionsByMonth(dateFrom, dateTo),
    staleTime: 60 * 1000,
  });

  return {
    commissionsByMonth,
    loading: isLoading,
    error,
    refetch,
  };
}
