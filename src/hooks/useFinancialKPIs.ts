import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, differenceInDays, subMonths, startOfDay } from 'date-fns';

export interface FinancialKPIs {
  monthRevenue: number;
  monthRevenueChange: number;
  arAging: {
    current: number;
    days30: number;
    days60: number;
    days90: number;
    total: number;
  };
  delinquencies: {
    count: number;
    amount: number;
  };
  commissionsDue: {
    count: number;
    amount: number;
  };
  monthCosts: number;
  monthCostsChange: number;
  marginPerJob: number;
  marginPerJobChange: number;
  isLoading: boolean;
}

const fetchFinancialKPIs = async (): Promise<FinancialKPIs> => {
  const today = new Date();
  const currentMonthStart = startOfMonth(today);
  const currentMonthEnd = endOfMonth(today);
  const lastMonthStart = startOfMonth(subMonths(today, 1));
  const lastMonthEnd = endOfMonth(subMonths(today, 1));

  // Format dates for SQL
  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  // 1. Month Revenue - Sum of paid invoices in current month
  const { data: currentMonthInvoices } = await supabase
    .from('invoices')
    .select('total_amount, amount_paid, paid_date')
    .eq('status', 'paid')
    .gte('paid_date', formatDate(currentMonthStart))
    .lte('paid_date', formatDate(currentMonthEnd));

  const monthRevenue = currentMonthInvoices?.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0) || 0;

  // Get last month revenue for comparison
  const { data: lastMonthInvoices } = await supabase
    .from('invoices')
    .select('total_amount, amount_paid, paid_date')
    .eq('status', 'paid')
    .gte('paid_date', formatDate(lastMonthStart))
    .lte('paid_date', formatDate(lastMonthEnd));

  const lastMonthRevenue = lastMonthInvoices?.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0) || 0;
  const monthRevenueChange = lastMonthRevenue > 0
    ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : 0;

  // 2. A/R Aging - Unpaid invoices grouped by age
  const { data: unpaidInvoices } = await supabase
    .from('invoices')
    .select('invoice_id, total_amount, amount_paid, due_date, status')
    .in('status', ['sent', 'overdue'])
    .order('due_date', { ascending: true });

  let arCurrent = 0;
  let arDays30 = 0;
  let arDays60 = 0;
  let arDays90 = 0;

  unpaidInvoices?.forEach(invoice => {
    const balance = (invoice.total_amount || 0) - (invoice.amount_paid || 0);
    const daysOverdue = invoice.due_date ? differenceInDays(today, new Date(invoice.due_date)) : 0;

    if (daysOverdue < 0) {
      arCurrent += balance; // Not yet due
    } else if (daysOverdue <= 30) {
      arDays30 += balance;
    } else if (daysOverdue <= 60) {
      arDays60 += balance;
    } else {
      arDays90 += balance;
    }
  });

  const arTotal = arCurrent + arDays30 + arDays60 + arDays90;

  // 3. Delinquencies - Invoices >60 days overdue
  const delinquentInvoices = unpaidInvoices?.filter(invoice => {
    if (!invoice.due_date) return false;
    const daysOverdue = differenceInDays(today, new Date(invoice.due_date));
    return daysOverdue > 60;
  }) || [];

  const delinquenciesAmount = delinquentInvoices.reduce(
    (sum, inv) => sum + ((inv.total_amount || 0) - (inv.amount_paid || 0)),
    0
  );

  // 4. Commissions Due - Pending commissions
  const { data: pendingCommissions } = await supabase
    .from('commissions')
    .select('commission_amount, status')
    .eq('status', 'pending');

  const commissionsDueAmount = pendingCommissions?.reduce(
    (sum, comm) => sum + (comm.commission_amount || 0),
    0
  ) || 0;

  // 5. Month Costs - Expenses in current month
  const { data: currentMonthExpenses } = await supabase
    .from('expenses')
    .select('amount, tax_amount, expense_date')
    .gte('expense_date', formatDate(currentMonthStart))
    .lte('expense_date', formatDate(currentMonthEnd));

  const monthCosts = currentMonthExpenses?.reduce(
    (sum, exp) => sum + (exp.amount || 0) + (exp.tax_amount || 0),
    0
  ) || 0;

  // Get last month costs for comparison
  const { data: lastMonthExpenses } = await supabase
    .from('expenses')
    .select('amount, tax_amount, expense_date')
    .gte('expense_date', formatDate(lastMonthStart))
    .lte('expense_date', formatDate(lastMonthEnd));

  const lastMonthCosts = lastMonthExpenses?.reduce(
    (sum, exp) => sum + (exp.amount || 0) + (exp.tax_amount || 0),
    0
  ) || 0;

  const monthCostsChange = lastMonthCosts > 0
    ? ((monthCosts - lastMonthCosts) / lastMonthCosts) * 100
    : 0;

  // 6. Margin Per Job - Calculate from paid invoices and related expenses
  // This is a simplified calculation: (Total Revenue - Total Costs) / Number of Jobs
  const { data: paidInvoicesCount } = await supabase
    .from('invoices')
    .select('invoice_id', { count: 'exact', head: true })
    .eq('status', 'paid')
    .gte('paid_date', formatDate(currentMonthStart))
    .lte('paid_date', formatDate(currentMonthEnd));

  const jobCount = paidInvoicesCount?.length || currentMonthInvoices?.length || 1;
  const marginPerJob = jobCount > 0 && monthRevenue > 0
    ? ((monthRevenue - monthCosts) / monthRevenue) * 100
    : 0;

  // Calculate last month margin
  const lastJobCount = lastMonthInvoices?.length || 1;
  const lastMarginPerJob = lastJobCount > 0 && lastMonthRevenue > 0
    ? ((lastMonthRevenue - lastMonthCosts) / lastMonthRevenue) * 100
    : 0;

  const marginPerJobChange = lastMarginPerJob > 0
    ? marginPerJob - lastMarginPerJob
    : 0;

  return {
    monthRevenue,
    monthRevenueChange,
    arAging: {
      current: arCurrent,
      days30: arDays30,
      days60: arDays60,
      days90: arDays90,
      total: arTotal,
    },
    delinquencies: {
      count: delinquentInvoices.length,
      amount: delinquenciesAmount,
    },
    commissionsDue: {
      count: pendingCommissions?.length || 0,
      amount: commissionsDueAmount,
    },
    monthCosts,
    monthCostsChange,
    marginPerJob,
    marginPerJobChange,
    isLoading: false,
  };
};

export function useFinancialKPIs() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['financial-kpis'],
    queryFn: fetchFinancialKPIs,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  return {
    ...data,
    isLoading,
    error,
  };
}
