import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  ScheduledService,
  ScheduledServiceInsert,
  ScheduledServiceFilters,
  ServiceRecurrenceRule,
  ServiceRecurrenceRuleInsert,
  ServiceNotificationSettings,
  ServiceNotificationSettingsInsert,
  SERVICE_TYPE_CONFIG,
} from '@/lib/schemas';

// Cache key factory
export const serviceSchedulingKeys = {
  all: ['service-scheduling'] as const,
  lists: () => [...serviceSchedulingKeys.all, 'list'] as const,
  list: (filters: ScheduledServiceFilters) => [...serviceSchedulingKeys.lists(), filters] as const,
  details: () => [...serviceSchedulingKeys.all, 'detail'] as const,
  detail: (id: string) => [...serviceSchedulingKeys.details(), id] as const,
  calendar: (dateRange: { start: string; end: string }) => [...serviceSchedulingKeys.all, 'calendar', dateRange] as const,
  upcoming: () => [...serviceSchedulingKeys.all, 'upcoming'] as const,
  recurrenceRules: () => [...serviceSchedulingKeys.all, 'recurrence-rules'] as const,
  recurrenceRule: (id: string) => [...serviceSchedulingKeys.recurrenceRules(), id] as const,
};

// Fetch scheduled services with filters
export function useScheduledServices(filters: ScheduledServiceFilters = {}) {
  return useQuery({
    queryKey: serviceSchedulingKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('scheduled_services')
        .select(`
          *,
          property:properties(property_id, property_name),
          unit:units(unit_id, property_name),
          vendor:providers(provider_id, provider_name, email, phone_primary),
          recurrence_rule:service_recurrence_rules(*),
          created_by_user:users!scheduled_services_created_by_fkey(user_id, first_name, last_name)
        `)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true, nullsFirst: false });

      // Apply filters
      if (filters.property_id) {
        query = query.eq('property_id', filters.property_id);
      }
      if (filters.unit_id) {
        query = query.eq('unit_id', filters.unit_id);
      }
      if (filters.vendor_id) {
        query = query.eq('vendor_id', filters.vendor_id);
      }
      if (filters.service_type) {
        query = query.eq('service_type', filters.service_type);
      }
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters.date_from) {
        query = query.gte('scheduled_date', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('scheduled_date', filters.date_to);
      }
      if (filters.is_recurring !== undefined) {
        if (filters.is_recurring) {
          query = query.not('recurrence_rule_id', 'is', null);
        } else {
          query = query.is('recurrence_rule_id', null);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ScheduledService[];
    },
  });
}

// Fetch a single scheduled service
export function useScheduledService(scheduleId: string | null) {
  return useQuery({
    queryKey: serviceSchedulingKeys.detail(scheduleId || ''),
    queryFn: async () => {
      if (!scheduleId) return null;

      const { data, error } = await supabase
        .from('scheduled_services')
        .select(`
          *,
          property:properties(property_id, property_name),
          unit:units(unit_id, property_name),
          vendor:providers(provider_id, provider_name, email, phone_primary),
          recurrence_rule:service_recurrence_rules(*),
          created_by_user:users!scheduled_services_created_by_fkey(user_id, first_name, last_name)
        `)
        .eq('schedule_id', scheduleId)
        .single();

      if (error) throw error;
      return data as ScheduledService;
    },
    enabled: !!scheduleId,
  });
}

// Fetch services for calendar view (date range)
export function useCalendarServices(startDate: string, endDate: string) {
  return useQuery({
    queryKey: serviceSchedulingKeys.calendar({ start: startDate, end: endDate }),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_services')
        .select(`
          *,
          property:properties(property_id, property_name),
          vendor:providers(provider_id, provider_name)
        `)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
        .not('status', 'eq', 'cancelled')
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as ScheduledService[];
    },
    enabled: !!startDate && !!endDate,
  });
}

