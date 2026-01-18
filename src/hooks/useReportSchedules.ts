import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

// Types
export type ScheduleFrequency = 'weekly' | 'monthly' | 'annual';

export interface ReportSchedule {
  schedule_id: string;
  schedule_name: string;
  report_type: ReportType;
  schedule_frequency: ScheduleFrequency;
  day_of_week: number | null; // 0=Sunday, 5=Friday, 6=Saturday (for weekly)
  day_of_month: number | null; // 1-31 (for monthly/annual)
  month_of_year: number | null; // 1-12 (for annual)
  hour_of_day: number; // 0-23
  minute_of_hour: number; // 0-59
  timezone: string;
  recipient_emails: string[];
  date_range_start: string | null; // ISO date
  date_range_end: string | null; // ISO date
  report_filters: Record<string, unknown>;
  is_enabled: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  last_sent_at: string | null;
  next_run_at: string | null;
  // Joined data
  creator?: {
    user_id: string;
    first_name: string;
    last_name: string;
  };
}

export interface ReportScheduleInsert {
  schedule_name: string;
  report_type: ReportType;
  schedule_frequency?: ScheduleFrequency;
  day_of_week?: number | null;
  day_of_month?: number | null;
  month_of_year?: number | null;
  hour_of_day: number;
  minute_of_hour?: number;
  timezone?: string;
  recipient_emails: string[];
  date_range_start?: string | null;
  date_range_end?: string | null;
  report_filters?: Record<string, unknown>;
  is_enabled?: boolean;
}

export const SCHEDULE_FREQUENCIES: Record<ScheduleFrequency, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  annual: 'Annual',
};

export interface ReportEmailHistory {
  history_id: string;
  schedule_id: string;
  sent_at: string;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  recipient_emails: string[];
  email_provider_id: string | null;
  error_message: string | null;
  report_row_count: number | null;
  report_generation_time_ms: number | null;
}

export type ReportType =
  | 'current_balance'
  | 'financial_entries'
  | 'active_clients'
  | 'inactive_clients'
  | 'bookings_enhanced'
  | 'rental_revenue';

export const REPORT_TYPES: Record<ReportType, string> = {
  current_balance: 'Current Balance Report',
  financial_entries: 'Financial Entries Report',
  active_clients: 'Active Clients Report',
  inactive_clients: 'Inactive Clients Report',
  bookings_enhanced: 'Enhanced Bookings Report',
  rental_revenue: 'Rental Revenue Report',
};

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

// Query keys
export const reportScheduleKeys = {
  all: ['report-schedules'] as const,
  lists: () => [...reportScheduleKeys.all, 'list'] as const,
  list: (filters?: ScheduleFilters) => [...reportScheduleKeys.lists(), { filters }] as const,
  details: () => [...reportScheduleKeys.all, 'detail'] as const,
  detail: (id: string) => [...reportScheduleKeys.details(), id] as const,
  history: (scheduleId: string) => [...reportScheduleKeys.all, 'history', scheduleId] as const,
};

export interface ScheduleFilters {
  is_enabled?: boolean;
  report_type?: ReportType;
  search?: string;
}

