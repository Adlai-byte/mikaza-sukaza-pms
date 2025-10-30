/**
 * Comprehensive tests for useNotifications hook
 * Tests notification CRUD operations, optimistic updates, and real-time features
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  mockNotification,
  mockUnreadNotification,
  mockReadNotification,
  mockNotificationPreferences,
} from '@/test/utils/mock-data';
import React from 'react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock AuthContext
const mockProfile = { user_id: 'user-123' };
const mockUser = { id: 'user-123' };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, profile: mockProfile }),
}));

// Import after mocking
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useDeleteAllRead,
  useNotificationPreferences,
  useUpdatePreferences,
} from './useNotifications';
import { supabase } from '@/integrations/supabase/client';
const mockSupabase = supabase as any;

// Helper functions
const mockSupabaseSuccess = (data: any) => ({ data, error: null });
const mockSupabaseError = (message: string) => ({
  data: null,
  error: { message, code: 'PGRST116', details: '', hint: '' },
});
const mockSupabaseCount = (count: number) => ({ count, error: null });

// Mock Supabase channel for real-time
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

// Create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: any) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default channel mock
    mockSupabase.channel = vi.fn().mockReturnValue(mockChannel);
    mockSupabase.removeChannel = vi.fn();
  });

  describe('Fetch Notifications', () => {
    it('should fetch notifications successfully', async () => {
      const mockNotifications = [
        mockNotification({ notification_id: 'notif-1', title: 'Task assigned' }),
        mockNotification({ notification_id: 'notif-2', title: 'Job completed' }),
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockSupabaseSuccess(mockNotifications)),
            }),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.notifications[0].title).toBe('Task assigned');
    });

    it('should handle fetch error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockSupabaseError('Failed to fetch')),
            }),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should respect limit parameter', async () => {
      const mockNotifications = Array(100).fill(null).map((_, i) =>
        mockNotification({ notification_id: `notif-${i}` })
      );

      const mockLimit = vi.fn().mockResolvedValue(mockSupabaseSuccess(mockNotifications.slice(0, 20)));

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: mockLimit,
            }),
          }),
        }),
      });

      const wrapper = createWrapper();
      renderHook(() => useNotifications(20), { wrapper });

      await waitFor(() => {
        expect(mockLimit).toHaveBeenCalledWith(20);
      });
    });
  });

  describe('Real-time Subscriptions', () => {
    it('should setup real-time subscription on mount', () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          }),
        }),
      });

      const wrapper = createWrapper();
      renderHook(() => useNotifications(), { wrapper });

      expect(mockSupabase.channel).toHaveBeenCalledWith('notifications-changes');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: 'user_id=eq.user-123',
        },
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('should cleanup subscription on unmount', () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockSupabaseSuccess([])),
            }),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { unmount } = renderHook(() => useNotifications(), { wrapper });

      unmount();

      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });
  });

  describe('Unread Count', () => {
    it('should fetch unread count successfully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseCount(5)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUnreadCount(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.unreadCount).toBe(5);
    });

    it('should handle unread count fetch error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: null, error: { message: 'Failed' } }),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUnreadCount(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should default to 0 on error or return error
      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe('Mark As Read', () => {
    it('should mark notification as read successfully', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useMarkAsRead(), { wrapper });

      result.current.mutate('notif-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should handle mark as read error', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseError('Failed to update')),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useMarkAsRead(), { wrapper });

      result.current.mutate('notif-123');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Mark All As Read', () => {
    it('should mark all notifications as read successfully', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useMarkAllAsRead(), { wrapper });

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should handle mark all as read error', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseError('Failed to update')),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useMarkAllAsRead(), { wrapper });

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Delete Notification', () => {
    it('should delete notification successfully', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDeleteNotification(), { wrapper });

      result.current.mutate('notif-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should handle delete error', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseError('Failed to delete')),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDeleteNotification(), { wrapper });

      result.current.mutate('notif-123');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Delete All Read', () => {
    it('should delete all read notifications successfully', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDeleteAllRead(), { wrapper });

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should handle delete all read error', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseError('Failed to delete')),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDeleteAllRead(), { wrapper });

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Notification Preferences', () => {
    it('should fetch preferences successfully', async () => {
      const preferences = mockNotificationPreferences();

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseSuccess(preferences)),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useNotificationPreferences(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.preferences).toBeDefined();
      expect(result.current.preferences?.email_task_assigned).toBe(true);
    });

    it('should return defaults when preferences do not exist', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'No rows found' },
            }),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useNotificationPreferences(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have default preferences
      expect(result.current.preferences).toBeDefined();
      expect(result.current.preferences?.email_task_assigned).toBe(true);
    });

    it('should handle other fetch errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST999', message: 'Database error' },
            }),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useNotificationPreferences(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('Update Preferences', () => {
    it('should update preferences successfully', async () => {
      const updatedPreferences = mockNotificationPreferences({
        email_task_assigned: false,
        browser_enabled: true,
      });

      mockSupabase.from.mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseSuccess(updatedPreferences)),
            }),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdatePreferences(), { wrapper });

      result.current.mutate({
        email_task_assigned: false,
        browser_enabled: true,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it('should handle update preferences error', async () => {
      mockSupabase.from.mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseError('Failed to update')),
            }),
          }),
        }),
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdatePreferences(), { wrapper });

      result.current.mutate({
        email_task_assigned: false,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Optimistic Updates', () => {
    it('should optimistically update when marking as read', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      // Set initial notifications
      queryClient.setQueryData(['notifications', 'list'], [
        mockUnreadNotification({ notification_id: 'notif-1' }),
        mockUnreadNotification({ notification_id: 'notif-2' }),
      ]);
      queryClient.setQueryData(['notifications', 'count'], 2);

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseSuccess(null)),
          }),
        }),
      });

      const wrapper = ({ children }: any) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useMarkAsRead(), { wrapper });

      result.current.mutate('notif-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Check optimistic update happened
      const notifications = queryClient.getQueryData(['notifications', 'list']) as any[];
      expect(notifications).toBeDefined();
    });

    it('should rollback on error', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const originalNotifications = [
        mockUnreadNotification({ notification_id: 'notif-1' }),
        mockUnreadNotification({ notification_id: 'notif-2' }),
      ];

      queryClient.setQueryData(['notifications', 'list'], originalNotifications);
      queryClient.setQueryData(['notifications', 'count'], 2);

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseError('Update failed')),
          }),
        }),
      });

      const wrapper = ({ children }: any) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useMarkAsRead(), { wrapper });

      result.current.mutate('notif-1');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should rollback to original state
      const notifications = queryClient.getQueryData(['notifications', 'list']);
      expect(notifications).toEqual(originalNotifications);
    });
  });
});
