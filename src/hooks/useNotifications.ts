import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AppNotification, NotificationPreferences } from '@/lib/schemas';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLogs } from '@/hooks/useActivityLogs';

// Query keys
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  unread: () => [...notificationKeys.all, 'unread'] as const,
  count: () => [...notificationKeys.all, 'count'] as const,
  preferences: (userId: string) => [...notificationKeys.all, 'preferences', userId] as const,
};

// Fetch notifications for current user
const fetchNotifications = async (userId: string, limit: number = 50): Promise<AppNotification[]> => {
  console.log('🔔 [Notifications] Fetching notifications for userId:', userId);

  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      action_user:users!notifications_action_by_fkey(user_id, first_name, last_name, email, photo_url),
      task:tasks(task_id, title, status, priority),
      issue:issues(issue_id, title, status, priority),
      job:jobs(job_id, title, status, priority)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ [Notifications] Fetch error:', error);
    throw error;
  }

  console.log('✅ [Notifications] Fetched:', data?.length || 0, 'notifications');
  console.log('📊 [Notifications] Sample data:', data?.[0]);
  return (data || []) as AppNotification[];
};

// Fetch unread count
const fetchUnreadCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
};

// Mark notification as read
const markAsRead = async (notificationId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('notification_id', notificationId)
    .eq('user_id', userId);

  if (error) throw error;
};

// Mark all as read
const markAllAsRead = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
};

// Delete notification
const deleteNotification = async (notificationId: string, userId: string): Promise<{ notificationId: string; notification: any }> => {
  // Fetch notification details before deleting for logging
  const { data: notification } = await supabase
    .from('notifications')
    .select('notification_id, type, title, message')
    .eq('notification_id', notificationId)
    .eq('user_id', userId)
    .single();

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('notification_id', notificationId)
    .eq('user_id', userId);

  if (error) throw error;
  return { notificationId, notification };
};

// Delete all read notifications
const deleteAllRead = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .eq('is_read', true);

  if (error) throw error;
};

// Fetch notification preferences
const fetchPreferences = async (userId: string): Promise<NotificationPreferences> => {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    // If preferences don't exist, return defaults
    if (error.code === 'PGRST116') {
      return {
        user_id: userId,
        email_task_assigned: true,
        email_task_due_soon: true,
        email_task_completed: false,
        email_issue_assigned: true,
        email_issue_resolved: false,
        email_mentions: true,
        app_task_assigned: true,
        app_task_status_changed: true,
        app_task_due_soon: true,
        app_issue_assigned: true,
        app_issue_status_changed: true,
        app_mentions: true,
        browser_enabled: false,
        daily_summary: false,
        weekly_summary: false,
      };
    }
    throw error;
  }

  return data as NotificationPreferences;
};

// Update preferences
const updatePreferences = async (userId: string, preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({ user_id: userId, ...preferences, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as NotificationPreferences;
};

// Hooks
export function useNotifications(limit: number = 50) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const userId = profile?.user_id || user?.id || '';

  console.log('🔔 [useNotifications] Hook initialized:', {
    userId,
    hasProfile: !!profile,
    hasUser: !!user,
    profileUserId: profile?.user_id,
    userAuthId: user?.id,
  });

  const { data: notifications = [], isLoading, error, refetch } = useQuery({
    queryKey: notificationKeys.lists(),
    queryFn: () => fetchNotifications(userId, limit),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  });

  console.log('🔔 [useNotifications] Query result:', {
    notificationCount: notifications.length,
    isLoading,
    hasError: !!error,
    error: error?.message,
  });

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🔔 Notification update:', payload);

          // Invalidate queries to refetch
          queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
          queryClient.invalidateQueries({ queryKey: notificationKeys.count() });

          // Show browser notification for new notifications
          if (payload.eventType === 'INSERT' && 'new' in payload) {
            const newNotification = payload.new as AppNotification;
            showBrowserNotification(newNotification);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return {
    notifications,
    loading: isLoading,
    error,
    refetch,
  };
}

export function useUnreadCount() {
  const { user, profile } = useAuth();
  const userId = profile?.user_id || user?.id || '';

  const { data: unreadCount = 0, isLoading } = useQuery({
    queryKey: notificationKeys.count(),
    queryFn: () => fetchUnreadCount(userId),
    enabled: !!userId,
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });

  return {
    unreadCount,
    loading: isLoading,
  };
}

export function useMarkAsRead() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const userId = profile?.user_id || user?.id || '';

  return useMutation({
    mutationFn: (notificationId: string) => markAsRead(notificationId, userId),
    onMutate: async (notificationId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists() });
      await queryClient.cancelQueries({ queryKey: notificationKeys.count() });

      // Snapshot the previous values
      const previousNotifications = queryClient.getQueryData(notificationKeys.lists());
      const previousCount = queryClient.getQueryData(notificationKeys.count());

      // Optimistically update the notifications list
      queryClient.setQueryData(notificationKeys.lists(), (old: AppNotification[] | undefined) => {
        if (!old) return old;
        return old.map(notification =>
          notification.notification_id === notificationId
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification
        );
      });

      // Optimistically update the unread count
      queryClient.setQueryData(notificationKeys.count(), (old: number | undefined) => {
        return Math.max(0, (old || 0) - 1);
      });

      // Return context with previous values for rollback
      return { previousNotifications, previousCount };
    },
    onError: (error: Error, notificationId, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(notificationKeys.lists(), context.previousNotifications);
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(notificationKeys.count(), context.previousCount);
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark notification as read',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Always refetch after mutation completes
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.count() });
    },
  });
}

