import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ActivityLog } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export function useActivityLogs() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();

  const logActivity = useCallback(async (
    actionType: string,
    actionDetails?: Record<string, any>,
    userId?: string,
    performedBy?: string
  ) => {
    try {
      setLoading(true);

      // Get current user's full name
      let performedByName = performedBy || 'System';

      if (!performedBy && profile) {
        // Build full name from profile
        const firstName = profile.first_name || '';
        const lastName = profile.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();

        // Use full name if available, otherwise email, otherwise user type
        performedByName = fullName || profile.email || profile.user_type || 'Unknown User';

        console.log('📝 [ACTIVITY LOG] Logging action:', {
          actionType,
          performedBy: performedByName,
          userId: profile.user_id,
          email: profile.email,
          timestamp: new Date().toISOString()
        });
      }

      const { error } = await supabase
        .from('activity_logs')
        .insert([{
          user_id: userId || null,
          action_type: actionType,
          action_details: actionDetails || {},
          performed_by: performedByName,
        }]);

      if (error) {
        console.error('❌ [ACTIVITY LOG] Failed to log activity:', error);
        throw error;
      }

      console.log('✅ [ACTIVITY LOG] Activity logged successfully:', {
        actionType,
        performedBy: performedByName
      });
    } catch (error) {
      console.error('Error logging activity:', error);
      // Don't show toast for logging errors to avoid spamming user
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const getActivityLogs = useCallback(async (userId?: string): Promise<ActivityLog[]> => {
    try {
      console.log('🔍 [ACTIVITY LOG] Fetching logs for user:', userId);

      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        // Get logs where this user is the subject (user_id matches)
        // OR logs performed by this user (check performed_by field)
        // We need to fetch the user details first to match the performed_by name
        const { data: userData } = await supabase
          .from('users')
          .select('first_name, last_name, email')
          .eq('user_id', userId)
          .single();

        if (userData) {
          const fullName = `${userData.first_name} ${userData.last_name}`.trim();
          console.log('👤 [ACTIVITY LOG] User details:', { fullName, email: userData.email });

          // Fetch logs where:
          // 1. user_id matches (actions done TO/ABOUT this user)
          // 2. performed_by matches the user's full name or email
          query = query.or(`user_id.eq.${userId},performed_by.eq.${fullName},performed_by.eq.${userData.email}`);
        } else {
          // Fallback to just user_id if we can't get user details
          query = query.eq('user_id', userId);
        }
      }

      const { data, error } = await query.limit(50); // Limit to 50 most recent logs

      if (error) {
        console.error('❌ [ACTIVITY LOG] Fetch error:', error);
        throw error;
      }

      console.log('✅ [ACTIVITY LOG] Fetched', data?.length || 0, 'logs');
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