// Fetch upcoming services (next 7 days)
export function useUpcomingServices() {
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return useQuery({
    queryKey: serviceSchedulingKeys.upcoming(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_services')
        .select(`
          *,
          property:properties(property_id, property_name),
          vendor:providers(provider_id, provider_name, phone_primary)
        `)
        .gte('scheduled_date', today)
        .lte('scheduled_date', nextWeek)
        .in('status', ['scheduled', 'confirmed'])
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true, nullsFirst: false })
        .limit(20);

      if (error) throw error;
      return data as ScheduledService[];
    },
  });
}

// Create a scheduled service
export function useCreateScheduledService() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (service: ScheduledServiceInsert) => {
      const { data, error } = await supabase
        .from('scheduled_services')
        .insert({
          ...service,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: serviceSchedulingKeys.all });
      toast({
        title: 'Service Scheduled',
        description: `${SERVICE_TYPE_CONFIG[data.service_type as keyof typeof SERVICE_TYPE_CONFIG]?.label || data.service_type} has been scheduled.`,
      });
    },
    onError: (error: Error) => {
      console.error('Failed to create scheduled service:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule service. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// Update a scheduled service
export function useUpdateScheduledService() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ scheduleId, updates }: { scheduleId: string; updates: Partial<ScheduledServiceInsert> }) => {
      const { data, error } = await supabase
        .from('scheduled_services')
        .update(updates)
        .eq('schedule_id', scheduleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: serviceSchedulingKeys.all });
      toast({
        title: 'Service Updated',
        description: 'The scheduled service has been updated.',
      });
    },
    onError: (error: Error) => {
      console.error('Failed to update scheduled service:', error);
      toast({
        title: 'Error',
        description: 'Failed to update service. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// Delete a scheduled service
export function useDeleteScheduledService() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await supabase
        .from('scheduled_services')
        .delete()
        .eq('schedule_id', scheduleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceSchedulingKeys.all });
      toast({
        title: 'Service Deleted',
        description: 'The scheduled service has been removed.',
      });
    },
    onError: (error: Error) => {
      console.error('Failed to delete scheduled service:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete service. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// Update service status
export function useUpdateServiceStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      scheduleId,
      status,
      completionNotes
    }: {
      scheduleId: string;
      status: string;
      completionNotes?: string;
    }) => {
      const updates: Record<string, unknown> = { status };

      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
        updates.completed_by = user?.id;
        if (completionNotes) {
          updates.completion_notes = completionNotes;
        }
      }

      const { data, error } = await supabase
        .from('scheduled_services')
        .update(updates)
        .eq('schedule_id', scheduleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: serviceSchedulingKeys.all });
      toast({
        title: 'Status Updated',
        description: `Service marked as ${data.status}.`,
      });
    },
    onError: (error: Error) => {
      console.error('Failed to update service status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// ==========================================
// RECURRENCE RULES HOOKS
// ==========================================

// Create a recurrence rule
export function useCreateRecurrenceRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (rule: ServiceRecurrenceRuleInsert) => {
      const { data, error } = await supabase
        .from('service_recurrence_rules')
        .insert(rule)
        .select()
        .single();

      if (error) throw error;
      return data as ServiceRecurrenceRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceSchedulingKeys.recurrenceRules() });
    },
    onError: (error: Error) => {
      console.error('Failed to create recurrence rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to create recurring schedule. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// Create a scheduled service with recurrence
export function useCreateRecurringService() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      service,
      recurrenceRule
    }: {
      service: ScheduledServiceInsert;
      recurrenceRule: ServiceRecurrenceRuleInsert;
    }) => {
      // First create the recurrence rule
      const { data: ruleData, error: ruleError } = await supabase
        .from('service_recurrence_rules')
        .insert(recurrenceRule)
        .select()
        .single();

      if (ruleError) throw ruleError;

      // Then create the service with the rule ID
      const { data: serviceData, error: serviceError } = await supabase
        .from('scheduled_services')
        .insert({
          ...service,
          recurrence_rule_id: ruleData.rule_id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (serviceError) throw serviceError;

      // Generate future instances (this would typically be done by a backend function)
      // For now, we'll return the created service and handle generation separately

      return { service: serviceData, rule: ruleData };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: serviceSchedulingKeys.all });
      toast({
        title: 'Recurring Service Created',
        description: `Recurring ${SERVICE_TYPE_CONFIG[data.service.service_type as keyof typeof SERVICE_TYPE_CONFIG]?.label || data.service.service_type} has been scheduled.`,
      });
    },
    onError: (error: Error) => {
      console.error('Failed to create recurring service:', error);
      toast({
        title: 'Error',
        description: 'Failed to create recurring service. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// ==========================================
// NOTIFICATION SETTINGS HOOKS
// ==========================================

// Get notification settings for a service
export function useServiceNotificationSettings(scheduleId: string | null) {
  return useQuery({
    queryKey: [...serviceSchedulingKeys.detail(scheduleId || ''), 'notifications'],
    queryFn: async () => {
      if (!scheduleId) return null;

      const { data, error } = await supabase
        .from('service_notification_settings')
        .select('*')
        .eq('schedule_id', scheduleId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
      return data as ServiceNotificationSettings | null;
    },
    enabled: !!scheduleId,
  });
}

// Create or update notification settings
export function useUpsertNotificationSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: ServiceNotificationSettingsInsert) => {
      const { data, error } = await supabase
        .from('service_notification_settings')
        .upsert(settings, { onConflict: 'schedule_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [...serviceSchedulingKeys.detail(data.schedule_id), 'notifications']
      });
      toast({
        title: 'Notifications Updated',
        description: 'Notification settings have been saved.',
      });
    },
    onError: (error: Error) => {
      console.error('Failed to update notification settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notification settings. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// ==========================================
// UTILITY HOOKS
// ==========================================

// Get service count by status
export function useServiceStatusCounts(filters: ScheduledServiceFilters = {}) {
  return useQuery({
    queryKey: [...serviceSchedulingKeys.list(filters), 'counts'],
    queryFn: async () => {
      let query = supabase
        .from('scheduled_services')
        .select('status', { count: 'exact', head: false });

      if (filters.property_id) {
        query = query.eq('property_id', filters.property_id);
      }
      if (filters.date_from) {
        query = query.gte('scheduled_date', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('scheduled_date', filters.date_to);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Count by status
      const counts = {
        scheduled: 0,
        confirmed: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
        no_show: 0,
        total: data?.length || 0,
      };

      data?.forEach((item: { status: string }) => {
        if (item.status in counts) {
          counts[item.status as keyof typeof counts]++;
        }
      });

      return counts;
    },
  });
}

// Get services grouped by property (for dashboard)
export function useServicesByProperty(dateRange?: { start: string; end: string }) {
  return useQuery({
    queryKey: [...serviceSchedulingKeys.all, 'by-property', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('scheduled_services')
        .select(`
          property_id,
          status,
          property:properties(property_id, property_name)
        `)
        .not('status', 'eq', 'cancelled');

      if (dateRange?.start) {
        query = query.gte('scheduled_date', dateRange.start);
      }
      if (dateRange?.end) {
        query = query.lte('scheduled_date', dateRange.end);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group by property
      const grouped = data?.reduce((acc, item) => {
        const propId = item.property_id;
        if (!acc[propId]) {
          acc[propId] = {
            property_id: propId,
            property_name: (item.property as any)?.property_name || 'Unknown',
            total: 0,
            completed: 0,
            pending: 0,
          };
        }
        acc[propId].total++;
        if (item.status === 'completed') {
          acc[propId].completed++;
        } else if (['scheduled', 'confirmed'].includes(item.status)) {
          acc[propId].pending++;
        }
        return acc;
      }, {} as Record<string, { property_id: string; property_name: string; total: number; completed: number; pending: number }>);

      return Object.values(grouped || {});
    },
  });
}
