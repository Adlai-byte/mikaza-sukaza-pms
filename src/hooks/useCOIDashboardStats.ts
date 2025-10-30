import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { COIDashboardStats } from '@/lib/schemas';

export function useCOIDashboardStats() {
  return useQuery({
    queryKey: ['coi-dashboard-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coi_dashboard_stats')
        .select('*')
        .single();

      if (error) {
        console.error('Error fetching COI dashboard stats:', error);
        throw error;
      }

      return data as COIDashboardStats;
    },
    refetchInterval: 60000, // Refetch every minute
  });
}
