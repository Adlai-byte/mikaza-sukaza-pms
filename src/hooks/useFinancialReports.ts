import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PropertyFinancialSummary, ExpenseByCategory, FinancialAuditLog } from '@/lib/schemas';

// Query keys
export const financialReportKeys = {
  all: ['financial-reports'] as const,
  ownerStatement: (propertyId: string, dateFrom?: string, dateTo?: string) =>
    [...financialReportKeys.all, 'owner-statement', propertyId, dateFrom, dateTo] as const,
  propertyOverview: (propertyId?: string, dateFrom?: string, dateTo?: string) =>
    [...financialReportKeys.all, 'property-overview', propertyId, dateFrom, dateTo] as const,
  auditLog: (filters?: AuditLogFilters) =>
    [...financialReportKeys.all, 'audit-log', filters] as const,
};

export interface AuditLogFilters {
  table_name?: string;
  record_id?: string;
  user_id?: string;
  action?: 'INSERT' | 'UPDATE' | 'DELETE';
  date_from?: string;
  date_to?: string;
}

export interface OwnerStatementData {
  property_id: string;
  property_name: string;
  period_start: string;
  period_end: string;
  revenue: {
    total: number;
    by_invoice: Array<{
      invoice_number: string;
      guest_name: string;
      issue_date: string;
      amount: number;
    }>;
  };
  expenses: {
    total: number;
    by_category: Array<{
      category: string;
      amount: number;
      count: number;
    }>;
    by_expense: Array<{
      date: string;
      vendor: string;
      category: string;
      description: string;
      amount: number;
    }>;
  };
  net_income: number;
}

// Fetch owner statement for a property
const fetchOwnerStatement = async (
  propertyId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<OwnerStatementData> => {
  // Default to current month if no dates provided
  const today = new Date();
  const periodStart = dateFrom || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const periodEnd = dateTo || new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  // Fetch property info
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('property_id, property_name')
    .eq('property_id', propertyId)
    .single();

  if (propertyError) throw propertyError;

  // Fetch invoices (revenue)
  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('invoice_number, guest_name, issue_date, total_amount, status')
    .eq('property_id', propertyId)
    .eq('status', 'paid')
    .gte('paid_date', periodStart)
    .lte('paid_date', periodEnd)
    .order('issue_date', { ascending: true });

  if (invoicesError) throw invoicesError;

  const revenueByInvoice = (invoices || []).map(inv => ({
    invoice_number: inv.invoice_number,
    guest_name: inv.guest_name,
    issue_date: inv.issue_date,
    amount: inv.total_amount,
  }));

  const totalRevenue = revenueByInvoice.reduce((sum, inv) => sum + inv.amount, 0);

  // Fetch expenses
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('expense_date, vendor_name, category, description, amount, tax_amount')
    .eq('property_id', propertyId)
    .gte('expense_date', periodStart)
    .lte('expense_date', periodEnd)
    .order('expense_date', { ascending: true });

  if (expensesError) throw expensesError;

  // Group expenses by category
  const expensesByCategory: Record<string, { amount: number; count: number }> = {};
  const expensesList = (expenses || []).map(exp => {
    const totalAmount = exp.amount + (exp.tax_amount || 0);

    if (!expensesByCategory[exp.category]) {
      expensesByCategory[exp.category] = { amount: 0, count: 0 };
    }
    expensesByCategory[exp.category].amount += totalAmount;
    expensesByCategory[exp.category].count += 1;

    return {
      date: exp.expense_date,
      vendor: exp.vendor_name || 'Unknown',
      category: exp.category,
      description: exp.description,
      amount: totalAmount,
    };
  });

  const expensesByCategoryArray = Object.entries(expensesByCategory).map(([category, data]) => ({
    category,
    amount: data.amount,
    count: data.count,
  }));

  const totalExpenses = expensesList.reduce((sum, exp) => sum + exp.amount, 0);

  return {
    property_id: propertyId,
    property_name: property.property_name || '',
    period_start: periodStart,
    period_end: periodEnd,
    revenue: {
      total: totalRevenue,
      by_invoice: revenueByInvoice,
    },
    expenses: {
      total: totalExpenses,
      by_category: expensesByCategoryArray,
      by_expense: expensesList,
    },
    net_income: totalRevenue - totalExpenses,
  };
};

// Fetch property financial overview (from view)
const fetchPropertyFinancialOverview = async (
  propertyId?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<PropertyFinancialSummary[]> => {
  let query = supabase
    .from('property_financial_overview')
    .select('*')
    .order('month', { ascending: false });

  if (propertyId) {
    query = query.eq('property_id', propertyId);
  }

  if (dateFrom) {
    query = query.gte('month', dateFrom);
  }

  if (dateTo) {
    query = query.lte('month', dateTo);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as PropertyFinancialSummary[];
};

// Fetch financial audit log
const fetchFinancialAuditLog = async (filters?: AuditLogFilters): Promise<FinancialAuditLog[]> => {
  let query = supabase
    .from('financial_audit_log')
    .select(`
      *,
      user:users(user_id, first_name, last_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (filters?.table_name) {
    query = query.eq('table_name', filters.table_name);
  }

  if (filters?.record_id) {
    query = query.eq('record_id', filters.record_id);
  }

  if (filters?.user_id) {
    query = query.eq('user_id', filters.user_id);
  }

  if (filters?.action) {
    query = query.eq('action', filters.action);
  }

  if (filters?.date_from) {
    query = query.gte('created_at', filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte('created_at', filters.date_to);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as FinancialAuditLog[];
};

// Fetch audit log for a specific record
const fetchRecordAuditLog = async (tableName: string, recordId: string): Promise<FinancialAuditLog[]> => {
  const { data, error } = await supabase
    .from('financial_audit_log')
    .select(`
      *,
      user:users(user_id, first_name, last_name, email)
    `)
    .eq('table_name', tableName)
    .eq('record_id', recordId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as FinancialAuditLog[];
};

// Hooks
export function useOwnerStatement(propertyId: string, dateFrom?: string, dateTo?: string) {
  const { data: statement, isLoading, error, refetch } = useQuery({
    queryKey: financialReportKeys.ownerStatement(propertyId, dateFrom, dateTo),
    queryFn: () => fetchOwnerStatement(propertyId, dateFrom, dateTo),
    enabled: !!propertyId,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    statement,
    loading: isLoading,
    error,
    refetch,
  };
}

export function usePropertyFinancialOverview(propertyId?: string, dateFrom?: string, dateTo?: string) {
  const { data: overview = [], isLoading, error, refetch } = useQuery({
    queryKey: financialReportKeys.propertyOverview(propertyId, dateFrom, dateTo),
    queryFn: () => fetchPropertyFinancialOverview(propertyId, dateFrom, dateTo),
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    overview,
    loading: isLoading,
    error,
    refetch,
  };
}

export function useFinancialAuditLog(filters?: AuditLogFilters) {
  const { data: auditLogs = [], isLoading, error, refetch } = useQuery({
    queryKey: financialReportKeys.auditLog(filters),
    queryFn: () => fetchFinancialAuditLog(filters),
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    auditLogs,
    loading: isLoading,
    error,
    refetch,
  };
}

export function useRecordAuditLog(tableName: string, recordId: string) {
  const { data: auditLogs = [], isLoading, error, refetch } = useQuery({
    queryKey: [...financialReportKeys.all, 'record-audit', tableName, recordId],
    queryFn: () => fetchRecordAuditLog(tableName, recordId),
    enabled: !!tableName && !!recordId,
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    auditLogs,
    loading: isLoading,
    error,
    refetch,
  };
}
