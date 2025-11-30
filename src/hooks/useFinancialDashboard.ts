import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Utility: Get default date range (last 12 months)
const getDefaultDateRange = (): { periodStart: string; periodEnd: string } => {
  const today = new Date();
  const periodStart = new Date(today.getFullYear() - 1, today.getMonth(), 1).toISOString().split('T')[0];
  const periodEnd = today.toISOString().split('T')[0];
  return { periodStart, periodEnd };
};

// Query keys
export const financialDashboardKeys = {
  all: ['financial-dashboard'] as const,
  summary: (dateFrom?: string, dateTo?: string) =>
    [...financialDashboardKeys.all, 'summary', dateFrom, dateTo] as const,
  revenueByProperty: (dateFrom?: string, dateTo?: string) =>
    [...financialDashboardKeys.all, 'revenue-by-property', dateFrom, dateTo] as const,
  expensesByCategory: (dateFrom?: string, dateTo?: string) =>
    [...financialDashboardKeys.all, 'expenses-by-category', dateFrom, dateTo] as const,
  revenueOverTime: (dateFrom?: string, dateTo?: string) =>
    [...financialDashboardKeys.all, 'revenue-over-time', dateFrom, dateTo] as const,
  expensesOverTime: (dateFrom?: string, dateTo?: string) =>
    [...financialDashboardKeys.all, 'expenses-over-time', dateFrom, dateTo] as const,
};

// Dashboard Summary Data
export interface DashboardSummary {
  total_revenue: number;
  total_expenses: number;
  net_income: number;
  total_invoices: number;
  paid_invoices: number;
  pending_invoices: number;
  overdue_invoices: number;
  total_properties: number;
  active_bookings: number;
}

// Revenue by Property
export interface RevenueByProperty {
  property_id: string;
  property_name: string;
  revenue: number;
  invoice_count: number;
  occupancy_days: number;
}

// Expenses by Category
export interface ExpensesByCategory {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

// Revenue/Expense Over Time
export interface FinancialOverTime {
  month: string;
  revenue: number;
  expenses: number;
  net_income: number;
}

// Fetch dashboard summary
const fetchDashboardSummary = async (
  dateFrom?: string,
  dateTo?: string
): Promise<DashboardSummary> => {
  // Use centralized date utility
  const defaults = getDefaultDateRange();
  const periodStart = dateFrom || defaults.periodStart;
  const periodEnd = dateTo || defaults.periodEnd;

  // Fetch revenue data (paid invoices)
  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('total_amount, status, paid_date')
    .gte('issue_date', periodStart)
    .lte('issue_date', periodEnd);

  if (invoicesError) {
    console.error('[Financial Dashboard] Error fetching invoices:', invoicesError);
    throw invoicesError;
  }

  const paidInvoices = invoices?.filter(inv => inv.status === 'paid' && inv.total_amount != null) || [];
  const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  // Fetch expenses
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('amount, tax_amount')
    .gte('expense_date', periodStart)
    .lte('expense_date', periodEnd);

  if (expensesError) {
    console.error('[Financial Dashboard] Error fetching expenses:', expensesError);
    throw expensesError;
  }

  const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0) + (exp.tax_amount || 0), 0) || 0;

  // Invoice status counts
  const invoicesByStatus = {
    paid: invoices?.filter(inv => inv.status === 'paid').length || 0,
    pending: invoices?.filter(inv => inv.status === 'draft' || inv.status === 'sent').length || 0,
    overdue: invoices?.filter(inv => inv.status === 'overdue').length || 0,
  };

  // Fetch property count
  const { count: propertyCount } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  // Fetch active bookings (current and future)
  const { count: activeBookingsCount } = await supabase
    .from('property_bookings')
    .select('*', { count: 'exact', head: true })
    .gte('check_out_date', new Date().toISOString().split('T')[0]);

  return {
    total_revenue: totalRevenue,
    total_expenses: totalExpenses,
    net_income: totalRevenue - totalExpenses,
    total_invoices: invoices?.length || 0,
    paid_invoices: invoicesByStatus.paid,
    pending_invoices: invoicesByStatus.pending,
    overdue_invoices: invoicesByStatus.overdue,
    total_properties: propertyCount || 0,
    active_bookings: activeBookingsCount || 0,
  };
};