export function useMarkAllAsRead() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const userId = profile?.user_id || user?.id || '';

  return useMutation({
    mutationFn: () => markAllAsRead(userId),
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists() });
      await queryClient.cancelQueries({ queryKey: notificationKeys.count() });

      // Snapshot the previous values
      const previousNotifications = queryClient.getQueryData(notificationKeys.lists());
      const previousCount = queryClient.getQueryData(notificationKeys.count());

      // Optimistically update the notifications list
      queryClient.setQueryData(notificationKeys.lists(), (old: AppNotification[] | undefined) => {
        if (!old) return old;
        return old.map(notification => ({
          ...notification,
          is_read: true,
          read_at: new Date().toISOString()
        }));
      });

      // Optimistically update the unread count to 0
      queryClient.setQueryData(notificationKeys.count(), 0);

      // Return context with previous values for rollback
      return { previousNotifications, previousCount };
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(notificationKeys.lists(), context.previousNotifications);
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(notificationKeys.count(), context.previousCount);
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark all as read',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Always refetch after mutation completes
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.count() });
    },
  });
}

export function useDeleteNotification() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const userId = profile?.user_id || user?.id || '';
  const { logActivity } = useActivityLogs();

  return useMutation({
    mutationFn: (notificationId: string) => deleteNotification(notificationId, userId),
    onMutate: async (notificationId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists() });
      await queryClient.cancelQueries({ queryKey: notificationKeys.count() });

      // Snapshot the previous values
      const previousNotifications = queryClient.getQueryData(notificationKeys.lists());
      const previousCount = queryClient.getQueryData(notificationKeys.count());

      // Get the notification being deleted to check if it was unread
      const deletedNotification = (previousNotifications as AppNotification[] | undefined)?.find(
        n => n.notification_id === notificationId
      );

      // Optimistically update the notifications list
      queryClient.setQueryData(notificationKeys.lists(), (old: AppNotification[] | undefined) => {
        if (!old) return old;
        return old.filter(notification => notification.notification_id !== notificationId);
      });

      // Optimistically update the unread count if notification was unread
      if (deletedNotification && !deletedNotification.is_read) {
        queryClient.setQueryData(notificationKeys.count(), (old: number | undefined) => {
          return Math.max(0, (old || 0) - 1);
        });
      }

      // Return context with previous values for rollback
      return { previousNotifications, previousCount };
    },
    onSuccess: ({ notificationId, notification }) => {
      // Log the delete action
      logActivity('notification_deleted', {
        notification_id: notificationId,
        type: notification?.type,
        title: notification?.title || 'Unknown Notification',
        message: notification?.message,
      });
    },
    onError: (error: Error, notificationId, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(notificationKeys.lists(), context.previousNotifications);
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(notificationKeys.count(), context.previousCount);
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete notification',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Always refetch after mutation completes
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.count() });
    },
  });
}

export function useDeleteAllRead() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const userId = profile?.user_id || user?.id || '';

  return useMutation({
    mutationFn: () => deleteAllRead(userId),
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists() });
      await queryClient.cancelQueries({ queryKey: notificationKeys.count() });

      // Snapshot the previous values
      const previousNotifications = queryClient.getQueryData(notificationKeys.lists());
      const previousCount = queryClient.getQueryData(notificationKeys.count());

      // Optimistically update the notifications list - remove all read notifications
      queryClient.setQueryData(notificationKeys.lists(), (old: AppNotification[] | undefined) => {
        if (!old) return old;
        console.log('🗑️ [DeleteAllRead] Before filter:', old.length, 'notifications');
        const filtered = old.filter(notification => !notification.is_read);
        console.log('🗑️ [DeleteAllRead] After filter:', filtered.length, 'notifications remaining');
        return filtered;
      });

      // Count doesn't change since we're only deleting read notifications
      // (unread count should remain the same)

      // Return context with previous values for rollback
      return { previousNotifications, previousCount };
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'All read notifications deleted',
      });
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(notificationKeys.lists(), context.previousNotifications);
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(notificationKeys.count(), context.previousCount);
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete notifications',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Always refetch after mutation completes
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.count() });
    },
  });
}

export function useNotificationPreferences() {
  const { user, profile } = useAuth();
  const userId = profile?.user_id || user?.id || '';

  const { data: preferences, isLoading, error } = useQuery({
    queryKey: notificationKeys.preferences(userId),
    queryFn: () => fetchPreferences(userId),
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    preferences,
    loading: isLoading,
    error,
  };
}

export function useUpdatePreferences() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const userId = profile?.user_id || user?.id || '';

  return useMutation({
    mutationFn: (preferences: Partial<NotificationPreferences>) =>
      updatePreferences(userId, preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.preferences(userId) });
      toast({
        title: 'Success',
        description: 'Notification preferences updated',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update preferences',
        variant: 'destructive',
      });
    },
  });
}

// Helper function to show browser notifications
function showBrowserNotification(notification: AppNotification) {
  // Check if browser notifications are supported
  if (!('Notification' in window)) {
    return;
  }

  // Check permission
  if (Notification.permission === 'granted') {
    new Notification(notification.title, {
      body: notification.message,
      icon: '/icon-192x192.png', // Add your app icon
      badge: '/badge-72x72.png',
      tag: notification.notification_id,
    });
  } else if (Notification.permission !== 'denied') {
    // Request permission
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: notification.notification_id,
        });
      }
    });
  }
}

// Export helper to request browser notification permission
export function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return Promise.reject(new Error('Browser notifications not supported'));
  }

  if (Notification.permission === 'granted') {
    return Promise.resolve(Notification.permission);
  }

  return Notification.requestPermission();
}
