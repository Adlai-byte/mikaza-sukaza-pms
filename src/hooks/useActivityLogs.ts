import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ActivityLog } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";

export function useActivityLogs() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const logActivity = useCallback(async (
    actionType: string,
    actionDetails?: Record<string, any>,
    userId?: string,
    performedBy?: string
  ) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('activity_logs')
        .insert([{
          user_id: userId || null,
          action_type: actionType,
          action_details: actionDetails || {},
          performed_by: performedBy || 'System',
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error logging activity:', error);
      // Don't show toast for logging errors to avoid spamming user
    } finally {
      setLoading(false);
    }
  }, []);

  const getActivityLogs = useCallback(async (userId?: string): Promise<ActivityLog[]> => {
    try {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as ActivityLog[];
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch activity logs",
        variant: "destructive",
      });
      return [];
    }
  }, [toast]);

  return {
    loading,
    logActivity,
    getActivityLogs,
  };
}