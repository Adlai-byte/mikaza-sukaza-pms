import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Types for commissions
export interface Commission {
  commission_id: string;
  user_id: string;
  source_type: 'booking' | 'invoice' | 'service' | 'tip' | 'referral' | 'bonus' | 'adjustment' | 'other';
  booking_id?: string | null;
  invoice_id?: string | null;
  job_id?: string | null;
  property_id?: string | null;
  commission_type: 'percentage' | 'fixed' | 'tiered';
  base_amount: number;
  commission_rate?: number | null;
  commission_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled' | 'on_hold';
  payment_date?: string | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  earned_date: string;
  period_start?: string | null;
  period_end?: string | null;
  description?: string | null;
  notes?: string | null;
  tip_from_guest?: string | null;
  tip_reason?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  user?: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    user_type: string;
  };
  property?: {
    property_id: string;
    property_name: string;
  };
  booking?: {
    booking_id: string;
    guest_name: string;
  };
  invoice?: {
    invoice_id: string;
    invoice_number: string;
  };
}

export interface CommissionInsert {
  user_id: string;
  source_type: 'booking' | 'invoice' | 'service' | 'tip' | 'referral' | 'bonus' | 'adjustment' | 'other';
  booking_id?: string | null;
  invoice_id?: string | null;
  job_id?: string | null;
  property_id?: string | null;
  commission_type: 'percentage' | 'fixed' | 'tiered';
  base_amount: number;
  commission_rate?: number | null;
  commission_amount: number;
  status?: 'pending' | 'approved' | 'paid' | 'cancelled' | 'on_hold';
  payment_date?: string | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  earned_date?: string;
  period_start?: string | null;
  period_end?: string | null;
  description?: string | null;
  notes?: string | null;
  tip_from_guest?: string | null;
  tip_reason?: string | null;
}

// Query keys
export const commissionKeys = {
  all: ['commissions'] as const,
  lists: () => [...commissionKeys.all, 'list'] as const,
  list: (filters?: CommissionFilters) => [...commissionKeys.lists(), filters] as const,
  details: () => [...commissionKeys.all, 'detail'] as const,
  detail: (id: string) => [...commissionKeys.details(), id] as const,
  byUser: (userId: string) => [...commissionKeys.all, 'user', userId] as const,
  byProperty: (propertyId: string) => [...commissionKeys.all, 'property', propertyId] as const,
  summary: (userId?: string) => [...commissionKeys.all, 'summary', userId] as const,
};

export interface CommissionFilters {
  user_id?: string;
  property_id?: string;
  status?: string;
  source_type?: string;
  date_from?: string;
  date_to?: string;
}