// Fetch schedules
const fetchSchedules = async (filters?: ScheduleFilters): Promise<ReportSchedule[]> => {
  let query = supabase
    .from('report_email_schedules')
    .select(`
      *,
      creator:users!report_email_schedules_created_by_fkey(user_id, first_name, last_name)
    `)
    .order('created_at', { ascending: false });

  if (filters?.is_enabled !== undefined) {
    query = query.eq('is_enabled', filters.is_enabled);
  }

  if (filters?.report_type) {
    query = query.eq('report_type', filters.report_type);
  }

  if (filters?.search) {
    query = query.ilike('schedule_name', `%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as ReportSchedule[];
};

// Fetch single schedule
const fetchSchedule = async (scheduleId: string): Promise<ReportSchedule> => {
  const { data, error } = await supabase
    .from('report_email_schedules')
    .select(`
      *,
      creator:users!report_email_schedules_created_by_fkey(user_id, first_name, last_name)
    `)
    .eq('schedule_id', scheduleId)
    .single();

  if (error) throw error;
  return data as ReportSchedule;
};

// Fetch history for a schedule
const fetchHistory = async (scheduleId: string): Promise<ReportEmailHistory[]> => {
  const { data, error } = await supabase
    .from('report_email_history')
    .select('*')
    .eq('schedule_id', scheduleId)
    .order('sent_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data || []) as ReportEmailHistory[];
};

// Create schedule
const createSchedule = async (
  scheduleData: ReportScheduleInsert,
  userId: string
): Promise<ReportSchedule> => {
  const { data, error } = await supabase
    .from('report_email_schedules')
    .insert([{
      ...scheduleData,
      created_by: userId,
    }])
    .select()
    .single();

  if (error) throw error;
  return data as ReportSchedule;
};

// Update schedule
const updateSchedule = async ({
  scheduleId,
  updates,
  userId,
}: {
  scheduleId: string;
  updates: Partial<ReportScheduleInsert>;
  userId: string;
}): Promise<ReportSchedule> => {
  const { data, error } = await supabase
    .from('report_email_schedules')
    .update({
      ...updates,
      updated_by: userId,
    })
    .eq('schedule_id', scheduleId)
    .select()
    .single();

  if (error) throw error;
  return data as ReportSchedule;
};

// Delete schedule
const deleteSchedule = async (scheduleId: string): Promise<void> => {
  const { error } = await supabase
    .from('report_email_schedules')
    .delete()
    .eq('schedule_id', scheduleId);

  if (error) throw error;
};

// Toggle schedule enabled/disabled
const toggleSchedule = async ({
  scheduleId,
  isEnabled,
  userId,
}: {
  scheduleId: string;
  isEnabled: boolean;
  userId: string;
}): Promise<ReportSchedule> => {
  const { data, error } = await supabase
    .from('report_email_schedules')
    .update({
      is_enabled: isEnabled,
      updated_by: userId,
    })
    .eq('schedule_id', scheduleId)
    .select()
    .single();

  if (error) throw error;
  return data as ReportSchedule;
};

// Send report now (manual trigger)
const sendReportNow = async (scheduleId: string): Promise<{ success: boolean; message: string }> => {
  const { data, error } = await supabase.functions.invoke('send-scheduled-report', {
    body: { scheduleId },
  });

  if (error) throw error;
  return data;
};

// ==================== HOOKS ====================

/**
 * Hook to fetch all report schedules
 */
export function useReportSchedules(filters?: ScheduleFilters) {
  const { toast } = useToast();

  const query = useQuery({
    queryKey: reportScheduleKeys.list(filters),
    queryFn: () => fetchSchedules(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    schedules: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch a single schedule
 */
export function useReportSchedule(scheduleId: string | null) {
  return useQuery({
    queryKey: reportScheduleKeys.detail(scheduleId || ''),
    queryFn: () => fetchSchedule(scheduleId!),
    enabled: !!scheduleId,
  });
}

/**
 * Hook to fetch schedule history
 */
export function useReportScheduleHistory(scheduleId: string | null) {
  return useQuery({
    queryKey: reportScheduleKeys.history(scheduleId || ''),
    queryFn: () => fetchHistory(scheduleId!),
    enabled: !!scheduleId,
  });
}

/**
 * Hook to create a new schedule
 */
export function useCreateReportSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (data: ReportScheduleInsert) => createSchedule(data, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportScheduleKeys.all });
      toast({
        title: t('common.success'),
        description: t('automation.scheduleCreated', 'Report schedule created successfully'),
      });
    },
    onError: (error: Error) => {
      console.error('Create schedule failed:', error);
      toast({
        title: t('common.error'),
        description: t('automation.scheduleCreateError', 'Failed to create schedule'),
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update a schedule
 */
export function useUpdateReportSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ scheduleId, updates }: { scheduleId: string; updates: Partial<ReportScheduleInsert> }) =>
      updateSchedule({ scheduleId, updates, userId: user?.id || '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportScheduleKeys.all });
      toast({
        title: t('common.success'),
        description: t('automation.scheduleUpdated', 'Report schedule updated successfully'),
      });
    },
    onError: (error: Error) => {
      console.error('Update schedule failed:', error);
      toast({
        title: t('common.error'),
        description: t('automation.scheduleUpdateError', 'Failed to update schedule'),
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a schedule
 */
export function useDeleteReportSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportScheduleKeys.all });
      toast({
        title: t('common.success'),
        description: t('automation.scheduleDeleted', 'Report schedule deleted successfully'),
      });
    },
    onError: (error: Error) => {
      console.error('Delete schedule failed:', error);
      toast({
        title: t('common.error'),
        description: t('automation.scheduleDeleteError', 'Failed to delete schedule'),
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to toggle schedule enabled/disabled
 */
export function useToggleReportSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ scheduleId, isEnabled }: { scheduleId: string; isEnabled: boolean }) =>
      toggleSchedule({ scheduleId, isEnabled, userId: user?.id || '' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: reportScheduleKeys.all });
      toast({
        title: t('common.success'),
        description: data.is_enabled
          ? t('automation.scheduleEnabled', 'Schedule enabled')
          : t('automation.scheduleDisabled', 'Schedule disabled'),
      });
    },
    onError: (error: Error) => {
      console.error('Toggle schedule failed:', error);
      toast({
        title: t('common.error'),
        description: t('automation.scheduleToggleError', 'Failed to update schedule'),
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to manually send a report
 */
export function useSendReportNow() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: sendReportNow,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: reportScheduleKeys.all });
      toast({
        title: t('common.success'),
        description: result.message || t('automation.reportSent', 'Report sent successfully'),
      });
    },
    onError: (error: Error) => {
      console.error('Send report failed:', error);
      toast({
        title: t('common.error'),
        description: t('automation.reportSendError', 'Failed to send report'),
        variant: 'destructive',
      });
    },
  });
}