// Fetch revenue by property
const fetchRevenueByProperty = async (
  dateFrom?: string,
  dateTo?: string
): Promise<RevenueByProperty[]> => {
  // Use centralized date utility
  const defaults = getDefaultDateRange();
  const periodStart = dateFrom || defaults.periodStart;
  const periodEnd = dateTo || defaults.periodEnd;

  // Fetch invoices with property info - Fixed: Added null check for paid_date
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`
      total_amount,
      status,
      paid_date,
      property:properties(property_id, property_name)
    `)
    .eq('status', 'paid')
    .not('paid_date', 'is', null)
    .gte('paid_date', periodStart)
    .lte('paid_date', periodEnd);

  if (error) {
    console.error('[Financial Dashboard] Error fetching revenue by property:', error);
    throw error;
  }

  // Group by property
  const propertyMap = new Map<string, { property_name: string; revenue: number; count: number; property_ids: Set<string> }>();

  invoices?.forEach((invoice: { total_amount: number; property?: { property_id: string; property_name: string } }) => {
    if (!invoice.property) return;

    const propertyId = invoice.property.property_id;
    const existing = propertyMap.get(propertyId) || {
      property_name: invoice.property.property_name,
      revenue: 0,
      count: 0,
      property_ids: new Set<string>(),
    };

    existing.property_ids.add(propertyId);

    propertyMap.set(propertyId, {
      property_name: existing.property_name,
      revenue: existing.revenue + invoice.total_amount,
      count: existing.count + 1,
      property_ids: existing.property_ids,
    });
  });

  // Optimize: Fetch all bookings for all properties in one query (fix N+1 problem)
  const propertyIds = Array.from(propertyMap.keys());

  if (propertyIds.length === 0) {
    return [];
  }

  const { data: allBookings } = await supabase
    .from('property_bookings')
    .select('property_id, check_in_date, check_out_date')
    .in('property_id', propertyIds)
    .gte('check_out_date', periodStart)
    .lte('check_in_date', periodEnd);

  // Group bookings by property
  const bookingsByProperty = new Map<string, Array<{ check_in_date: string; check_out_date: string }>>();
  allBookings?.forEach((booking) => {
    if (!bookingsByProperty.has(booking.property_id)) {
      bookingsByProperty.set(booking.property_id, []);
    }
    bookingsByProperty.get(booking.property_id)!.push({
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
    });
  });

  // Convert to array and add occupancy data
  const results = Array.from(propertyMap.entries()).map(([propertyId, data]) => {
    const bookings = bookingsByProperty.get(propertyId) || [];
    const occupancyDays = bookings.reduce((sum, booking) => {
      const checkIn = new Date(booking.check_in_date);
      const checkOut = new Date(booking.check_out_date);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      return sum + nights;
    }, 0);

    return {
      property_id: propertyId,
      property_name: data.property_name,
      revenue: data.revenue,
      invoice_count: data.count,
      occupancy_days: occupancyDays,
    };
  });

  return results.sort((a, b) => b.revenue - a.revenue);
};

// Fetch expenses by category
const fetchExpensesByCategory = async (
  dateFrom?: string,
  dateTo?: string
): Promise<ExpensesByCategory[]> => {
  // Use centralized date utility
  const defaults = getDefaultDateRange();
  const periodStart = dateFrom || defaults.periodStart;
  const periodEnd = dateTo || defaults.periodEnd;

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('category, amount, tax_amount')
    .gte('expense_date', periodStart)
    .lte('expense_date', periodEnd);

  if (error) {
    console.error('[Financial Dashboard] Error fetching expenses by category:', error);
    throw error;
  }

  // Group by category
  const categoryMap = new Map<string, { amount: number; count: number }>();
  let totalExpenses = 0;

  expenses?.forEach((expense) => {
    const totalAmount = expense.amount + (expense.tax_amount || 0);
    totalExpenses += totalAmount;

    const existing = categoryMap.get(expense.category) || { amount: 0, count: 0 };
    categoryMap.set(expense.category, {
      amount: existing.amount + totalAmount,
      count: existing.count + 1,
    });
  });

  // Convert to array with percentages
  const results = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    amount: data.amount,
    count: data.count,
    percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
  }));

  return results.sort((a, b) => b.amount - a.amount);
};