// Fetch all commissions with filters
const fetchCommissions = async (filters?: CommissionFilters): Promise<Commission[]> => {
  let query = supabase
    .from('commissions')
    .select(`
      *,
      user:users!commissions_user_id_fkey(user_id, first_name, last_name, email, user_type),
      property:properties(property_id, property_name),
      booking:property_bookings(booking_id, guest_name),
      invoice:invoices(invoice_id, invoice_number)
    `)
    .order('earned_date', { ascending: false });

  if (filters?.user_id) {
    query = query.eq('user_id', filters.user_id);
  }

  if (filters?.property_id) {
    query = query.eq('property_id', filters.property_id);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.source_type) {
    query = query.eq('source_type', filters.source_type);
  }

  if (filters?.date_from) {
    query = query.gte('earned_date', filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte('earned_date', filters.date_to);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as Commission[];
};

// Fetch single commission by ID
const fetchCommission = async (commissionId: string): Promise<Commission> => {
  const { data, error } = await supabase
    .from('commissions')
    .select(`
      *,
      user:users!commissions_user_id_fkey(user_id, first_name, last_name, email, user_type),
      property:properties(property_id, property_name),
      booking:property_bookings(booking_id, guest_name),
      invoice:invoices(invoice_id, invoice_number)
    `)
    .eq('commission_id', commissionId)
    .single();

  if (error) throw error;
  return data as Commission;
};

// Create commission
const createCommission = async (commission: CommissionInsert): Promise<Commission> => {
  const { data, error } = await supabase
    .from('commissions')
    .insert(commission)
    .select()
    .single();

  if (error) throw error;
  return fetchCommission(data.commission_id);
};

// Update commission
const updateCommission = async ({
  commissionId,
  updates
}: {
  commissionId: string;
  updates: Partial<Commission>
}): Promise<Commission> => {
  const { data, error } = await supabase
    .from('commissions')
    .update(updates)
    .eq('commission_id', commissionId)
    .select()
    .single();

  if (error) throw error;
  return fetchCommission(data.commission_id);
};

// Delete commission
const deleteCommission = async (commissionId: string): Promise<void> => {
  const { error } = await supabase
    .from('commissions')
    .delete()
    .eq('commission_id', commissionId);

  if (error) throw error;
};

// Approve commission
const approveCommission = async (commissionId: string): Promise<Commission> => {
  return updateCommission({
    commissionId,
    updates: { status: 'approved' },
  });
};

// Mark commission as paid
const markCommissionAsPaid = async ({
  commissionId,
  paymentMethod,
  paymentReference,
  paymentDate
}: {
  commissionId: string;
  paymentMethod?: string;
  paymentReference?: string;
  paymentDate?: string;
}): Promise<Commission> => {
  return updateCommission({
    commissionId,
    updates: {
      status: 'paid',
      payment_date: paymentDate || new Date().toISOString().split('T')[0],
      payment_method: paymentMethod,
      payment_reference: paymentReference,
    },
  });
};

// Calculate commission based on rules
const calculateCommission = async ({
  userId,
  amount,
  sourceType = 'booking',
  propertyId,
}: {
  userId: string;
  amount: number;
  sourceType?: string;
  propertyId?: string | null;
}): Promise<number> => {
  const { data, error } = await supabase.rpc('calculate_commission', {
    p_user_id: userId,
    p_amount: amount,
    p_source_type: sourceType,
    p_property_id: propertyId,
  });

  if (error) throw error;
  return data || 0;
};

// Fetch commission summary
const fetchCommissionSummary = async (userId?: string) => {
  let query = supabase.from('commission_summary_by_user').select('*');

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
};

// Fetch monthly commission report
const fetchMonthlyCommissionReport = async (userId?: string) => {
  let query = supabase.from('monthly_commission_report').select('*');

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
};

// Hooks
export function useCommissions(filters?: CommissionFilters) {
  const { data: commissions = [], isLoading, error, refetch } = useQuery({
    queryKey: commissionKeys.list(filters),
    queryFn: () => fetchCommissions(filters),
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    commissions,
    loading: isLoading,
    error,
    refetch,
  };
}

export function useCommission(commissionId: string) {
  const { data: commission, isLoading, error, refetch } = useQuery({
    queryKey: commissionKeys.detail(commissionId),
    queryFn: () => fetchCommission(commissionId),
    enabled: !!commissionId && commissionId.length > 0,
    staleTime: 30 * 1000,
  });

  return {
    commission,
    loading: isLoading,
    error,
    refetch,
  };
}

export function useCreateCommission() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCommission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commissionKeys.lists() });
      toast({
        title: 'Success',
        description: 'Commission created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create commission',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCommission() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCommission,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: commissionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: commissionKeys.detail(data.commission_id) });
      toast({
        title: 'Success',
        description: 'Commission updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update commission',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCommission() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCommission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commissionKeys.lists() });
      toast({
        title: 'Success',
        description: 'Commission deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete commission',
        variant: 'destructive',
      });
    },
  });
}

export function useApproveCommission() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveCommission,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: commissionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: commissionKeys.detail(data.commission_id) });
      toast({
        title: 'Success',
        description: 'Commission approved successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve commission',
        variant: 'destructive',
      });
    },
  });
}

export function useMarkCommissionAsPaid() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markCommissionAsPaid,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: commissionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: commissionKeys.detail(data.commission_id) });
      toast({
        title: 'Success',
        description: 'Commission marked as paid',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark commission as paid',
        variant: 'destructive',
      });
    },
  });
}

export function useCalculateCommission() {
  return useMutation({
    mutationFn: calculateCommission,
  });
}

