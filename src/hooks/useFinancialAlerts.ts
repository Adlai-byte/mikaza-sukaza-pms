import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addDays, differenceInDays, differenceInHours } from 'date-fns';

export interface InvoiceAlert {
  id: string;
  number: string;
  guest: string;
  amount: number;
  daysUntilDue: number;
}

export interface COIAlert {
  id: string;
  vendor: string;
  type: string;
  daysUntilExpiry: number;
}

export interface SLAAlert {
  id: string;
  job: string;
  property: string;
  hoursRemaining: number;
}

export interface FinancialAlerts {
  invoicesNearingDue: InvoiceAlert[];
  coisExpiring: COIAlert[];
  slasAtRisk: SLAAlert[];
  isLoading: boolean;
}

const fetchFinancialAlerts = async (): Promise<FinancialAlerts> => {
  const today = new Date();
  const in14Days = addDays(today, 14);
  const in30Days = addDays(today, 30);

  // Format dates for SQL
  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  // 1. Invoices Nearing Due - Due within next 14 days
  const { data: nearingDueInvoices } = await supabase
    .from('invoices')
    .select('invoice_id, invoice_number, guest_name, total_amount, amount_paid, due_date')
    .in('status', ['sent', 'draft'])
    .gte('due_date', formatDate(today))
    .lte('due_date', formatDate(in14Days))
    .order('due_date', { ascending: true })
    .limit(10);

  const invoicesNearingDue: InvoiceAlert[] = (nearingDueInvoices || []).map(invoice => {
    const daysUntilDue = invoice.due_date ? differenceInDays(new Date(invoice.due_date), today) : 0;
    const balance = (invoice.total_amount || 0) - (invoice.amount_paid || 0);

    return {
      id: invoice.invoice_id,
      number: invoice.invoice_number || 'N/A',
      guest: invoice.guest_name || 'Unknown',
      amount: balance,
      daysUntilDue: Math.max(0, daysUntilDue),
    };
  });

  // 2. COIs Expiring Soon - Expiring within next 30 days
  const { data: expiringCOIs } = await supabase
    .from('vendor_cois')
    .select(`
      coi_id,
      expiration_date,
      policy_type,
      vendor:service_providers(provider_id, provider_name)
    `)
    .gte('expiration_date', formatDate(today))
    .lte('expiration_date', formatDate(in30Days))
    .order('expiration_date', { ascending: true })
    .limit(10);

  const coisExpiring: COIAlert[] = (expiringCOIs || []).map((coi: any) => {
    const daysUntilExpiry = coi.expiration_date ? differenceInDays(new Date(coi.expiration_date), today) : 0;

    return {
      id: coi.coi_id,
      vendor: coi.vendor?.provider_name || 'Unknown Vendor',
      type: coi.policy_type || 'General Liability',
      daysUntilExpiry: Math.max(0, daysUntilExpiry),
    };
  });

  // 3. SLAs at Risk - Jobs approaching or past expected completion
  const { data: jobsAtRisk } = await supabase
    .from('jobs')
    .select(`
      job_id,
      job_title,
      expected_completion_date,
      status,
      property:properties(property_id, property_name)
    `)
    .in('status', ['pending', 'in_progress'])
    .not('expected_completion_date', 'is', null)
    .lte('expected_completion_date', formatDate(in14Days))
    .order('expected_completion_date', { ascending: true })
    .limit(10);

  const slasAtRisk: SLAAlert[] = (jobsAtRisk || []).map((job: any) => {
    const hoursRemaining = job.expected_completion_date
      ? differenceInHours(new Date(job.expected_completion_date), today)
      : 0;

    return {
      id: job.job_id,
      job: job.job_title || 'Untitled Job',
      property: job.property?.property_name || 'Unknown Property',
      hoursRemaining: Math.max(0, Math.round(hoursRemaining)),
    };
  });

  return {
    invoicesNearingDue,
    coisExpiring,
    slasAtRisk,
    isLoading: false,
  };
};

export function useFinancialAlerts() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['financial-alerts'],
    queryFn: fetchFinancialAlerts,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  return {
    ...data,
    isLoading,
    error,
  };
}