// Fetch revenue/expenses over time (monthly)
const fetchFinancialOverTime = async (
  dateFrom?: string,
  dateTo?: string
): Promise<FinancialOverTime[]> => {
  // Use centralized date utility
  const defaults = getDefaultDateRange();
  const periodStart = dateFrom || defaults.periodStart;
  const periodEnd = dateTo || defaults.periodEnd;

  // Fetch invoices
  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('total_amount, paid_date, status')
    .eq('status', 'paid')
    .not('paid_date', 'is', null)
    .gte('paid_date', periodStart)
    .lte('paid_date', periodEnd);

  if (invoicesError) {
    console.error('[Financial Dashboard] Error fetching financial over time (invoices):', invoicesError);
    throw invoicesError;
  }

  // Fetch expenses
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('amount, tax_amount, expense_date')
    .gte('expense_date', periodStart)
    .lte('expense_date', periodEnd);

  if (expensesError) {
    console.error('[Financial Dashboard] Error fetching financial over time (expenses):', expensesError);
    throw expensesError;
  }

  // Group by month
  const monthMap = new Map<string, { revenue: number; expenses: number }>();

  // Process invoices
  invoices?.forEach((invoice) => {
    if (!invoice.paid_date) return;
    const month = invoice.paid_date.substring(0, 7); // YYYY-MM
    const existing = monthMap.get(month) || { revenue: 0, expenses: 0 };
    monthMap.set(month, {
      revenue: existing.revenue + invoice.total_amount,
      expenses: existing.expenses,
    });
  });

  // Process expenses
  expenses?.forEach((expense) => {
    const month = expense.expense_date.substring(0, 7); // YYYY-MM
    const totalAmount = expense.amount + (expense.tax_amount || 0);
    const existing = monthMap.get(month) || { revenue: 0, expenses: 0 };
    monthMap.set(month, {
      revenue: existing.revenue,
      expenses: existing.expenses + totalAmount,
    });
  });

  // Convert to array and sort by month
  const results = Array.from(monthMap.entries()).map(([month, data]) => ({
    month,
    revenue: data.revenue,
    expenses: data.expenses,
    net_income: data.revenue - data.expenses,
  }));

  return results.sort((a, b) => a.month.localeCompare(b.month));
};

// Hooks
export function useDashboardSummary(dateFrom?: string, dateTo?: string) {
  const { data: summary, isLoading, error, refetch } = useQuery({
    queryKey: financialDashboardKeys.summary(dateFrom, dateTo),
    queryFn: () => fetchDashboardSummary(dateFrom, dateTo),
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    summary,
    loading: isLoading,
    error,
    refetch,
  };
}

export function useRevenueByProperty(dateFrom?: string, dateTo?: string) {
  const { data: revenueByProperty = [], isLoading, error, refetch } = useQuery({
    queryKey: financialDashboardKeys.revenueByProperty(dateFrom, dateTo),
    queryFn: () => fetchRevenueByProperty(dateFrom, dateTo),
    staleTime: 60 * 1000,
  });

  return {
    revenueByProperty,
    loading: isLoading,
    error,
    refetch,
  };
}

export function useExpensesByCategory(dateFrom?: string, dateTo?: string) {
  const { data: expensesByCategory = [], isLoading, error, refetch } = useQuery({
    queryKey: financialDashboardKeys.expensesByCategory(dateFrom, dateTo),
    queryFn: () => fetchExpensesByCategory(dateFrom, dateTo),
    staleTime: 60 * 1000,
  });

  return {
    expensesByCategory,
    loading: isLoading,
    error,
    refetch,
  };
}

export function useFinancialOverTime(dateFrom?: string, dateTo?: string) {
  const { data: financialOverTime = [], isLoading, error, refetch } = useQuery({
    queryKey: financialDashboardKeys.revenueOverTime(dateFrom, dateTo),
    queryFn: () => fetchFinancialOverTime(dateFrom, dateTo),
    staleTime: 60 * 1000,
  });

  return {
    financialOverTime,
    loading: isLoading,
    error,
    refetch,
  };
}