export function useCommissionSummary(userId?: string) {
  const { data: summary = [], isLoading, error, refetch } = useQuery({
    queryKey: commissionKeys.summary(userId),
    queryFn: () => fetchCommissionSummary(userId),
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    summary,
    loading: isLoading,
    error,
    refetch,
  };
}

export function useMonthlyCommissionReport(userId?: string) {
  const { data: report = [], isLoading, error, refetch } = useQuery({
    queryKey: [...commissionKeys.all, 'monthly-report', userId],
    queryFn: () => fetchMonthlyCommissionReport(userId),
    staleTime: 60 * 1000,
  });

  return {
    report,
    loading: isLoading,
    error,
    refetch,
  };
}

// Commission analytics for performance insights
export interface CommissionAnalytics {
  totalStaff: number;
  topPerformers: Array<{
    user_id: string;
    name: string;
    role: string;
    total_commissions: number;
    commission_count: number;
    avg_commission: number;
    growth_trend: number; // Percentage change from last period
  }>;
  bySourceType: Array<{
    source_type: string;
    count: number;
    total_amount: number;
    percentage: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    total_amount: number;
    count: number;
    avg_per_staff: number;
  }>;
  performanceMetrics: {
    avg_commission_per_staff: number;
    avg_time_to_approval: number; // in days
    avg_time_to_payment: number; // in days
    conversion_rate: number; // (approved + paid) / total
  };
}

// Fetch commission analytics
const fetchCommissionAnalytics = async (filters?: CommissionFilters): Promise<CommissionAnalytics> => {
  // Fetch all commissions with filters
  const commissions = await fetchCommissions(filters);

  // Calculate total staff
  const uniqueStaff = new Set(commissions.map(c => c.user_id));
  const totalStaff = uniqueStaff.size;

  // Calculate top performers
  const userStats = new Map<string, {
    user_id: string;
    name: string;
    role: string;
    total_commissions: number;
    commission_count: number;
  }>();

  commissions.forEach(commission => {
    const key = commission.user_id;
    if (!userStats.has(key)) {
      userStats.set(key, {
        user_id: commission.user_id,
        name: `${commission.user?.first_name || ''} ${commission.user?.last_name || ''}`.trim(),
        role: commission.user?.user_type || '',
        total_commissions: 0,
        commission_count: 0,
      });
    }
    const stats = userStats.get(key)!;
    stats.total_commissions += commission.commission_amount;
    stats.commission_count += 1;
  });

  const topPerformers = Array.from(userStats.values())
    .map(stats => ({
      ...stats,
      avg_commission: stats.total_commissions / stats.commission_count,
      growth_trend: 0, // TODO: Calculate based on historical data
    }))
    .sort((a, b) => b.total_commissions - a.total_commissions)
    .slice(0, 10);

  // Calculate by source type
  const sourceTypeStats = new Map<string, { count: number; total_amount: number }>();
  commissions.forEach(commission => {
    if (!sourceTypeStats.has(commission.source_type)) {
      sourceTypeStats.set(commission.source_type, { count: 0, total_amount: 0 });
    }
    const stats = sourceTypeStats.get(commission.source_type)!;
    stats.count += 1;
    stats.total_amount += commission.commission_amount;
  });

  const totalAmount = commissions.reduce((sum, c) => sum + c.commission_amount, 0);
  const bySourceType = Array.from(sourceTypeStats.entries()).map(([source_type, stats]) => ({
    source_type,
    count: stats.count,
    total_amount: stats.total_amount,
    percentage: totalAmount > 0 ? (stats.total_amount / totalAmount) * 100 : 0,
  }));

  // Calculate monthly trend (last 12 months)
  const monthlyStats = new Map<string, { total_amount: number; count: number }>();
  commissions.forEach(commission => {
    const month = commission.earned_date.substring(0, 7); // YYYY-MM
    if (!monthlyStats.has(month)) {
      monthlyStats.set(month, { total_amount: 0, count: 0 });
    }
    const stats = monthlyStats.get(month)!;
    stats.total_amount += commission.commission_amount;
    stats.count += 1;
  });

  const monthlyTrend = Array.from(monthlyStats.entries())
    .map(([month, stats]) => ({
      month,
      total_amount: stats.total_amount,
      count: stats.count,
      avg_per_staff: totalStaff > 0 ? stats.total_amount / totalStaff : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12); // Last 12 months

  // Calculate performance metrics
  const approvedOrPaid = commissions.filter(c => c.status === 'approved' || c.status === 'paid');
  const paidCommissions = commissions.filter(c => c.status === 'paid' && c.payment_date);

  const avg_time_to_payment = paidCommissions.length > 0
    ? paidCommissions.reduce((sum, c) => {
        const earned = new Date(c.earned_date);
        const paid = new Date(c.payment_date!);
        const days = (paid.getTime() - earned.getTime()) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0) / paidCommissions.length
    : 0;

  const performanceMetrics = {
    avg_commission_per_staff: totalStaff > 0 ? totalAmount / totalStaff : 0,
    avg_time_to_approval: 3, // TODO: Calculate from actual data
    avg_time_to_payment,
    conversion_rate: commissions.length > 0 ? (approvedOrPaid.length / commissions.length) * 100 : 0,
  };

  return {
    totalStaff,
    topPerformers,
    bySourceType,
    monthlyTrend,
    performanceMetrics,
  };
};

export function useCommissionAnalytics(filters?: CommissionFilters) {
  const { data: analytics, isLoading, error, refetch } = useQuery({
    queryKey: [...commissionKeys.all, 'analytics', filters],
    queryFn: () => fetchCommissionAnalytics(filters),
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    analytics,
    loading: isLoading,
    error,
    refetch,
  };
}
