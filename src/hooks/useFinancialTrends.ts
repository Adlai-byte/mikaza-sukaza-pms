import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface MonthlyTrend {
  month: string;
  revenue: number;
  costs: number;
  margin: number;
}

export interface FinancialTrends {
  monthlyData: MonthlyTrend[];
  isLoading: boolean;
}

const fetchFinancialTrends = async (): Promise<FinancialTrends> => {
  const today = new Date();
  const monthlyData: MonthlyTrend[] = [];

  // Format dates for SQL
  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  // Fetch data for the last 6 months
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(today, i);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const monthLabel = format(monthDate, 'MMM yyyy');

    // Get revenue for this month
    const { data: monthInvoices } = await supabase
      .from('invoices')
      .select('amount_paid')
      .eq('status', 'paid')
      .gte('paid_date', formatDate(monthStart))
      .lte('paid_date', formatDate(monthEnd));

    const revenue = monthInvoices?.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0) || 0;

    // Get costs for this month
    const { data: monthExpenses } = await supabase
      .from('expenses')
      .select('amount, tax_amount')
      .gte('expense_date', formatDate(monthStart))
      .lte('expense_date', formatDate(monthEnd));

    const costs = monthExpenses?.reduce(
      (sum, exp) => sum + (exp.amount || 0) + (exp.tax_amount || 0),
      0
    ) || 0;

    // Calculate margin percentage
    const margin = revenue > 0 ? ((revenue - costs) / revenue) * 100 : 0;

    monthlyData.push({
      month: monthLabel,
      revenue,
      costs,
      margin,
    });
  }

  return {
    monthlyData,
    isLoading: false,
  };
};

export function useFinancialTrends() {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['financial-trends'],
    queryFn: fetchFinancialTrends,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  return {
    ...data,
    isLoading,
    isFetching,
    error,
    refetch,
  };
}
